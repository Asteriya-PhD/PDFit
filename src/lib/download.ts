import { saveFileDialog } from './tauri'

/**
 * Download a blob as a file.
 * On desktop (Tauri): opens native save dialog.
 * On web: triggers browser download.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  await saveFileDialog(blob, filename)
}

/**
 * Trigger download with blob URL (web only)
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}