# PDFit — Architecture Document

## Tech Stack

### Core

| Technology | Version | Purpose | Rationale |
|---|---|---|---|
| React | 19 | UI framework | De facto standard for interactive web apps |
| TypeScript | 5.7 | Type safety | Strict mode, no `any`, no unchecked access |
| Vite | 6 | Build tool | Fast HMR, native ESM, first-class TS support |
| Tailwind CSS | 4 | Styling | Utility-first, no runtime, v4 CSS-first config |
| pdf-lib | 1.17 | PDF operations | Pure JS, no native deps, supports split/merge/delete/rotate |
| pdfjs-dist | 4.10 | PDF rendering | Page → canvas for thumbnail preview |
| lucide-react | 0.468 | Icons | Lightweight, tree-shakeable icon library |
| jszip | 3.10 | ZIP export | Multi-file split export (download as zip) |

### Deployment

- **Hosting**: GitHub Pages (static site)
- **CI/CD**: GitHub Actions — auto-deploy on push to `main`
- **Domain**: `https://asteriya-phd.github.io/PDFit/`

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  App (Layout)                                        │
│  ┌─────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │ Header  │  │ FileDropzone │  │ Tool Buttons    │ │
│  └─────────┘  └──────────────┘  └─────────────────┘ │
│  ┌─────────┐  ┌──────────────────────────────────┐   │
│  │ FileList │  │ ToolPanel                       │   │
│  │ (sidebar)│  │ ┌─ MergeTool ─────────────────┐ │   │
│  │          │  │ │  Reorder files → Merge      │ │   │
│  │          │  │ └─────────────────────────────┘ │   │
│  │          │  │ ┌─ SplitTool ─────────────────┐ │   │
│  │          │  │ │  Extract or split by ranges │ │   │
│  │          │  │ └─────────────────────────────┘ │   │
│  │          │  │ ┌─ DeleteTool ────────────────┐ │   │
│  │          │  │ │  Delete by spec or click    │ │   │
│  │          │  │ └─────────────────────────────┘ │   │
│  │          │  │ ┌─ RotateTool ────────────────┐ │   │
│  │          │  │ │  90/180/270, all/selected   │ │   │
│  │          │  │ └─────────────────────────────┘ │   │
│  └─────────┘  └──────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐   │
│  │ ThumbnailGrid (PDF.js preview)                 │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

## Data Flow

```
File Input (drag/drop)
    │
    ▼
File.arrayBuffer()
    │
    ▼
AppContext (useReducer)
    │  files: PDFFileInfo[]
    │  activeFileId: string | null
    │  activeTool: ToolType
    │  loading: boolean
    │
    ├──► pdfEngine.ts (operations)
    │       ├── mergePDFs()           ─► Uint8Array
    │       ├── extractPages()        ─► Uint8Array
    │       ├── deleteSelectedPages() ─► Uint8Array
    │       ├── rotateSelectedPages() ─► Uint8Array
    │       ├── splitPDFByRanges()    ─► {name, data}[]
    │       └── parsePageSpec()       ─► number[]
    │
    ├──► ThumbnailGrid (preview)
    │       └── pdfjs-dist → canvas rendering
    │
    └──► downloadBlob()
            └── Blob URL → <a download>
```

## Core Engine API (`src/lib/pdfEngine.ts`)

All functions are pure — take `ArrayBuffer` in, return `Uint8Array` out.

```typescript
// Parse page spec "1,3,5-7" → 0-based indices
parsePageSpec(spec: string, totalPages: number): number[]

// Merge multiple PDFs
mergePDFs(buffers: ArrayBuffer[]): Promise<Uint8Array>

// Extract specific pages
extractPages(buffer: ArrayBuffer, pageIndices: number[]): Promise<Uint8Array>

// Delete pages, keep the rest
deleteSelectedPages(buffer: ArrayBuffer, pagesToDelete: Set<number>): Promise<Uint8Array>

// Rotate pages (empty indices = all pages)
rotateSelectedPages(buffer: ArrayBuffer, pageIndices: number[], angle: RotationAngle): Promise<Uint8Array>

// Split by page ranges → array of {name, data}
splitPDFByRanges(buffer: ArrayBuffer, ranges: PageRange[]): Promise<{name: string, data: Uint8Array}[]>
```

