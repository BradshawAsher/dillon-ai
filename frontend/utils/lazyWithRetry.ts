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
    message.includes('failed to fetch') ||
    message.includes('importing a module script failed') ||
    message.includes('error loading dynamically imported module')
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
    const pageHasBeenForceRefreshed =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem('mcp_page_has_been_force_refreshed') === 'true'

    try {
      const component = await componentImport()
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('mcp_page_has_been_force_refreshed')
      }
      return component
    } catch (error: any) {
      const isChunkError = isDynamicImportError(error)

      if (!pageHasBeenForceRefreshed && isChunkError && typeof window !== 'undefined') {
        window.sessionStorage.setItem('mcp_page_has_been_force_refreshed', 'true')
        window.location.reload()
        return { default: (() => null) as unknown as T }
      }

      throw error
    }
  })
}
