import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initSync } from '@llamaindex/liteparse-wasm'
import { parseToMarkdown, hasTextContent } from './liteparse'

const TEST_DIR = join(process.cwd(), 'test-files')
let textPdf: ArrayBuffer
let imageOnlyPdf: ArrayBuffer

beforeAll(() => {
  const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
  const imageOnly = readFileSync(join(TEST_DIR, 'image-only.pdf'))
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  imageOnlyPdf = imageOnly.buffer.slice(imageOnly.byteOffset, imageOnly.byteOffset + imageOnly.byteLength)
})

describe('parseToMarkdown', () => {
  it('extracts non-empty markdown from a text-based PDF', async () => {
    const { markdown, totalPages } = await parseToMarkdown(textPdf)
    expect(totalPages).toBeGreaterThan(0)
    expect(markdown.length).toBeGreaterThan(0)
  })

  it('reports correct total page count', async () => {
    const { totalPages } = await parseToMarkdown(textPdf)
    expect(totalPages).toBe(1)
  })

  it('fires the progress callback for every page', async () => {
    const calls: Array<{ page: number; total: number }> = []
    await parseToMarkdown(textPdf, (page, total) => {
      calls.push({ page, total })
    })
    expect(calls).toHaveLength(1)
    expect(calls[0]).toEqual({ page: 1, total: 1 })
  })

  it('returns empty markdown for an image-only (scanned) PDF', async () => {
    const { markdown, totalPages } = await parseToMarkdown(imageOnlyPdf)
    expect(totalPages).toBeGreaterThan(0)
    // Without OCR enabled, an image-only PDF yields an empty text string.
    // The empty-state check in PdfToMdTool uses this signal.
    expect(markdown.length).toBe(0)
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
