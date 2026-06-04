/**
 * PDF → XLSX (Excel) — local-browser conversion.
 *
 * Pipeline: LiteParse extracts per-item text + (x, y) coordinates →
 * custom row/column clustering → `exceljs` writes a workbook.
 *
 * **Table detection is heuristic.** PDFs don't carry table structure,
 * so we infer it from spatial layout: items sharing the same y
 * position form a row, items sharing the same x position form a
 * column. A page is treated as a table only if it has ≥ 2 columns
 * across ≥ 2 rows. Pages that don't meet that bar are skipped;
 * a fully non-tabular PDF throws NO_TABLE.
 *
 * Lazy-loaded: LiteParse parser is reused from `src/lib/liteparse.ts`
 * (cached `parserPromise`), and `exceljs` is a dynamic import.
 */

import { parseToMarkdown } from './liteparse'

interface TextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName?: string
  fontSize?: number
}

const Y_TOLERANCE = 3              // px — items within this y are "same row"
const MIN_COLUMNS = 2

export class NoTableError extends Error {
  constructor() {
    super('NO_TABLE')
    this.name = 'NoTableError'
  }
}

export class EmptyPdfError extends Error {
  constructor() {
    super('EMPTY_PDF')
    this.name = 'EmptyPdfError'
  }
}

export interface XlsxResult {
  bytes: Uint8Array
  totalPages: number
  /** Pages that yielded at least one row of ≥ 2 columns. */
  tablePages: number
  cellCount: number
}

interface PageTable {
  /** 2D grid: cells[rowIndex][colIndex] = string */
  grid: string[][]
  columnCount: number
  rowCount: number
}

interface LiteParseResult {
  text: string
  pages: Array<{
    pageNum: number
    width: number
    height: number
    text: string
    textItems: TextItem[]
  }>
}

/**
 * Need access to the parsed `textItems` (with x/y), not just the
 * flattened markdown. We call the LiteParse constructor directly via
 * the same parser instance the cached `getParser()` already made.
 *
 * `parseToMarkdown()` discards the structured data, so this wrapper
 * re-invokes `parser.parse()` against the same wasm parser. That's
 * fine — the parser itself is cached, only the per-call work is
 * duplicated.
 */
async function parseStructured(arrayBuffer: ArrayBuffer): Promise<LiteParseResult> {
  // Lazy-load + init liteparse (cached, so the second call returns immediately).
  const mod = await import('@llamaindex/liteparse-wasm')
  // Re-trigger init lazily — but we don't need to, the cached parser
  // already exists after the first call. We just need the parser.
  // Use the public entrypoint: liteparse.parseToMarkdown sets up
  // its own parser instance, but to keep things simple, we re-import
  // and re-parse using a fresh instance.
  const parser = new mod.LiteParse({ ocrEnabled: false, outputFormat: 'json', quiet: true })
  const bytes = new Uint8Array(arrayBuffer.slice(0))
  return (await parser.parse(bytes)) as LiteParseResult
}

