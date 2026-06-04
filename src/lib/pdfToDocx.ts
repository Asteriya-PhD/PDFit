/**
 * PDF → DOCX (Word) — local-browser conversion with table-aware
 * document flow.
 *
 * Pipeline: LiteParse parses PDF → per-item (x, y) text → custom
 * row-classification → mixed array of `Paragraph | Table` in document
 * order → `docx` package writes .docx.
 *
 * **Mixed content mode (v2).** Each page is processed top-to-bottom.
 * Items are clustered into rows (by y) and each row is classified
 * as either "text" (≤ 1 cell in our column schema) or "table" (≥ 2
 * cells in distinct columns). Consecutive same-type rows are
 * coalesced: text rows → paragraphs (with heading detection on the
 * first line of a block); table rows → a `docx.Table` element.
 * Then they're emitted in document order, so a page with a heading,
 * description, and comparison table becomes exactly that sequence
 * in Word.
 *
 * Fallback: pages with no table-like structure produce only paragraphs
 * (same behavior as the v1 text-only pipeline).
 *
 * Lazy-loaded: LiteParse parser is reused from `src/lib/liteparse.ts`
 * (cached `parserPromise`), and `docx` is a dynamic import.
 */

import { parseToMarkdown } from './liteparse'
import type { Paragraph as ParagraphType, Table as TableType } from 'docx'

interface TextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName?: string
  fontSize?: number
}

const Y_TOLERANCE = 3
const HEADING_RE = /^(Heading\s+\d+|[A-Z][^.]*:?)$/

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

interface DocxResult {
  bytes: Uint8Array
  totalPages: number
  charCount: number
  tableCount: number
}

async function parseStructured(arrayBuffer: ArrayBuffer): Promise<LiteParseResult> {
  const mod = await import('@llamaindex/liteparse-wasm')
  const parser = new mod.LiteParse({ ocrEnabled: false, outputFormat: 'json', quiet: true })
  return (await parser.parse(new Uint8Array(arrayBuffer.slice(0)))) as LiteParseResult
}

interface Row {
  y: number
  items: TextItem[]  // sorted by x
}

interface TableRegion {
  rows: string[][]  // rows[r][c] = cell text (or '' if empty)
  columnCount: number
}

interface TextBlock {
  lines: string[]
}

type PageElement = { kind: 'paragraphs'; blocks: TextBlock[] } | { kind: 'table'; table: TableRegion }

/**
 * Group textItems on a page into rows (items sharing a y-baseline
 * within Y_TOLERANCE), then determine the page's column x-positions
 * by finding the most-populated row and keeping x's that appear in
 * ≥ 2 rows.
 */
function groupRowsAndColumns(items: TextItem[]): {
  rows: Row[]
  columnXs: number[]
} {
  if (items.length === 0) return { rows: [], columnXs: [] }

  // Sort top-to-bottom, then by x (so items at the same y end up adjacent).
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x)

  const rows: Row[] = []
  for (const it of sorted) {
    const last = rows[rows.length - 1]
    if (!last || Math.abs(last.y - it.y) > Y_TOLERANCE) {
      rows.push({ y: it.y, items: [it] })
    } else {
      last.items.push(it)
    }
  }
  for (const r of rows) r.items.sort((a, b) => a.x - b.x)

  // Pick the row with the most items as the "schema" — its x-positions
  // are the candidate columns. Keep only x's that appear in ≥ 2 rows.
  const maxLen = Math.max(...rows.map(r => r.items.length))
  if (maxLen < 2) return { rows, columnXs: [] }
  const headerXs = rows.find(r => r.items.length === maxLen)!.items.map(it => it.x)

  const xCount = new Map<number, number>()
  for (const row of rows) {
    const seen = new Set<number>()
    for (const it of row.items) {
      let nearest = headerXs[0]!
      let bestDist = Math.abs(it.x - nearest)
      for (const hx of headerXs) {
        const d = Math.abs(it.x - hx)
        if (d < bestDist) { bestDist = d; nearest = hx }
      }
      if (!seen.has(nearest)) {
        seen.add(nearest)
        xCount.set(nearest, (xCount.get(nearest) ?? 0) + 1)
      }
    }
  }
  const columnXs = [...xCount.entries()]
    .filter(([, c]) => c >= 2)
    .map(([x]) => x)
    .sort((a, b) => a - b)
  return { rows, columnXs }
}

/**
 * Classify each row as table or text and group into PageElements.
 * Text rows: ≤ 1 item in a column, or doesn't match the column
 * schema. Table rows: ≥ 2 items in ≥ 2 distinct columns.
 */
