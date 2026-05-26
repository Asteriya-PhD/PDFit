export interface PDFFileInfo {
  id: string
  name: string
  size: number
  file: File
  arrayBuffer: ArrayBuffer
  pageCount: number
}

export type ToolType = 'merge' | 'split' | 'delete' | 'rotate' | null

export interface PageRange {
  start: number // 1-based inclusive
  end: number   // 1-based inclusive
}

export type RotationAngle = 90 | 180 | 270
