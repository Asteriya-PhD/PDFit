# PDFit — Progress Log

## Phase 1: Core PDF Operations

### 2026-05-26 — Initial Scaffold & Core Engine

**Commits**:
- `ef253ee` — Phase 1: PDF split/merge/delete/rotate with pdf-lib + React
- `2871564` — Fix base path and cleanup

**Implemented**:
- Vite + React 19 + TypeScript + Tailwind CSS 4 project setup
- `pdfEngine.ts` with all core operations: merge, extract, delete, rotate, split
- AppContext (useReducer) for global file/tool/loading state
- EmptyState with drag-and-drop landing page
- FileDropzone (compact variant in sidebar)
- FileList showing loaded files with page count and size
- Header with tool navigation (Merge/Split/Delete/Rotate)
- MergeTool with file reordering
- SplitTool with extract-by-spec and split-by-range modes
- DeleteTool with manual input and click-to-select modes
- RotateTool with angle selection and scope (all/selected)
- GitHub Actions deploy workflow (`.github/workflows/deploy.yml`)

**Known Issues**:
- None major at this stage

---

### 2026-05-26 — Bug Fixes & Preview Enhancement

**Commits**:
- `1452b9d` — Fix extract page range bug + enhance thumbnail preview
- `bfa2c0e` — Rewrite ThumbnailGrid: fix portrait orientation, content rendering, zoom
- `d79efaf` — Fix pdfjs worker version mismatch
- `97877da` — Dynamic thumbnail height

**Bug Fixes**:

| Bug | Root Cause | Fix |
|---|---|---|
| Extract "5-10" only gets page 5 | `split(',')` + `parseInt()` doesn't handle ranges | Use `parsePageSpec()` which parses `1,3,5-7` correctly |
| Thumbnails show as landscape | Fixed container height (180px) clips portrait pages | Dynamic target-height approach — all thumbnails same pixel height |
| Thumbnails render blank | pdfjs worker version mismatch (CDN 4.0.379 vs installed 4.10.38) | Bundle worker locally via `new URL()` |
| "放大预览" doesn't enlarge | Scale increase too small (0.35→0.5) | Dynamic height: default 200px, expanded 500px |

**Preview Enhancements**:
- Before: fixed scale 0.35, container 180px → portrait pages clipped
- After: target height 200px, scale = targetPx / page.height → full page visible
- Expanded mode: 500px target height, 70vh container
- Expand/collapse toggle in preview bar

---

### Phase 2: Desktop App (Tauri v2) 🚧 In Progress

#### 2026-05-26 — Tauri v2 Setup & Configuration

**Implemented**:
- Tauri CLI v2.11.2 installed via cargo
- Tauri project scaffolded in `src-tauri/` directory
- React SPA embedded via WebView (100% code reuse)
- Native file dialogs (open/save PDF) via `@tauri-apps/plugin-dialog`
- File system access via `@tauri-apps/plugin-fs`
- Cross-platform desktop abstraction layer (`src/lib/desktop.ts`, `src/lib/tauri.ts`)
- Windows .msi installer build configured via WiX
- PDF file association on Windows (`ext: ["pdf"]`, `mimeType: "application/pdf"`)
- Auto-updater configured via GitHub Releases API
- GitHub Pages + Tauri dual deployment support

**Project Structure**:
```
src-tauri/
├── Cargo.toml          # Rust dependencies (tauri + plugins)
├── build.rs            # Tauri build script
├── tauri.conf.json     # App config, bundle targets, plugins
└── src/
    ├── main.rs         # Entry point → calls lib.rs
    ├── lib.rs          # Tauri builder with plugins
    └── commands.rs     # (reserved for custom commands)

src/lib/
├── desktop.ts          # Desktop environment detection
├── tauri.ts            # File dialog abstraction (desktop/web)
└── download.ts         # Cross-platform download helper
```

**Build Outputs**:
- macOS: `PDFit.app` + `PDFit_0.1.0_aarch64.dmg`
- Windows (cross-compile): Requires `x86_64-pc-windows-msvc` target
- Linux: AppImage via `x86_64-unknown-linux-gnu` target

**NPM Scripts**:
```json
"tauri": "tauri",
"tauri:dev": "tauri dev",
"tauri:build": "tauri build",
"tauri:build:windows": "tauri build --target x86_64-pc-windows-msvc",
"tauri:build:macos": "tauri build",
"tauri:build:linux": "tauri build --target x86_64-unknown-linux-gnu"
```

