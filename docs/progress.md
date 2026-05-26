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

### Phase 2: Desktop App ⬜

*Not started.*

### Phase 3: Conversion Features ⬜

*Not started.*

### Phase 4: Polish & Extras ⬜

*Not started.*
