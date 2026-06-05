import { useState } from 'react'
import { useI18n } from '@/i18n'
import { usePwaInstall } from '@/hooks/usePwaInstall'
import { Download, Smartphone, X } from 'lucide-react'

/**
 * "Install" affordance that lives in the Header right side. Has three
 * render paths:
 *   1. Installed (display-mode: standalone or appinstalled) — nothing
 *   2. iOS Safari — "Add to Home Screen" hint with a dismissible popover
 *   3. Other browsers (Chrome/Edge/etc.) — Install button that triggers
 *      the native install prompt
 */
export default function InstallButton() {
  const { t } = useI18n()
  const { canInstall, install, isStandalone, installed, showIosHint, dismissIosHint } =
    usePwaInstall()
  const [iosPopoverOpen, setIosPopoverOpen] = useState(false)
  const [installing, setInstalling] = useState(false)

  if (isStandalone || installed) return null

  const handleInstall = async () => {
    setInstalling(true)
    try {
      await install()
    } finally {
      setInstalling(false)
    }
  }

  // Chrome / Edge / desktop install path
  if (canInstall) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        disabled={installing}
        className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md text-xs font-medium transition-all duration-200"
        style={{
          backgroundColor: 'var(--color-accent-700)',
          color: '#ffffff',
          fontFamily: 'var(--font-body)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--color-accent-600)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'var(--color-accent-700)'
        }}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{t('installButton.label')}</span>
      </button>
    )
  }

  // iOS Safari path
  if (showIosHint) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setIosPopoverOpen(v => !v)}
          className="inline-flex items-center gap-1 px-2 h-8 rounded-md text-xs font-medium transition-all duration-200"
          style={{
            border: '1px solid var(--color-rule)',
            color: 'var(--color-muted)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.05em',
            background: 'transparent',
          }}
          aria-haspopup="dialog"
          aria-expanded={iosPopoverOpen}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>iOS</span>
        </button>
        {iosPopoverOpen && (
          <div
            role="dialog"
            aria-label={t('installButton.iosHint.title')}
            className="absolute right-0 top-full mt-2 w-72 z-50 rounded-lg"
            style={{
              backgroundColor: 'var(--color-ink)',
              color: 'var(--color-paper)',
              padding: '14px 16px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
              border: '1px solid var(--color-ink)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p
                className="text-xs font-semibold"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
              >
                {t('installButton.iosHint.title')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIosPopoverOpen(false)
                  dismissIosHint()
                }}
                aria-label="Close"
                className="opacity-60 hover:opacity-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              {t('installButton.iosHint.body')}
            </p>
          </div>
        )}
      </div>
    )
  }

  return null
}
