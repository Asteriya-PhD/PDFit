import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@/contexts/AppContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { I18nProvider } from '@/i18n'
import App from '@/App'
import { preloadLiteParse } from '@/lib/liteparse'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

// Warm the 4 MB LiteParse WASM in parallel with the rest of the app
// boot. By the time the user uploads a PDF and clicks "Extract Text",
// the parser is already initialized — no download latency on the
// critical path. Idempotent and non-blocking.
preloadLiteParse()

// Register the PWA service worker (autoUpdate strategy). We log update
// events to the console for debugging; a small "Update available"
// toast could be added later if needed.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, reg) {
    if (reg) {
      // Check for updates every hour — fresh content without aggressive polling.
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
    }
  },
  onRegisterError(err) {
    console.warn('PWA SW registration failed:', err)
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
)
