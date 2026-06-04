import type { ToolType } from '@/types'

export type ShortcutAction =
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'DESELECT_TOOL' }
  | { type: 'OPEN_FILE' }

export interface ShortcutDef {
  key: string
  ctrl: boolean
  shift: boolean
  alt: boolean
  action: ShortcutAction
  label: string
}

/** Ordered tool list for number-key quick-switch */
export const TOOL_ORDER: ToolType[] = [
  'merge',
  'split',
  'delete',
  'reorder',
  'page-numbering',
  'watermark',
  'pdf-to-md',
  'rotate',
  'image-to-pdf',
  'pdf-to-image',
]

function buildNumericShortcuts(): ShortcutDef[] {
  return TOOL_ORDER.map((tool, i) => ({
    key: String(i + 1),
    ctrl: false,
    shift: false,
    alt: false,
    action: { type: 'SET_TOOL', tool },
    label: `Switch to ${tool}`,
  }))
}

export const SHORTCUTS: ShortcutDef[] = [
  // Ctrl+O / Cmd+O — Open file
  {
    key: 'o',
    ctrl: true,
    shift: false,
    alt: false,
    action: { type: 'OPEN_FILE' },
    label: 'Open PDF file',
  },

  // Escape — Deselect tool
  {
    key: 'Escape',
    ctrl: false,
    shift: false,
    alt: false,
    action: { type: 'DESELECT_TOOL' },
    label: 'Deselect tool',
  },

  // Ctrl+M / Cmd+M — Merge
  {
    key: 'm',
    ctrl: true,
    shift: false,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'merge' },
    label: 'Switch to Merge',
  },

  // Ctrl+S / Cmd+S — Split
  {
    key: 's',
    ctrl: true,
    shift: false,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'split' },
    label: 'Switch to Split',
  },

  // Ctrl+D / Cmd+D — Delete
  {
    key: 'd',
    ctrl: true,
    shift: false,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'delete' },
    label: 'Switch to Delete',
  },

  // Ctrl+E / Cmd+E — Rotate (Ctrl+R conflicts with browser reload)
  {
    key: 'e',
    ctrl: true,
    shift: false,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'rotate' },
    label: 'Switch to Rotate',
  },

  // Ctrl+I / Cmd+I — PDF→Image
  {
    key: 'i',
    ctrl: true,
    shift: false,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'pdf-to-image' },
    label: 'Switch to PDF→Image',
  },

  // Ctrl+Shift+I — Image→PDF
  {
    key: 'i',
    ctrl: true,
    shift: true,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'image-to-pdf' },
    label: 'Switch to Image→PDF',
  },

  // Ctrl+Shift+R — Reorder
  {
    key: 'r',
    ctrl: true,
    shift: true,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'reorder' },
    label: 'Switch to Reorder',
  },

  // Ctrl+Shift+N — Page Numbering
  {
    key: 'n',
    ctrl: true,
    shift: true,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'page-numbering' },
    label: 'Switch to Page Numbering',
  },

  // Ctrl+Shift+W — Watermark
  {
    key: 'w',
    ctrl: true,
    shift: true,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'watermark' },
    label: 'Switch to Watermark',
  },

  // Ctrl+Shift+M — Extract Markdown
  {
    key: 'm',
    ctrl: true,
    shift: true,
    alt: false,
    action: { type: 'SET_TOOL', tool: 'pdf-to-md' },
    label: 'Switch to Extract Markdown',
  },

  // Numeric shortcuts (1-8)
  ...buildNumericShortcuts(),
]
