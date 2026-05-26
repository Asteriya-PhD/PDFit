import '@/lib/pdfWorker'
import { getDocument } from 'pdfjs-dist'

export interface PdfToImageOptions {
  dpi: number
  format: 'png' | 'jpeg'
  quality?: number
}

export interface PageImageResult {
  blob: Blob
  pageIndex: number
  width: number
  height: number
}

/**
 * Render a single PDF page to an image blob at the specified DPI.
 */
export async function renderPageToImage(
  arrayBuffer: ArrayBuffer,
  pageIndex: number,
  options: PdfToImageOptions
): Promise<PageImageResult> {
  const { dpi, format, quality = 0.92 } = options

  const pdf = await getDocument({ data: arrayBuffer.slice(0) }).promise
  const page = await pdf.getPage(pageIndex + 1)

  const rotation = page.rotate
  const scale = dpi / 72
  const viewport = page.getViewport({ scale, rotation })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  await page.render({ canvasContext: ctx, viewport }).promise

  const blob = await new Promise<Blob>((resolve, reject) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error('Canvas toBlob returned null'))),
      mimeType,
      format === 'jpeg' ? quality : undefined
    )
  })

  return { blob, pageIndex, width: canvas.width, height: canvas.height }
}

/**
 * Render multiple PDF pages to image blobs.
 */
export async function renderPagesToImages(
  arrayBuffer: ArrayBuffer,
  pageIndices: number[],
  options: PdfToImageOptions,
  onProgress?: (done: number, total: number) => void
): Promise<PageImageResult[]> {
  const results: PageImageResult[] = []
  for (let i = 0; i < pageIndices.length; i++) {
    const pageIndex = pageIndices[i]
    if (pageIndex === undefined) continue
    const result = await renderPageToImage(arrayBuffer, pageIndex, options)
    results.push(result)
    onProgress?.(i + 1, pageIndices.length)
  }
  return results
}

/**
 * Get the file extension for the given format.
 */
export function imageExtension(format: 'png' | 'jpeg'): string {
  return format === 'jpeg' ? 'jpg' : 'png'
}
