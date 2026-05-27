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

### Phase 4: Polish & Extras ✅ (Dark Mode, Shortcuts, Page Numbering, Watermark completed)

**Goal**: Elevate the app from functional to polished — dark mode, i18n, UX shortcuts, and advanced PDF manipulations.

**Strategy**: Prioritize by value/effort ratio. Each feature is independently revertible. 0 new npm deps preferred; lightweight deps added only when the custom approach costs more.

**Implementation Order**:
```
Dark Mode ─→ Keyboard Shortcuts ─→ Page Numbering ─→ Watermark ─→ i18n ─→ Drag-and-Drop Page Reordering ─→ Compress PDF ─→ Batch Queue
```

**New dependencies considered** (added only per feature):
| Package | When | Version | Size | Purpose |
|---------|------|---------|------|---------|
| `@dnd-kit/core` + `@dnd-kit/sortable` | DnD reordering | latest | ~15KB gzip | Page drag-and-drop |
| `i18next` + `react-i18next` | i18n | latest | ~15KB gzip | Internationalization |

---

#### Feature 1: Dark Mode ✅

**Goal**: Full dark mode support with class-based toggle, system preference detection, and localStorage persistence.

**Technical approach**:
- Tailwind CSS v4's `dark` variant is built-in and uses the `prefers-color-scheme: dark` media query by default
- Override to **class-based** strategy for manual toggle: `@custom-variant dark (&:where(.dark, .dark *));` in `index.css`
- When the user toggles, add/remove `.dark` class on `<html>` element
- Store preference in localStorage as `'dark' | 'light' | 'system'`
- All hardcoded Tailwind color classes (`bg-white`, `text-gray-800`, `border-gray-200`, `bg-gray-50`, etc.) get `dark:` variants
- Use CSS custom properties for frequently repeated chrome colors to reduce repetition
- lucide-react icons inherit current color — no icon changes needed

**Tailwind v4 dark variant strategy**:

```css
/* Override media-query default to class-based */
@custom-variant dark (&:where(.dark, .dark *));
```

**Files to create/modify**:

| File | Action | Purpose |
|------|--------|---------|
| `src/index.css` | MODIFY | Add `@custom-variant dark`, CSS variables for chrome colors |
| `src/contexts/ThemeContext.tsx` | CREATE | Theme provider: state, toggle, persistence, system detection |
| `src/components/ThemeToggle.tsx` | CREATE | Sun/Moon icon toggle button |
| `src/main.tsx` | MODIFY | Wrap app with `ThemeProvider`, apply `.dark` on `<html>` |
| `src/components/Header.tsx` | MODIFY | Add `ThemeToggle` in header bar; add dark variants for all classes |
| `src/App.tsx` | MODIFY | Add dark variants for layout skeleton |
| `src/components/EmptyState.tsx` | MODIFY | Add dark variants |
| `src/components/FileList.tsx` | MODIFY | Add dark variants |
| `src/components/FileDropzone.tsx` | MODIFY | Add dark variants |
| `src/components/ThumbnailGrid.tsx` | MODIFY | Add dark variants |
| `src/components/ToolPanel.tsx` | MODIFY | Add dark variants |
| `src/components/tools/*.tsx` (7 files) | MODIFY | Add dark variants for all tool components |
| `src/lib/desktop.ts` | MODIFY | Optionally read system Tauri theme setting |
| `src/vite-env.d.ts` | MODIFY | No changes needed (Tailwind types are global) |

**Total**: ~14 files modified, 2 new files.

**UI states**:
- **Light (default)**: Current look — white/gray/red chrome
- **Dark toggled on**: Dark backgrounds (gray-900/800), light text, adjusted accent colors
- **System preference**: Auto-follows OS setting until user explicitly toggles
- **Persistence**: Preference survives page reload and tab close
- **Transition**: Smooth color transition via `transition-colors` on body

**Dark theme color map**:

