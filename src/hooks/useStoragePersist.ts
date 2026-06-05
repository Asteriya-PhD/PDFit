import { useEffect, useState, useCallback } from 'react'

/**
 * Two-tier "is storage about to be evicted?" signal.
 *
 *  Tier 1: storage estimate (browser reports quota + current usage).
 *  Tier 2: persisted() — already protected.
 *
 * We only nag when BOTH conditions are true:
 *   - NOT already persisted
 *   - usage / quota > 0.6 (storage getting full — eviction risk)
 *   - the user has used the app enough to care (≥ 2 successful file
 *     conversions in this browser)
 *   - the user hasn't dismissed the prompt in the last 30 days
 *
 * The "≥ 2 conversions" gate keeps us from asking first-time visitors
 * for permission; the 30-day cooldown keeps us from pestering returners.
 */

const VISIT_KEY = 'pdfit-conversions' // every successful file op increments
const DISMISS_KEY = 'pdfit-persist-dismissed-at' // ISO timestamp; 30-day TTL
const DISMISS_TTL_DAYS = 30
const MIN_CONVERSIONS = 2
const USAGE_THRESHOLD = 0.6

function readConversions(): number {
  try {
    return Number(localStorage.getItem(VISIT_KEY) || '0')
  } catch {
    return 0
  }
}

function readDismissedAt(): number {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    return raw ? Date.parse(raw) : 0
  } catch {
    return 0
  }
}

function isDismissedRecently(): boolean {
  const dismissedAt = readDismissedAt()
  if (!dismissedAt) return false
  const ageMs = Date.now() - dismissedAt
  return ageMs < DISMISS_TTL_DAYS * 24 * 60 * 60 * 1000
}

export function recordConversion(): void {
  try {
    const next = readConversions() + 1
    localStorage.setItem(VISIT_KEY, String(next))
  } catch {}
}

export function useStoragePersist() {
  const [shouldShow, setShouldShow] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isPersisted, setIsPersisted] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      // Skip the entire flow on browsers without the Storage API
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
        setIsChecking(false)
        return
      }
      try {
        const [persisted, estimate] = await Promise.all([
          navigator.storage.persisted(),
          navigator.storage.estimate(),
        ])
        if (cancelled) return
        setIsPersisted(persisted)
        const usage = estimate.usage ?? 0
        const quota = estimate.quota ?? 0
        const ratio = quota > 0 ? usage / quota : 0
        const eligible =
          !persisted &&
          ratio > USAGE_THRESHOLD &&
          readConversions() >= MIN_CONVERSIONS &&
          !isDismissedRecently()
        setShouldShow(eligible)
      } catch {
        // API failure → don't nag
      } finally {
        if (!cancelled) setIsChecking(false)
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [])

  const grant = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
      return false
    }
    try {
      const granted = await navigator.storage.persist()
      if (granted) {
        setIsPersisted(true)
        setShouldShow(false)
      }
      return granted
    } catch {
      return false
    }
  }, [])

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, new Date().toISOString())
    } catch {}
    setShouldShow(false)
  }, [])

  return { shouldShow, isChecking, isPersisted, grant, dismiss }
}
