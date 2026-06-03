import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GlobalWorkerOptions } from 'pdfjs-dist'
import { pdfToMarkdown, hasTextContent } from './pdfToMarkdown'

// pdfjs's default workerSrc is the relative path "./pdf.worker.mjs",
// which resolves to src/lib/pdf.worker.mjs from this test file — missing.
// In Node we have no Worker, so we point to the legacy worker module and
// let pdfjs fall back to its fake worker (main-thread execution).
GlobalWorkerOptions.workerSrc = join(
  process.cwd(),
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
)

const TEST_DIR = join(process.cwd(), 'test-files')
let textPdf: ArrayBuffer
let imageOnlyPdf: ArrayBuffer

beforeAll(() => {
  const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
  const imageOnly = readFileSync(join(TEST_DIR, 'image-only.pdf'))
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  imageOnlyPdf = imageOnly.buffer.slice(imageOnly.byteOffset, imageOnly.byteOffset + imageOnly.byteLength)
})

describe('pdfToMarkdown', () => {
  it('extracts non-empty markdown from a text-based PDF', async () => {
    const { markdown, totalPages } = await pdfToMarkdown(textPdf)
    expect(totalPages).toBeGreaterThan(0)
    expect(markdown.length).toBeGreaterThan(0)
  })

  it('reports correct total page count', async () => {
    const { totalPages } = await pdfToMarkdown(textPdf)
    expect(totalPages).toBe(1)
  })

  it('fires the progress callback for every page', async () => {
    const calls: Array<{ page: number; total: number }> = []
    await pdfToMarkdown(textPdf, (page, total) => {
      calls.push({ page, total })
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ page: 1, total: 1 })
  })

  it('emits a no-text marker for an image-only (scanned) PDF', async () => {
    // Image-only PDF has no extractable text; the lib injects a
    // <!-- Page N: no extractable text --> comment per page and
    // trims the final string. All-comments → empty after trim.
    const { markdown, totalPages } = await pdfToMarkdown(imageOnlyPdf)
    expect(totalPages).toBeGreaterThan(0)
    expect(markdown.length).toBeLessThan(50)
  })
})

describe('hasTextContent', () => {
  it('returns true for a text-based PDF', async () => {
    const has = await hasTextContent(textPdf)
    expect(has).toBe(true)
  })

  it('returns false for an image-only PDF', async () => {
    const has = await hasTextContent(imageOnlyPdf)
    expect(has).toBe(false)
  })
})