function classifyRows(rows: Row[], columnXs: number[]): PageElement[] {
  if (rows.length === 0) return []
  const out: PageElement[] = []

  const classifyRow = (r: Row): 'table' | 'text' => {
    if (columnXs.length < 2) return 'text'
    // Map each item to its nearest column; count distinct columns hit.
    const hitCols = new Set<number>()
    for (const it of r.items) {
      let nearest = columnXs[0]!
      let bestDist = Math.abs(it.x - nearest)
      for (let i = 1; i < columnXs.length; i++) {
        const d = Math.abs(columnXs[i]! - it.x)
        if (d < bestDist) { bestDist = d; nearest = columnXs[i]! }
      }
      hitCols.add(nearest)
    }
    return hitCols.size >= 2 ? 'table' : 'text'
  }

  let i = 0
  while (i < rows.length) {
    const kind = classifyRow(rows[i]!)
    let j = i
    while (j < rows.length && classifyRow(rows[j]!) === kind) j++

    if (kind === 'table') {
      const tableRows: string[][] = rows.slice(i, j).map(r => {
        const cells = new Array<string>(columnXs.length).fill('')
        for (const it of r.items) {
          let nearest = columnXs[0]!
          let bestDist = Math.abs(it.x - nearest)
          for (let k = 1; k < columnXs.length; k++) {
            const d = Math.abs(columnXs[k]! - it.x)
            if (d < bestDist) { bestDist = d; nearest = columnXs[k]! }
          }
          cells[columnXs.indexOf(nearest)] = (cells[columnXs.indexOf(nearest)] ? cells[columnXs.indexOf(nearest)] + ' ' : '') + it.text.trim()
        }
        return cells
      })
      out.push({ kind: 'table', table: { rows: tableRows, columnCount: columnXs.length } })
    } else {
      // Coalesce text rows into blocks separated by a larger y-gap.
      // A gap > 2× the average line height is a paragraph break.
      const blockLines: string[][] = [[]]
      for (let k = i; k < j; k++) {
        const line = rows[k]!.items.map(it => it.text).join(' ').trim()
        if (line) blockLines[blockLines.length - 1]!.push(line)
        if (k < j - 1) {
          const gap = Math.abs(rows[k]!.y - rows[k + 1]!.y)
          const avg = rows.slice(i, j).reduce((s, r) => s + Math.abs(r.y - (rows[0]?.y ?? r.y)), 0) / Math.max(1, j - i)
          if (gap > avg * 1.5) blockLines.push([])
        }
      }
      const blocks: TextBlock[] = blockLines
        .filter(lines => lines.length > 0)
        .map(lines => ({ lines }))
      if (blocks.length > 0) out.push({ kind: 'paragraphs', blocks })
    }
    i = j
  }
  return out
}

function isHeadingLine(line: string, isFirst: boolean): boolean {
  return isFirst && HEADING_RE.test(line)
}

export async function pdfToDocx(
  arrayBuffer: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<DocxResult> {
  const { markdown, totalPages } = await parseToMarkdown(arrayBuffer, onProgress)
  if (!markdown.trim()) {
    throw new Error('EMPTY_PDF')
  }

  // Structured parse for spatial layout.
  const structured = await parseStructured(arrayBuffer)
  const total = structured.pages.length

  // Process each page into a list of PageElements in document order.
  const pageElements: PageElement[][] = []
  for (let p = 0; p < total; p++) {
    const items = structured.pages[p]!.textItems
    const { rows, columnXs } = groupRowsAndColumns(items)
    pageElements.push(classifyRows(rows, columnXs))
  }

  // Lazy-load docx.
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, BorderStyle, WidthType } = await import('docx')

  const children: (ParagraphType | TableType)[] = []
  let tableCount = 0
  for (const elements of pageElements) {
    for (const el of elements) {
      if (el.kind === 'paragraphs') {
        for (const block of el.blocks) {
          block.lines.forEach((line, idx) => {
            const isFirst = idx === 0
            const isHeading = isHeadingLine(line, isFirst)
            children.push(
              new Paragraph({
                heading: isHeading ? HeadingLevel.HEADING_1 : undefined,
                children: [new TextRun({ text: line, bold: Boolean(isHeading) })],
              }),
            )
          })
          // Spacer paragraph between blocks for readability.
          children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
        }
      } else {
        tableCount++
        const t = el.table
        const rows = t.rows.map(row =>
          new TableRow({
            children: row.map(cell => new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: cell })] })],
            })),
          }),
        )
        children.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top:    { style: BorderStyle.SINGLE, size: 4, color: '999999' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '999999' },
            left:   { style: BorderStyle.SINGLE, size: 4, color: '999999' },
            right:  { style: BorderStyle.SINGLE, size: 4, color: '999999' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
            insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: 'cccccc' },
          },
          rows,
        }))
        // Spacer after each table.
        children.push(new Paragraph({ children: [new TextRun({ text: '' })] }))
      }
    }
  }

  const doc = new Document({ sections: [{ children }] })
  const arrayBuffer2 = await Packer.toArrayBuffer(doc)
  const bytes = new Uint8Array(arrayBuffer2)

  return {
    bytes,
    totalPages,
    charCount: markdown.length,
    tableCount,
  }
}
