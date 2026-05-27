import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import type { WatermarkOptions } from '@/types'

const DEFAULT_OPTIONS: WatermarkOptions = {
  text: '',
  fontSize: 60,
  opacity: 0.2,
  rotation: -45,
  color: '#cccccc',
  pageScope: 'all',
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  let r: number, g: number, b: number
  if (clean.length === 3) {
    r = parseInt(clean[0]! + clean[0], 16)
    g = parseInt(clean[1]! + clean[1], 16)
    b = parseInt(clean[2]! + clean[2], 16)
  } else {
    r = parseInt(clean.slice(0, 2), 16)
    g = parseInt(clean.slice(2, 4), 16)
    b = parseInt(clean.slice(4, 6), 16)
  }
  return rgb(r / 255, g / 255, b / 255)
}

function parsePageScope(scope: string, totalPages: number): number[] {
  if (scope === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i)
  }
  const pages = new Set<number>()
  const parts = scope.split(',')
  for (const part of parts) {
    const trimmed = part.trim()
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/)
    if (rangeMatch) {
      const start = Math.max(1, parseInt(rangeMatch[1]!, 10))
      const end = Math.min(totalPages, parseInt(rangeMatch[2]!, 10))
      for (let i = start; i <= end; i++) pages.add(i - 1)
    } else {
      const page = parseInt(trimmed, 10)
      if (page >= 1 && page <= totalPages) pages.add(page - 1)
    }
  }
  return [...pages].sort((a, b) => a - b)
}

/**
 * Add a text watermark to a PDF document.
 *
 * @param buffer - The source PDF as ArrayBuffer
 * @param options - Watermark configuration
 * @returns The modified PDF as Uint8Array
 */
export async function addWatermark(
  buffer: ArrayBuffer,
  options: Partial<WatermarkOptions> = {},
): Promise<Uint8Array> {
  const opts: WatermarkOptions = { ...DEFAULT_OPTIONS, ...options }
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pages = pdf.getPages()
  const totalPages = pages.length
  const color = hexToRgb(opts.color)

  const targetPages = parsePageScope(opts.pageScope, totalPages)

  for (const pageIndex of targetPages) {
    const page = pages[pageIndex]!
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const textWidth = font.widthOfTextAtSize(opts.text, opts.fontSize)
    const x = (pageWidth - textWidth) / 2
    const y = pageHeight / 2 + opts.fontSize / 3

    page.drawText(opts.text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color,
      rotate: degrees(opts.rotation),
      opacity: opts.opacity,
    })
  }

  return pdf.save()
}
