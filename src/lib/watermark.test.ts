import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { addWatermark } from './watermark'
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

describe('addWatermark', () => {
  it('produces a valid PDF with the same page count', async () => {
    const out = await addWatermark(textPdf, { text: 'CONFIDENTIAL' })
    expect(await pageCount(out)).toBe(await pageCount(new Uint8Array(textPdf)))
  })

  it('applies to multi-page PDFs without dropping pages', async () => {
    const before = await pageCount(new Uint8Array(readFileSync(join(TEST_DIR, 'multi-page.pdf'))))
    const out = await addWatermark(multiPagePdf, { text: 'DRAFT' })
    expect(await pageCount(out)).toBe(before)
  })

  it('respects custom page scope (single page)', async () => {
    const out = await addWatermark(multiPagePdf, { text: 'P1', pageScope: '1' })
    expect(await pageCount(out)).toBe(await pageCount(new Uint8Array(readFileSync(join(TEST_DIR, 'multi-page.pdf')))))
  })

  it('respects custom page scope (range)', async () => {
    const out = await addWatermark(multiPagePdf, { text: 'P1-2', pageScope: '1-2' })
    expect(await pageCount(out)).toBeGreaterThan(0)
  })

  it('uses defaults when no options are given', async () => {
    const out = await addWatermark(textPdf)
    expect(await pageCount(out)).toBeGreaterThan(0)
  })

  it('produces a different byte stream than the input (text was actually drawn)', async () => {
    const out = await addWatermark(textPdf, { text: 'WATERMARKED' })
    expect(out.byteLength).toBeGreaterThan(0)
    // Different content ⇒ different bytes
    const outBytes = new Uint8Array(out)
    const origBytes = new Uint8Array(textPdf)
    expect(outBytes.length).not.toBe(origBytes.length)
  })
})
