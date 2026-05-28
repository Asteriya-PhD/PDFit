import { useI18n } from '@/i18n'
import { Languages } from 'lucide-react'

export default function LocaleToggle() {
  const { locale, setLocale, t } = useI18n()

  const next = locale === 'zh' ? 'en' : 'zh'

  return (
    <button
      onClick={() => setLocale(next)}
      className="btn-icon"
      style={{ width: 'auto', padding: '0 12px', gap: '6px' }}
      title={t(`localeToggle.title.${next}`)}
    >
      <Languages className="w-4 h-4" />
      <span
        className="text-xs font-medium"
        style={{ fontFamily: 'var(--font-heading)' }}
      >
        {t(`localeToggle.label.${next}`)}
      </span>
    </button>
  )
}
