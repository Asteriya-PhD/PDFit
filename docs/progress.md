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

## Phase 4: Polish & Extras ✅ (All 6 features completed)

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
| `Ctrl+E` / `Cmd+E` | Rotate |
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

### 2026-05-27 — Page Numbering

**Goal**: Add page numbers as configurable overlays to PDF pages before download.

**Commits**:
- *(current)* — feat: Phase 4 Page Numbering — pdf-lib drawText footer/header overlays

**Implemented**:
- `src/lib/pageNumbering.ts` — Pure function `addPageNumbers(buffer, options)`: embeds Helvetica font, draws text on each page at configurable position/size/color
- `src/components/tools/PageNumberingTool.tsx` — UI: position grid (6 options), font size picker (8–24pt), color presets + custom picker, start number, prefix/suffix, "Page X of Y" toggle, live preview

**Options**:
| Option | Default | Values |
|--------|---------|--------|
| Position | `bottom-center` | bottom-center/left/right, top-center/left/right |
| Font size | 12px | 8, 10, 12, 14, 16, 20, 24 |
| Color | `#000000` | 6 presets + custom color picker |
| Start number | 1 | 1+ |
| Prefix/Suffix | '' | Free text (e.g., `- 1 -`, `Page 1`) |
| Show total pages | off | `1 / 10` format |

**Files created**:
| File | Purpose |
|---|---|
| `src/lib/pageNumbering.ts` | Core engine: draw page numbers on each page |
| `src/components/tools/PageNumberingTool.tsx` | UI: position, font size, start number, preview, download |

