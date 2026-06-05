// IndexedDB helper for the share-target flow.
//
// Schema mirrors the schema written by the Workbox extension inside
// vite.config.ts (see `extensions:`). The SW stashes `{ id: 'current',
// blob, name, receivedAt }`; the app boot reads it back here.
//
// We keep the store intentionally minimal: one record with a fixed key.
// A queue would let us receive multiple shares in a row before the app
// loads, but that's not a flow the OS share sheet produces — the app
// is launched (or foregrounded) for each share — so a single slot
// suffices.

const DB_NAME = 'pdfit-share'
const STORE = 'shared'
const KEY = 'current'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export interface SharedFile {
  id: string
  name: string
  blob: Blob
  receivedAt: number
}

/** Read the most-recently stashed share, if any. */
export async function readSharedFile(): Promise<SharedFile | null> {
  const db = await openDb()
  try {
    return await new Promise<SharedFile | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => resolve((req.result as SharedFile | undefined) ?? null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

/** Drop the stashed share after the app has consumed it. */
export async function clearSharedFile(): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}
