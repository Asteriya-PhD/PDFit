#!/usr/bin/env node
/**
 * a11y-check.mjs — Spin up the production build via `vite preview`,
 * navigate key surfaces, and run axe-core (WCAG 2 AA). Fails the process
 * on any critical or serious violations.
 *
 * Tool panels only render when a file is loaded, so we inject a stub
 * PDFFileInfo via `window.__PDFIT_TEST_STATE__` (read by AppContext) for
 * those scenarios. This bypass is opt-in — no production code path sets
 * the window var, and AppContext falls back to an empty state otherwise.
 */
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'
import { existsSync } from 'node:fs'

const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}/PDFit/`

/**
 * Each scenario audits one rendered surface. `tool` and `fileName`
 * trigger the test-state injection; omit them for the empty home state.
 */
const SCENARIOS = [
  { name: 'home (empty state)' },
  { name: 'merge tool',         tool: 'merge' },
  { name: 'split tool',         tool: 'split' },
  { name: 'delete tool',        tool: 'delete' },
  { name: 'rotate tool',        tool: 'rotate' },
  { name: 'reorder tool',       tool: 'reorder' },
  { name: 'page-numbering',     tool: 'page-numbering' },
  { name: 'watermark tool',     tool: 'watermark' },
  { name: 'pdf-to-image',       tool: 'pdf-to-image' },
  { name: 'pdf-to-md',          tool: 'pdf-to-md' },
  { name: 'image-to-pdf',       tool: 'image-to-pdf' },
  { name: 'mineru tool',        tool: 'mineru' },
]

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
  throw new Error(`Preview server did not become ready at ${url} within ${timeoutMs}ms: ${lastErr?.message}`)
}

async function main() {
  console.log(`Starting vite preview on port ${PORT}…`)
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, VITE_BASE: '/PDFit/' },
  })
  server.stdout.on('data', d => process.stdout.write(`[preview] ${d}`))
  server.stderr.on('data', d => process.stderr.write(`[preview] ${d}`))

  await waitForServer(BASE)
  console.log(`Preview ready at ${BASE}`)

  const launchOpts = {}
  const chromePath = process.env.CHROME_PATH
    || (process.platform === 'darwin' && existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      : undefined)
  if (chromePath) {
    launchOpts.executablePath = chromePath
    console.log(`Using system Chrome: ${chromePath}`)
  } else {
    console.log('Using Playwright-bundled Chromium')
  }
  const browser = await chromium.launch(launchOpts)

  let critical = 0
  let serious = 0
  let minor = 0
  const startTime = Date.now()

  for (const scenario of SCENARIOS) {
    // Fresh context per scenario so addInitScript payloads don't accumulate
    // and the React tree restarts cleanly between states.
    const context = await browser.newContext()
    const page = await context.newPage()

    if (scenario.tool) {
      const fileName = scenario.fileName ?? 'sample.pdf'
      await context.addInitScript(({ tool, fileName }) => {
        const file = new File([new Uint8Array(0)], fileName, { type: 'application/pdf' })
        window.__PDFIT_TEST_STATE__ = {
          files: [{
            id: 'test-file-1',
            name: fileName,
            size: 0,
            file,
            arrayBuffer: new ArrayBuffer(0),
            pageCount: 5,
          }],
          activeFileId: 'test-file-1',
          activeTool: tool,
        }
      }, { tool: scenario.tool, fileName })
    }

    console.log(`\n→ Auditing: ${scenario.name}`)
    console.log(`  url: ${BASE}`)

    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })
    // Let any post-mount animation settle (e.g. fadeIn 250ms) and let
    // tool panels finish their initial render (font picker, color inputs).
    await wait(500)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    for (const v of results.violations) {
      const impact = v.impact || 'minor'
      const sample = v.nodes.slice(0, 2).map(n => `      → ${n.target.join(' ')}`).join('\n')
      const banner = impact === 'critical' ? '✗ CRITICAL' : impact === 'serious' ? '✗ SERIOUS' : '· minor'
      console.log(`  ${banner} [${v.id}] ${v.help}\n${sample}\n      ${v.helpUrl}`)
      if (impact === 'critical') critical++
      else if (impact === 'serious') serious++
      else minor++
    }

    if (results.violations.length === 0) {
      console.log('  ✓ no violations')
    } else {
      console.log(`  → ${results.violations.length} total (critical=${critical}, serious=${serious}, minor=${minor})`)
    }

    await context.close()
  }

  await browser.close()
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n========== a11y summary (${elapsed}s) ==========`)
  console.log(`critical: ${critical}  serious: ${serious}  minor: ${minor}`)

  if (critical > 0 || serious > 0) {
    console.error(`\n❌ a11y check failed: ${critical} critical + ${serious} serious violations`)
    process.exit(1)
  }
  console.log('\n✅ a11y check passed (WCAG 2 AA)')
}

main().catch(err => {
  console.error('\n❌ a11y check crashed:', err)
  process.exit(1)
})
