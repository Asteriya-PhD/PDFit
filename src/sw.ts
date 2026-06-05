/// <reference lib="webworker" />

// PDFit service worker. Built by vite-plugin-pwa using the
// InjectManifest strategy (see vite.config.ts). Workbox injects
// `self.__WB_MANIFEST` (the pre-cache list) at build time, and we
// handle runtime caching + the share-target POST flow ourselves.

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// Take over uncontrolled clients on first install so the new SW
// starts serving immediately. Without this, a stale SW could keep
// handling requests for up to a day after deploy.
self.addEventListener('install', () => {
  void self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// 1. Pre-cache the build output. Vite-plugin-pwa replaces the token
//    below with the actual manifest array at build time.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// 2. SPA navigation fallback. Any GET that doesn't match a precache
//    entry or a runtime route → serve index.html so React Router /
//    our URL-based deep links still work after offline.
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'pdfit-pages',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 * 7 }),
      ],
    }),
    {
      // Don't override the share-target POST.
      denylist: [/^\/api\//],
    }
  )
)

// 3. Runtime caching for the heavyweight chunks. First-load is slow;
//    returning users hit the cache and skip the download entirely.

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 86400 * 365 }),
    ],
  })
)

// LiteParse WASM bundle (~4 MB). Same rationale as before — the SW
// catches even programmatic `fetch` calls from the lazy loader.
registerRoute(
  ({ url }) => /\/assets\/liteparse_wasm_bg-.*\.wasm$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'liteparse-wasm',
    plugins: [
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 86400 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// exceljs (~270 KB gzip). Loaded on demand by PdfToXlsxTool.
registerRoute(
  ({ url }) => /\/assets\/exceljs\.min-.*\.js$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'exceljs',
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 86400 * 365 })],
  })
)

// pdfjs web worker (~1.4 MB). pdfjs-dist spawns it as a Worker; the
// SW still intercepts that fetch because workers fetch through the
// main thread.
registerRoute(
  ({ url }) => /\/assets\/pdf\.worker\.min-.*\.mjs$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'pdfjs-worker',
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 86400 * 365 })],
  })
)

// pdfjs library chunk (~360 KB). Pairs with the worker above.
registerRoute(
  ({ url }) => /\/assets\/pdfjs-.*\.js$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'pdfjs-lib',
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 86400 * 365 })],
  })
)

// pdf-lib chunk (~440 KB). Used by merge / split / delete / rotate
// / reorder / page-numbering / watermark / image-to-pdf.
registerRoute(
  ({ url }) => /\/assets\/pdflib-.*\.js$/.test(url.pathname),
  new CacheFirst({
    cacheName: 'pdf-lib',
    plugins: [new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 86400 * 365 })],
  })
)

// 4. Share-target POST handler. The OS share sheet POSTs a
//    multipart/form-data body to /PDFit/?share=received (the
//    `action` URL declared in the manifest). We intercept it here
//    before the navigation completes, stash the file in IDB under
//    the schema defined in src/lib/shareStore.ts, then 303-redirect
//    to the same URL as GET so the app boots with ?share=received
//    and drains the file. 303 is required (not 302) so the browser
//    does not re-POST.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'POST') return

  const url = new URL(req.url)
  if (url.searchParams.get('share') !== 'received') return
  // Path must be the manifest's action URL (with or without trailing
  // slash). Anything else is a normal POST we don't own.
  if (url.pathname !== '/PDFit/' && url.pathname !== '/PDFit') return

  event.respondWith(handleSharePost(req, url))
})

function openShareDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open('pdfit-share', 1)
    open.onupgradeneeded = () => {
      const db = open.result
      if (!db.objectStoreNames.contains('shared')) {
        db.createObjectStore('shared', { keyPath: 'id' })
      }
    }
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}

async function stashShare(blob: Blob, name: string): Promise<void> {
  const db = await openShareDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('shared', 'readwrite')
      tx.objectStore('shared').put({
        id: 'current',
        blob,
        name,
        receivedAt: Date.now(),
      })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

async function handleSharePost(req: Request, url: URL): Promise<Response> {
  try {
    // Clone because formData() consumes the body, and we want to be
    // defensive if we add more handlers later that also need it.
    const formData = await req.clone().formData()
    const file = formData.get('files')
    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const f = file as File
      await stashShare(f, f.name || 'shared.pdf')
    }
  } catch (err) {
    // Body unreadable (already consumed, or wrong enctype). Fall
    // through to the redirect so the app still boots cleanly.
    console.warn('[pdfit-sw] share POST body read failed:', err)
  }
  return Response.redirect(url.pathname + url.search, 303)
}

export {}
