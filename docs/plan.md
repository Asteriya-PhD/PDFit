# PDFit — Development Plan

## Vision

A lightweight, privacy-first PDF manipulation tool that runs **entirely in the browser**. No uploads, no servers, no accounts. Available as both a web app (GitHub Pages) and a desktop app (Tauri/Windows).

## Development Phases

### Phase 1: Core PDF Operations ✅ (Completed)

**Goal**: Validate that all basic PDF operations are feasible client-side with pdf-lib.

**Deliverables**:
- [x] Web app scaffold (Vite + React + TypeScript + Tailwind)
- [x] Core PDF engine — split, merge, delete pages, rotate pages
- [x] File drag-and-drop import
- [x] PDF.js thumbnail preview (expandable)
- [x] Merge tool with file reordering
- [x] Split tool (extract pages + split by ranges)
- [x] Delete tool (by page input or click selection)
- [x] Rotate tool (90°/180°/270°, all or selected pages)
- [x] GitHub Pages deployment via GitHub Actions

**Testing**:
- [x] Split by range (5-10) — correct
- [x] Extract pages (1,3,5-7) — fixed range parsing bug
- [x] Thumbnail preview — fixed worker version mismatch, orientation, clipping

---

### Phase 2: Desktop App (Tauri + Windows Installer) ✅

**Goal**: Package the web app as a native Windows/macOS/Linux desktop application.

**Deliverables**:
- [x] Tauri v2 project setup in the same repo (`src-tauri/`)
- [x] React SPA embedded in WebView (100% code reuse)
- [x] Native file dialogs (open/save) via `@tauri-apps/plugin-dialog`
- [x] Windows .msi installer via WiX
- [x] PDF file association (`ext: ["pdf"]`)
- [x] Auto-updater via GitHub Releases API
- [x] Cross-platform abstraction layer (`desktop.ts`, `tauri.ts`, `download.ts`)
- [x] macOS `.dmg` + Linux AppImage build targets

**Considerations**:
- Tauri binary: ~5MB, Electron alternative would be ~150MB
- Rust backend can call CLI tools for future conversion features
- Share 100% of the React codebase with the web version

---

### Phase 3: Conversion Features ⬜

**Goal**: Add PDF-to-other-format conversion capabilities.

**Deliverables**:
- [ ] PDF → Markdown (using pdf.js text extraction or PyMuPDF4LLM)
- [ ] PDF → Image (canvas-based export)
- [ ] Image → PDF (pdf-lib supports this natively)
- [ ] PDF → Word/Excel (Desktop: LibreOffice CLI; Web: optional API)

**Conversion Strategy**:
- **Web version**: Only features that can run in-browser (PDF→MD, PDF→Image, Image→PDF). Heavy conversions (Word/Excel) use optional remote API (MinerU or similar).
- **Desktop version**: Heavy conversions call locally installed LibreOffice (`--headless --convert-to`). User is guided to install LibreOffice if not detected.

---

### Phase 4: Polish & Extras ⬜

**Deliverables**:
- [ ] Dark mode
- [ ] i18n (English + Chinese)
- [ ] Batch processing queue
- [ ] Drag-and-drop page reordering
- [ ] Watermark
- [ ] Page numbering
- [ ] Compress PDF
- [ ] Keyboard shortcuts

---

## Technical Decisions Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-05 | pdf-lib for operations | Pure JS, no native deps, handles all Phase 1 needs |
| 2026-05 | pdfjs-dist for preview only | Separate rendering from manipulation |
| 2026-05 | Tailwind CSS v4 | Zero-config, CSS-first, smaller output |
| 2026-05 | GitHub Pages + Actions | Free hosting, auto-deploy on push |
| 2026-05 | Local pdfjs worker (not CDN) | Avoid version mismatch, offline support |
| 2026-05 | Dynamic thumbnail height | Guarantees full page visibility regardless of orientation |

## Future Considerations

- **MinerU**: Lightweight API for heavy document conversions (PDF→Word/Excel).
  Consider using as an optional enhancement for the web version.
- **WASM PDF engine**: If pdf-lib performance becomes a bottleneck for very large
  files, evaluate pdf.js or other WASM-based alternatives.
- **PWA**: Adding a service worker would allow offline use and "install" capability
  without Tauri.
