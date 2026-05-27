import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PageNumberingOptions } from '@/types'

const DEFAULT_OPTIONS: PageNumberingOptions = {
  startNumber: 1,
  position: 'bottom-center',
  fontSize: 12,
  color: '#000000',
  prefix: '',
  suffix: '',
  showTotalPages: false,
}

/**
 * Parse a hex color string into pdf-lib RGB components.
 * Accepts #RRGGBB or shorthand #RGB.
 */
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

/**
 * Compute x coordinate based on position, text width, and page width.
 */
function positionX(
  position: PageNumberingOptions['position'],
  textWidth: number,
  pageWidth: number,
  margin: number,
): number {
  switch (position) {
    case 'bottom-left':
    case 'top-left':
      return margin
    case 'bottom-center':
    case 'top-center':
      return (pageWidth - textWidth) / 2
    case 'bottom-right':
    case 'top-right':
      return pageWidth - margin - textWidth
  }
}

/**
 * Compute y coordinate based on position, page height, and font size.
 */
function positionY(
  position: PageNumberingOptions['position'],
  pageHeight: number,
  fontSize: number,
  margin: number,
): number {
  switch (position) {
    case 'bottom-left':
    case 'bottom-center':
    case 'bottom-right':
      return margin
    case 'top-left':
    case 'top-center':
    case 'top-right':
      return pageHeight - margin - fontSize
  }
}

/**
 * Add page numbers to a PDF document.
 *
 * @param buffer - The source PDF as ArrayBuffer
 * @param options - Page numbering configuration
 * @returns The modified PDF as Uint8Array
 */
export async function addPageNumbers(
  buffer: ArrayBuffer,
  options: Partial<PageNumberingOptions> = {},
): Promise<Uint8Array> {
  const opts: PageNumberingOptions = { ...DEFAULT_OPTIONS, ...options }
  const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const pages = pdf.getPages()
  const totalPages = pages.length
  const margin = 40 // points from edge

  const color = hexToRgb(opts.color)

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i]!
    const { width: pageWidth, height: pageHeight } = page.getSize()
    const pageNumber = opts.startNumber + i

    let text: string
    if (opts.showTotalPages) {
      text = `${opts.prefix}${pageNumber} / ${totalPages}${opts.suffix}`
    } else {
      text = `${opts.prefix}${pageNumber}${opts.suffix}`
    }

    const textWidth = font.widthOfTextAtSize(text, opts.fontSize)
    const x = positionX(opts.position, textWidth, pageWidth, margin)
    const y = positionY(opts.position, pageHeight, opts.fontSize, margin)

    page.drawText(text, {
      x,
      y,
      size: opts.fontSize,
      font,
      color,
    })
  }

  return pdf.save()
}
