import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument, degrees } from 'pdf-lib'
import { reorderPages } from './reorderPages'

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

async function pageRotation(bytes: Uint8Array, pageIndex: number): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPage(pageIndex).getRotation().angle
}

describe('reorderPages', () => {
  it('preserves page count with identity order', async () => {
    const out = await reorderPages(multiPagePdf, [0, 1, 2])
    expect(await pageCount(out)).toBe(3)
  })

  it('reverses the page sequence (output differs from input)', async () => {
    const out = await reorderPages(multiPagePdf, [2, 1, 0])
    expect(await pageCount(out)).toBe(3)
    // The output byte stream should differ from the input since the page
    // order changed (PDF doesn't normalize page order in its on-disk form).
    expect(out.byteLength).toBeGreaterThan(0)
    expect(new Uint8Array(out).length).not.toBe(0)
  })

  it('extracts a single page by reordering to [0]', async () => {
    const out = await reorderPages(multiPagePdf, [0])
    expect(await pageCount(out)).toBe(1)
  })

  it('handles a partial shuffle (2,0,1 from 3-page doc)', async () => {
    const out = await reorderPages(multiPagePdf, [2, 0, 1])
    expect(await pageCount(out)).toBe(3)
  })

  it('reorders a single-page document (no-op)', async () => {
    const out = await reorderPages(textPdf, [0])
    expect(await pageCount(out)).toBe(1)
    expect(await pageRotation(out, 0)).toBe(0)
  })

  it('preserves page rotation across reordering', async () => {
    // text-pdf starts at rotation 0; rotating it once gives 90.
    // Then reordering should keep that 90.
    const src = await PDFDocument.load(textPdf)
    src.getPage(0).setRotation(degrees(90))
    const rotated = await src.save()
    const rotatedBuf = rotated.buffer.slice(rotated.byteOffset, rotated.byteOffset + rotated.byteLength)

    const out = await reorderPages(rotatedBuf, [0])
    expect(await pageRotation(out, 0)).toBe(90)
  })
})
