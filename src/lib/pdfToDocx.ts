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
// A single-column row is kept in the table only if it sits within this
// y-distance of some multi-column row on the same page. Larger than
// Y_TOLERANCE (which is a row-bucketing tolerance for same-baseline
// items) because we're measuring cell-wrap gaps: a wrapped cell line
// can be at a different y from the next multi-column line, but not by
// much. Standalone headings (e.g. a centered "Teaching Method" between
// two tables) have a much larger gap to any multi-column row and
// therefore stay as `text`.
const SINGLE_COL_TABLE_GAP = 20
// X positions within this many PDF units of each other are bucketed into
// the same column during schema detection. Chosen to be smaller than the
// gap between any two real columns of a page (>30 in every observed
// fixture) so adjacent columns stay separate, but large enough to absorb
// x-jitter within a single column.
const X_CLUSTER_TOL = 25
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
 * within Y_TOLERANCE), then determine the page's column x-positions.
 *
 * Columns are detected by **global x-clustering** rather than by picking
 * a single "schema row" (the previous approach). Each item's x is added
 * to the closest existing cluster if it's within X_CLUSTER_TOL; otherwise
 * it starts a new cluster. A cluster is kept as a column only if it has
 * items in ≥ 2 different rows. The previous "schema row = max-items row"
 * approach over-detected columns when an outlier row (e.g. a 4-item
 * fill-in-the-blank math worksheet line spread across the page) had more
 * items than the actual table header — every x in that outlier became a
 * candidate column. Global clustering makes phantom columns self-filter
 * because their x positions only appear in 1 row.
 */
function groupRowsAndColumns(items: TextItem[]): {
  rows: Row[]
  columnXs: number[]
} {
  if (items.length === 0) return { rows: [], columnXs: [] }

  // Sort top-to-bottom (ascending y), then left-to-right (ascending x).
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)

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

  // Cluster all x positions across the page. Each cluster is a candidate
  // column. Keep clusters that have items in ≥ 2 different rows.
  interface Cluster {
    /** x position of the first item in the cluster (used as the anchor for distance checks). */
    anchor: number
    /** All x positions that landed in this cluster (for computing the representative). */
    xPositions: number[]
    rowIndices: Set<number>
  }
  const clusters: Cluster[] = []
  for (let r = 0; r < rows.length; r++) {
    for (const it of rows[r]!.items) {
      // Find the closest cluster within tolerance; ties broken by lower index.
      let bestIdx = -1
      let bestDist = Infinity
      for (let c = 0; c < clusters.length; c++) {
        const d = Math.abs(it.x - clusters[c]!.anchor)
        if (d <= X_CLUSTER_TOL && d < bestDist) {
          bestIdx = c
          bestDist = d
        }
      }
      if (bestIdx === -1) {
        clusters.push({ anchor: it.x, xPositions: [it.x], rowIndices: new Set([r]) })
      } else {
        const cluster = clusters[bestIdx]!
        cluster.xPositions.push(it.x)
        cluster.rowIndices.add(r)
      }
    }
  }

  // Keep clusters that appear in ≥ 2 rows. Use the median x of the cluster
  // as the representative column position.
  const columnXs = clusters
    .filter(c => c.rowIndices.size >= 2)
    .map(c => {
      const sorted = [...c.xPositions].sort((a, b) => a - b)
      return sorted[Math.floor(sorted.length / 2)]!
    })
    .sort((a, b) => a - b)

  return { rows, columnXs }
}

/**
 * Classify each row as table or text and group into PageElements.
 *
 * Two-pass classification. Pass 1 counts how many distinct columns each
 * row hits (`multi` = ≥ 2, `single` = 1, `none` = 0). Pass 2 maps to the
 * final `'table' | 'text'`:
 *   - `multi` rows are always `'table'`.
 *   - `none` rows are always `'text'`.
 *   - `single` rows are `'table'` iff some `multi` row is within
 *     `SINGLE_COL_TABLE_GAP` of their y baseline; otherwise `'text'`.
 *
 * The two-pass is necessary because a multi-line cell produces N pipeline
 * rows that each hit only one column. Marking all ≥ 1-hit rows as `'table'`
 * naively (the v5 attempt) over-classifies standalone headings — a
 * centered "Teaching Method" between two tables would merge the tables
 * together. The y-proximity check keeps wrapped cells in the table (their
 * single-column rows sit within ~14 y-units of the next multi-column
 * row) while excluding isolated headings (whose gap to any multi-column
 * row is much larger).
 */
function classifyRows(rows: Row[], columnXs: number[]): PageElement[] {
  if (rows.length === 0) return []
  const out: PageElement[] = []

  // Pass 1: tag each row by column-hit count.
  const hitColCount = (r: Row): number => {
    if (columnXs.length < 2) return 0
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
    return hitCols.size
  }
  const hits = rows.map(r => hitColCount(r))

  // Pass 2: 'multi' → 'table'; 'none' → 'text'; 'single' → 'table' iff
  // a 'multi' row is within SINGLE_COL_TABLE_GAP of its y.
  const kinds: Array<'table' | 'text'> = rows.map((_, i) => {
    if (hits[i]! >= 2) return 'table'
    if (hits[i]! === 0) return 'text'
    // exactly 1 column hit — look for a nearby multi-column row
    for (let j = 0; j < rows.length; j++) {
      if (j === i) continue
      if (hits[j]! < 2) continue
      if (Math.abs(rows[j]!.y - rows[i]!.y) < SINGLE_COL_TABLE_GAP) return 'table'
    }
    return 'text'
  })

  let i = 0
  while (i < rows.length) {
    const kind = kinds[i]!
    let j = i
    while (j < rows.length && kinds[j] === kind) j++

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
