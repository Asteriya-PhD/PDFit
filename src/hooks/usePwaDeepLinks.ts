// Bridge between URL deep-links (?tool=, ?share=received) and the
// AppContext state. Called once from App.tsx, so the wiring lives
// next to the context consumers.
//
// Two flows are handled here, in order:
//
//   1. ?tool=<slug>  — applied synchronously on mount via
//      applyToolDeepLink(). Bumps activeTool in AppContext so the
//      Header highlights the right tool BEFORE the user drops a
//      file. The reducer keeps this value when ADD_FILES fires
//      (see AppContext: `activeTool: state.activeTool ?? 'merge'`),
//      so the user lands in the Word tool and stays there.
//
//   2. ?share=received — async drain of the IDB stash the SW wrote
//      during the share_target POST. checkShareReceived() strips the
//      param, reads IDB, hands the File to addFiles, clears IDB, and
//      fires a CustomEvent so the UI can announce it.
//
// We do the tool deep-link synchronously and the share drain after a
// microtask. If the share arrived with ?tool= already set (unlikely
// but possible), the file's tool wins because addFiles preserves the
// existing activeTool — which is what the user picked via the
// shortcut, not the share's default.

import { useEffect, useRef } from 'react'
import { useApp } from '@/contexts/AppContext'
import { applyToolDeepLink } from '@/lib/urlRouter'
import { checkShareReceived, SHARE_RECEIVED_EVENT } from '@/lib/shareReceiver'
import type { ShareReceivedDetail } from '@/lib/shareReceiver'

export type { ShareReceivedDetail }

export function usePwaDeepLinks(): void {
  const { setTool, addFiles } = useApp()
  // Track whether we've already drained the share this mount. The
  // hook can run twice in StrictMode dev; without this guard, the
  // second drain would no-op (IDB is cleared), but we'd still fire
  // the toast event twice.
  const drainedRef = useRef(false)

  useEffect(() => {
    // 1. ?tool= (synchronous, run before any state read).
    applyToolDeepLink({ setTool })

    // 2. ?share=received (async, after tool is set so the file lands
    // in the right tool).
    if (drainedRef.current) return
    drainedRef.current = true
    void checkShareReceived({
      onFile: async (file) => {
        await addFiles([file])
      },
    })
    // setTool / addFiles are stable from useReducer + useCallback
    // upstream; effect runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}

/**
 * Subscribe to share-received announcements. Use in components that
 * want to display a toast. The hook is read-only; the actual IDB
 * drain happens once in usePwaDeepLinks.
 */
export function useShareReceivedToast(handler: (detail: ShareReceivedDetail) => void): void {
  useEffect(() => {
    const listener = (e: Event) => {
      const detail = (e as CustomEvent<ShareReceivedDetail>).detail
      handler(detail)
    }
    window.addEventListener(SHARE_RECEIVED_EVENT, listener)
    return () => window.removeEventListener(SHARE_RECEIVED_EVENT, listener)
  }, [handler])
}