## Desktop Architecture (Tauri v2)

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  Tauri Shell (Rust)                                  │
│  ┌────────────────────────────────────────────────┐  │
│  │  WebView (React SPA — same code as web)        │  │
│  │  ┌──────────── App ──────────────────────────┐ │  │
│  │  │  ...same component tree as GitHub Pages... │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  │  ┌────────────────────────────────────────────┐ │  │
│  │  │  Desktop Abstraction Layer                  │ │  │
│  │  │  ┌──────────────┐ ┌───────────┐ ┌────────┐ │ │  │
│  │  │  │  desktop.ts  │ │ tauri.ts  │ │ dwnld. │ │ │  │
│  │  │  │  (detection) │ │ (dialogs) │ │ (blob) │ │ │  │
│  │  │  └──────────────┘ └───────────┘ └────────┘ │ │  │
│  │  └────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Rust Plugins                                   │  │
│  │  dialog │ fs │ updater │ protocol-asset        │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Desktop Layer

| File | Purpose | Key API |
|---|---|---|
| `desktop.ts` | Detect Tauri environment (3 methods) | `isDesktop()`, `getPlatform()` |
| `tauri.ts` | File dialog abstraction (native / web fallback) | `openFileDialog()`, `saveFileDialog()` |
| `download.ts` | Cross-platform download trigger | `downloadBlob()`, `triggerDownload()` |

The abstraction layer auto-detects the runtime environment:
- **Desktop**: Calls Tauri plugin APIs (`dialog.open`, `dialog.save`, `fs.readFile`, `fs.writeFile`)
- **Web**: Falls back to DOM APIs (`<input>`, `<a download>`)

### Tauri Plugins

| Plugin | Version | Usage |
|---|---|---|
| `dialog` | 2 | Native open/save file dialogs |
| `fs` | 2 | Read/write PDF files from native filesystem |
| `updater` | 2 | Auto-update via GitHub Releases |

### Build Targets

| Platform | Command | Output |
|---|---|---|
| macOS | `npm run tauri:build:macos` | `.app` + `.dmg` |
| Windows | `npm run tauri:build:windows` | `.msi` installer |
| Linux | `npm run tauri:build:linux` | AppImage |

### Dual Deployment

- **Web**: GitHub Pages — auto-deploys on push to `main` via GitHub Actions
- **Desktop**: `npm run tauri:build` — produces native installers
- 100% code shared between both targets — build-time `VITE_BASE` env controls asset path

### Code Convention (Desktop)
- All Tauri-specific logic in `src/lib/` — never in components
- `isDesktop()` check before calling any Tauri API (web fallback otherwise)
- `openFileDialog()` handles both single and multiple file selection (`File \| File[]`)
- Type-safe: leverage `@tauri-apps/plugin-dialog` generics for `OpenDialogReturn<T>`

## Code Conventions

### TypeScript
- `strict: true` in tsconfig
- `noUncheckedIndexedAccess: true` — always check array/object access
- No `as any`, no `@ts-ignore`, no `@ts-expect-error`
- Use `interface` for props, `type` for unions/aliases
- Prefer `const` over `let`, pure functions over classes

### React Components
- Single `interface` above the component for props
- Named exports only (no `export default`)
- Use hooks (`useState`, `useEffect`, `useReducer`, `useCallback`)
- Avoid context fragmentation — one AppContext is sufficient for this scale

### Styling
- Tailwind CSS v4: use `@import "tailwindcss"` in CSS, no config file
- No CSS modules or styled-components — Tailwind utilities only
- Consistent color scale: red for primary actions, gray for chrome

### PDF Operations
- Always call `pdfDoc.getPageIndices()` for 0-based page iteration
- Page indices are 0-based internally, 1-based in UI (converted at boundary)
- `ignoreEncryption: true` for loading (we don't need encryption for client-side
  processing)
- Worker mismatch causes silent rendering failure — always pin pdfjs-dist to the
  exact version used for the worker URL

## Git Conventions

### Branch Strategy
- `main` — production, auto-deploys to GitHub Pages
- `develop` — integration branch for feature work
- `feat/*` — feature branches (e.g. `feat/dark-mode`)
- `fix/*` — bug fix branches

### Commit Messages
```
type(scope): description

feat:    New feature
fix:     Bug fix
refactor: Code change that neither fixes nor adds
docs:     Documentation
chore:    Build, config, deployment
style:    Formatting, linting
```

### Pull Requests
- Squash merge feature branches into `develop`
- Fast-forward `develop` into `main` for releases
