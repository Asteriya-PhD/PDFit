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
      // InjectManifest lets us write the SW in TypeScript
      // (src/sw.ts). It's how we get a custom `fetch` listener for
      // the share_target POST without shelling out to a parallel
      // generateSW + importScripts config.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'pdfit.svg',
        'icons/pwa-192x192.png',
        'icons/pwa-512x512.png',
        'icons/apple-touch-icon.png',
        'icons/maskable-icon-512x512.png',
        'icons/shortcut-word.png',
        'icons/shortcut-excel.png',
        'icons/shortcut-merge.png',
      ],
      injectManifest: {
        // Workbox InjectManifest glob. The pre-cache list is injected
        // at build time into the SW via self.__WB_MANIFEST.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        // We don't want the share-target action URL itself in the
        // precache (it would shadow the fetch listener). index.html
        // is what navigateFallback will serve for SPA routing.
      },
      manifest: {
        id: '/PDFit/',
        name: 'PDFit — 12 PDF tools, 0 servers',
        short_name: 'PDFit',
        description:
          'Privacy-first PDF toolbox. Merge, split, convert to Word/Excel, watermark, and more — entirely in your browser.',
        theme_color: '#d97757',
        background_color: '#f4f1e8',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '.',
        scope: '.',
        lang: 'en',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Long-press the installed-app icon → jump straight to a tool.
        // URL is resolved against the manifest's base path, so
        // '/PDFit/?tool=word' lands on /PDFit/?tool=word (the app
        // reads ?tool= on boot via src/lib/urlRouter.ts).
        shortcuts: [
          {
            name: 'Convert to Word',
            short_name: 'To Word',
            description: 'Open a PDF and convert to editable .docx',
            url: '/PDFit/?tool=word',
            icons: [{ src: 'icons/shortcut-word.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Convert to Excel',
            short_name: 'To Excel',
            description: 'Open a PDF and extract tables to .xlsx',
            url: '/PDFit/?tool=excel',
            icons: [{ src: 'icons/shortcut-excel.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Merge PDFs',
            short_name: 'Merge',
            description: 'Combine multiple PDFs into one',
            url: '/PDFit/?tool=merge',
            icons: [{ src: 'icons/shortcut-merge.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        // Share sheet → PDFit. The action URL doubles as the app's
        // "share received" trigger: after the SW stashes the file in
        // IndexedDB (see src/sw.ts) it 303-redirects to the same URL
        // as GET, and the app boot (src/lib/shareReceiver.ts) drains
        // IDB.
        share_target: {
          action: '/PDFit/?share=received',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{ name: 'files', accept: ['application/pdf'] }],
          },
        },
      },
      // The runtime caching rules moved into src/sw.ts so we can use
      // real TypeScript + registerRoute. Keeping them here would
      // duplicate logic; this block intentionally omits `workbox:`.
      devOptions: {
        // Don't activate the SW during `vite dev` — it makes HMR
        // // unreliable and the share-target flow only matters once
        // // shipped to GH Pages.
        enabled: false,
        type: 'module',
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
