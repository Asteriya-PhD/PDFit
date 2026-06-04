import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { initSync } from '@llamaindex/liteparse-wasm'
import { pdfToDocx } from './pdfToDocx'

const TEST_DIR = join(process.cwd(), 'test-files')
let textPdf: ArrayBuffer
let imageOnlyPdf: ArrayBuffer
let tablePdf: ArrayBuffer
let multiLinePdf: ArrayBuffer

beforeAll(async () => {
  // Same trick as liteparse.test.ts: init the wasm sync with local bytes
  // for Node. The dynamic import inside pdfToDocx reuses the cached
  // parser from liteparse.ts.
  const wasmBytes = readFileSync(
    join(process.cwd(), 'node_modules/@llamaindex/liteparse-wasm/pkg/liteparse_wasm_bg.wasm'),
  )
  initSync({ module: wasmBytes })

  const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
  const imageOnly = readFileSync(join(TEST_DIR, 'image-only.pdf'))
  const table = readFileSync(join(TEST_DIR, 'table-pdf.pdf'))
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  imageOnlyPdf = imageOnly.buffer.slice(imageOnly.byteOffset, imageOnly.byteOffset + imageOnly.byteLength)
  tablePdf = table.buffer.slice(table.byteOffset, table.byteOffset + table.byteLength)

  // Build a 2-col table whose right cell wraps to 3 visual lines. Generated
  // at test time (not a checked-in fixture) so it doesn't depend on any
  // local asset — `PDF_Word/` is gitignored and the existing test-files/
  // fixtures don't have multi-line cells. y values are chosen so that
  // each wrapped right-cell line sits within SINGLE_COL_TABLE_GAP (20) of
  // the nearest multi-col row, so the v6 classifier keeps them all in the
  // same Table element.
  const doc = await PDFDocument.create()
  const page = doc.addPage([612, 792]) // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const draw = (text: string, x: number, y: number) => {
    page.drawText(text, { x, y, font, size: 12 })
  }
  // Header row at y=750.
  draw('Teacher', 80, 750)
  draw('Student', 300, 750)
  // Row 1 at y=710: both cells single-line.
  draw('1. Play audio', 80, 710)
  draw('1. Listen', 300, 710)
  // Row 1 line 2 at y=694: both cells continue. (16y gap < 20 SINGLE_COL_TABLE_GAP)
  draw('description', 80, 694)
  draw('to audio', 300, 694)
  // Row 1 line 3 at y=678: only the right cell has a 3rd line. (16y gap to
  // the y=694 multi-col row, so the v6 classifier keeps this in the table.)
  draw('end of line', 300, 678)
  const bytes = await doc.save()
  multiLinePdf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
})

/**
 * Extract the cell text matrix from a generated .docx (zip → word/document.xml).
 * Returns rows of cells, where each cell is the joined text of all `<w:t>` runs
 * inside its `<w:tc>`. Lightweight regex parser — no DOM dep needed in Node.
 */
async function docxCells(bytes: Uint8Array): Promise<string[][]> {
  const zip = await JSZip.loadAsync(bytes)
  const xml = await zip.file('word/document.xml')!.async('string')
  const rows: string[][] = []
  for (const tr of xml.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)) {
    const cells: string[] = []
    const trBody = tr[1] ?? ''
    for (const tc of trBody.matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)) {
      const tcBody = tc[1] ?? ''
      const text = [...tcBody.matchAll(/<w:t(?:\b[^>]*)?>([^<]*)<\/w:t>/g)]
        .map(m => m[1] ?? '')
        .join('')
      cells.push(text)
    }
    rows.push(cells)
  }
  return rows
}

