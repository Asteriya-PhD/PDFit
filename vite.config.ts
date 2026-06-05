import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pdfit.svg', 'icons/pwa-192x192.png', 'icons/pwa-512x512.png'],
      manifest: {
        name: 'PDFit',
        short_name: 'PDFit',
        description: 'Privacy-first browser-based PDF manipulation tool',
        theme_color: '#DC2626',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 86400 * 365 } },
          },
          {
            // LiteParse WASM bundle (~4 MB) — the big one. CacheFirst so
            // returning users don't re-download it; the browser also
            // pre-warms this via preloadLiteParse() in main.tsx on first
            // visit so the very first extract is also fast.
            urlPattern: /\/assets\/liteparse_wasm_bg-.*\.wasm$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'liteparse-wasm',
              expiration: { maxEntries: 4, maxAgeSeconds: 86400 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Excel export — exceljs (~940 KB raw, ~270 KB gzip). Used
            // by PdfToXlsxTool via dynamic import. First-clicks slow
            // until cached, then instant.
            urlPattern: /\/assets\/exceljs\.min-.*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'exceljs',
              expiration: { maxEntries: 4, maxAgeSeconds: 86400 * 365 },
            },
          },
          {
            // pdfjs web worker (~1.4 MB raw). Loaded by pdfjs-dist as a
            // Worker; the SW intercepts the fetch even for worker URLs.
            urlPattern: /\/assets\/pdf\.worker\.min-.*\.mjs$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs-worker',
              expiration: { maxEntries: 4, maxAgeSeconds: 86400 * 365 },
            },
          },
          {
            // pdfjs library chunk (~360 KB). Pairs with the worker above.
            urlPattern: /\/assets\/pdfjs-.*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdfjs-lib',
              expiration: { maxEntries: 4, maxAgeSeconds: 86400 * 365 },
            },
          },
          {
            // pdf-lib chunk (~440 KB). Used by merge / split / delete /
            // rotate / reorder / page-numbering / watermark / image-to-pdf.
            urlPattern: /\/assets\/pdflib-.*\.js$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pdf-lib',
              expiration: { maxEntries: 4, maxAgeSeconds: 86400 * 365 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vitest-only config. The browser build must keep the real pdfjs-dist
  // entry so the worker URL resolves at runtime; tests get a legacy
  // redirect because Node has no Worker global.
  test: {
    alias: [
      {
        find: 'pdfjs-dist',
        replacement: path.resolve(__dirname, './node_modules/pdfjs-dist/legacy/build/pdf.mjs'),
      },
    ],
  },
  base: process.env.VITE_BASE || '/PDFit/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          pdfjs: ['pdfjs-dist'],
          pdflib: ['pdf-lib'],
          framework: ['react', 'react-dom'],
        },
      },
    },
  },
})
