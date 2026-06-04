import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initSync } from '@llamaindex/liteparse-wasm'
import { pdfToXlsx, NoTableError } from './pdfToXlsx'

const TEST_DIR = join(process.cwd(), 'test-files')
let tablePdf: ArrayBuffer
let textPdf: ArrayBuffer
let imageOnlyPdf: ArrayBuffer

beforeAll(() => {
  const wasmBytes = readFileSync(
    join(process.cwd(), 'node_modules/@llamaindex/liteparse-wasm/pkg/liteparse_wasm_bg.wasm'),
  )
  initSync({ module: wasmBytes })

  const table = readFileSync(join(TEST_DIR, 'table-pdf.pdf'))
  const text = readFileSync(join(TEST_DIR, 'text-pdf.pdf'))
  const imageOnly = readFileSync(join(TEST_DIR, 'image-only.pdf'))
  tablePdf = table.buffer.slice(table.byteOffset, table.byteOffset + table.byteLength)
  textPdf = text.buffer.slice(text.byteOffset, text.byteOffset + text.byteLength)
  imageOnlyPdf = imageOnly.buffer.slice(imageOnly.byteOffset, imageOnly.byteOffset + imageOnly.byteLength)
})

describe('pdfToXlsx', () => {
  it('produces a valid .xlsx (PK\\x03\\x04 magic) for a table PDF', async () => {
    const { bytes, totalPages, tablePages, cellCount } = await pdfToXlsx(tablePdf)
    expect(bytes.byteLength).toBeGreaterThan(0)
    expect(totalPages).toBe(1)
    expect(tablePages).toBe(1)
    expect(cellCount).toBeGreaterThanOrEqual(12) // 4 rows × 3 cols = 12
    // .xlsx is a zip — must start with PK magic
    expect(bytes[0]).toBe(0x50)
    expect(bytes[1]).toBe(0x4B)
    expect(bytes[2]).toBe(0x03)
    expect(bytes[3]).toBe(0x04)
  })

  it('throws NoTableError for a non-tabular PDF (paragraphs only)', async () => {
    await expect(pdfToXlsx(textPdf)).rejects.toBeInstanceOf(NoTableError)
  })

  it('throws EMPTY_PDF (plain Error) for an image-only PDF', async () => {
    await expect(pdfToXlsx(imageOnlyPdf)).rejects.toThrow('EMPTY_PDF')
  })
})
