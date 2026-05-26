import { PDFDocument, RotationTypes } from 'pdf-lib'
import type { PageRange, RotationAngle } from '@/types'

/**
 * Parse page spec like "1,3,5-7" into 0-based page index array
 */
export function parsePageSpec(spec: string, totalPages: number): number[] {
  const parts = spec.split(',').map(s => s.trim())
  const indices = new Set<number>()

  for (const part of parts) {
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/)
    if (rangeMatch) {
      const start = Math.max(1, parseInt(rangeMatch[1]!, 10))
      const end = Math.min(totalPages, parseInt(rangeMatch[2]!, 10))
      for (let i = start; i <= end; i++) indices.add(i - 1) // 0-based
    } else {
      const num = parseInt(part, 10)
      if (!isNaN(num) && num >= 1 && num <= totalPages) {
        indices.add(num - 1)
      }
    }
  }

  return [...indices].sort((a, b) => a - b)
}

/**
 * Format page indices back to display string
 */
export function formatPageIndices(indices: number[]): string {
  if (indices.length === 0) return ''
  const sorted = [...indices].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]!
  let end = sorted[0]!

  for (let i = 1; i <= sorted.length; i++) {
    const curr = sorted[i]
    if (curr !== undefined && curr === end + 1) {
      end = curr
    } else {
      ranges.push(start === end ? `${start + 1}` : `${start + 1}-${end + 1}`)
      if (curr !== undefined) {
        start = curr
        end = curr
      }
    }
  }

  return ranges.join(', ')
}

/**
 * Merge multiple PDFs into one document
 */
export async function mergePDFs(buffers: ArrayBuffer[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create()

  for (const buffer of buffers) {
    const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
    const pageIndices = pdf.getPageIndices()
    const pages = await merged.copyPages(pdf, pageIndices)
    for (const page of pages) merged.addPage(page)
  }

  return merged.save()
}

/**
 * Extract specific pages from a PDF into a new document
 * @param pageIndices 0-based page indices to extract
 */
export async function extractPages(
  buffer: ArrayBuffer,
  pageIndices: number[]
): Promise<Uint8Array> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const dest = await PDFDocument.create()
  const pages = await dest.copyPages(source, pageIndices)
  for (const page of pages) dest.addPage(page)
  return dest.save()
}

/**
 * Remove specific pages from a PDF, keeping the rest
 * @param pagesToDelete 0-based page indices to remove
 */
export async function deleteSelectedPages(
  buffer: ArrayBuffer,
  pagesToDelete: Set<number>
): Promise<Uint8Array> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const allIndices = source.getPageIndices()
  const keepIndices = allIndices.filter(i => !pagesToDelete.has(i))

  if (keepIndices.length === 0) {
    throw new Error('Cannot delete all pages — PDF must have at least one page')
  }

  const dest = await PDFDocument.create()
  const pages = await dest.copyPages(source, keepIndices)
  for (const page of pages) dest.addPage(page)
  return dest.save()
}

/**
 * Rotate specific pages in a PDF
 * @param pageIndices 0-based; empty = all pages
 */
export async function rotateSelectedPages(
  buffer: ArrayBuffer,
  pageIndices: number[],
  angle: RotationAngle
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const indices = pageIndices.length > 0 ? pageIndices : pdf.getPageIndices()

  for (const idx of indices) {
    const page = pdf.getPage(idx)
    const current = page.getRotation().angle
    const newAngle = ((current + angle) % 360) as 0 | 90 | 180 | 270
    page.setRotation({ angle: newAngle, type: RotationTypes.Degrees })
  }

  return pdf.save()
}

/**
 * Split PDF by page ranges — returns an array of { name, data }
 */
export async function splitPDFByRanges(
  buffer: ArrayBuffer,
  ranges: PageRange[]
): Promise<{ name: string; data: Uint8Array }[]> {
  const source = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const totalPages = source.getPageCount()

  const results: { name: string; data: Uint8Array }[] = []
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i]!
    const start = Math.max(1, range.start)
    const end = Math.min(totalPages, range.end)
    if (start > end) continue

    const indices: number[] = []
    for (let p = start; p <= end; p++) indices.push(p - 1)

    const dest = await PDFDocument.create()
    const pages = await dest.copyPages(source, indices)
    for (const page of pages) dest.addPage(page)

    const data = await dest.save()
    results.push({ name: `part_${i + 1}_p${start}-${end}.pdf`, data })
  }

  return results
}
