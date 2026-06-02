import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('pdfit-theme')
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch { /* localStorage unavailable */ }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    () => theme === 'system' ? getSystemTheme() : theme
  )

  // rAF throttle for toggle: coalesce rapid clicks into one frame so the
  // 250-350ms color transition doesn't restart mid-flight and cause flicker.
  const toggleRafRef = useRef<number | null>(null)
  const lastResolvedRef = useRef<ResolvedTheme>(resolvedTheme)
  useEffect(() => { lastResolvedRef.current = resolvedTheme }, [resolvedTheme])

  // Sync resolved theme whenever theme changes
  useEffect(() => {
    const resolved = theme === 'system' ? getSystemTheme() : theme
    setResolvedTheme(resolved)
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [theme])

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const isDark = mq.matches
      setResolvedTheme(isDark ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', isDark)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try { localStorage.setItem('pdfit-theme', newTheme) } catch { /* noop */ }
  }

  const toggle = useCallback(() => {
    if (toggleRafRef.current !== null) return
    toggleRafRef.current = requestAnimationFrame(() => {
      toggleRafRef.current = null
      const next = lastResolvedRef.current === 'dark' ? 'light' : 'dark'
      setThemeState(next)
      try { localStorage.setItem('pdfit-theme', next) } catch { /* noop */ }
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
