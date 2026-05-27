import { useEffect, useCallback } from 'react'
import { useApp } from '@/contexts/AppContext'
import { openFileDialog } from '@/lib/tauri'
import { isDesktop } from '@/lib/desktop'
import { SHORTCUTS } from '@/lib/shortcuts'
import type { ShortcutAction } from '@/lib/shortcuts'

function isEditableTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return (el as HTMLElement).isContentEditable === true
}

export function useKeyboardShortcuts() {
  const { activeTool, setTool, addFiles } = useApp()

  const handleAction = useCallback(
    async (action: ShortcutAction) => {
      switch (action.type) {
        case 'SET_TOOL':
          // Toggle: pressing the shortcut for the active tool deselects it
          setTool(activeTool === action.tool ? null : action.tool)
          break
        case 'DESELECT_TOOL':
          setTool(null)
          break
        case 'OPEN_FILE':
          if (isDesktop()) {
            const file = await openFileDialog({
              filters: [{ name: 'PDF', extensions: ['pdf'] }],
              multiple: true,
            })
            if (file) {
              addFiles(Array.isArray(file) ? file : [file])
            }
          } else {
            // Click the hidden file input inside FileDropzone
            document
              .querySelector<HTMLInputElement>('input[type="file"][accept=".pdf"]')
              ?.click()
          }
          break
      }
    },
    [activeTool, setTool, addFiles],
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Suppress all shortcuts when the user is typing in an input
      if (isEditableTarget(document.activeElement)) return

      for (const shortcut of SHORTCUTS) {
        if (e.key !== shortcut.key) continue

        const ctrlOrCmd = e.ctrlKey || e.metaKey
        if (shortcut.ctrl && !ctrlOrCmd) continue
        if (!shortcut.ctrl && ctrlOrCmd) continue
        if (shortcut.shift && !e.shiftKey) continue
        if (!shortcut.shift && e.shiftKey) continue
        if (shortcut.alt && !e.altKey) continue
        if (!shortcut.alt && e.altKey) continue

        e.preventDefault()
        e.stopPropagation()
        handleAction(shortcut.action)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true })
  }, [handleAction])
}
