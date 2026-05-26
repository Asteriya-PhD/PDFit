# PDFit — AI Agent Knowledge Base

## Project Overview

PDFit is a privacy-first, browser-based PDF manipulation tool. All operations run locally in the browser — no files are ever uploaded to a server. Supports split, merge, delete pages, and rotate pages. Currently in Phase 1 (MVP).

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
│   │   ├── desktop.ts            # Desktop environment detection
│   │   ├── tauri.ts              # File dialog abstraction (desktop/web)
│   │   └── download.ts           # Cross-platform download helper
│   ├── types/
│   │   └── index.ts              # Shared type definitions
│   ├── contexts/
│   │   └── AppContext.tsx         # Global state (useReducer)
│   └── components/
│       ├── Header.tsx             # Navigation + tool selector
│       ├── EmptyState.tsx         # Landing page / dropzone
│       ├── FileDropzone.tsx       # Drag-and-drop + file picker
│       ├── FileList.tsx           # Loaded files sidebar
│       ├── ThumbnailGrid.tsx      # PDF.js page preview (expandable)
│       ├── ToolPanel.tsx          # Tool router
│       └── tools/
│           ├── MergeTool.tsx       # Merge with reorder
│           ├── SplitTool.tsx       # Extract pages + split by ranges
│           ├── DeleteTool.tsx      # Delete pages (input or click)
│           └── RotateTool.tsx      # Rotate 90/180/270 (all or selected)
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

## Current Status

- **Phase**: 2 (Desktop app via Tauri v2 — split/merge/delete/rotate, native installers)
- **Platform**: Web (GitHub Pages) + Desktop (macOS dmg / Windows msi / Linux AppImage)
- **Deployment**: GitHub Actions auto-deploy (web), `npm run tauri:build` (desktop)
- **Next up**: Phase 3 — PDF conversion features (PDF→Image, Image→PDF, PDF→Markdown)

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