| Element | Light | Dark |
|---------|-------|------|
| Page background | `white` / `gray-50` | `gray-950` / `gray-900` |
| Card/surface | `white` | `gray-800` |
| Border | `gray-200` | `gray-700` |
| Primary text | `gray-800` / `gray-700` | `gray-100` / `gray-200` |
| Secondary text | `gray-400` / `gray-500` | `gray-400` / `gray-500` |
| Accent (buttons, active) | `red-600` / `red-50` | `red-500` / `red-900/30` |
| Hover background | `gray-100` | `gray-700` |
| Dropzone border | `gray-300` | `gray-600` |
| Thumbnail placeholder | `gray-100` | `gray-800` |
| Scrollbar thumb | `#cbd5e1` | `#475569` |

---

#### Feature 2: Keyboard Shortcuts

**Goal**: Common keyboard shortcuts for faster workflows.

**Technical approach**:
- Global `useEffect` in `main.tsx` or a dedicated `useKeyboardShortcuts` hook
- Hotkeys fire only when no input/textarea is focused (check `document.activeElement?.tagName`)
- Define shortcuts as a config object in a new file `src/lib/shortcuts.ts`

**Shortcuts**:

| Key | Action | Scope |
|-----|--------|-------|
| `Ctrl+O` / `Cmd+O` | Open file dialog | Global |
| `Escape` | Deselect tool (set to null) | Global |
| `Ctrl+M` / `Cmd+M` | Switch to Merge | Global |
| `Ctrl+S` / `Cmd+S` | Switch to Split | Global |
| `Ctrl+D` / `Cmd+D` | Switch to Delete | Global |
| `Ctrl+R` / `Cmd+R` | Switch to Rotate | Global |
| `Ctrl+I` / `Cmd+I` | Switch to PDF→Image | Global |
| `Ctrl+Shift+I` | Switch to Image→PDF | Global |
| `Ctrl+Shift+M` | Switch to Extract Markdown | Global |
| `1`-`9` | Quick tool switch (numbered positions) | Global |
| `Ctrl+Z` / `Cmd+Z` | (Future) Undo last operation | Global |

**Files to create/modify**:

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/shortcuts.ts` | CREATE | Shortcut map definition and activation logic |
| `src/hooks/useKeyboardShortcuts.ts` | CREATE | Hook that listens to keydown and dispatches actions |
| `src/App.tsx` | MODIFY | Mount `useKeyboardShortcuts` |

**UI states**:
- Shortcuts work silently in the background
- No visible indication unless we add a tooltip or shortcut hint next to button labels (nice to have)
- When a text input/textarea is focused, all shortcuts are suppressed

---

#### Feature 3: Page Numbering ✅

**Goal**: Add page numbers as footer overlays to PDF pages before download.

**Technical approach**:
- pdf-lib `page.drawText()` to render page numbers at configurable positions
- Operates as a post-processing step on the output PDF of any operation
- Or as a standalone tool: load PDF → preview with numbering options → download
- Options: position (bottom-center / bottom-left / bottom-right / top-center / top-left / top-right), start number, font size, font color, prefix/suffix ("- 1 -", "Page 1 of N"), "X of Y" mode
- Embeds the same standard font (Helvetica) for minimal file size impact
- `pageNumbering.ts` exports a pure function `addPageNumbers(buffer: ArrayBuffer, options)` → `Uint8Array`

**Files created/modified**:

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/pageNumbering.ts` | CREATE | Core engine: draw page numbers on each page |
| `src/components/tools/PageNumberingTool.tsx` | CREATE | UI: position, font size, start number, preview |
| `src/types/index.ts` | MODIFY | Add `'page-numbering'` to `ToolType`, add `PageNumberPosition` + `PageNumberingOptions` types |
| `src/components/Header.tsx` | MODIFY | Add nav button (Hash icon) |
| `src/components/ToolPanel.tsx` | MODIFY | Add route entry |
| `src/lib/shortcuts.ts` | MODIFY | Add `Ctrl+Shift+N` shortcut, insert at TOOL_ORDER index 4 |
| `src/components/EmptyState.tsx` | MODIFY | Add feature badge |

