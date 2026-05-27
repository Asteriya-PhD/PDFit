# PDFit — AI Agent Knowledge Base

## Project Overview

PDFit is a privacy-first, browser-based PDF manipulation tool. All operations run locally in the browser — no files are ever uploaded to a server. Supports split, merge, delete pages, rotate pages, page numbering, watermark, PDF↔Image conversion, and Markdown extraction. Currently in Phase 4 (Polish & Extras).

## Tech Stack

| Layer | Choice |
|---|---|---|
| Framework | React 19 + TypeScript 5.7 |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| PDF Engine | pdf-lib 1.17 (operations) |
| PDF Preview | pdfjs-dist 4.10 (rendering) |
| Icons | lucide-react |
| ZIP | jszip (multi-file split export) |
| Desktop Shell | Tauri v2 (Rust) |
| Desktop Plugins | dialog, fs, updater |
| Deployment | GitHub Pages (web) + Tauri (desktop installers) |

## Project Structure

```
PDFit/
├── src/
│   ├── App.tsx                   # Root layout
│   ├── main.tsx                  # Entry point
│   ├── index.css                 # Tailwind + global styles
│   ├── vite-env.d.ts
│   ├── lib/
│   │   ├── pdfEngine.ts          # Core PDF operations (pure functions)
│   │   ├── pdfToImage.ts         # PDF page → canvas → PNG/JPEG blob
│   │   ├── pageNumbering.ts      # Add page number overlays via pdf-lib
│   ├── watermark.ts          # Add text watermark overlays via pdf-lib
│   │   ├── imageToPdf.ts         # Image files → PDF document
│   │   ├── pdfToMarkdown.ts      # PDF text extraction → Markdown
│   │   ├── pdfWorker.ts          # Centralized pdfjs worker initialization
│   │   ├── desktop.ts            # Desktop environment detection
│   │   ├── tauri.ts              # File dialog abstraction (desktop/web)
│   │   ├── download.ts           # Cross-platform download helper
│   │   └── shortcuts.ts          # Keyboard shortcut definitions
│   ├── hooks/
│   │   └── useKeyboardShortcuts.ts  # Global keydown listener hook
│   ├── types/
│   │   └── index.ts              # Shared type definitions
│   ├── contexts/
│   │   ├── AppContext.tsx         # Global state (useReducer)
│   │   └── ThemeContext.tsx       # Theme state (light/dark/system)
│   └── components/
│       ├── Header.tsx             # Navigation + tool selector + ThemeToggle
│       ├── ThemeToggle.tsx        # Sun/Moon theme switch
│       ├── EmptyState.tsx         # Landing page / dropzone
│       ├── FileDropzone.tsx       # Drag-and-drop + file picker
│       ├── FileList.tsx           # Loaded files sidebar
│       ├── ThumbnailGrid.tsx      # PDF.js page preview (expandable)
│       ├── ToolPanel.tsx          # Tool router
│       └── tools/
│           ├── MergeTool.tsx       # Merge with reorder
│           ├── SplitTool.tsx       # Extract pages + split by ranges
│           ├── DeleteTool.tsx      # Delete pages (input or click)
│           ├── RotateTool.tsx      # Rotate 90/180/270 (all or selected)
│           ├── PageNumberingTool.tsx # Add page number overlays
│           ├── WatermarkTool.tsx     # Add text watermark overlays
│           ├── PdfToImageTool.tsx  # PDF → PNG/JPEG export
│           ├── ImageToPdfTool.tsx  # Image files → PDF
│           └── PdfToMdTool.tsx     # PDF → Markdown extraction
├── src-tauri/
│   ├── Cargo.toml                # Rust dependencies (tauri + plugins)
│   ├── build.rs                  # Tauri build script
│   ├── tauri.conf.json           # App config, bundle targets, plugins
│   ├── capabilities/default.json # Permission scopes
│   ├── icons/                    # App icons (png, ico, icns)
│   └── src/
│       ├── main.rs               # Entry point → calls lib.rs
│       └── lib.rs                # Tauri builder with plugins
├── docs/
│   ├── architecture.md           # Tech decisions, code conventions
│   ├── plan.md                   # Development roadmap
│   └── progress.md               # Implementation log
├── public/
│   └── pdfx.svg
├── .github/workflows/deploy.yml  # GitHub Actions → Pages
├── AGENTS.md                     # This file
└── package.json
```

## Key Architecture Decisions

### 1. Pure browser-side processing
All PDF operations use `pdf-lib` (no WASM, no backend). Files read via `File.arrayBuffer()`, processed, then downloaded via Blob URL.

### 2. Prefer `pdf-lib` over `pdfjs-dist` for manipulation
pdf-lib is the manipulation engine (split/merge/delete/rotate). pdfjs-dist is ONLY used for preview rendering (canvas thumbnails). Never the reverse.

### 3. State management via useReducer + Context
Simple enough that no external state library is needed. AppContext provides files, active tool, and loading state.

### 4. Target-height approach for thumbnails
Thumbnails are rendered to a fixed pixel height (200px default, 500px expanded), with scale calculated dynamically per page. This guarantees all pages (portrait/landscape) are fully visible.

### 5. PDF.js worker must match installed version
The worker is bundled locally via Vite (`new URL(...)`), NOT loaded from CDN. This avoids version mismatch.

### 6. Desktop abstraction layer for Tauri/web dual-target
The `src/lib/` desktop layer (`desktop.ts`, `tauri.ts`, `download.ts`) auto-detects the runtime (Tauri vs browser) and routes to native dialogs or DOM fallbacks. Components call the abstraction, never Tauri APIs directly — `isDesktop()` check always gates platform-specific code.

### 7. VITE_BASE env var for dual deployment
Web deploys to GitHub Pages at `/PDFit/`. Tauri WebView needs base `/`. The `vite.config.ts` uses `process.env.VITE_BASE || '/PDFit/'`, and `tauri.conf.json` sets `VITE_BASE=/` in `beforeBuildCommand`.

### 8. Global keyboard shortcuts via capture-phase keydown hook
Shortcuts are defined declaratively in `src/lib/shortcuts.ts` as a typed array. The `useKeyboardShortcuts` hook attaches a `capture: true` keydown listener on `window`. Before matching, it checks `document.activeElement` to suppress shortcuts when the user is typing in an `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable`. Each shortcut includes exact modifier state (ctrl/cmd, shift, alt) to prevent e.g. `Ctrl+Shift+M` from matching `Ctrl+M`. All tool shortcuts toggle (pressing the active shortcut deselects the tool), matching the Header button behavior.

## Current Status

- **Phase**: 4 (Polish & Extras — dark mode, keyboard shortcuts, page numbering, watermark; i18n upcoming)
- **Platform**: Web (GitHub Pages) + Desktop (macOS dmg / Windows msi / Linux AppImage)
- **Deployment**: GitHub Actions auto-deploy (web), `npm run tauri:build` (desktop)
- **Next up**: Phase 4 remaining — i18n (EN/CN), Drag-and-Drop Reorder

## Conventions

### Git
- Branch: `main` (production), `develop` (integration), `feat/*` (feature branches)
- Commit format: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)
- PRs: squash merge into `develop`, fast-forward into `main`

### Code
- TypeScript strict mode (no unchecked index access)
- No `as any`, no `@ts-ignore`, no `@ts-expect-error`
- Functions over classes
- Named exports preferred over default exports
- Component props defined as inline `interface` above the component
- Avoid comments — code should be self-documenting
