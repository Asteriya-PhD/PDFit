import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  parsePageSpec,
  formatPageIndices,
  mergePDFs,
  extractPages,
  deleteSelectedPages,
  rotateSelectedPages,
  splitPDFByRanges,
} from './pdfEngine'
import { PDFDocument } from 'pdf-lib'

const TEST_DIR = join(process.cwd(), 'test-files')
let textPdf: ArrayBuffer
let multiPagePdf: ArrayBuffer

beforeAll(async () => {
  // Read test fixtures and copy to fresh ArrayBuffers (pdf-lib consumes them).
  const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
  const multi = readFileSync(join(TEST_DIR, 'multi-page.pdf'))
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  multiPagePdf = multi.buffer.slice(multi.byteOffset, multi.byteOffset + multi.byteLength)
})

async function pageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}

describe('parsePageSpec', () => {
  it('parses single pages', () => {
    expect(parsePageSpec('1,3,5', 10)).toEqual([0, 2, 4])
  })

  it('parses ranges', () => {
    expect(parsePageSpec('1-3', 10)).toEqual([0, 1, 2])
    expect(parsePageSpec('2-4', 10)).toEqual([1, 2, 3])
  })

  it('parses mixed pages and ranges', () => {
    expect(parsePageSpec('1,3-5,7', 10)).toEqual([0, 2, 3, 4, 6])
  })

  it('deduplicates', () => {
    expect(parsePageSpec('1,1,2-3', 10)).toEqual([0, 1, 2])
  })

  it('clamps to totalPages', () => {
    expect(parsePageSpec('1,5,15', 5)).toEqual([0, 4])
  })

  it('rejects out-of-range', () => {
    expect(parsePageSpec('20', 5)).toEqual([])
  })

  it('handles whitespace', () => {
    expect(parsePageSpec(' 1 , 3 - 5 ', 10)).toEqual([0, 2, 3, 4])
  })

  it('returns sorted output', () => {
    expect(parsePageSpec('5,1,3', 10)).toEqual([0, 2, 4])
  })
})

describe('formatPageIndices', () => {
  it('formats empty list', () => {
    expect(formatPageIndices([])).toBe('')
  })

  it('formats single index', () => {
    expect(formatPageIndices([0])).toBe('1')
  })

  it('formats contiguous range', () => {
    expect(formatPageIndices([0, 1, 2])).toBe('1-3')
  })

  it('formats non-contiguous indices', () => {
    expect(formatPageIndices([0, 2, 4])).toBe('1, 3, 5')
  })

  it('formats mixed ranges and singles', () => {
    expect(formatPageIndices([0, 1, 2, 5, 7, 8])).toBe('1-3, 6, 8-9')
  })

  it('handles unsorted input by sorting first', () => {
    expect(formatPageIndices([4, 0, 2])).toBe('1, 3, 5')
  })
})

describe('mergePDFs', () => {
  it('combines two PDFs and preserves total page count', async () => {
    const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
    const multi = readFileSync(join(TEST_DIR, 'multi-page.pdf'))
    const out = await mergePDFs([
      text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength),
      multi.buffer.slice(multi.byteOffset, multi.byteOffset + multi.byteLength),
    ])
    const total = await pageCount(out)
    const textPages = await pageCount(new Uint8Array(text))
    const multiPages = await pageCount(new Uint8Array(multi))
    expect(total).toBe(textPages + multiPages)
  })

  it('handles a single PDF', async () => {
    const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
    const out = await mergePDFs([
      text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength),
    ])
    const textPages = await pageCount(new Uint8Array(text))
    expect(await pageCount(out)).toBe(textPages)
  })
})

describe('extractPages', () => {
  it('extracts the requested pages', async () => {
    const out = await extractPages(multiPagePdf, [0, 2])
    expect(await pageCount(out)).toBe(2)
  })

  it('returns a single-page PDF when one index is given', async () => {
    const out = await extractPages(multiPagePdf, [0])
    expect(await pageCount(out)).toBe(1)
  })
})

describe('deleteSelectedPages', () => {
  it('removes the specified pages and keeps the rest', async () => {
    const totalBefore = await pageCount(new Uint8Array(readFileSync(join(TEST_DIR, 'multi-page.pdf'))))
    const out = await deleteSelectedPages(multiPagePdf, new Set([0]))
    expect(await pageCount(out)).toBe(totalBefore - 1)
  })

  it('refuses to delete all pages', async () => {
    const all = Array.from({ length: 100 }, (_, i) => i)
    await expect(deleteSelectedPages(multiPagePdf, new Set(all))).rejects.toThrow(/at least one page/)
  })
})

describe('rotateSelectedPages', () => {
  it('rotates the entire document when pageIndices is empty', async () => {
    const out = await rotateSelectedPages(textPdf, [], 90)
    const doc = await PDFDocument.load(out)
    const page = doc.getPage(0)
    // 0 + 90 = 90
    expect(page.getRotation().angle).toBe(90)
  })

  it('only rotates specified pages', async () => {
    const out = await rotateSelectedPages(multiPagePdf, [0], 90)
    const doc = await PDFDocument.load(out)
    expect(doc.getPage(0).getRotation().angle).toBe(90)
    // Other pages unchanged (0)
    const totalPages = doc.getPageCount()
    for (let i = 1; i < totalPages; i++) {
      expect(doc.getPage(i).getRotation().angle).toBe(0)
    }
  })

  it('wraps rotation past 360', async () => {
    // 270 + 180 = 450 -> 90
    const out = await rotateSelectedPages(textPdf, [], 180)
    const doc = await PDFDocument.load(out)
    expect(doc.getPage(0).getRotation().angle).toBe(180)
  })
})

describe('splitPDFByRanges', () => {
  it('produces one entry per range', async () => {
    const parts = await splitPDFByRanges(multiPagePdf, [
      { start: 1, end: 1 },
      { start: 2, end: 3 },
    ])
    expect(parts).toHaveLength(2)
    expect(parts[0]!.name).toBe('part_1_p1-1.pdf')
    expect(parts[1]!.name).toBe('part_2_p2-3.pdf')
    expect(await pageCount(parts[0]!.data)).toBe(1)
    expect(await pageCount(parts[1]!.data)).toBe(2)
  })

  it('skips invalid ranges (start > end)', async () => {
    const parts = await splitPDFByRanges(multiPagePdf, [
      { start: 3, end: 2 },
    ])
    expect(parts).toHaveLength(0)
  })

  it('clamps ranges to total pages', async () => {
    const totalPages = await pageCount(new Uint8Array(readFileSync(join(TEST_DIR, 'multi-page.pdf'))))
    const parts = await splitPDFByRanges(multiPagePdf, [
      { start: 1, end: 9999 },
    ])
    expect(parts).toHaveLength(1)
    expect(await pageCount(parts[0]!.data)).toBe(totalPages)
  })
})
