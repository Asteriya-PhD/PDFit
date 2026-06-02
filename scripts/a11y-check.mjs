#!/usr/bin/env node
/**
 * a11y-check.mjs — Spin up the production build via `vite preview`,
 * navigate key pages, and run axe-core (WCAG 2 AA). Fails the process
 * on any critical or serious violations.
 *
 * Designed to run in CI without test fixtures; uses the empty state as
 * the only required surface (tool panels need a real PDF).
 */
import { chromium } from 'playwright'
import { AxeBuilder } from '@axe-core/playwright'
import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'
import { existsSync } from 'node:fs'

const PORT = 4173
const BASE = `http://127.0.0.1:${PORT}/PDFit/`
const PAGES = [
  { name: 'home (empty state)', path: '' },
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
  const context = await browser.newContext()
  const page = await context.newPage()

  let critical = 0
  let serious = 0
  let minor = 0
  const startTime = Date.now()

  for (const { name, path } of PAGES) {
    const url = BASE + path
    console.log(`\n→ Auditing: ${name}`)
    console.log(`  url: ${url}`)

    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    // Let any post-mount animation settle (e.g. fadeIn 250ms).
    await wait(400)

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
