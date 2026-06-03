import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { imagesToPdf, type ImageInput } from './imageToPdf'

const TEST_DIR = join(process.cwd(), 'test-files')

let png1: { bytes: Uint8Array; name: string }
let jpg1: { bytes: Uint8Array; name: string }

beforeAll(() => {
  png1 = {
    bytes: readFileSync(join(TEST_DIR, 'test1.png')),
    name: 'test1.png',
  }
  jpg1 = {
    bytes: readFileSync(join(TEST_DIR, 'test3.jpg')),
    name: 'test3.jpg',
  }
})

function toImageInput(file: { bytes: Uint8Array; name: string }, id: string, type: string): ImageInput {
  const buf = file.bytes.buffer.slice(file.bytes.byteOffset, file.bytes.byteOffset + file.bytes.byteLength)
  // The lib only uses `file.type` to dispatch embedPng vs embedJpg, and
  // `arrayBuffer` for the actual bytes. dataUrl is for the UI preview.
  return {
    id,
    file: new File([file.bytes], file.name, { type }),
    dataUrl: '',
    arrayBuffer: buf,
  }
}

async function pageCount(bytes: Uint8Array): Promise<number> {
  const doc = await PDFDocument.load(bytes)
  return doc.getPageCount()
}

async function pageDims(bytes: Uint8Array, pageIndex: number): Promise<{ width: number; height: number }> {
  const doc = await PDFDocument.load(bytes)
  const page = doc.getPage(pageIndex)
  const { width, height } = page.getSize()
  return { width, height }
}

describe('imagesToPdf', () => {
  it('embeds a single PNG into a 1-page PDF', async () => {
    const out = await imagesToPdf([toImageInput(png1, 'a', 'image/png')], {
      pageSize: 'auto',
      margin: 0,
    })
    expect(await pageCount(out)).toBe(1)
  })

  it('embeds a single JPG into a 1-page PDF', async () => {
    const out = await imagesToPdf([toImageInput(jpg1, 'a', 'image/jpeg')], {
      pageSize: 'auto',
      margin: 0,
    })
    expect(await pageCount(out)).toBe(1)
  })

  it('produces one page per image when given multiple', async () => {
    const out = await imagesToPdf(
      [
        toImageInput(png1, 'a', 'image/png'),
        toImageInput(jpg1, 'b', 'image/jpeg'),
      ],
      { pageSize: 'auto', margin: 0 },
    )
    expect(await pageCount(out)).toBe(2)
  })

  it('uses fixed A4 page size when pageSize="a4"', async () => {
    const out = await imagesToPdf([toImageInput(png1, 'a', 'image/png')], {
      pageSize: 'a4',
      margin: 20,
    })
    const { width, height } = await pageDims(out, 0)
    // A4: 595.28 x 841.89
    expect(width).toBeCloseTo(595.28, 1)
    expect(height).toBeCloseTo(841.89, 1)
  })

  it('uses fixed Letter page size when pageSize="letter"', async () => {
    const out = await imagesToPdf([toImageInput(png1, 'a', 'image/png')], {
      pageSize: 'letter',
      margin: 0,
    })
    const { width, height } = await pageDims(out, 0)
    // Letter: 612 x 792
    expect(width).toBe(612)
    expect(height).toBe(792)
  })

  it('auto page size matches image dimensions when margin=0', async () => {
    const out = await imagesToPdf([toImageInput(png1, 'a', 'image/png')], {
      pageSize: 'auto',
      margin: 0,
    })
    const { width, height } = await pageDims(out, 0)
    expect(width).toBeGreaterThan(0)
    expect(height).toBeGreaterThan(0)
  })
})
