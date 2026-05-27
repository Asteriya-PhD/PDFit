import { useTheme } from '@/contexts/ThemeContext'
import { useI18n } from '@/i18n'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const { resolvedTheme, toggle } = useTheme()
  const { t } = useI18n()

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
      title={resolvedTheme === 'dark' ? t('themeToggle.title.dark') : t('themeToggle.title.light')}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  )
}
