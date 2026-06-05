import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from '@/contexts/AppContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { I18nProvider } from '@/i18n'
import App from '@/App'
import { preloadLiteParse } from '@/lib/liteparse'
import './index.css'

// Warm the 4 MB LiteParse WASM in parallel with the rest of the app
// boot. By the time the user uploads a PDF and clicks "Extract Text",
// the parser is already initialized — no download latency on the
// critical path. Idempotent and non-blocking.
preloadLiteParse()

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
