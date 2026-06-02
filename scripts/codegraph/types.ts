// Shared types for the codegraph indexer and query CLI.

export const CODEGRAPH_VERSION = 1

export type SymbolKind =
  | 'function'
  | 'class'
  | 'const'
  | 'type'
  | 'interface'
  | 'enum'
  | 'component'

export interface SymbolNode {
  name: string
  kind: SymbolKind
  line: number
  column: number
  isExported: boolean
  isDefault: boolean
}

export interface ImportBinding {
  imported: string
  local: string
  isType: boolean
}

export interface ImportEdge {
  source: string
  resolved?: string
  names: ImportBinding[]
  isTypeOnly: boolean
}

export interface ExportNode {
  name: string
  isReExport: boolean
  from?: string
}

export interface FileNode {
  path: string
  hash: string
  symbols: SymbolNode[]
  imports: ImportEdge[]
  exports: ExportNode[]
}

export interface CodeGraph {
  version: number
  generatedAt: string
  projectRoot: string
  files: FileNode[]
}
