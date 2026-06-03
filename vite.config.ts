import { defineConfig } from 'vite'
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
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // pdfjs-dist's default entry uses web workers, which don't exist in
      // Node. Redirect to the legacy build (main-thread, no worker) for
      // vitest. The browser build still uses the default entry — the
      // browser code path sets GlobalWorkerOptions.workerSrc in pdfWorker.ts.
      'pdfjs-dist': path.resolve(__dirname, './node_modules/pdfjs-dist/legacy/build/pdf.mjs'),
    },
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
