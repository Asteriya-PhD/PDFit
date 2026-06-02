# codegraph

Lightweight code-structure index for PdfX, built with [ts-morph](https://ts-morph.com/).

Generates a single `.codegraph/index.json` describing every `.ts`/`.tsx` file under `src/`: its exported symbols, imports, and exports. Useful for navigation, refactoring prep, and AI-assisted code review.

## Scripts

```bash
npm run graph:build       # regenerate .codegraph/index.json
npm run graph:query ...   # query the index (see below)
```

## Query CLI

```bash
# Fuzzy-find any symbol by name
npm run graph:query addWatermark

# Filter by kind (function|class|const|type|interface|enum|component)
npm run graph:query -- --kind component App

# Who imports a given file?
npm run graph:query -- --importers src/lib/pdfEngine.ts

# List a file's exports (including re-exports)
npm run graph:query -- --exports src/App.tsx

# Machine-readable output for piping
npm run graph:query addWatermark -- --json
```

## Programmatic use

`build.ts` and `cli.ts` are entry points — for library use, import the types from `types.ts` and walk the JSON index directly, or shell out to the CLI.

```ts
import { readFileSync } from 'node:fs'
import type { CodeGraph } from './scripts/codegraph/types.ts'

const index: CodeGraph = JSON.parse(
  readFileSync('.codegraph/index.json', 'utf8'),
)

for (const file of index.files) {
  // ...
}
```

## Index schema (v1)

```ts
interface CodeGraph {
  version: 1
  generatedAt: string           // ISO timestamp
  projectRoot: string           // POSIX, relative to repo root
  files: FileNode[]
}

interface FileNode {
  path: string                  // POSIX, relative to repo root
  hash: string                  // sha1 prefix of file content
  symbols: SymbolNode[]         // functions, classes, consts, types, components
  imports: ImportEdge[]         // resolved via tsconfig paths (@/foo → src/foo)
  exports: ExportNode[]         // local + re-exports
}

interface SymbolNode {
  name: string
  kind: 'function' | 'class' | 'const' | 'type' | 'interface' | 'enum' | 'component'
  line: number                  // 1-based
  column: number                // 0-based
  isExported: boolean
  isDefault: boolean
}

interface ImportEdge {
  source: string                // raw, e.g. '@/lib/pdfEngine'
  resolved?: string             // POSIX relative path for local modules
  names: { imported: string; local: string; isType: boolean }[]
  isTypeOnly: boolean           // `import type {} from`
}

interface ExportNode {
  name: string
  isReExport: boolean
  from?: string                 // present when isReExport
}
```

## Component detection

A symbol is classified as `component` (vs `function`/`const`) when:
- File extension is `.tsx`
- Name starts with a capital letter (PascalCase, no special chars)
- Exported
- Body contains JSX

This is a heuristic — it will miss HOCs that wrap other components and mis-classify non-component PascalCase exports that return JSX-shaped objects. Good enough for navigation; verify critical lookups by reading the file.

## Out of scope

- **Call graph** (who calls X) — adds significant complexity, low ROI for a 7K-line project.
- **MCP server** — for AI tool integration, shell out to the CLI or read the JSON directly.
- **Incremental indexing** — full rebuild runs in well under 1s for this codebase; no caching needed.
- **Auto-rebuild on change** — run `npm run graph:build` manually, or wire into a pre-commit hook.

## Files

- `types.ts` — shared types
- `build.ts` — ts-morph based indexer
- `cli.ts` — query CLI
- `README.md` — this file
