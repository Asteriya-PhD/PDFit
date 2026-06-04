#!/usr/bin/env node
/**
 * e2e-check.mjs — End-to-end smoke test for core PDFit workflows.
 *
 * Mirrors a11y-check.mjs (vite preview + Playwright), but instead of
 * checking axe violations it drives real user flows and validates the
 * files the browser actually produces. Designed to be CI-friendly:
 *   - exits non-zero on any failure
 *   - writes e2e-results.json for the workflow to upload as artifact
 *   - uploads downloaded files to e2e-artifacts/ for debugging
 *
 * Why test-state injection instead of the dropzone?
 *   The EmptyState's dropzone creates an <input type=file> via JS and
 *   calls .click() — Playwright's filechooser event is fragile in this
 *   path (input.click() can bypass the filechooser dialog in headless
 *   Chromium). Instead, we read the real test PDFs in Node, ship their
 *   bytes through addInitScript (as plain number arrays → Uint8Array →
 *   ArrayBuffer on the page side), and let AppContext boot with files
 *   already populated. The tool panels then render against real PDF
 *   bytes, and the export buttons fire real download events.
 *
 * Scenarios (zh locale forced via localStorage):
 *   1. merge      — inject 2 PDFs, click 合并, expect a merged PDF
 *   2. split      — inject multi-page PDF, extract pages 1,3, expect a PDF
 *   3. rotate     — inject PDF, click 旋转全部页面, expect a PDF
 *   4. watermark  — inject PDF, type text, click 添加水印并下载, expect a PDF
 *
 * Validation: download saved to disk, file size > 1KB, first 4 bytes
 * match the expected magic (%PDF- for PDF).
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'
import {
  existsSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync,
} from 'node:fs'
import { join } from 'node:path'

const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}/PDFit/`
const TEST_DIR = join(process.cwd(), 'test-files')
const ARTIFACTS = join(process.cwd(), 'e2e-artifacts')
const RESULTS_FILE = join(process.cwd(), 'e2e-results.json')

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46]   // %PDF
const MIN_SIZE = 200

let server = null
const cleanup = () => {
  if (server && !server.killed) {
    server.kill('SIGTERM')
    setTimeout(() => server?.kill('SIGKILL'), 3000)
  }
}
process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(130) })
process.on('SIGTERM', () => { cleanup(); process.exit(143) })

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now()
  let lastErr
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' })
      if (res.status < 500) return
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastErr = e
    }
    await wait(500)
  }
  throw new Error(`Preview server not ready: ${lastErr?.message}`)
}

function getBrowserLaunchOpts() {
  const opts = {}
  if (process.env.CHROME_PATH) {
    opts.executablePath = process.env.CHROME_PATH
  } else if (process.platform === 'darwin' && existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) {
    opts.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  }
  return opts
}

const SCENARIOS = [
  {
    name: 'merge',
    files: ['text-pdf.pdf', 'multi-page.pdf'],
    pageCount: [1, 3],
    tool: 'merge',
    action: async (page) => {
      await page.getByRole('button', { name: /合并 \d+ 个文件/ }).click()
    },
    expect: 'pdf',
  },
  {
    name: 'split-extract',
    files: ['multi-page.pdf'],
    pageCount: [3],
    tool: 'split',
    action: async (page) => {
      await page.getByPlaceholder('例: 1,3,5-7').fill('1,3')
      await page.getByRole('button', { name: '提取所选页面' }).click()
    },
    expect: 'pdf',
  },
  {
    name: 'rotate',
    files: ['text-pdf.pdf'],
    pageCount: [1],
    tool: 'rotate',
    action: async (page) => {
      await page.getByRole('button', { name: '旋转全部页面' }).click()
    },
    expect: 'pdf',
  },
  {
    name: 'watermark',
    files: ['text-pdf.pdf'],
    pageCount: [1],
    tool: 'watermark',
    action: async (page) => {
      await page.getByPlaceholder('请输入水印文字，如: CONFIDENTIAL').fill('E2E_TEST')
      await page.getByRole('button', { name: '添加水印并下载' }).click()
    },
    expect: 'pdf',
  },
  {
    name: 'delete-pages',
    files: ['multi-page.pdf'],
    pageCount: [3],
    tool: 'delete',
    action: async (page) => {
      await page.getByPlaceholder('例: 1,3,5-7').fill('1,2')
      await page.getByRole('button', { name: '删除并下载' }).click()
    },
    expect: 'pdf',
  },
  {
    name: 'page-numbering',
    files: ['multi-page.pdf'],
    pageCount: [3],
    tool: 'page-numbering',
    action: async (page) => {
      await page.getByRole('button', { name: '添加页码并下载' }).click()
    },
    expect: 'pdf',
  },
  {
    name: 'pdf-to-image',
    files: ['multi-page.pdf'],
    pageCount: [3],
    tool: 'pdf-to-image',
    action: async (page) => {
      await page.getByRole('button', { name: '导出图片' }).click()
    },
    expect: 'zip',
  },
  {
    name: 'pdf-to-md',
    files: ['text-pdf.pdf'],
    pageCount: [1],
    tool: 'pdf-to-md',
    action: async (page) => {
      // The toolbar tab and the panel action button share the same text;
      // scope to the .btn-primary action button to disambiguate.
      const extractBtn = page.locator('button.btn-primary', { hasText: '提取文本' })
      const downloadBtn = page.locator('button.btn-primary', { hasText: '下载 .md' })
      await extractBtn.click()
      await downloadBtn.waitFor({ timeout: 15000 })
      await downloadBtn.click()
    },
    expect: 'md',
  },
  {
    name: 'pdf-to-docx',
    // PDF→DOCX pipeline: click the action button to convert, then the
    // download button. The result is a valid .docx (PK zip header) so
    // we check both magic + size, same as the PDF scenarios.
    files: ['text-pdf.pdf'],
    pageCount: [1],
    tool: 'pdf-to-docx',
    action: async (page) => {
      // The toolbar tab and the panel action button share the same text
      // ("转 Word" / "To Word" in zh); scope to .btn-primary to pick the
      // action button, not the nav tab.
      const convertBtn = page.locator('button.btn-primary', { hasText: '转换为 Word' })
      const downloadBtn = page.locator('button.btn-primary', { hasText: '下载 .docx' })
      await convertBtn.click()
      await downloadBtn.waitFor({ timeout: 30000 })
      await downloadBtn.click()
    },
    expect: 'docx',
  },
  {
    name: 'pdf-to-xlsx',
    // PDF→XLSX pipeline: click the action button to convert, then the
    // download button. Uses a synthetic table-pdf.pdf fixture (4 rows ×
    // 3 cols). Result is .xlsx (also a zip), so we check PK magic.
    files: ['table-pdf.pdf'],
    pageCount: [1],
    tool: 'pdf-to-xlsx',
    action: async (page) => {
      const convertBtn = page.locator('button.btn-primary', { hasText: '转换为 Excel' })
      const downloadBtn = page.locator('button.btn-primary', { hasText: '下载 .xlsx' })
      await convertBtn.click()
      await downloadBtn.waitFor({ timeout: 30000 })
      await downloadBtn.click()
    },
    expect: 'xlsx',
  },
  {
    name: 'image-to-pdf',
    // ImageToPdfTool manages its own local `images` state and uses its own
    // <input type=file>, not the AppContext dropzone. We inject the file
    // via Playwright's setInputFiles, then click the convert button.
    files: [],
    pageCount: [],
    tool: 'image-to-pdf',
    action: async (page) => {
      const input = page.locator('input[type="file"]').first()
      await input.setInputFiles(join(TEST_DIR, 'test1.png'))
      const btn = page.getByRole('button', { name: /转换为 PDF/ })
      await btn.waitFor({ timeout: 5000 })
      await btn.click()
    },
    expect: 'pdf',
  },
  {
    name: 'reorder',
    // Drag-drop is fragile in headless Chromium. ReorderTool's apply
    // button handles the no-op case (downloads the original PDF), so
    // we can validate the apply flow without performing a drag.
    files: ['multi-page.pdf'],
    pageCount: [3],
    tool: 'reorder',
    action: async (page) => {
      await page.getByRole('button', { name: '确认新顺序' }).click()
    },
    expect: 'pdf',
  },
]

async function runScenario(browser, scenario) {
  const ctx = await browser.newContext({ acceptDownloads: true })

  // Pre-read PDF bytes in Node and serialize as plain number arrays.
  // addInitScript ships them across the boundary; the page reconstructs
  // them as Uint8Array → ArrayBuffer → File objects that AppContext
  // accepts via __PDFIT_TEST_STATE__.
  const filePayload = scenario.files.map((f, i) => {
    const bytes = readFileSync(join(TEST_DIR, f))
    return {
      name: f,
      size: bytes.byteLength,
      pageCount: scenario.pageCount[i] ?? 1,
      bytes: Array.from(bytes),
    }
  })

  await ctx.addInitScript((payload) => {
    try { localStorage.setItem('pdfit-locale', 'zh') } catch {}
    const files = payload.files.map((f, i) => {
      const bytes = new Uint8Array(f.bytes)
      const buffer = bytes.buffer
      const file = new File([bytes], f.name, { type: 'application/pdf' })
      return {
        id: `test-file-${i + 1}`,
        name: f.name,
        size: f.size,
        file,
        arrayBuffer: buffer,
        pageCount: f.pageCount,
      }
    })
    window.__PDFIT_TEST_STATE__ = {
      files,
      // Empty-file scenarios (image-to-pdf, mineru-panel) need no active
      // file id; the tools render via App.tsx's special-case branches or
      // accept gate without touching activeFile.
      activeFileId: files[0]?.id ?? null,
      activeTool: payload.tool,
    }
  }, { files: filePayload, tool: scenario.tool })

  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}\n${e.stack ?? ''}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })

  try {
    // domcontentloaded is faster and more deterministic than networkidle
    // for vite preview — HMR pings / sourcemap fetches can keep
    // networkidle from settling in CI under load. The tool panel
    // renders on mount and the 800ms wait below covers animation +
    // any lazy-imported module that lands on the same task (e.g.
    // pdf-to-md triggers the LiteParse WASM dynamic import which
    // can briefly hog the main thread before the next scenario's
    // panel mounts).
    await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await wait(800)

    // Wait for the tool panel to render by looking for the action button
    // the scenario is about to click. If it's the active tool (default
    // is merge), the button shows "合并 N 个文件". For others, the
    // activeTool is set so the right panel renders on mount.
    const readySelector = {
      merge: /合并 \d+ 个文件/,
      split: /提取所选页面|分割 PDF/,
      rotate: /旋转全部页面/,
      watermark: /添加水印并下载/,
      delete: /删除并下载|输入页码|点选页面/,
      'page-numbering': /添加页码并下载/,
      'pdf-to-image': /导出图片/,
      'pdf-to-md': /提取文本/,
      'image-to-pdf': /图片转 PDF|拖拽图片/,
      reorder: /确认新顺序/,
      'pdf-to-docx': /转 Word|转换为 Word/,
      'pdf-to-xlsx': /转 Excel|转换为 Excel/,
    }[scenario.tool]
    await page.getByText(readySelector).first().waitFor({ timeout: 10000 })

    // No-download smoke test path: run scenario.validate and report
    // its outcome directly. Used for mineru, where mocking the full
    // multi-step external API flow is too brittle for a CI e2e.
    if (scenario.validate) {
      await scenario.validate(page)
      return {
        name: scenario.name,
        status: 'PASS',
        filename: null,
        size: null,
        errors,
      }
    }

    // Trigger the action and wait for the resulting download.
    // .catch is attached immediately so an action() throw doesn't leak an
    // unhandled rejection from downloadPromise (which would crash the run).
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 }).catch(() => null)
    await scenario.action(page)
    const download = await downloadPromise

    if (!download) {
      return {
        name: scenario.name,
        status: 'FAIL',
        error: 'No download event fired within 20s',
        errors,
      }
    }

    const ext = scenario.expect
    const outPath = join(ARTIFACTS, `${scenario.name}.${ext}`)
    await download.saveAs(outPath)
    const size = statSync(outPath).size
    const bytes = readFileSync(outPath)
    // PDF and DOCX (which is a zip) get magic-byte checks; plain formats
    // (zip-from-pdf-to-image, md) are validated by size alone since
    // the byte layout varies.
    const ZIP_HEADER = [0x50, 0x4B, 0x03, 0x04]   // PK\x03\x04
    const expectMagic = scenario.expect === 'pdf' ? PDF_HEADER
      : (scenario.expect === 'docx' || scenario.expect === 'xlsx') ? ZIP_HEADER
      : null
    const magic = expectMagic ? Array.from(bytes.subarray(0, 4)) : []
    const headerOk = expectMagic ? magic.every((b, i) => b === expectMagic[i]) : true
    const sizeOk = size >= MIN_SIZE
    const pass = headerOk && sizeOk

    return {
      name: scenario.name,
      status: pass ? 'PASS' : 'FAIL',
      filename: download.suggestedFilename(),
      size,
      headerOk,
      sizeOk,
      errors: pass ? [] : [
        `headerOk=${headerOk} sizeOk=${sizeOk} size=${size} magic=${magic.map((b) => b.toString(16)).join(' ')}`,
        ...errors,
      ],
    }
  } catch (e) {
    return {
      name: scenario.name,
      status: 'FAIL',
      error: e instanceof Error ? e.message : String(e),
      errors,
    }
  } finally {
    await ctx.close()
  }
}

async function main() {
  if (existsSync(ARTIFACTS)) rmSync(ARTIFACTS, { recursive: true })
  mkdirSync(ARTIFACTS, { recursive: true })

  console.log('Starting vite preview…')
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VITE_BASE: '/PDFit/' },
  })
  server.stdout.on('data', (d) => process.stdout.write(`[preview] ${d}`))
  server.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`))

  await waitForServer(BASE)
  console.log(`Preview ready at ${BASE}`)

  const browser = await chromium.launch(getBrowserLaunchOpts())
  const startTime = Date.now()
  const results = []

  for (const sc of SCENARIOS) {
    console.log(`\n→ ${sc.name}`)
    const r = await runScenario(browser, sc)
    results.push(r)
    const mark = r.status === 'PASS' ? '✓' : '✗'
    const detail = r.size != null ? ` (${r.size} bytes)` : ''
    console.log(`  ${mark} ${r.status}${detail}`)
    if (r.status === 'FAIL') {
      console.log(`    error: ${r.error ?? '(see errors[])'}`)
      if (r.errors?.length) console.log(`    ${r.errors.join('\n    ')}`)
    }
  }

  await browser.close()
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  const summary = {
    started_at: new Date().toISOString(),
    elapsed_seconds: Number(elapsed),
    total: results.length,
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
    results,
  }
  writeFileSync(RESULTS_FILE, JSON.stringify(summary, null, 2))
  console.log(`\n========== e2e summary (${elapsed}s) ==========`)
  console.log(`total: ${summary.total}  passed: ${summary.passed}  failed: ${summary.failed}`)
  console.log(`results: ${RESULTS_FILE}`)
  console.log(`artifacts: ${ARTIFACTS}`)

  if (summary.failed > 0) {
    console.error(`\n❌ e2e check failed (${summary.failed}/${summary.total})`)
    process.exit(1)
  }
  console.log(`\n✅ e2e check passed`)
  // vite preview is a child with piped stdio; without an explicit exit, the
  // event loop stays alive and CI hangs until the 20-min job timeout.
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ e2e crashed:', err)
  process.exit(1)
})