function detectTable(items: TextItem[]): PageTable | null {
  if (items.length === 0) return null

  // Sort top-to-bottom (ascending y), then left-to-right (ascending x).
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)

  // Group by y (top-to-bottom).
  const rowYs: number[] = []
  const rowItems: TextItem[][] = []
  for (const it of sorted) {
    const lastY = rowYs[rowYs.length - 1]
    if (lastY === undefined || Math.abs(lastY - it.y) > Y_TOLERANCE) {
      rowYs.push(it.y)
      rowItems.push([])
    }
    rowItems[rowItems.length - 1]!.push(it)
  }
  for (const items of rowItems) {
    items.sort((a, b) => a.x - b.x)
  }

  // Column x-positions = the union of "row with the most items" +
  // any other x that recurs in ≥ 2 rows (so we don't miss a column
  // that only appears in data rows but not in the header).
  const maxLen = Math.max(...rowItems.map(r => r.length))
  if (maxLen < MIN_COLUMNS) return null
  const headerXs = rowItems.find(r => r.length === maxLen)!.map(it => it.x)

  // Count how many distinct x-clusters appear across all rows.
  const xCount = new Map<number, number>()
  for (const row of rowItems) {
    const seen = new Set<number>()
    for (const it of row) {
      // Bucket by nearest header x.
      let nearest = headerXs[0]!
      let bestDist = Math.abs(it.x - nearest)
      for (const hx of headerXs) {
        const d = Math.abs(it.x - hx)
        if (d < bestDist) { bestDist = d; nearest = hx }
      }
      if (!seen.has(nearest)) { seen.add(nearest); xCount.set(nearest, (xCount.get(nearest) ?? 0) + 1) }
    }
  }
  // Keep columns that appear in at least 2 rows (otherwise it's a one-off).
  const columnXs = [...xCount.entries()].filter(([, c]) => c >= 2).map(([x]) => x).sort((a, b) => a - b)
  if (columnXs.length < MIN_COLUMNS) return null

  // Build the grid.
  const grid = rowItems.map(row => {
    const cells = new Array<string>(columnXs.length).fill('')
    for (const it of row) {
      let bestIdx = 0
      let bestDist = Math.abs(columnXs[0]! - it.x)
      for (let i = 1; i < columnXs.length; i++) {
        const d = Math.abs(columnXs[i]! - it.x)
        if (d < bestDist) { bestDist = d; bestIdx = i }
      }
      cells[bestIdx] = (cells[bestIdx] ? cells[bestIdx] + ' ' : '') + it.text.trim()
    }
    return cells
  })

  return { grid, columnCount: columnXs.length, rowCount: grid.length }
}

/**
 * Convert a PDF's bytes into a .xlsx workbook. One worksheet per
 * page that yielded a table. Pages without table structure are
 * silently skipped.
 *
 * Throws:
 * - `EmptyPdfError` if the PDF has no extractable text.
 * - `NoTableError` if no page contains a table-like layout.
 */
export async function pdfToXlsx(
  arrayBuffer: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<XlsxResult> {
  // Use the cached LiteParse parser via the wrapper so the markdown
  // path is exercised too. If markdown is empty, there's nothing to do.
  const { markdown } = await parseToMarkdown(arrayBuffer, onProgress)
  if (!markdown.trim()) throw new EmptyPdfError()

  // For the structured (x, y) view, parse again with a fresh instance.
  // The wasm module init is cached at the module level; only the
  // per-document parse work is duplicated.
  const structured = await parseStructured(arrayBuffer)
  const total = structured.pages.length
  if (total === 0) throw new NoTableError()

  // Detect tables per page.
  const pageTables: Array<{ pageNum: number; table: PageTable }> = []
  for (let i = 0; i < total; i++) {
    const p = structured.pages[i]!
    const table = detectTable(p.textItems)
    if (table) pageTables.push({ pageNum: p.pageNum, table })
  }
  if (pageTables.length === 0) throw new NoTableError()

  // Lazy-load exceljs.
  const ExcelJS = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  let cellCount = 0
  for (const { pageNum, table } of pageTables) {
    // First page → "Sheet1", rest → "Sheet N"
    const sheetName = pageNum === 1 && pageTables.length === 1
      ? 'Sheet1'
      : `Page ${pageNum}`
    const ws = wb.addWorksheet(sheetName)
    for (const row of table.grid) {
      ws.addRow(row)
      cellCount += row.filter(c => c !== '').length
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  // exceljs returns a Node Buffer (Uint8Array) in Node and an ArrayBuffer
  // in the browser. `new Uint8Array(buf)` works for both — Buffer is
  // already a Uint8Array, and ArrayBuffer can be wrapped to a view.
  const bytes = new Uint8Array(buffer as ArrayBufferLike)

  return {
    bytes,
    totalPages: total,
    tablePages: pageTables.length,
    cellCount,
  }
}
