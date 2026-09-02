// Pure storage-URL helpers with NO Supabase client dependency.
//
// resolveStorageCdnUrl used to live in supabaseStorage.ts, which imports the
// auth client and constructs it eagerly at module load. That pulled the whole
// Supabase SDK — and a hard `createClient` call that throws without env vars —
// into any module that only needed to rewrite a storage URL (e.g. the evidence
// renderer). Keeping the pure helper here lets those consumers import it without
// dragging in the auth client.

export const STORAGE_CDN_URL = (import.meta.env.VITE_STORAGE_CDN_URL || 'https://dillon-ai-worker.bradshin231.workers.dev').replace(/\/+$/, '')
export const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL || 'https://pub-3b04d9f4c75546caae7c86bd7b6847de.r2.dev').replace(/\/+$/, '')
export const SUPABASE_STORAGE_ORIGIN = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'

/** Rewrites a direct Supabase storage URL to the Cloudflare CDN origin; passes anything else through unchanged. */
export function resolveStorageCdnUrl(url: string | undefined | null): string {
  if (!url || typeof url !== 'string') return ''
  if (url.startsWith(SUPABASE_STORAGE_ORIGIN)) {
    return url.replace(SUPABASE_STORAGE_ORIGIN, STORAGE_CDN_URL)
  }
  return url
}