**Known Issues**:
- None at this stage
- Windows cross-compilation requires MinGW-w64 or similar toolchain

---

#### 2026-05-26 — Phase 2 Bug Fixes & Polish

**Commits**:
- *(included in Phase 2 commit history)* — Phase 2 fixes: edition, CLI deps, multi-file dialog, project docs

**Fixes**:

| Bug | Root Cause | Fix |
|---|---|---|
| `npm run tauri:build` fails with command not found | `@tauri-apps/cli` not installed as npm dependency | Add `@tauri-apps/cli@2.11.2` to `devDependencies` |
| Cargo edition warning | `Cargo.toml` missing `edition` field | Add `edition = "2021"` |
| Desktop multi-file open crashes | `open()` returns `string[]` when `multiple: true`, but code treated it as `string` | Rewrite `openFileDialog` to handle both `string` and `string[]`; return `File \| File[] \| null` |

**Desktop Layer**:
- `desktop.ts` — desktop environment detection with 3 fallback methods
- `tauri.ts` — file dialog abstraction (Tauri native dialog / web `<input>`)
- `download.ts` — cross-platform download helper
- `FileDropzone.tsx` — Tauri-aware: uses native dialog on desktop, web input fallback
- `vite.config.ts` — base path `process.env.VITE_BASE || '/PDFit/'` (Tauri needs `/`)
- `index.html` — favicon path relative (works in both WebView and browser)

**All builds pass**:
- `tsc --noEmit` ✅
- `cargo build` ✅ (no warnings)
- `npm run build` ✅

---

### Phase 3: Conversion Features 🚧 Planning Complete

**Goal**: PDF ↔ Image, PDF → Markdown conversion (browser-side).

**Plan**:
- Feature A: PDF → Image (canvas render → PNG/JPEG download)
- Feature B: Image → PDF (pdf-lib embedPng/Jpg → multi-page PDF)
- Feature C: PDF → Markdown (pdfjs text extraction → positional Markdown reconstruction)
- Feature D: PDF → Word/Excel — postponed (post-MVP, desktop-only via LibreOffice)

**Key decision**: 0 new npm dependencies — all 3 browser features reuse pdfjs-dist, pdf-lib, and jszip.
Image files for Feature B managed in local component state (not AppContext, which is PDF-only).

*Ready for implementation.*

## Phase 4: Polish & Extras ✅

### 2026-05-27 — Dark Mode

**Goal**: Full dark mode with class-based toggle, system preference detection, and localStorage persistence.

**Commits**:
- `be566c4` — feat: Phase 4 Dark Mode — class-based theme toggle with system preference detection

**Implemented**:
- `ThemeContext` — theme state (`light` | `dark` | `system`), toggle, localStorage persistence, `prefers-color-scheme` listener
- `ThemeToggle` — Sun/Moon icon button in header

**Files created**:
| File | Purpose |
|---|---|
| `src/contexts/ThemeContext.tsx` | Theme provider + `useTheme` hook |
| `src/components/ThemeToggle.tsx` | Toggle button (Sun/Moon icons) |

**Files modified with `dark:` variants**:
| File | Changes |
|---|---|
| `src/index.css` | `@custom-variant dark`, scrollbar dark colors |
| `src/main.tsx` | Wrapped with `<ThemeProvider>` |
| `src/components/Header.tsx` | Added ThemeToggle, dark variants for header/border/buttons |
| `src/App.tsx` | Sidebar background + border dark variants |
| `src/components/EmptyState.tsx` | Border, hover, icon bg, feature card dark variants |
| `src/components/FileList.tsx` | Item selected/normal states, remove button, empty state |
| `src/components/FileDropzone.tsx` | Compact + full mode border, hover, icon, text |
| `src/components/ThumbnailGrid.tsx` | Container, canvas wrapper, error placeholder, no-file state |
| `src/components/ToolPanel.tsx` | Hint text colors |
| `src/components/tools/MergeTool.tsx` | File cards, move buttons, disabled state |
| `src/components/tools/SplitTool.tsx` | Mode toggles, inputs, range rows, disabled buttons |
| `src/components/tools/DeleteTool.tsx` | Mode toggles, page grid (selected/unselected), input |
| `src/components/tools/RotateTool.tsx` | Angle/scope toggles, page grid (blue selected), input |
| `src/components/tools/PdfToImageTool.tsx` | Scope/format/DPI toggles, input, progress bar |
| `src/components/tools/ImageToPdfTool.tsx` | Empty dropzone, image cards, page-size toggle |
| `src/components/tools/PdfToMdTool.tsx` | Copy/download/reset buttons, textarea, progress bar |
| `src/lib/desktop.ts` | Added `getSystemTheme()` (Tauri theme detection) |