**Files modified**:
| File | Changes |
|---|---|
| `src/types/index.ts` | Added `'page-numbering'` to `ToolType`, `PageNumberPosition`, `PageNumberingOptions` |
| `src/components/Header.tsx` | Added nav button (# icon) between Rotate and PDF→Image |
| `src/components/ToolPanel.tsx` | Added `<PageNumberingTool />` route entry |
| `src/lib/shortcuts.ts` | Added `Ctrl+Shift+N` shortcut; inserted `page-numbering` at TOOL_ORDER index 4 |
| `src/components/EmptyState.tsx` | Added "添加页码" badge |

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅

---
---

### 2026-05-27 — Watermark

**Goal**: Add custom text watermarks to PDF pages before download.

**Commits**:
- *(current)* — feat: Phase 4 Watermark — pdf-lib drawText with rotation, opacity, and diagonal positioning

**Implemented**:
- `src/lib/watermark.ts` — Pure function `addWatermark(buffer, options)`: embeds Helvetica font, draws rotated semi-transparent text centered on each page
- `src/components/tools/WatermarkTool.tsx` — UI: text input, font size picker (24–120pt), opacity slider (1–100%), rotation grid (−45°/0°/45°/90°), color presets + custom picker, page scope all/custom with range input, live preview

**Options**:
| Option | Default | Values |
|--------|---------|--------|
| Font size | 60pt | 24, 36, 48, 60, 72, 96, 120 |
| Opacity | 20% | 1–100% slider |
| Rotation | −45° | −45°, 0°, 45°, 90° |
| Color | `#cccccc` | 6 presets + custom color picker |
| Page scope | All | All pages or custom range (e.g. `1,3,5-7`) |

**Rotation behavior**: pdf-lib's `degrees()` helper rotates text around its start position. Text is centered on the page so diagonal watermarks span from center.

**Files created**:
| File | Purpose |
|------|---------|
| `src/lib/watermark.ts` | Core engine: add text watermark to PDF pages |
| `src/components/tools/WatermarkTool.tsx` | UI: text input, opacity, rotation, font size, scope |

**Files modified**:
| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `'watermark'` to `ToolType`, `WatermarkOptions` |
| `src/components/Header.tsx` | Added nav button (💧 icon) between 页码 and PDF→Image |
| `src/components/ToolPanel.tsx` | Added `<WatermarkTool />` route entry |
| `src/lib/shortcuts.ts` | Added `Ctrl+Shift+W` shortcut; inserted `watermark` at TOOL_ORDER index 5 |
| `src/components/EmptyState.tsx` | Added "添加水印" badge |

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅

---

---
### 2026-05-27 — i18n (EN/CN)

**Goal**: Full bilingual support — Chinese (zh-CN) and English (en). Auto-detect browser language, allow manual switch.

**Commits**:
- *(current)* — feat: Phase 4 i18n — bilingual support with custom I18nContext

**Implemented**:
- Custom Context-based i18n (no react-i18next dependency — 2 languages only)
- `src/i18n/types.ts` — Translation key type and params type
- `src/i18n/zh.ts` — Chinese translations (~200 keys, source of truth)
- `src/i18n/en.ts` — English translations (all keys translated)
- `src/i18n/index.tsx` — `I18nProvider` + `useI18n` hook with `t(key, params?)` interpolation
- `src/components/LocaleToggle.tsx` — Globe icon toggle (EN/中文) in header

**i18n system design**:
- `I18nContext` provides `t('key', { param })` function and `locale` state
- Locale stored in `localStorage` as `pdfx-locale`, defaults to `navigator.language`
- Supports `{{param}}` interpolation for dynamic values (file names, page counts, sizes)
- `t()` fallback: current locale → Chinese → raw key
- Key format: `{component}.{element}.{variant}` (flat keys, no nesting)

**Translation key coverage** (~200 keys):
| Area | Keys | Examples |
|------|------|---------|
| Layout shell | ~15 | Header nav labels, theme toggle, locale toggle |
| Landing page | 12 | Dropzone text, feature badges (9 tools) |
| File management | ~5 | File list header, page count, empty state |
| Preview | ~5 | Info bar, expand/collapse, load error |
| ToolPanel | ~4 | No tool hint, file count, loading |
| **MergeTool** | ~5 | Title, description, button with file count |
| **SplitTool** | ~15 | Tabs, extract/split forms, hints, error messages |
| **DeleteTool** | ~14 | Manual/select modes, hints, page counts, errors |
| **RotateTool** | ~18 | Angle labels, scope, selected count, button variants |
| **PageNumberingTool** | ~22 | Position grid, font size, color, prefix/suffix, preview |
| **WatermarkTool** | ~25 | Text, opacity, rotation, color, scope, preview |
| **PdfToImageTool** | ~18 | Scope, format, quality, DPI presets, progress |
| **ImageToPdfTool** | ~14 | Dropzone, add more, page size, margin, button |
| **PdfToMdTool** | ~16 | Description, limitation, empty, copy/download, stats |

**Files created** (5):
| File | Purpose |
|------|---------|
| `src/i18n/types.ts` | Translation key type + I18nParams type |
| `src/i18n/zh.ts` | Chinese translations (~200 keys) |
| `src/i18n/en.ts` | English translations (~200 keys) |
| `src/i18n/index.tsx` | I18nProvider + useI18n hook |
| `src/components/LocaleToggle.tsx` | Globe toggle button (EN/中文) |

**Files modified** (16):
| File | Changes |
|------|---------|
| `src/main.tsx` | Wrapped with `<I18nProvider>` |
| `src/components/Header.tsx` | `t()` calls, tools array inlined inside component, LocaleToggle added |
| `src/components/ThemeToggle.tsx` | `t()` for title attribute |
| `src/components/EmptyState.tsx` | Import `useI18n`, `t()` for all text |
| `src/components/FileDropzone.tsx` | Import `useI18n`, `t()` for dropzone text |
| `src/components/FileList.tsx` | Import `useI18n`, `t()` for empty/header/pageCount |
| `src/components/ThumbnailGrid.tsx` | Import `useI18n`, `t()` for info/noFile/expand/collapse/error |
| `src/components/ToolPanel.tsx` | Import `useI18n`, `t()` for hints |
| `src/components/tools/MergeTool.tsx` | `t()` for title/description/pageCount/button/error |
| `src/components/tools/SplitTool.tsx` | `t()` for tabs/forms/hints/placeholders/buttons |
| `src/components/tools/DeleteTool.tsx` | `t()` for tabs/hints/pageCount/selectedCount/errors |
| `src/components/tools/RotateTool.tsx` | `t()` for angles/scope/hints/button variants |
| `src/components/tools/PageNumberingTool.tsx` | `t()` for position/fontSize/color/prefix/suffix/preview |
| `src/components/tools/WatermarkTool.tsx` | `t()` for text/opacity/rotation/color/scope/preview |
| `src/components/tools/PdfToImageTool.tsx` | `t()` for scope/format/quality/DPI/progress |
| `src/components/tools/ImageToPdfTool.tsx` | `t()` for dropzone/size/pageSize/margin/button |
| `src/components/tools/PdfToMdTool.tsx` | `t()` for description/limitation/progress/copy/download |

**Locale behavior**:
- Default: reads `navigator.language`; if starts with `zh`, set Chinese; otherwise English
- Manual toggle: Globe icon in header toggles EN/中文 instantly
- Persistence: selection saved to `localStorage` as `pdfx-locale`
- Fallback: missing key → Chinese → raw key string

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅ (no new warnings)

---

### 2026-05-27 — Drag-and-Drop Page Reordering

**Goal**: Reorder pages within a single PDF by dragging thumbnails via native HTML5 Drag and Drop.

**Commits**:
- *(current)* — feat: Phase 4 Drag-and-Drop Page Reordering

**Implemented**:
- `src/lib/reorderPages.ts` — Core engine: `reorderPages(buffer, newOrder)` uses pdf-lib `copyPages()` to produce a new PDF with pages in the specified order
- `src/components/tools/ReorderTool.tsx` — Full UI with:
  - pdfjs-dist page thumbnail rendering (matching ThumbnailGrid pattern)
  - Native HTML5 Drag and Drop (`dragstart` / `dragover` / `drop`)
  - Red vertical line as drop position indicator
  - "Apply New Order" button → pdf-lib reorder → auto download
  - "Reset" button restoring original order
  - Unmodified check: when order unchanged, downloads original file directly
  - Page numbers show original page indices for easy identification

**Files created** (2):
| File | Purpose |
|------|---------|
| `src/lib/reorderPages.ts` | Core pdf-lib reorder engine |
| `src/components/tools/ReorderTool.tsx` | UI: thumbnail strip with drag-and-drop |

**Files modified** (6):
| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `'reorder'` to `ToolType` |
| `src/i18n/en.ts` | Added `header.tool.reorder` + 10 `reorder.*` translation keys |
| `src/i18n/zh.ts` | Added Chinese translations for all reorder keys |
| `src/components/Header.tsx` | Inserted Reorder button (Move icon) between Rotate and Page Numbering |
| `src/components/ToolPanel.tsx` | Added `<ReorderTool />` route entry |
| `src/components/EmptyState.tsx` | Added "页面排序 / Reorder Pages" badge with Move icon |
| `src/lib/shortcuts.ts` | Inserted `reorder` at TOOL_ORDER index 4 (numeric key `5`); added `Ctrl+Shift+R` shortcut |

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅ (2.20s, zero errors)
- LSP diagnostics: 0 errors, 0 warnings across all changed files

---

## Polish & Wrap-up (2026-05-27)

**Goal**: Address remaining quality-of-life improvements before feature freeze.

### Firefox Scrollbar Compatibility
- Added `scrollbar-width: thin` + `scrollbar-color` for Firefox (alongside existing `::-webkit-scrollbar`)
- Both light and dark mode scrollbar colors supported via `.dark` selector

### Vite Chunk Optimization
- Split into 5 independent chunks:
  | Chunk | Content | Size | Gzip |
  |-------|---------|------|------|
  | `pdflib-*.js` | pdf-lib | 436 KB | 180 KB |
  | `pdfjs-*.js` | pdfjs-dist API | 364 KB | 107 KB |
  | `index-*.js` | App code | 297 KB | 83 KB |
  | `framework-*.js` | React + ReactDOM | 11 KB | 4 KB |
  | `jszip.min-*.js` | jszip (on-demand) | 97 KB | 30 KB |
- Main app chunk reduced from 1,114 KB → 297 KB (**−73%**)

### PWA (Progressive Web App)
- Installed `vite-plugin-pwa` with Workbox `generateSW` strategy
- Precaches all static assets (15 entries, ~1.2 MB) for offline use
- Web App Manifest with 192×192 + 512×512 icons (generated from `pdfx.svg` via `sharp`)
- Auto-registration via `registerSW.js` with auto-update
- 5-second polling cycle in service worker scope

### MinerU API Integration (PDF/Office → Markdown)
**New tool**: "文档转换 / Doc Converter" — browser-based document parsing via MinerU Cloud API v4.

**Architecture**:
- **Privacy-first by default**: tool is off until user explicitly configures API endpoint + API key
- **Privacy warning banner**: amber alert visible on every use explaining data flows to MinerU servers
- **Config checkbox**: user must acknowledge data transfer before enabling

**Supported formats**: PDF, DOCX, PPTX, XLSX, PNG, JPG

**API flow** (MinerU Cloud API v4):
1. `POST /api/v4/file-urls/batch` → get presigned S3 upload URLs
2. `PUT` file content directly to cloud storage
3. `POST /api/v4/extract/task/batch` → submit extraction task
4. Poll `GET /api/v4/extract/task/{id}` every 5s until `status === "done"`
5. Download result ZIP → extract `full.md` + optional images

**Files created**:
| File | Purpose |
|------|---------|
| `src/lib/mineru.ts` | API client: presigned URL flow, task polling, ZIP extraction |
| `src/components/tools/MineruTool.tsx` | UI: config panel + privacy gate + dropzone + progress + preview + download |

**Files modified** (8):
| File | Changes |
|------|---------|
| `src/types/index.ts` | Added `'mineru'` to `ToolType`, `MineruConfig`, `MineruTaskStatus` |
| `src/components/Header.tsx` | Added Doc Convert nav button (FileSpreadsheet icon) |
| `src/components/ToolPanel.tsx` | Added `<MineruTool />` route entry |
| `src/components/EmptyState.tsx` | Added "文档转换 / Doc Converter" badge |
| `src/lib/shortcuts.ts` | Added `mineru` to TOOL_ORDER (numeric shortcut `0`) |
| `src/i18n/zh.ts` | Added 16 Chinese translation keys |
| `src/i18n/en.ts` | Added 16 English translation keys |

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅ (2.22s, zero errors)
- PWA: `dist/sw.js` + `dist/manifest.webmanifest` generated
- Chunk size warning: eliminated (all chunks < 500 KB)

### Final Build Summary

| Metric | Before | After |
|--------|--------|-------|
| Main JS chunk | 1,114 KB | 297 KB (−73%) |
| Chunk warnings | 1 (≥500 KB) | 0 |
| Total JS (gzip) | 377 KB | 408 KB (+MinerU + PWA) |
| Offline support | No | Yes (PWA SW) |
| Firefox scrollbar | Broken (invisible) | Working |
| Build time | 2.37s | 2.22s |

---

## Post-Phase-4 Bug Fixes & UX Improvements (2026-05-27)

**Commits**: *(not yet committed)*

**Fixed Issues**:

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | 上传 PDF 后仍需手动点击功能栏 | `ADD_FILES` reducer 不设置 `activeTool`，保持 `null` | Auto-set `activeTool` to `'merge'` on `ADD_FILES` when `activeTool` is null |
| 2 | 水印功能看起来「失败」 | 默认透明度 0.2 + 颜色 `#cccccc` — 水印实际存在但几乎不可见 | 默认 opacity 0.2 → 0.4，颜色 `#cccccc` → `#999999` |
| 3 | 水印无法预览实际效果 | 只有文本参数预览，无视觉渲染 | 新增 Canvas 预览：用 pdfjs-dist 渲染 PDF 第一页 + Canvas 2D 叠加水印文字（实时响应参数变化，200ms 防抖） |
| 4 | MinerU API 需用户手动输入 | UI 要求用户配置 endpoint + API key，隐私提示在配置页面内 | 改用 `VITE_MINERU_API_KEY` 环境变量（`.env.local` / GitHub Secret），新增独立隐私同意门（checkbox），用户确认后自动使用内置 Key。未设置 env var 时保留手动配置作为 fallback |
| 5 | 深色模式文件列表红色对比度不足 | `dark:bg-red-900/30` + `dark:text-red-400` 在深色背景上不明显 | 改为 `dark:bg-blue-900/30` + `dark:text-blue-400` + `dark:border-blue-800`，Header 活动状态同步修改 |

**Files changed**:

| File | Changes |
|------|---------|
| `src/contexts/AppContext.tsx` | ADD_FILES auto-selects `'merge'` when no tool active |
| `src/lib/watermark.ts` | Default opacity 0.2→0.4, color `#cccccc`→`#999999` |
| `src/components/tools/WatermarkTool.tsx` | Canvas visual preview (pdfjs-dist first page + Canvas 2D overlay), defaults sync |
| `src/components/tools/MineruTool.tsx` | Refactored: privacy-gate-first flow, env var API key, fallback manual config |
| `src/lib/mineru.ts` | Added `hasConsent()`, `saveConsent()`, `getBuiltInApiKey()` |
| `src/vite-env.d.ts` | Added `ImportMetaEnv` with `VITE_MINERU_API_KEY` |
| `src/components/FileList.tsx` | Dark mode active color red→blue |
| `src/components/Header.tsx` | Dark mode active color red→blue |
| `src/i18n/zh.ts` | Updated MinerU translation keys (privacy detail, consent, notice) |
| `src/i18n/en.ts` | Updated MinerU translation keys (privacy detail, consent, notice) |
| `.github/workflows/deploy.yml` | Inject `VITE_MINERU_API_KEY` from GitHub Secrets |
| `.env.example` | **New** — Environment variable template |

**New Files**:
| File | Purpose |
|------|---------|
| `.env.example` | Template for `VITE_MINERU_API_KEY` (gitignored `.env` / `.env.local`) |

**Verification**:
- `tsc --noEmit` ✅
- `npm run build` ✅ (1813 modules, 2.37s)
- LSP diagnostics: 0 errors across all changed files