**UI states**:
- **File loaded, default**: Position grid (6 options), font size picker (8–24px), color presets + custom, start number input, prefix/suffix input, "X of Y" toggle, live preview
- **Loading**: Processing overlay
- **Success**: Download numbered PDF
- **Error**: Message with error details

---

#### Feature 4: Watermark ✅

**Goal**: Add custom text watermarks to PDF pages.

**Technical approach**:
- pdf-lib `page.drawText()` rotated and semi-transparent across pages
- Use `page.setFont()` with existing embedded fonts
- Core engine: `addWatermark(buffer, options)` where options includes:
  - `text: string` — watermark text
  - `fontSize: number` (default 60)
  - `opacity: number` (0.0–1.0, default 0.2) — uses `drawText`'s `opacity` option
  - `rotation: number` (default -45 degrees, diagonal)
  - `color: string` (hex, default "#cccccc")
  - `pageScope: 'all' | number[]` (which pages to apply)
- For multi-page: iterate `doc.getPages()` and apply to each or selected pages
- pdf-lib supports RGBA fill via `rgb()` with separate opacity — combine for transparency effect
- `drawText()` with `xRotate`, `yRotate`, `opacity` parameters

**Files to create/modify**:

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/watermark.ts` | CREATE | Core engine: add text watermark to PDF pages |
| `src/components/tools/WatermarkTool.tsx` | CREATE | UI: text input, opacity, rotation, font size, scope |
| `src/types/index.ts` | MODIFY | Add `'watermark'` to `ToolType` |
| `src/components/Header.tsx` | MODIFY | Add nav button |
| `src/components/ToolPanel.tsx` | MODIFY | Add route entry |
| `src/components/EmptyState.tsx` | MODIFY | Add feature badge |

**UI states**:
- **File loaded, default**: Text input, opacity slider, rotation dropdown, font size, preview of watermark position
- **Loading**: Processing
- **Success**: Download watermarked PDF
- **Error**: Message with error info

---

#### Feature 5: i18n (English + Chinese)

**Goal**: Full bilingual support — Chinese (zh-CN) and English (en). Auto-detect browser language, allow manual switch.

**Technical approach**:
- Custom Context-based i18n (avoid react-i18next dependency for 2 languages)
- Translation files as TypeScript modules in `src/i18n/`
- `I18nContext` provides `t('key')` function and `locale` state
- Locale stored in localStorage, defaults to browser language (`navigator.language`)
- All user-facing strings extracted from components into translation keys
- Key format: `{component}.{element}.{variant}` e.g., `header.tool.merge`, `emptyState.dropzone.text`

**Translation file structure** (`src/i18n/`):

```
src/i18n/
├── zh.ts              # Chinese translations
├── en.ts              # English translations
├── index.ts           # I18nProvider + useI18n hook
└── types.ts           # Translation key type definitions
```

**Impact assessment**:
- Every component with user-facing text needs `t()` calls
- Estimated 150+ translation keys across the entire app
- Chinese is already the primary UI language — English will be the new addition
- This is mostly mechanical find-and-replace work

**Files to create/modify**:

| File | Action | Purpose |
|------|--------|---------|
| `src/i18n/index.ts` | CREATE | I18nProvider + useI18n hook |
| `src/i18n/types.ts` | CREATE | Translation key type |
| `src/i18n/zh.ts` | CREATE | Chinese translations (current strings as base) |
| `src/i18n/en.ts` | CREATE | English translations |
| `src/main.tsx` | MODIFY | Wrap with I18nProvider |
| `src/components/LocaleToggle.tsx` | CREATE | EN/中文 toggle button |
| `src/components/Header.tsx` | MODIFY | Use `t()`, add LocaleToggle |
| `src/App.tsx` | MODIFY | Use `t()` for any inline text |
| Every component with user-facing text (~15 files) | MODIFY | Replace hardcoded text with `t()` calls |

**UI states**:
- **Auto-detect**: On first visit, reads `navigator.language`; if starts with `zh`, set Chinese; otherwise English
- **Manual toggle**: Globe icon + "EN"/"中文" label in header
- **Persistence**: Selection saved to localStorage
- **Fallback**: If a key is missing in current locale, fall back to Chinese (source of truth)

**Trade-offs**:
- Custom i18n is lighter than react-i18next but lacks pluralization and interpolation utilities
- For this app's needs (simple string replacement), custom is sufficient
- If more than 2 languages are needed later, migrate to i18next

---

#### Feature 6: Drag-and-Drop Page Reordering

**Goal**: Reorder pages within a PDF by drag-and-drop (like MergeTool's file reorder, but at page level).

**Technical approach**:
- New tool: Reorder pages within a single PDF
- pdf-lib approach: extract all pages in the new order via `copyPages()` into a new document
- Page thumbnails rendered via existing pdfjs `ThumbnailGrid` pattern
- Use native HTML5 Drag and Drop API (no library needed for simple use case) OR use `@dnd-kit` for smooth animations
- Page thumbnails are rendered at 120px height for the reorder strip (compact)
- Drag ghost appears as semi-transparent thumbnail
- Drop zone indicators between thumbnails

**Implementation with native DnD**:
```
1. User starts dragging a thumbnail → `dragstart` sets page index as data
2. Dragover shows insertion indicator
3. Drop → page index moved to new position
4. State updates → new page order → diff from original → user clicks "确认"
5. On confirm: create new PDF with pages in new order
```

**Files to create/modify**:

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/reorderPages.ts` | CREATE | Core engine: reorder pages in a PDF document |
| `src/components/tools/ReorderTool.tsx` | CREATE | UI: thumbnail strip with drag-and-drop |
| `src/types/index.ts` | MODIFY | Add `'reorder'` to `ToolType` |
| `src/components/Header.tsx` | MODIFY | Add nav button |
| `src/components/ToolPanel.tsx` | MODIFY | Add route entry |
| `src/components/EmptyState.tsx` | MODIFY | Add feature badge |

