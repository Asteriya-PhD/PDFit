// Boot-time drain of a share-target handoff.
//
// Flow (see vite.config.ts `workbox.extensions` for the SW half):
//   1. OS share sheet → SW receives POST /PDFit/?share=received
//   2. SW extracts the PDF, stashes {blob, name} in IDB, 303-redirects
//      to the same URL as GET
//   3. Browser follows the redirect → this app boots at ?share=received
//   4. checkShareReceived() (called from main.tsx) reads IDB, hands the
//      file to AppContext.addFiles, fires a CustomEvent so UI can toast,
//      then strips the query param so reload / back-button don't
//      re-trigger.

import { readSharedFile, clearSharedFile } from '@/lib/shareStore'

export const SHARE_RECEIVED_EVENT = 'pdfit:share-received'

export interface ShareReceivedDetail {
  name: string
  size: number
}

export interface ShareReceiverHooks {
  /** Hand a freshly-constructed File to the app. */
  onFile: (file: File) => void | Promise<void>
  /** Run before the query param is stripped, after onFile resolves. */
  onLoaded?: (detail: ShareReceivedDetail) => void
}

/**
 * Reads `?share=received` from the URL. If present, drains the
 * stashed file from IDB and dispatches SHARE_RECEIVED_EVENT so the UI
 * can announce it. Returns a promise that resolves once the file has
 * been added (or immediately if there was no share to drain).
 */
export async function checkShareReceived(hooks: ShareReceiverHooks): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  if (params.get('share') !== 'received') return false

  // Clear the param first so any subsequent reload / share doesn't
  // re-fire. Safe to do before reading IDB: the OS share sheet only
  // navigates here once per share.
  params.delete('share')
  const next =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : '') +
    window.location.hash
  window.history.replaceState({}, '', next)

  let shared: Awaited<ReturnType<typeof readSharedFile>>
  try {
    shared = await readSharedFile()
  } catch (err) {
    console.warn('[pdfit] IDB read failed for shared file:', err)
    return false
  }
  if (!shared) {
    // User visited /?share=received manually with no file stashed.
    return false
  }

  // The original File's name + type live in the stashed record. Wrap
  // the blob in a File so the rest of the app (addFiles → pdf-lib
  // page-count probe) doesn't have to special-case Blobs.
  const file = new File([shared.blob], shared.name, {
    type: 'application/pdf',
    lastModified: shared.receivedAt,
  })

  try {
    await hooks.onFile(file)
  } finally {
    // Clear IDB even if the consumer threw — otherwise the same file
    // will keep re-appearing on every reload.
    await clearSharedFile().catch(() => {})
  }

  const detail: ShareReceivedDetail = { name: shared.name, size: shared.blob.size }
  hooks.onLoaded?.(detail)
  window.dispatchEvent(new CustomEvent<ShareReceivedDetail>(SHARE_RECEIVED_EVENT, { detail }))
  return true
}
