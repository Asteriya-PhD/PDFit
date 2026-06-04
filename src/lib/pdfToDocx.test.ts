import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initSync } from '@llamaindex/liteparse-wasm'
import { pdfToDocx } from './pdfToDocx'

const TEST_DIR = join(process.cwd(), 'test-files')
let textPdf: ArrayBuffer
let imageOnlyPdf: ArrayBuffer

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
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  imageOnlyPdf = imageOnly.buffer.slice(imageOnly.byteOffset, imageOnly.byteOffset + imageOnly.byteLength)
})

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
})
