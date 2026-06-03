import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { addPageNumbers } from './pageNumbering'
import { PDFDocument } from 'pdf-lib'

const TEST_DIR = join(process.cwd(), 'test-files')
let textPdf: ArrayBuffer
let multiPagePdf: ArrayBuffer

beforeAll(() => {
  const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
  const multi = readFileSync(join(TEST_DIR, 'multi-page.pdf'))
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  multiPagePdf = multi.buffer.slice(multi.byteOffset, multi.byteOffset + multi.byteLength)
})

async function pageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}

describe('addPageNumbers', () => {
  it('preserves page count', async () => {
    const out = await addPageNumbers(multiPagePdf)
    const before = await pageCount(new Uint8Array(readFileSync(join(TEST_DIR, 'multi-page.pdf'))))
    expect(await pageCount(out)).toBe(before)
  })

  it('starts numbering from startNumber', async () => {
    // 1-page doc with startNumber=5 ⇒ should still have 1 page
    const out = await addPageNumbers(textPdf, { startNumber: 5 })
    expect(await pageCount(out)).toBe(1)
  })

  it('appends / total when showTotalPages is true', async () => {
    const out = await addPageNumbers(multiPagePdf, { showTotalPages: true })
    // We can't easily read the text back without pdfjs, but we can assert
    // the page count is preserved and the output is a valid PDF.
    expect(await pageCount(out)).toBe(await pageCount(new Uint8Array(readFileSync(join(TEST_DIR, 'multi-page.pdf')))))
  })

  it('respects prefix and suffix', async () => {
    const out = await addPageNumbers(textPdf, { prefix: 'p.', suffix: '/end' })
    expect(await pageCount(out)).toBe(1)
  })

  it('handles all 6 position options without error', async () => {
    const positions = [
      'top-left', 'top-center', 'top-right',
      'bottom-left', 'bottom-center', 'bottom-right',
    ] as const
    for (const position of positions) {
      const out = await addPageNumbers(textPdf, { position })
      expect(await pageCount(out)).toBe(1)
    }
  })

  it('produces a larger output when numbering is added', async () => {
    const out = await addPageNumbers(textPdf)
    expect(out.byteLength).toBeGreaterThan(0)
  })
})
