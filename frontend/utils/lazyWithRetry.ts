import { lazy, type ComponentType } from 'react'

/**
 * True when an error looks like a stale dynamic-import/chunk failure caused by a
 * new deployment invalidating old chunk hashes. Covers the Chromium/Vite,
 * Firefox, and Safari phrasings — Safari reports "Importing a module script
 * failed", which the previous check missed, leaving Safari users on a broken
 * page after a deploy instead of auto-reloading. Case-insensitive so a phrasing
 * change in casing still matches.
 */
export function isDynamicImportError(error: unknown): boolean {
  const message = (error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '')
  ).toLowerCase()
  return (
    message.includes('dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('unable to preload css') ||
    message.includes('failed to load module script')
  )
}

/**
 * Wraps React.lazy with automatic single reload when a dynamic import fails
 * due to a new Vercel/production deployment invalidating old chunk hashes.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const lastRefreshed = Number(
      (typeof window !== 'undefined' && window.sessionStorage.getItem('mcp_last_lazy_reload')) || 0
    )
    const recentlyRefreshed = Date.now() - lastRefreshed < 15_000

    try {
      return await componentImport()
    } catch (error: any) {
      const isChunkError = isDynamicImportError(error)

      if (!recentlyRefreshed && isChunkError && typeof window !== 'undefined') {
        window.sessionStorage.setItem('mcp_last_lazy_reload', String(Date.now()))
        window.location.reload()
        return { default: (() => null) as unknown as T }
      }

      throw error
    }
  })
}
