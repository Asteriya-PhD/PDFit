/**
 * LiteParse (WASM) wrapper — local-browser PDF → Markdown extraction.
 *
 * Replaces the previous pdfjs-based `pdfToMarkdown` and the MinerU cloud
 * upload path. LiteParse runs entirely in the browser via WASM; no
 * network calls, no API keys, no third-party servers.
 *
 * The wasm bundle (~4MB unpacked) is loaded on first call via dynamic
 * import so the main chunk stays small. Vite code-splits the import.
 */

interface LiteParser {
  parse(data: Uint8Array): Promise<ParseResult>
  free(): void
}

interface TextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontName?: string
  fontSize?: number
}

interface PageResult {
  pageNum: number
  width: number
  height: number
  text: string
  textItems: TextItem[]
}

interface ParseResult {
  text: string
  pages: PageResult[]
}

let parserPromise: Promise<LiteParser> | null = null

async function initWasm(mod: typeof import('@llamaindex/liteparse-wasm')): Promise<void> {
  // The default `init` uses fetch() to load the .wasm file via the
  // package's exports. In the browser that resolves to a /assets/ URL;
  // in Node (vitest) fetch exists but the bare specifier doesn't resolve.
  // Detect Node and fall back to initSync with the local wasm bytes.
  if (typeof window === 'undefined') {
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { dirname, join } = await import('node:path')
    // The wasm lives next to the JS module on disk.
    const here = dirname(fileURLToPath(import.meta.url))
    const wasmPath = join(here, '../../node_modules/@llamaindex/liteparse-wasm/pkg/liteparse_wasm_bg.wasm')
    const wasmBytes = readFileSync(wasmPath)
    mod.initSync({ module: wasmBytes })
  } else {
    await mod.default()
  }
}

async function getParser(): Promise<LiteParser> {
  if (!parserPromise) {
    parserPromise = (async () => {
      const mod = await import('@llamaindex/liteparse-wasm')
      await initWasm(mod)
      return new mod.LiteParse({ ocrEnabled: false, outputFormat: 'json', quiet: true })
    })()
  }
  return parserPromise
}

/**
 * Parse a PDF and return Markdown-ish text. LiteParse returns plain text
 * (with newlines preserved per its own layout heuristics); we just pass
 * it through — the existing tool already lets the user switch between
 * Markdown and plain-text views.
 */
export async function parseToMarkdown(
  arrayBuffer: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<{ markdown: string; totalPages: number }> {
  const parser = await getParser()
  const bytes = new Uint8Array(arrayBuffer.slice(0))
  const result: ParseResult = await parser.parse(bytes)
  const total = result.pages?.length ?? 0
  for (let i = 0; i < total; i++) onProgress?.(i + 1, total)
  return {
    markdown: result.text ?? '',
    totalPages: total,
  }
}

/**
 * Cheap pre-check: any extractable text at all? Used by PdfToMdTool to
 * distinguish "scanned PDF, nothing to extract" from "we have a result
 * but it's short". The empty-text branch is no longer a comment marker
 * — LiteParse just returns an empty string.
 */
export async function hasTextContent(arrayBuffer: ArrayBuffer): Promise<boolean> {
  const parser = await getParser()
  const bytes = new Uint8Array(arrayBuffer.slice(0))
  const result: ParseResult = await parser.parse(bytes)
  return Boolean(result.text && result.text.trim().length > 0)
}
