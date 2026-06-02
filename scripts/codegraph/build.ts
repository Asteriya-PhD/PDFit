// Build the codegraph index for src/**/*.{ts,tsx}.
// Walks the source tree with ts-morph and writes .codegraph/index.json.

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Project, SyntaxKind, type SourceFile } from 'ts-morph'
import type {
  CodeGraph,
  ExportNode,
  FileNode,
  ImportBinding,
  ImportEdge,
  SymbolKind,
  SymbolNode,
} from './types.ts'
import { CODEGRAPH_VERSION } from './types.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PROJECT_ROOT = join(__dirname, '..', '..')
const OUTPUT_DIR = join(PROJECT_ROOT, '.codegraph')
const OUTPUT_FILE = join(OUTPUT_DIR, 'index.json')

const toPosix = (p: string): string => p.replaceAll('\\', '/')

const hashContent = (content: string): string =>
  createHash('sha1').update(content).digest('hex').slice(0, 12)

const isComponentName = (name: string): boolean =>
  /^[A-Z]/.test(name) && /^[A-Za-z0-9_$]+$/.test(name)

const findJsx = (root: import('ts-morph').Node): boolean => {
  let found = false
  root.forEachChild(child => {
    if (found) return
    const k = child.getKind()
    if (
      k === SyntaxKind.JsxElement ||
      k === SyntaxKind.JsxSelfClosingElement ||
      k === SyntaxKind.JsxFragment
    ) {
      found = true
      return
    }
    if (findJsx(child)) found = true
  })
  return found
}

const isReactComponentLike = (
  name: string,
  isExported: boolean,
  isTsx: boolean,
  hasJsx: boolean,
): boolean => isTsx && isExported && isComponentName(name) && hasJsx

const buildProject = (): Project => {
  const project = new Project({
    tsConfigFilePath: join(PROJECT_ROOT, 'tsconfig.json'),
    skipAddingFilesFromTsConfig: true,
  })
  project.addSourceFilesAtPaths('src/**/*.{ts,tsx}')
  return project
}

const locOf = (sf: SourceFile, pos: number): { line: number; column: number } => {
  const { line, column } = sf.getLineAndColumnAtPos(pos)
  return { line, column: column - 1 }
}

const extractSymbols = (sf: SourceFile): SymbolNode[] => {
  const symbols: SymbolNode[] = []
  const isTsx = sf.getFilePath().endsWith('.tsx')

  for (const fn of sf.getFunctions()) {
    const name = fn.getName()
    if (!name) continue
    const isExported = fn.isExported()
    const isDefault = fn.isDefaultExport()
    const hasJsx = isTsx && findJsx(fn)
    const kind: SymbolKind = isReactComponentLike(name, isExported, isTsx, hasJsx)
      ? 'component'
      : 'function'
    const { line, column } = locOf(sf, fn.getStart())
    symbols.push({ name, kind, line, column, isExported, isDefault })
  }

  for (const cls of sf.getClasses()) {
    const name = cls.getName()
    if (!name) continue
    const { line, column } = locOf(sf, cls.getStart())
    symbols.push({
      name,
      kind: 'class',
      line,
      column,
      isExported: cls.isExported(),
      isDefault: cls.isDefaultExport(),
    })
  }

  for (const stmt of sf.getVariableStatements()) {
    const isExported = stmt.isExported()
    for (const decl of stmt.getDeclarations()) {
      const name = decl.getName()
      const init = decl.getInitializer()
      const hasJsx = !!(init && isTsx && findJsx(init))
      const kind: SymbolKind = isReactComponentLike(name, isExported, isTsx, hasJsx)
        ? 'component'
        : 'const'
      const { line, column } = locOf(sf, decl.getStart())
      symbols.push({ name, kind, line, column, isExported, isDefault: false })
    }
  }

  for (const ta of sf.getTypeAliases()) {
    const { line, column } = locOf(sf, ta.getStart())
    symbols.push({
      name: ta.getName(),
      kind: 'type',
      line,
      column,
      isExported: ta.isExported(),
      isDefault: false,
    })
  }

  for (const iface of sf.getInterfaces()) {
    const { line, column } = locOf(sf, iface.getStart())
    symbols.push({
      name: iface.getName(),
      kind: 'interface',
      line,
      column,
      isExported: iface.isExported(),
      isDefault: false,
    })
  }

  for (const e of sf.getEnums()) {
    const { line, column } = locOf(sf, e.getStart())
    symbols.push({
      name: e.getName(),
      kind: 'enum',
      line,
      column,
      isExported: e.isExported(),
      isDefault: false,
    })
  }

  return symbols
}

