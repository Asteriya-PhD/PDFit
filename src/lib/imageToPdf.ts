import { PDFDocument } from 'pdf-lib'

export type PageSize = 'auto' | 'a4' | 'letter'

const PAGE_SIZES: Record<'a4' | 'letter', { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
}

export interface ImageToPdfOptions {
  pageSize: PageSize
  margin: number // points
}

export interface ImageInput {
  id: string
  file: File
  dataUrl: string // for preview
  arrayBuffer: ArrayBuffer
}

/**
 * Convert one or more images into a single PDF.
 * Supports PNG and JPEG images via pdf-lib's embedPng / embedJpg.
 */
export async function imagesToPdf(
  images: ImageInput[],
  options: ImageToPdfOptions
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const { pageSize, margin } = options

  for (const img of images) {
    const ext = img.file.type
    // Use ternary so TypeScript infers the full pdf-lib image type
    const embed = ext === 'image/png'
      ? await pdf.embedPng(img.arrayBuffer)
      : ext === 'image/jpeg' || ext === 'image/jpg'
        ? await pdf.embedJpg(img.arrayBuffer)
        : await pdf.embedPng(await webpToPngBuffer(img.file))

    const imgW = embed.width
    const imgH = embed.height

    if (pageSize === 'auto') {
      // Page at image dimensions + margins
      const pw = imgW + margin * 2
      const ph = imgH + margin * 2
      const page = pdf.addPage([pw, ph])
      page.drawImage(embed, { x: margin, y: margin, width: imgW, height: imgH })
    } else {
      // Fixed page size — center image, scale to fit
      const size = PAGE_SIZES[pageSize]
      const pw = size.width
      const ph = size.height
      const maxW = pw - margin * 2
      const maxH = ph - margin * 2
      const scale = Math.min(maxW / imgW, maxH / imgH)
      const drawW = imgW * scale
      const drawH = imgH * scale
      const x = (pw - drawW) / 2
      const y = (ph - drawH) / 2
      const page = pdf.addPage([pw, ph])
      page.drawImage(embed, { x, y, width: drawW, height: drawH })
    }
  }

  return pdf.save()
}

/**
 * Convert a WebP file to PNG ArrayBuffer via canvas.
 */
async function webpToPngBuffer(file: File): Promise<ArrayBuffer> {
  const img = await loadImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Canvas conversion failed'))), 'image/png')
  })
  return blob.arrayBuffer()
}

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file)
}
