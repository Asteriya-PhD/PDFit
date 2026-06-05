// `?tool=<slug>` deep-link routing for the PWA shortcuts.
//
// The manifest shortcuts point at /PDFit/?tool=word|excel|merge. On
// boot we read the slug, map it to the internal ToolType, and call
// setTool so the Header highlights the right tool before the user has
// uploaded anything. The mapping is intentionally tiny — only the 3
// tools exposed in the manifest shortcuts are recognised. Unknown
// values are silently ignored to keep the URL "openable" for future
// slugs without crashing old builds.

import type { ToolType } from '@/types'

/** Slug → ToolType. Keep in sync with the manifest `shortcuts` block. */
const TOOL_SLUGS: Record<string, ToolType> = {
  word: 'pdf-to-docx',
  excel: 'pdf-to-xlsx',
  merge: 'merge',
}

export interface UrlRouterHooks {
  setTool: (tool: ToolType) => void
}

/**
 * Apply the `?tool=` deep-link. Returns the matched slug, or null if
 * no recognised value was present. Strips the param from the URL via
 * replaceState so the back button stays clean.
 */
export function applyToolDeepLink(hooks: UrlRouterHooks): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const slug = params.get('tool')
  if (!slug) return null

  const tool = TOOL_SLUGS[slug]
  if (!tool) {
    // Unknown slug — still strip the param so the URL stays clean.
    params.delete('tool')
    const next =
      window.location.pathname +
      (params.toString() ? `?${params.toString()}` : '') +
      window.location.hash
    window.history.replaceState({}, '', next)
    return null
  }

  hooks.setTool(tool)
  params.delete('tool')
  const next =
    window.location.pathname +
    (params.toString() ? `?${params.toString()}` : '') +
    window.location.hash
  window.history.replaceState({}, '', next)
  return slug
}
