import { useI18n } from '@/i18n'
import { Languages } from 'lucide-react'

export default function LocaleToggle() {
  const { locale, setLocale, t } = useI18n()

  const next = locale === 'zh' ? 'en' : 'zh'

  return (
    <button
      onClick={() => setLocale(next)}
      className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors flex items-center gap-1 text-xs font-medium"
      title={t(`localeToggle.title.${next}`)}
    >
      <Languages className="w-4 h-4" />
      <span>{t(`localeToggle.label.${next}`)}</span>
    </button>
  )
}