const extractImports = (sf: SourceFile): ImportEdge[] => {
  const edges: ImportEdge[] = []
  for (const imp of sf.getImportDeclarations()) {
    const source = imp.getModuleSpecifierValue()
    const isTypeOnly = imp.isTypeOnly()
    const resolvedSf = imp.getModuleSpecifierSourceFile()
    const resolved = resolvedSf
      ? toPosix(relative(PROJECT_ROOT, resolvedSf.getFilePath()))
      : undefined

    const names: ImportBinding[] = imp.getNamedImports().map(specifier => {
      const nameNode = specifier.getNameNode()
      return {
        imported: nameNode.getText(),
        local: specifier.getAliasNode()?.getText() ?? nameNode.getText(),
        isType: specifier.isTypeOnly(),
      }
    })

    const defaultImport = imp.getDefaultImport()
    if (defaultImport) {
      names.push({
        imported: 'default',
        local: defaultImport.getText(),
        isType: false,
      })
    }
    const namespaceImport = imp.getNamespaceImport()
    if (namespaceImport) {
      names.push({
        imported: '*',
        local: namespaceImport.getText(),
        isType: false,
      })
    }

    edges.push({ source, resolved, names, isTypeOnly })
  }
  return edges
}

const extractExports = (sf: SourceFile): ExportNode[] => {
  const exports: ExportNode[] = []
  const seen = new Set<string>()

  // Local exports: every exported declaration (function, class, const, type, interface, enum)
  for (const name of sf.getExportedDeclarations().keys()) {
    if (name === 'default') continue
    if (seen.has(name)) continue
    seen.add(name)
    exports.push({ name, isReExport: false })
  }

  // Default export — record as `default` regardless of original symbol name
  if (sf.getDefaultExportSymbol()) {
    exports.push({ name: 'default', isReExport: false })
    seen.add('default')
  }

  // Re-exports
  for (const exp of sf.getExportDeclarations()) {
    const from = exp.getModuleSpecifierValue()
    const named = exp.getNamedExports()
    if (named.length === 0) {
      exports.push({ name: '*', isReExport: true, from })
      continue
    }
    for (const spec of named) {
      const n = spec.getNameNode().getText()
      if (seen.has(n)) continue
      seen.add(n)
      exports.push({ name: n, isReExport: true, from })
    }
  }

  return exports
}

const buildIndex = (): CodeGraph => {
  const project = buildProject()
  const sourceFiles = project.getSourceFiles()
  const files: FileNode[] = []

  for (const sf of sourceFiles) {
    const relPath = toPosix(relative(PROJECT_ROOT, sf.getFilePath()))
    files.push({
      path: relPath,
      hash: hashContent(sf.getFullText()),
      symbols: extractSymbols(sf),
      imports: extractImports(sf),
      exports: extractExports(sf),
    })
  }

  files.sort((a, b) => a.path.localeCompare(b.path))

  return {
    version: CODEGRAPH_VERSION,
    generatedAt: new Date().toISOString(),
    projectRoot: '.',
    files,
  }
}

const main = (): void => {
  const index = buildIndex()
  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2) + '\n', 'utf8')

  const totalSymbols = index.files.reduce((acc, f) => acc + f.symbols.length, 0)
  const totalImports = index.files.reduce((acc, f) => acc + f.imports.length, 0)
  const totalExports = index.files.reduce((acc, f) => acc + f.exports.length, 0)

  console.log(
    `codegraph: indexed ${index.files.length} files, ` +
      `${totalSymbols} symbols, ${totalImports} imports, ${totalExports} exports ` +
      `→ .codegraph/index.json`,
  )
}

main()
