export interface PDFFileInfo {
  id: string
  name: string
  size: number
  file: File
  arrayBuffer: ArrayBuffer
  pageCount: number
}

export type ToolType = 'merge' | 'split' | 'delete' | 'rotate' | 'reorder' | 'page-numbering' | 'watermark' | 'pdf-to-image' | 'image-to-pdf' | 'pdf-to-md' | 'mineru' | null

export interface MineruConfig {
  endpoint: string
  apiKey: string
}

export interface MineruTaskStatus {
  task_id: string
  status: 'pending' | 'running' | 'done' | 'failed'
  result?: {
    markdown: string
    images?: Record<string, string>
  }
}

export interface PageRange {
  start: number // 1-based inclusive
  end: number   // 1-based inclusive
}

export type RotationAngle = 90 | 180 | 270

export type PageNumberPosition = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right'

export interface PageNumberingOptions {
  startNumber: number
  position: PageNumberPosition
  fontSize: number
  color: string
  prefix: string
  suffix: string
  showTotalPages: boolean
}

export interface WatermarkOptions {
  text: string
  fontSize: number
  opacity: number
  rotation: number
  color: string
  pageScope: 'all' | string
}