**UI states**:
- **File loaded, default**: Horizontal thumbnail strip showing all pages in current order
- **Dragging**: Ghost thumbnail follows cursor, insertion line between pages
- **Dropped**: Visual reorder immediately in the strip; "撤销" button shown
- **Confirm**: "确认新顺序" button → triggers pdf-lib reorder → download
- **Reset**: User can reset to original order
- **Error**: Reorder failed (memory limit on very large documents)

---

#### Feature 7: Compress PDF

**Goal**: Reduce PDF file size by recompressing content objects.

**Technical approach**:
- pdf-lib's `PDFDocument.create()` with `useObjectStreams: true` and `objectsPerTick: 100`
- pdf-lib `save()` offers `useObjectStreams: true` flag which compresses cross-reference tables and object streams
- For deeper compression: re-encode images to JPEG via canvas (`canvas.toBlob('image/jpeg', quality)`) → embed back via pdf-lib
- Two modes:
  - **Fast**: Object stream compression only (~10-20% size reduction, lossless)
  - **Deep**: Re-compress images to JPEG quality 60 (30-70% size reduction, lossy)
- Deep mode renders each page via pdfjs canvas → exports as JPEG → creates new PDF with compressed images
- This is the same approach as "render all pages as images and make a new PDF" — very effective but converts text to images (lossy)
- **⚠️ Deep mode caveat**: Text becomes image; no selectable text; file may be larger for text-heavy PDFs

**Important limitation**: pdf-lib's native compression is weak. True compression requires either WASM (qpdf/pyramid) or server-side. For the browser-only scope, this feature offers modest gains.

