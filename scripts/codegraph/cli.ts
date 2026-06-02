// Query CLI for the codegraph index.
//
// Usage:
//   npm run graph:query <term>                       # fuzzy find symbol by name
//   npm run graph:query -- --importers <file>        # who imports this file
//   npm run graph:query -- --exports <file>          # list a file's exports
//   npm run graph:query -- --kind <kind>             # filter symbol search by kind
//   npm run graph:query -- --json                    # machine-readable output

import { existsSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CodeGraph, FileNode, SymbolNode } from './types.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const INDEX_FILE = join(PROJECT_ROOT, '.codegraph', 'index.json')

const toPosix = (p: string): string => p.replaceAll('\\', '/')

const loadIndex = (): CodeGraph => {
  if (!existsSync(INDEX_FILE)) {
    console.error(
      `codegraph: index not found at ${toPosix(relative(PROJECT_ROOT, INDEX_FILE))}.\n` +
        `Run \`npm run graph:build\` first.`,
    )
    process.exit(1)
  }
  const raw = readFileSync(INDEX_FILE, 'utf8')
  return JSON.parse(raw) as CodeGraph
}

type Args = {
  positional: string[]
  importers?: string
  exports?: string
  kind?: string
  json: boolean
  help: boolean
}

const parseArgs = (argv: string[]): Args => {
  const args: Args = { positional: [], json: false, help: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') args.json = true
    else if (a === '--help' || a === '-h') args.help = true
    else if (a === '--importers') args.importers = argv[++i]
    else if (a === '--exports') args.exports = argv[++i]
    else if (a === '--kind') args.kind = argv[++i]
    else if (a && !a.startsWith('--')) args.positional.push(a)
  }
  return args
}

const printHelp = (): void => {
  console.log(
    `codegraph query — read .codegraph/index.json

Usage:
  npm run graph:query <term>                  fuzzy find symbol by name
  npm run graph:query -- --importers <file>   who imports this file
  npm run graph:query -- --exports <file>     list a file's exports
  npm run graph:query -- --kind <kind>        filter by kind (function|class|const|type|interface|enum|component)
  npm run graph:query -- --json               machine-readable output

Examples:
  npm run graph:query addWatermark
  npm run graph:query -- --importers src/lib/pdfEngine.ts
  npm run graph:query -- --exports src/App.tsx
`,
  )
}

const fuzzyMatch = (needle: string, hay: string): boolean => {
  const n = needle.toLowerCase()
  const h = hay.toLowerCase()
  if (h.includes(n)) return true
  // Subsequence match
  let i = 0
  for (const ch of h) {
    if (ch === n[i]) i++
    if (i === n.length) return true
  }
  return false
}

const resolveFileRef = (index: CodeGraph, ref: string): FileNode | undefined => {
  const target = toPosix(ref).replace(/^\.\//, '')
  return index.files.find(f => f.path === target || f.path.endsWith(`/${target}`))
}

const cmdFindSymbol = (
  index: CodeGraph,
  term: string,
  kind: string | undefined,
): SymbolNode[] => {
  const results: { file: FileNode; sym: SymbolNode; score: number }[] = []
  for (const f of index.files) {
    for (const s of f.symbols) {
      if (kind && s.kind !== kind) continue
      if (fuzzyMatch(term, s.name)) {
        const score = s.name.toLowerCase().includes(term.toLowerCase()) ? 0 : 1
        results.push({ file: f, sym: s, score })
      }
    }
  }
  results.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score
    if (a.sym.name.length !== b.sym.name.length) {
      return a.sym.name.length - b.sym.name.length
    }
    return a.file.path.localeCompare(b.file.path)
  })
  return results.slice(0, 50).map(r => r.sym)
}

const cmdImporters = (index: CodeGraph, ref: string): { from: string; names: string[] }[] => {
  const target = resolveFileRef(index, ref)
  if (!target) return []
  const importers: { from: string; names: string[] }[] = []
  for (const f of index.files) {
    for (const imp of f.imports) {
      if (imp.resolved === target.path) {
        importers.push({ from: f.path, names: imp.names.map(n => n.local) })
      }
    }
  }
  return importers
}

const cmdExports = (index: CodeGraph, ref: string) => {
  const target = resolveFileRef(index, ref)
  return target ? target.exports : []
}

const fmtSymbol = (s: SymbolNode): string => {
  const badge = s.isDefault ? ' [default]' : s.isExported ? '' : ' (private)'
  return `  ${s.kind.padEnd(10)} ${s.name}${badge}`
}

const main = (): void => {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || (args.positional.length === 0 && !args.importers && !args.exports)) {
    printHelp()
    return
  }

  const index = loadIndex()

  if (args.importers) {
    const results = cmdImporters(index, args.importers)
    if (args.json) {
      console.log(JSON.stringify({ importers: results }, null, 2))
    } else if (results.length === 0) {
      console.log(`No importers found for ${args.importers}.`)
    } else {
      console.log(`Importers of ${args.importers} (${results.length}):`)
      for (const r of results) {
        console.log(`  ${r.from}  →  { ${r.names.join(', ')} }`)
      }
    }
    return
  }

  if (args.exports) {
    const results = cmdExports(index, args.exports)
    if (args.json) {
      console.log(JSON.stringify({ exports: results }, null, 2))
    } else if (results.length === 0) {
      console.log(`No exports found for ${args.exports}.`)
    } else {
      console.log(`Exports of ${args.exports} (${results.length}):`)
      for (const e of results) {
        const tag = e.isReExport ? `re-export from "${e.from}"` : 'local'
        console.log(`  ${e.name.padEnd(30)} ${tag}`)
      }
    }
    return
  }

  const term = args.positional[0]!
  const symbols = cmdFindSymbol(index, term, args.kind)
  if (args.json) {
    console.log(JSON.stringify({ term, count: symbols.length, symbols }, null, 2))
  } else if (symbols.length === 0) {
    console.log(`No symbols matching "${term}".`)
  } else {
    console.log(`Symbols matching "${term}"${args.kind ? ` (kind=${args.kind})` : ''} (${symbols.length}):`)
    for (const s of symbols) {
      console.log(fmtSymbol(s))
    }
  }
}

main()
