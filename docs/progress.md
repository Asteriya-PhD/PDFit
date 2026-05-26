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
- *(current)* — Phase 2 fixes: edition, CLI deps, multi-file dialog, project docs

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

### Phase 3: Conversion Features ⬜

*Not started.*

### Phase 3: Conversion Features ⬜

*Not started.*

### Phase 4: Polish & Extras ⬜

*Not started.*
