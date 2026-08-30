import { describe, expect, it } from 'vitest'

import { resolveStorageCdnUrl, STORAGE_CDN_URL, SUPABASE_STORAGE_ORIGIN } from '../services/storageCdn'

describe('resolveStorageCdnUrl', () => {
    it('rewrites a direct Supabase storage origin to the CDN origin', () => {
        const input = `${SUPABASE_STORAGE_ORIGIN}/storage/v1/object/public/deal-documents/x.pdf`
        expect(resolveStorageCdnUrl(input)).toBe(`${STORAGE_CDN_URL}/storage/v1/object/public/deal-documents/x.pdf`)
    })

    it('passes a non-Supabase URL through unchanged', () => {
        expect(resolveStorageCdnUrl('https://example.com/a.pdf')).toBe('https://example.com/a.pdf')
    })

    it('returns an empty string for null/undefined/non-string input', () => {
        expect(resolveStorageCdnUrl(null)).toBe('')
        expect(resolveStorageCdnUrl(undefined)).toBe('')
        expect(resolveStorageCdnUrl(123 as unknown as string)).toBe('')
    })
})
