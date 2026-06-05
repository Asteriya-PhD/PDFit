// Render 3 shortcut icons (192×192) for the PWA manifest. Editorial
// "Privacy Press" style: orange #d97757 background, dark stroke #8b3a1c,
// simple geometric shapes (matches the existing pwa-192x192.png and
// pdfit.svg). Run with: `node scripts/gen-shortcut-icons.mjs`.
//
// Uses Google Chrome headless screenshot — the playwright binary isn't
// installed in this env, but Chrome is. We invoke it directly with
// --headless=new --screenshot. One Chrome launch, three pages, three
// PNGs. The output PNG matches the viewport 1:1 (no deviceScaleFactor
// override → 192×192 RGBA).

import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = resolve(__dirname, '../public/icons')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const VIEWPORT = 192

// 192px viewport, no padding, transparent background. The icon artwork
// fills the full square. `purpose: any` (no maskable safe zone) is
// intentional because shortcut launchers don't crop.
function html(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${VIEWPORT}px;height:${VIEWPORT}px;overflow:hidden;background:transparent}
    svg{width:${VIEWPORT}px;height:${VIEWPORT}px;display:block}
  </style></head><body>${body}</body></html>`
}

// Word: a "W" on a document page with a fold corner.
const wordSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="15" y="10" width="70" height="85" rx="6" fill="#d97757" stroke="#8b3a1c" stroke-width="2"/>
  <path d="M 71 10 L 85 24 L 71 24 Z" fill="#8b3a1c" opacity="0.55"/>
  <rect x="22" y="36" width="56" height="4" rx="2" fill="#ffffff" opacity="0.85"/>
  <rect x="22" y="48" width="56" height="4" rx="2" fill="#ffffff" opacity="0.85"/>
  <text x="50" y="80" font-size="32" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif">W</text>
</svg>`

// Excel: a 4×3 grid (header row in dark) representing a spreadsheet.
const excelSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="12" y="14" width="76" height="76" rx="6" fill="#d97757" stroke="#8b3a1c" stroke-width="2"/>
  <!-- header row -->
  <rect x="12" y="14" width="76" height="16" fill="#8b3a1c"/>
  <text x="50" y="26" font-size="9" font-weight="700" fill="#ffffff" text-anchor="middle" font-family="system-ui, sans-serif" letter-spacing="0.5">XLSX</text>
  <!-- grid lines: 3 cols × 2 rows below header -->
  <g stroke="#ffffff" stroke-width="1.5" fill="none" opacity="0.85">
    <line x1="37" y1="30" x2="37" y2="90"/>
    <line x1="63" y1="30" x2="63" y2="90"/>
    <line x1="12" y1="50" x2="88" y2="50"/>
    <line x1="12" y1="70" x2="88" y2="70"/>
  </g>
  <rect x="12" y="14" width="76" height="76" rx="6" fill="none" stroke="#8b3a1c" stroke-width="2"/>
</svg>`

// Merge: two overlapping pages, the front one slightly forward.
const mergeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <!-- back page (offset up-right) -->
  <rect x="22" y="14" width="50" height="68" rx="5" fill="#8b3a1c" opacity="0.45"/>
  <rect x="27" y="32" width="40" height="3" rx="1.5" fill="#ffffff" opacity="0.55"/>
  <rect x="27" y="42" width="40" height="3" rx="1.5" fill="#ffffff" opacity="0.55"/>
  <!-- front page -->
  <rect x="18" y="22" width="58" height="68" rx="6" fill="#d97757" stroke="#8b3a1c" stroke-width="2"/>
  <path d="M 64 22 L 76 34 L 64 34 Z" fill="#8b3a1c" opacity="0.55"/>
  <rect x="24" y="46" width="46" height="3.5" rx="1.5" fill="#ffffff" opacity="0.85"/>
  <rect x="24" y="56" width="46" height="3.5" rx="1.5" fill="#ffffff" opacity="0.85"/>
  <rect x="24" y="66" width="32" height="3.5" rx="1.5" fill="#ffffff" opacity="0.85"/>
</svg>`

const targets = [
  { name: 'shortcut-word.png', svg: wordSvg },
  { name: 'shortcut-excel.png', svg: excelSvg },
  { name: 'shortcut-merge.png', svg: mergeSvg },
]

function chrome(args) {
  return new Promise((res, rej) => {
    const p = spawn(CHROME, args, { stdio: 'inherit' })
    p.on('close', code => (code === 0 ? res() : rej(new Error(`chrome exit ${code}`))))
    p.on('error', rej)
  })
}

const tmp = await mkdtemp(join(tmpdir(), 'pdfit-icons-'))
try {
  for (const { name, svg } of targets) {
    const page = join(tmp, `${name}.html`)
    const out = resolve(iconsDir, name)
    await writeFile(page, html(svg))
    // --headless=new: modern headless. --hide-scrollbars: avoid
    // accidental scrollbar pixels. --default-background-color=00000000
    // + transparent body → RGBA PNG with alpha=0 around the icon.
    await chrome([
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${VIEWPORT},${VIEWPORT}`,
      `--default-background-color=00000000`,
      `--screenshot=${out}`,
      `file://${page}`,
    ])
    console.log(`✓ wrote ${out}`)
  }
} finally {
  await rm(tmp, { recursive: true, force: true })
}
