import { useTheme } from '@/contexts/ThemeContext'
import { useI18n } from '@/i18n'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme()
  const { t } = useI18n()

  const isDark = resolvedTheme === 'dark'

  return (
    <button
      onClick={toggle}
      className="btn-icon relative overflow-hidden"
      title={isDark ? t('themeToggle.title.dark') : t('themeToggle.title.light')}
      aria-label={isDark ? t('themeToggle.title.dark') : t('themeToggle.title.light')}
    >
      <span
        key={isDark ? 'sun' : 'moon'}
        className="inline-block theme-toggle-icon"
      >
        {isDark ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </span>
    </button>
  )
}
