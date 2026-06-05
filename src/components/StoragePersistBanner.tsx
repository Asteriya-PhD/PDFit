import { useState } from 'react'
import { useI18n } from '@/i18n'
import { useStoragePersist } from '@/hooks/useStoragePersist'
import { ShieldCheck, X } from 'lucide-react'

/**
 * Asks the user to grant persistent storage so the browser can't
 * auto-evict our heavy caches (4 MB LiteParse WASM, 1.4 MB pdfjs
 * worker, etc) when disk pressure hits. The actual browser prompt
 * is non-customizable — we just trigger `navigator.storage.persist()`
 * and the UA shows its own dialog.
 *
 * Shown when ALL of:
 *   - storage.usage / quota > 0.6 (storage getting full)
 *   - ≥ 2 successful file ops in this browser (cares about retention)
 *   - not persisted already
 *   - not dismissed in the last 30 days
 */
export default function StoragePersistBanner() {
  const { t } = useI18n()
  const { shouldShow, isChecking, grant, dismiss } = useStoragePersist()
  const [granting, setGranting] = useState(false)
  const [showGranted, setShowGranted] = useState(false)

  if (isChecking || !shouldShow) return null

  const handleGrant = async () => {
    setGranting(true)
    const ok = await grant()
    setGranting(false)
    if (ok) setShowGranted(true)
  }

  if (showGranted) {
    return (
      <div
        role="status"
        className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md text-xs"
        style={{
          backgroundColor: 'var(--color-accent-100)',
          color: 'var(--color-accent-700)',
          border: '1px solid var(--color-accent-200)',
          fontFamily: 'var(--font-body)',
        }}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>{t('persistBanner.granted')}</span>
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label={t('persistBanner.title')}
      className="mt-2 flex items-center gap-3 px-3 py-2 rounded-md"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-rule)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <ShieldCheck
        className="w-4 h-4 shrink-0"
        style={{ color: 'var(--color-accent)' }}
      />
      <div className="flex-1 min-w-0">
        <p
          className="text-xs font-semibold leading-snug"
          style={{ color: 'var(--color-ink)' }}
        >
          {t('persistBanner.title')}
        </p>
        <p
          className="text-xs leading-snug mt-0.5"
          style={{ color: 'var(--color-muted)' }}
        >
          {t('persistBanner.body')}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleGrant}
          disabled={granting}
          className="px-2.5 h-7 rounded text-xs font-medium transition-all"
          style={{
            backgroundColor: 'var(--color-accent-700)',
            color: '#ffffff',
            fontFamily: 'var(--font-body)',
          }}
        >
          {t('persistBanner.keep')}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-7 h-7 rounded inline-flex items-center justify-center"
          style={{
            color: 'var(--color-muted)',
            background: 'transparent',
            border: '1px solid var(--color-rule)',
          }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
