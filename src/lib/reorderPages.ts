import { PDFDocument } from 'pdf-lib'

export async function reorderPages(
  sourceBuffer: ArrayBuffer,
  newOrder: number[]
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(sourceBuffer, { ignoreEncryption: true })
  const newDoc = await PDFDocument.create()
  const pages = await newDoc.copyPages(srcDoc, newOrder)
  for (const page of pages) newDoc.addPage(page)
  return newDoc.save()
}
