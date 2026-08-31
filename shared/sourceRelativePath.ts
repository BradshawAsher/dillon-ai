export const MAX_SOURCE_RELATIVE_PATH_LENGTH = 1024

function safeFallbackName(value: unknown) {
  if (typeof value !== 'string') return ''
  const segments = value.replace(/\\/g, '/').split('/').filter(Boolean)
  return segments.length > 0 ? segments[segments.length - 1].trim() : ''
}

/**
 * Normalize browser/ZIP supplied paths without ever accepting an absolute or
 * parent-traversing path. This is source metadata only; it is not a filesystem
 * or object-storage key.
 */
export function normalizeSourceRelativePath(value: unknown, fallbackFileName: unknown = ''): string {
  const fallback = safeFallbackName(fallbackFileName)
  if (typeof value !== 'string') return fallback

  const raw = value.trim().replace(/\\/g, '/')
  if (!raw) return fallback
  if (raw.startsWith('/') || /^[a-zA-Z]:\//.test(raw)) return fallback

  const segments = raw.split('/').filter((segment) => segment.length > 0 && segment !== '.')
  if (segments.some((segment) => segment === '..')) return fallback

  const normalized = segments.join('/')
  if (!normalized) return fallback
  return normalized.slice(0, MAX_SOURCE_RELATIVE_PATH_LENGTH)
}

export function sourceRelativePathForFile(file: { name?: string; webkitRelativePath?: string } | null | undefined): string {
  return normalizeSourceRelativePath(file?.webkitRelativePath || file?.name, file?.name)
}