describe('pdfToDocx', () => {
  it('produces a valid .docx (PK\\x03\\x04 magic) for a text PDF', async () => {
    const { bytes, totalPages, charCount } = await pdfToDocx(textPdf)
    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(totalPages).toBe(1)
    expect(charCount).toBeGreaterThan(0)
    // .docx is a zip — must start with PK magic
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4B)
    expect(bytes[2]).toBe(0x03)
    expect(bytes[3]).toBe(0x04)
  })

  it('fires the progress callback for every page', async () => {
    const calls: Array<{ page: number; total: number }> = []
    await pdfToDocx(textPdf, (page, total) => {
      calls.push({ page, total })
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ page: 1, total: 1 })
  })

  it('throws EMPTY_PDF for an image-only PDF', async () => {
    await expect(pdfToDocx(imageOnlyPdf)).rejects.toThrow('EMPTY_PDF')
  })

  it('emits at least one table for the mixed text+table fixture', async () => {
    const mixed = readFileSync(join(TEST_DIR, 'mixed-pdf.pdf'))
    const ab = mixed.buffer.slice(mixed.byteOffset, mixed.byteOffset + mixed.byteLength)
    const { bytes, tableCount, charCount } = await pdfToDocx(ab)
    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(tableCount).toBeGreaterThanOrEqual(2)  // fixture has 2 tables
    expect(charCount).toBeGreaterThan(0)
  })

  // Regression: cell text must be in the right (left-to-right, top-to-bottom)
  // order inside the generated .docx table. The fixture is a simple 4×3
  // table (Name/Age/City header + 3 data rows) with one textItem per cell.
  it('preserves cell text order in a multi-row table', async () => {
    const { bytes } = await pdfToDocx(tablePdf)
    const cells = await docxCells(bytes)
    // Find the first 4×3 contiguous block of rows.
    const target = cells.filter(r => r.length === 3)
    expect(target).toEqual([
      ['Name', 'Age', 'City'],
      ['Alice', '30', 'Beijing'],
      ['Bob', '25', 'Shanghai'],
      ['Charlie', '35', 'Guangzhou'],
    ])
  })

  // Regression: a 2-col table whose right cell wraps to 3 visual lines must
  // keep all wrapped fragments in the same `Table` element. Built with
  // pdf-lib in beforeAll so the fixture isn't a checked-in asset (the
  // `PDF_Word/` real-world PDF is gitignored; the existing test-files/
  // fixtures don't have multi-line cells).
  //
  // Source-PDF layout (y in PDF coords, decreasing downward):
  //   y=750  Teacher          Student          (header, both cols)
  //   y=710  1. Play audio    1. Listen        (row 1 line 1, both cols)
  //   y=694  description      to audio         (row 1 line 2, both cols)
  //   y=678                   end of line      (row 1 line 3, only right col)
  //
  // The v6 classifier (≥ 1 col hit → table, single-col row stays in the
  // table if a multi-col row is within 20y) should keep the y=678 single-
  // col row inside the same Table as the y=694/710/750 multi-col rows.
  it('keeps multi-line cell rows in the same Table element (not fragmented)', async () => {
    const { bytes, tableCount } = await pdfToDocx(multiLinePdf)
    expect(bytes.byteLength).toBeGreaterThan(0)
    // All 4 rows classify as 'table' (the single-col y=678 row is within
    // 16y of the y=694 multi-col row) and coalesce into one Table element.
    expect(tableCount).toBe(1)

    const cells = await docxCells(bytes)
    // Locate the table by its 'Teacher' / 'Student' header.
    const headerIdx = cells.findIndex(
      r => r.length === 2 && r[0] === 'Teacher' && r[1] === 'Student',
    )
    expect(headerIdx).toBeGreaterThanOrEqual(0)

    // The 3 rows right after the header are the wrapped row-1 block:
    // row 0 = line 1 (both cols), row 1 = line 2 (both cols),
    // row 2 = line 3 (only right col, left empty).
    const row1Block = cells.slice(headerIdx + 1, headerIdx + 5)

    // The "1. Play audio" left cell must appear in one of the row-1 rows.
    const playRow = row1Block.find(r => r[0] === '1. Play audio')
    expect(playRow).toBeDefined()
    expect(playRow?.[1]).toBe('1. Listen')

    // A row with empty left cell and "end of line" as the right cell must
    // exist — this is the key assertion: the right cell's 3rd line stayed
    // in the same Table instead of being fragmented out as a paragraph.
    const endOfLineRow = row1Block.find(r => r[0] === '' && r[1] === 'end of line')
    expect(endOfLineRow).toBeDefined()
  })
})
