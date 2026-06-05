import { useEffect, useState, useCallback } from 'react'

/**
 * Minimal structural type for the deferred-install-prompt event.
 * `BeforeInstallPromptEvent` isn't in the standard lib.dom.d.ts in some
 * TypeScript versions, so we mirror the shape we actually use.
 */
interface DeferredPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const INSTALLED_FLAG = 'pdfit-installed'
const IOS_DISMISS_FLAG = 'pdfit-ios-hint-dismissed'

/**
 * PWA install flow:
 *  - Captures `beforeinstallprompt` so we can show our own button
 *  - Falls back to an iOS-specific hint (Safari doesn't fire
 *    beforeinstallprompt; the only path to "install" is Share →
 *    Add to Home Screen)
 *  - Hides itself once the app is already running as a PWA
 *    (display-mode: standalone) or after a successful install
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [iosHintDismissed, setIosHintDismissed] = useState(false)

  useEffect(() => {
    // Detect display-mode: standalone — true if running as installed PWA
    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    setIsStandalone(standaloneQuery.matches)
    const onStandaloneChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches)
    standaloneQuery.addEventListener('change', onStandaloneChange)

    // Detect iOS Safari
    const ua = navigator.userAgent
    const isIosDevice = /iPhone|iPad|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream
    setIsIos(isIosDevice)
    setIosHintDismissed(localStorage.getItem(IOS_DISMISS_FLAG) === '1')
    if (localStorage.getItem(INSTALLED_FLAG) === '1') {
      setInstalled(true)
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault() // prevent the browser's own mini-infobar
      setDeferredPrompt(e as DeferredPromptEvent)
    }
    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      try { localStorage.setItem(INSTALLED_FLAG, '1') } catch {}
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
      standaloneQuery.removeEventListener('change', onStandaloneChange)
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome === 'accepted') {
      setInstalled(true)
      try { localStorage.setItem(INSTALLED_FLAG, '1') } catch {}
    }
    return outcome === 'accepted'
  }, [deferredPrompt])

  const dismissIosHint = useCallback(() => {
    setIosHintDismissed(true)
    try { localStorage.setItem(IOS_DISMISS_FLAG, '1') } catch {}
  }, [])

  // Show the button when we have a deferred prompt and we're not already
  // running as an installed PWA. iOS gets a separate hint path.
  const canInstall = !!deferredPrompt && !installed && !isStandalone
  const showIosHint = isIos && !isStandalone && !installed && !iosHintDismissed

  return { canInstall, install, installed, isStandalone, isIos, showIosHint, dismissIosHint }
}