**Color mapping**:
| Element | Light | Dark |
|---|---|---|
| Page background | `white` / `gray-50` | `gray-900` |
| Card/surface | `white` | `gray-800` |
| Borders | `gray-200` | `gray-700` |
| Primary text | `gray-800` / `gray-700` | `gray-100` / `gray-200` |
| Secondary text | `gray-400` / `gray-500` | unchanged |
| Active accent | `red-50` / `red-700` / `red-200` | `red-900/30` / `red-400` / `red-800` |
| Hover bg | `gray-100` | `gray-800` |
| Dashed border | `gray-300` | `gray-600` |
| Selected (blue) | `blue-100` / `blue-700` / `blue-300` | `blue-900/30` / `blue-400` / `blue-700` |

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅

**Theme behavior**:
- Default: follows `prefers-color-scheme` system preference
- Manual toggle: sun/moon button in header — saves to `localStorage` as `pdfx-theme`
- Three states: `light`, `dark`, `system` (follows OS)
- Live update: when in `system` mode, changing OS theme updates the app instantly

---

### 2026-05-27 — Keyboard Shortcuts

**Goal**: Common keyboard shortcuts for faster workflows — tool switching, file open, deselection.

**Commits**:
- *(current)* — feat: Phase 4 Keyboard Shortcuts

**Implemented**:
- `src/lib/shortcuts.ts` — Shortcut map definition (`SHORTCUTS[]`) with typed actions (`SET_TOOL`, `DESELECT_TOOL`, `OPEN_FILE`)
- `src/hooks/useKeyboardShortcuts.ts` — `keydown` listener on `window` (capture phase), editable-target suppression, exact modifier matching, toggle-on-repress behavior matching Header buttons

**Files created**:
| File | Purpose |
|---|---|
| `src/lib/shortcuts.ts` | Shortcut map + `TOOL_ORDER` for numeric quick-switch |
| `src/hooks/useKeyboardShortcuts.ts` | Hook: listen, match, dispatch |

**Files modified**:
| File | Changes |
|---|---|
| `src/App.tsx` | Mounts `useKeyboardShortcuts()` hook |

**Shortcuts**:
| Shortcut | Action |
|---|---|
| `Ctrl+O` / `Cmd+O` | Open PDF (Tauri native dialog on desktop, `<input>` click on web) |
| `Escape` | Deselect current tool |
| `Ctrl+M` / `Cmd+M` | Merge |
| `Ctrl+S` / `Cmd+S` | Split |
| `Ctrl+D` / `Cmd+D` | Delete |
| `Ctrl+R` / `Cmd+R` | Rotate |
| `Ctrl+I` / `Cmd+I` | PDF→Image |
| `Ctrl+Shift+I` | Image→PDF |
| `Ctrl+Shift+M` | Extract Markdown |
| `1`-`7` | Quick tool switch by Header position |

**Behavior**:
- Shortcuts suppressed when `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable` is focused
- `Ctrl+O` uses `isDesktop()` check → Tauri native dialog on desktop, DOM file picker on web
- All tool shortcuts toggle (pressing active tool again deselects it) — mirrors Header button behavior
- `Ctrl` matches either `ctrlKey` or `metaKey` (cross-platform Cmd/Ctrl)

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅

---

### Remaining Phase 4 Features

**Features** (in recommended order):
1. ✅ **Dark Mode** — Completed
2. ✅ **Keyboard Shortcuts** — Completed
3. ⬜ Page Numbering — pdf-lib `drawText()` footer overlays
4. ⬜ Watermark — pdf-lib rotated semi-transparent text
5. ⬜ i18n (EN/CN) — Custom Context-based i18n, `src/i18n/`, ~15 files with `t()` calls
6. ⬜ Drag-and-Drop Page Reordering — Native HTML5 DnD or @dnd-kit
7. ⬜ Compress PDF — pdf-lib object streams + optional image re-encoding via canvas
8. ⬜ Batch Processing Queue — Sequential queue with progress tracking (contingent on demand)
