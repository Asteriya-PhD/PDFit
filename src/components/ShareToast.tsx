// A small dismissible toast that announces a just-received share.
//
// Renders nothing until a 'pdfit:share-received' CustomEvent fires
// (dispatched by shareReceiver.ts). Auto-dismisses after 5s, or
// immediately on close. Positioned absolutely over the main column
// so it stays visible whether the app is on the landing page or in
// the split-pane file view.
//
// A11y: role=status + aria-live=polite means screen readers will
// read the filename but won't interrupt the user's current focus.
// Tab focus goes to the close button for keyboard dismissal.

import { useCallback, useEffect, useRef, useState } from 'react'
import { FileCheck2, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useShareReceivedToast, type ShareReceivedDetail } from '@/hooks/usePwaDeepLinks'

const AUTO_DISMISS_MS = 5_000

export default function ShareToast() {
  const { t } = useI18n()
  const [detail, setDetail] = useState<ShareReceivedDetail | null>(null)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setDetail(null)
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current)
      dismissTimer.current = null
    }
  }, [])

  const handler = useCallback(
    (d: ShareReceivedDetail) => {
      setDetail(d)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
      dismissTimer.current = setTimeout(() => {
        setDetail(null)
        dismissTimer.current = null
      }, AUTO_DISMISS_MS)
    },
    []
  )

  useShareReceivedToast(handler)

  useEffect(() => {
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  if (!detail) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[min(420px,calc(100vw-32px))] flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-lg"
      style={{
        backgroundColor: 'var(--color-ink)',
        color: 'var(--color-paper)',
        fontFamily: 'var(--font-body)',
        fontSize: '13px',
        lineHeight: 1.4,
      }}
    >
      <FileCheck2 className="w-4 h-4 shrink-0" style={{ color: 'var(--color-accent)' }} />
      <span className="flex-1 min-w-0 truncate">
        {t('shareReceived.toast', { filename: detail.name })}
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('shareReceived.dismiss')}
        className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
