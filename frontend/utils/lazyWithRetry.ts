import { lazy, type ComponentType } from 'react'

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
      const isChunkError =
        error?.message?.includes('dynamically imported module') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('Failed to fetch')

      if (!pageHasBeenForceRefreshed && isChunkError && typeof window !== 'undefined') {
        window.sessionStorage.setItem('mcp_page_has_been_force_refreshed', 'true')
        window.location.reload()
        return { default: (() => null) as unknown as T }
      }

      throw error
    }
  })
}
