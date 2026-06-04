import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import JSZip from 'jszip'
import { initSync } from '@llamaindex/liteparse-wasm'
import { pdfToDocx } from './pdfToDocx'

const TEST_DIR = join(process.cwd(), 'test-files')
const REAL_DIR = join(process.cwd(), 'PDF_Word')
let textPdf: ArrayBuffer
let imageOnlyPdf: ArrayBuffer
let tablePdf: ArrayBuffer
let realPdf: ArrayBuffer

beforeAll(() => {
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
  const real = readFileSync(join(REAL_DIR, '05_多普勒效应_2026-05-21.pdf'))
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  imageOnlyPdf = imageOnly.buffer.slice(imageOnly.byteOffset, imageOnly.byteOffset + imageOnly.byteLength)
  tablePdf = table.buffer.slice(table.byteOffset, table.byteOffset + table.byteLength)
  realPdf = real.buffer.slice(real.byteOffset, real.byteOffset + real.byteLength)
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

  // Regression: a 2-col table whose cells wrap to multiple visual lines
  // (the "教学过程" / teacher-activity × student-activity table on page 3
  // of the real physics fixture) must keep all wrapped fragments in the
  // same `Table` element — not split them across multiple table elements
  // or paragraph blocks. The header row (教师活动 / 学生活动) anchors the
  // detection; the next table should have ≥ 2 rows and the leftmost column
  // of one of those rows should start with "1. 播放音频".
  it('keeps multi-line cell rows in the same Table element (not fragmented)', async () => {
    const { bytes, tableCount } = await pdfToDocx(realPdf)
    expect(bytes.byteLength).toBeGreaterThan(0)
    // The 5-page real PDF has multiple tables; 教学过程 alone contributes 6
    // (环节 1:1 header + 6 data rows). Pick a low bound to stay robust if
    // the cell-wrap count shifts.
    expect(tableCount).toBeGreaterThanOrEqual(5)

    const cells = await docxCells(bytes)
    // Find the header row of 教学过程 first. The PDF's text encoding uses
    // Kangxi radicals (⽣ U+2F63) for some glyphs, so we accept either form.
    const headerIdx = cells.findIndex(
      r => r.length === 2 && r[0] === '教师活动' && /^学[⽣生]活动$/.test(r[1] ?? ''),
    )
    expect(headerIdx).toBeGreaterThanOrEqual(0)
    // The data rows of this table come right after the header (in the
    // same contiguous Table element). The first numbered teacher activity
    // ("1. 播放音频...") is at row[headerIdx+2] in the source PDF, because
    // the right cell's wrap produces a leading row[headerIdx+1] with the
    // left cell empty. Search up to 8 rows past the header so the
    // assertion stays robust if the wrap count shifts. The PDF text
    // encoding uses Kangxi radicals for many CJK glyphs, so we just check
    // for the "1. 播" prefix and the "频" character anywhere in the cell.
    const leftCellStartsWithPlay = cells
      .slice(headerIdx + 1, headerIdx + 9)
      .some(r => {
        const first = r[0]
        return first !== undefined && first.startsWith('1. 播') && first.includes('频')
      })
    expect(leftCellStartsWithPlay).toBe(true)
  })
})
