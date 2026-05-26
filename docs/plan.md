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

**Goal**: Add PDF-to-other-format and other-format-to-PDF conversion capabilities.

**Strategy**:
- All 3 browser-safe features (**PDF→Markdown**, **PDF→Image**, **Image→PDF**) run in-browser — no server needed
- **PDF→Word/Excel**: Desktop-only via LibreOffice CLI; Web version uses optional remote API (MinerU)
- 0 new npm dependencies needed for browser features (reuse pdfjs-dist, pdf-lib, jszip)

---

#### Feature A: PDF → Image

**Goal**: Render PDF pages as PNG/JPEG images for download.

**Technical approach**:
- Reuse `ThumbnailGrid`'s pdfjs-dist canvas rendering pattern at full resolution
- Render each page at a configurable DPI (default 150, max 300) via `viewport.scale`
- Export as Blob via `canvas.toBlob()` — PNG (lossless) or JPEG (configurable quality)
- Single page → direct download; multiple pages → ZIP archive via jszip

**Files to create/modify**:
| File | Action | Purpose |
|---|---|---|
| `src/lib/pdfToImage.ts` | CREATE | Core engine: render page → canvas → blob |
| `src/components/tools/PdfToImageTool.tsx` | CREATE | UI: page range, format, DPI options |
| `src/types/index.ts` | MODIFY | Add `'pdf-to-image'` to `ToolType` union |
| `src/components/Header.tsx` | MODIFY | Add nav button + tool config entry |
| `src/components/ToolPanel.tsx` | MODIFY | Add route entry |

**UI states**:
- **No file selected**: 提示选择文件
- **File loaded, default view**: Show page range selector (all / custom), format toggle (PNG/JPEG), quality slider (JPEG), DPI selector
- **Loading**: Processing bar with page progress
- **Success**: Download triggered; optionally show result preview
- **Error**: Alert with error message (render failure, memory limit)

---

#### Feature B: Image → PDF

**Goal**: Convert one or more images (PNG/JPEG) into a single PDF document.

**Technical approach**:
- pdf-lib `embedPng()` / `embedJpg()` — both are synchronous once data is loaded
- Create page at image dimensions (use `image.scale(1)` for 1:1 sizing), maintain aspect ratio
- Support drag-and-drop or file picker for image selection
- Options: page size (auto / A4 / Letter), orientation, margins, sort order
- **⚠️ Images managed locally in component state** — NOT through AppContext (which is PDF-only, calls `PDFDocument.load()`). The tool component maintains its own `{ file: File; preview: string }[]` state for image files.

**Files to create/modify**:
| File | Action | Purpose |
|---|---|---|
| `src/lib/imageToPdf.ts` | CREATE | Core engine: embed images → PDFDocument |
| `src/components/tools/ImageToPdfTool.tsx` | CREATE | UI: file picker, reorder, options (self-contained image state) |
| `src/types/index.ts` | MODIFY | Add `ToolType` union member `'image-to-pdf'` |
| `src/components/Header.tsx` | MODIFY | Add nav button |
| `src/components/ToolPanel.tsx` | MODIFY | Add route entry |

**UI states**:
- **Empty (no images loaded)**: Dropzone for images (PNG/JPEG/WebP); accept image types
- **Images loaded**: Thumbnail list with drag-to-reorder, remove button per image, URL.createObjectURL preview
- **Options**: Page size (Auto / A4 / Letter), margin
- **Loading**: Processing bar
- **Success**: Download PDF
- **Error**: Invalid image format, memory limit

---

#### Feature C: PDF → Markdown

**Goal**: Extract text content from PDF and format as Markdown.

**Technical approach**:
- Use pdfjs-dist `page.getTextContent()` — returns `TextItem[]` with text, position (x, y), font size
- Algorithm:
  1. Group items by y-position → lines (same baseline)
  2. Sort lines top-to-bottom, items within lines left-to-right
  3. Heuristic heading detection: font size significantly larger than body → `# / ## / ###`
  4. Paragraph breaks: vertical gap > 1.5× line height
  5. Images: render page region → embed as `![page-N](image-data:...)` base64 ( optional)
- Output: `.md` file download + preview in a text area (user can copy)

**Trade-offs & limitations**:
- No table reconstruction — pdfjs text items don't encode table structure
- No native list detection — bullet chars (`•`, `-`, `*`) are heuristics
- CJK text extracts well (pdfjs has good CJK support)
- Scanned PDFs produce no text — handled gracefully with "detected as scanned document" message

**Files to create/modify**:
| File | Action | Purpose |
|---|---|---|
| `src/lib/pdfToMarkdown.ts` | CREATE | Core engine: text extraction → Markdown |
| `src/components/tools/PdfToMdTool.tsx` | CREATE | UI: mode selector, preview, download |
| `src/types/index.ts` | MODIFY | Add `ToolType` union member `'pdf-to-md'` |
| `src/components/Header.tsx` | MODIFY | Add nav button |
| `src/components/ToolPanel.tsx` | MODIFY | Add route entry |