**Files to create/modify**:

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/compressPdf.ts` | CREATE | Core engine: lossless (object streams) + lossy (image re-compression) |
| `src/components/tools/CompressTool.tsx` | CREATE | UI: mode selector (fast/deep), quality slider for deep mode |
| `src/types/index.ts` | MODIFY | Add `'compress'` to `ToolType` |
| `src/components/Header.tsx` | MODIFY | Add nav button |
| `src/components/ToolPanel.tsx` | MODIFY | Add route entry |
| `src/components/EmptyState.tsx` | MODIFY | Add feature badge |

**UI states**:
- **File loaded, default**: Show current file size (KB/MB), select compression mode
- **Fast mode**: One-click compress; shows compression ratio after
- **Deep mode**: Quality slider + warning that text becomes image-based
- **Loading**: Processing with progress
- **Success**: Shows "压缩前 X KB → 压缩后 Y KB (节省 Z%)", download button
- **Warning**: If compressed size is larger, show message and offer download of original

---

#### Feature 8: Batch Processing Queue

**Goal**: Queue multiple PDFs for sequential processing with progress tracking.

**Technical approach**:
- New `QueueContext` (separate from AppContext) managing a queue of `QueueItem[]`
- Each QueueItem: `{ id, file, operation, status: 'pending' | 'processing' | 'done' | 'error', result?, error? }`
- Operations can be any existing tool function (merge, split, rotate, etc.)
- Process queue sequentially: dequeue → execute → update status → next
- Show progress: "处理中 3/10" with per-item status list
- Results: individual downloads or "全部下载" ZIP
- ⚠️ **Complexity**: Most tools are designed for single-file operation; the queue abstraction layer needs to wrap each tool's logic

**This feature is structurally complex** because:
- Different tools have different inputs and outputs
- The UI needs to show progress for heterogeneous operations
- State management across tools needs rethinking

**Simplified approach (recommended)**:
- Rather than a full queue system, add "batch" support to the existing Split tool (already outputs multiple files)
- For other tools, single-session batch isn't a common use case for a browser-only tool
- **Reprioritize**: Only implement if user feedback demands it

**Files to create/modify** (if proceeding):

| File | Action | Purpose |
|------|--------|---------|
| `src/contexts/QueueContext.tsx` | CREATE | Queue state + processor |
| `src/components/QueuePanel.tsx` | CREATE | Queue status UI |
| `src/lib/processQueue.ts` | CREATE | Sequential queue executor |
| `src/types/index.ts` | MODIFY | Add queue-related types |
| `src/components/Header.tsx` | MODIFY | Add queue status badge |
| `src/App.tsx` | MODIFY | Add queue panel when active |

**UI states**:
- **Empty queue**: No items, hidden from view
- **Items added**: Queue panel shows list with status badges
- **Processing**: Progress bar + current item name, cancel button
- **Complete**: Download buttons per item + "全部下载 ZIP"
- **Error**: Red badge on failed item, retry button

---

### Phase 4 Feature Summary

| Priority | Feature | Effort | New Dependencies | Value |
|----------|---------|--------|-----------------|-------|
| 1 | Dark Mode | Medium | None | High (daily UX) |
| 2 | Keyboard Shortcuts | Low | None | Medium (power users) |
| 3 | Page Numbering | Low | None | High (common need) |
| 4 | Watermark | Medium | None | Medium (specific need) |
| 5 | i18n (EN/CN) | High | i18next + react-i18next (optional) | High (reach) |
| 6 | Drag-and-Drop Reorder | Medium | @dnd-kit (optional) | Medium |
| 7 | Compress PDF | Medium | None | Medium (limitations) |
| 8 | Batch Queue | High | None | Low (browser context) |

**Implementation rationale**:
1. **Dark Mode first** — Touches the most files, so doing it early avoids conflicts with other features
2. **Keyboard Shortcuts** — Cheap win, 2 new files, minimal conflict
3. **Page Numbering / Watermark** — Similar pdf-lib drawText patterns; can share helper code
4. **i18n** — Mechanical text replacement; works best after all UI features are stable
5. **DnD Reorder** — Standalone feature; can be implemented any time
6. **Compress PDF** — Technical caveats; lowest confidence feature; implement last when we know whether it's useful
7. **Batch Queue** — Most complex; only if user demand exists

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
