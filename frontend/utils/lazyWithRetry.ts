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
    message === 'failed to fetch' ||
    message.includes('dynamically imported module') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('error loading dynamically imported module') ||
    message.includes('importing a module script failed') ||
    message.includes('unable to preload css') ||
    message.includes('failed to load module script')
  )
}

/** Backward-compatible name used by utility callers and focused tests. */
export const isChunkLoadError = isDynamicImportError

const LAST_RELOAD_KEY = 'mcp_last_lazy_reload'

// sessionStorage access can throw, not just return null — Safari private mode
// and hardened/embedded browsers reject getItem/setItem outright. These reads
// happen before the dynamic import runs, so an unguarded throw here would fail
// the component load even when the import itself would have succeeded. Swallow
// storage errors and fall back to "not recently refreshed".
function readLastReload(): number {
  if (typeof window === 'undefined') return 0
  try {
    return Number(window.sessionStorage.getItem(LAST_RELOAD_KEY) || 0)
  } catch {
    return 0
  }
}

function writeLastReload(value: number): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(LAST_RELOAD_KEY, String(value))
  } catch {
    /* storage unavailable — the reload below still breaks the retry loop */
  }
}

/**
 * Wraps React.lazy with automatic single reload when a dynamic import fails
 * due to a new Vercel/production deployment invalidating old chunk hashes.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const recentlyRefreshed = Date.now() - readLastReload() < 15_000

    try {
      return await componentImport()
    } catch (error: any) {
      const isChunkError = isDynamicImportError(error)

      if (!recentlyRefreshed && isChunkError && typeof window !== 'undefined') {
        writeLastReload(Date.now())
        window.location.reload()
        return { default: (() => null) as unknown as T }
      }

      throw error
    }
  })
}