**UI states**:
- **No file selected**: 提示选择 PDF
- **File loaded, default**: "提取 Markdown" button
- **Loading**: Extraction progress
- **Preview**: Textarea with extracted Markdown (read-only, selectable)
- **Actions**: Download `.md` file, Copy to clipboard
- **Empty result**: "此 PDF 可能为扫描件，无可提取的文本" + suggestion to use OCR tools

---

#### Feature D: PDF → Word/Excel (Desktop, post-MVP)

**Scope postponed**: Not in the initial Phase 3 implementation.

**Technical approach**:
- Desktop-only: Tauri Rust command → `exec` / `Command` → `libreoffice --headless --convert-to docx`
- Web: Optional MinerU API call (configurable endpoint)
- Desktop guide: If LibreOffice not found, show download link

**When to implement**: After A/B/C are stable and tested.

---

### Type Changes

The `ToolType` union in `src/types/index.ts` needs to be extended:

```typescript
// Before:
export type ToolType = 'merge' | 'split' | 'delete' | 'rotate' | null

// After:
export type ToolType = 'merge' | 'split' | 'delete' | 'rotate' | 'pdf-to-image' | 'image-to-pdf' | 'pdf-to-md' | null
```

Each tool also conforms to a consistent interface in `Header.tsx`:

```typescript
const tools: { type: ToolType; label: string; icon: typeof Combine }[] = [
  ...existing,
  { type: 'pdf-to-image', label: 'PDF转图片', icon: ImageIcon },
  { type: 'image-to-pdf', label: '图片转PDF', icon: FileImage },
  { type: 'pdf-to-md',    label: '提取Markdown', icon: FileText },
]
```

### Implementation Order

```
Feature A (PDF→Image) ─→ Feature B (Image→PDF) ─→ Feature C (PDF→Markdown)
```

**Rationale**:
1. **PDF→Image first** — simplest, reuses existing ThumbnailGrid canvas code, fastest win
2. **Image→PDF second** — independent of feature A, uses pdf-lib (already familiar), no pdfjs needed
3. **PDF→Markdown last** — most complex (positional layout reconstruction), benefits from the pattern established by A and B

**Testing plan** (per feature):

| Feature | Test Case | Steps | Expected Result |
|---|---|---|---|
| A (PDF→Image) | Single page extraction | Load 1-page PDF, select page 1, PNG, 150 DPI | Downloads single `.png` file at ~1240×1754 px |
| A | Multi-page ZIP | Load 3-page PDF, select all pages, JPEG quality 80 | Downloads `.zip` with 3 `.jpg` files |
| A | Custom DPI | Set 300 DPI, export 1 page | Image is ~2480×3508 px (2× size of 150 DPI) |
| A | Empty page | PDF with blank page | Exports blank white image, no crash |
| B (Image→PDF) | Single PNG | Drop 1 PNG, click convert | Downloads PDF; opens in viewer at correct dimensions |
| B | Multiple images | Drop 3 images (PNG+JPEG), drag reorder, convert | PDF has 3 pages in dropped order, correct orientation |
| B | A4 override | Set page size to A4, convert portrait image | Image centered on A4 page, aspect ratio preserved |
| B | Invalid file | Drop a `.txt` file | Rejected with format error; only PNG/JPEG accepted |
| C (PDF→MD) | Text extraction | Load text-heavy PDF, click extract | Preview shows readable Markdown with paragraph breaks |
| C | Headings | PDF with title + section headers | Output has `# Title`, `## Section` structure |
| C | Scanned PDF | Load image-only PDF (scanned) | Shows "可能为扫描件" message, empty preview |
| C | CJK text | Load Chinese PDF | Chinese characters extracted correctly, no garbled text |
| Cross | Large file | 500+ page PDF, export all as images | Progress indicator, no memory crash (may take time) |

**Rollback plan**:
Each feature is independently revertible (one commit per feature). If a feature causes issues, revert its single commit without affecting the others.

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
| 2026-05 | 0 new npm deps for Phase 3 browser features | pdfjs-dist + pdf-lib + jszip already cover all needs |
| 2026-05 | pdfjs getTextContent() for PDF→MD | Pure browser, no WASM or server; positional heuristics for structure |
| 2026-05 | PDF→Word/Excel postponed to post-MVP | LibreOffice CLI adds complexity; focus on browser-safe features first |

## Future Considerations

- **MinerU**: Lightweight API for heavy document conversions (PDF→Word/Excel).
  Consider using as an optional enhancement for the web version.
- **WASM PDF engine**: If pdf-lib performance becomes a bottleneck for very large
  files, evaluate pdf.js or other WASM-based alternatives.
- **PWA**: Adding a service worker would allow offline use and "install" capability
  without Tauri.
