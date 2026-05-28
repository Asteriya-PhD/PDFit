import '@/lib/pdfWorker'
import { getDocument } from 'pdfjs-dist'

interface TextLine {
  y: number
  items: { text: string; fontSize: number; x: number }[]
}

interface TextItem {
  str: string
  dir: string
  transform: number[]
  width: number
  height: number
  fontName: string
  hasEOL: boolean
}

interface TextMarkedContent {
  type: string
}

const BULLET_CHARS = new Set(['•', '●', '◦', '▪', '▸', '▹', '-', '*', '→', '➢'])

/**
 * Extract text content from a PDF and format as Markdown.
 * Returns the markdown string, or null if no extractable text found.
 */
export async function pdfToMarkdown(
  arrayBuffer: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<{ markdown: string; totalPages: number }> {
  const pdf = await getDocument({ data: arrayBuffer.slice(0) }).promise
  const totalPages = pdf.numPages
  const parts: string[] = []

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.(i, totalPages)
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()

    if (textContent.items.length === 0) {
      parts.push(`\n\n<!-- Page ${i}: no extractable text -->\n\n`)
      continue
    }

    const md = processPage(textContent)
    if (md.trim()) {
      parts.push(md)
    } else {
      parts.push(`\n\n<!-- Page ${i}: no extractable text -->\n\n`)
    }
  }

  const markdown = parts.join('\n\n').trim()

  return { markdown, totalPages }
}

function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
  return 'str' in item
}

function processPage(textContent: { items: Array<TextItem | TextMarkedContent> }): string {
  const rawItems: { text: string; x: number; y: number; fontSize: number }[] = []

  for (const item of textContent.items) {
    if (!isTextItem(item)) continue
    const str = item.str
    if (!str || !str.trim()) continue

    const x = item.transform[4] ?? 0
    const y = item.transform[5] ?? 0

    const fontSize = Math.abs(item.transform[0] ?? 0) + Math.abs(item.transform[3] ?? 0) / 2 || 12

    rawItems.push({ text: str, x, y, fontSize })
  }

  if (rawItems.length === 0) return ''

  // Group into lines by y-position (within 5px tolerance)
  const sorted = [...rawItems].sort((a, b) => b.y - a.y) // top-to-bottom by pdfjs y (bottom-origin)

  const lines: TextLine[] = []
  let currentLine: TextLine | null = null

  for (const item of sorted) {
    if (!currentLine || Math.abs(item.y - currentLine.y) > 5) {
      currentLine = { y: item.y, items: [] }
      lines.push(currentLine)
    }
    currentLine.items.push({ text: item.text, fontSize: item.fontSize, x: item.x })
  }

  // Sort items within each line left-to-right
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x)
  }

  // Compute body font size (median of all font sizes)
  const allSizes = rawItems.map(i => i.fontSize).sort((a, b) => a - b)
  const bodySize = allSizes[Math.floor(allSizes.length / 2)] ?? 12

  // Build markdown lines
  const mdLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const lineText = line.items.map(item => item.text).join(' ').trim()
    if (!lineText) continue

    // Detect heading level based on font size
    const maxFont = Math.max(...line.items.map(item => item.fontSize))
    const ratio = maxFont / bodySize

    let prefix = ''

    if (ratio >= 2.5) {
      prefix = '# '
    } else if (ratio >= 1.8) {
      prefix = '## '
    } else if (ratio >= 1.3) {
      prefix = '### '
    } else {
      // Check for list item
      const firstWord = lineText.trimStart().charAt(0)
      if (BULLET_CHARS.has(firstWord)) {
        prefix = '- '
      } else if (/^\d+[\.\)]\s/.test(lineText)) {
        // Numbered list — preserve as-is
      }
    }

    // Paragraph break detection: if gap to previous line > 1.5x body
    if (i > 0) {
      const prevLine = lines[i - 1]
      if (!prevLine) continue
      const gap = Math.abs(prevLine.y - line.y)
      if (gap > bodySize * 1.8) {
        mdLines.push('')
      }
    }

    const content = prefix + lineText

    // Trim heading-specific whitespace
    mdLines.push(prefix ? content : lineText)
  }

  return mdLines.join('\n')
}

/**
 * Check if a PDF likely contains extractable text.
 * Scanned PDFs will have zero text items per page.
 */
export async function hasTextContent(arrayBuffer: ArrayBuffer): Promise<boolean> {
  const pdf = await getDocument({ data: arrayBuffer.slice(0) }).promise
  const page = await pdf.getPage(1)
  const textContent = await page.getTextContent()
  return textContent.items.some(item => isTextItem(item) && item.str.trim().length > 0)
}
