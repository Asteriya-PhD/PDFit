import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import zh from './zh'
import en from './en'
import type { I18nParams } from './types'

export type Locale = 'zh' | 'en'

const translations: Record<Locale, Record<string, string>> = { zh, en }

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem('pdfx-locale')
    if (stored === 'zh' || stored === 'en') return stored
  } catch { /* localStorage unavailable */ }
  if (typeof navigator !== 'undefined' && navigator.language.startsWith('zh')) return 'zh'
  return 'en'
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: I18nParams) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    try { localStorage.setItem('pdfx-locale', newLocale) } catch { /* noop */ }
  }

  const t = (key: string, params?: I18nParams): string => {
    const map = translations[locale] ?? zh
    let text = map[key] ?? zh[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.split(`{{${k}}}`).join(String(v))
      }
    }
    return text
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
