/**
 * PDF → DOCX (Word) — local-browser conversion.
 *
 * Pipeline: LiteParse parses PDF → text → `docx` npm package writes .docx.
 * Both run in the browser; no upload, no API key. See [[pdf-to-docx-poc-2026-06-04]].
 *
 * Known limitations (acceptable for "老师改 Word" use case):
 * - No table extraction — LiteParse doesn't detect table structure.
 * - No embedded image extraction — would need explicit screenshot mode.
 * - No original font / styling preservation — Markdown is the lossy intermediate.
 *
 * The wrapper is lazy-loaded; LiteParse and `docx` are dynamic imports
 * code-split by Vite.
 */

import { parseToMarkdown } from './liteparse'
import type { Paragraph as ParagraphType } from 'docx'

interface DocxResult {
  bytes: Uint8Array
  totalPages: number
  charCount: number
}

const HEADING_RE = /^(Heading\s+\d+|[A-Z][^.]*:?)$/i

/**
 * Convert a PDF's bytes into a .docx file. Returns the docx bytes plus
 * metadata (page count, char count) for the UI to display.
 */
export async function pdfToDocx(
  arrayBuffer: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<DocxResult> {
  // Reuse the cached LiteParse parser via the existing wrapper.
  const { markdown, totalPages } = await parseToMarkdown(arrayBuffer, onProgress)
  if (!markdown.trim()) {
    throw new Error('EMPTY_PDF')
  }

  // Lazy-load the `docx` package so the main bundle stays small.
  // Use toArrayBuffer (returns Promise<ArrayBuffer>) instead of toBuffer
  // (returns Node Buffer, which throws in the browser with
  // "nodebuffer is not supported by this platform").
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import('docx')

  // Split into blocks separated by blank lines; each block may have
  // multiple lines (e.g. "Heading 1: Foo\nBody text under the heading").
  const blocks = markdown.split(/\n\n+/).map(b => b.trim()).filter(Boolean)

  const children: ParagraphType[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean)
    lines.forEach((line, idx) => {
      const isFirst = idx === 0
      const isHeading = isFirst && HEADING_RE.test(line)
      children.push(
        new Paragraph({
          heading: isHeading ? HeadingLevel.HEADING_1 : undefined,
          children: [new TextRun({ text: line, bold: Boolean(isHeading) })],
        }),
      )
    })
  }

  const doc = new Document({ sections: [{ children }] })
  const docxBuffer = await Packer.toArrayBuffer(doc)
  const bytes = new Uint8Array(docxBuffer)

  return {
    bytes,
    totalPages,
    charCount: markdown.length,
  }
}
