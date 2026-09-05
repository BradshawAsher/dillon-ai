import { describe, expect, it } from 'vitest'
import { mergeDocumentCarouselRows } from './documentCarousel'
import type { SubmissionHistoryItem } from './submissionHistory'

// Same lightweight fixture style used across the other submission-history tests
// (batchState.test.ts, diligenceDashboardUtils.test.ts): only the fields the
// unit under test reads are set, cast to the full row type.
const row = (over: Partial<SubmissionHistoryItem>): SubmissionHistoryItem =>
    ({ requestID: '', fileName: '', fileSize: 0, ...over } as SubmissionHistoryItem)

describe('mergeDocumentCarouselRows', () => {
    it('deduplicates the same file across project and batch rows, keeping the newest', () => {
        const older = row({ fileName: 'deal.pdf', fileSize: 100, updatedAt: '2026-01-01T00:00:00Z', status: 'processing' })
        const newer = row({ fileName: 'deal.pdf', fileSize: 100, updatedAt: '2026-02-01T00:00:00Z', status: 'completed' })

        const merged = mergeDocumentCarouselRows([older], [newer])

        expect(merged).toHaveLength(1)
        expect(merged[0].status).toBe('completed')
    })

    it('treats the same file name as distinct when the sizes differ', () => {
        const a = row({ fileName: 'deal.pdf', fileSize: 100 })
        const b = row({ fileName: 'deal.pdf', fileSize: 250 })

        const merged = mergeDocumentCarouselRows([a], [b])

        expect(merged).toHaveLength(2)
    })

    it('keeps client-only attempts (no file name) keyed by requestID', () => {
        const projectRow = row({ fileName: 'deal.pdf', fileSize: 100 })
        const localAttempt = row({ requestID: 'local-123' })

        const merged = mergeDocumentCarouselRows([projectRow], [localAttempt])

        expect(merged).toHaveLength(2)
        expect(merged.some((r) => r.requestID === 'local-123')).toBe(true)
    })

    it('uses the latest of any available timestamp field to decide the winner', () => {
        // The older row carries only createdAt; the newer one only processedAt.
        const older = row({ fileName: 'x.pdf', fileSize: 10, createdAt: '2026-01-01T00:00:00Z', status: 'received' })
        const newer = row({ fileName: 'x.pdf', fileSize: 10, processedAt: '2026-03-01T00:00:00Z', status: 'completed' })

        const merged = mergeDocumentCarouselRows([older], [newer])

        expect(merged).toHaveLength(1)
        expect(merged[0].status).toBe('completed')
    })

    it('does not throw when timestamps are missing or unparseable, and still merges both files', () => {
        const a = row({ fileName: 'a.pdf', fileSize: 1, updatedAt: 'not-a-date' })
        const b = row({ fileName: 'b.pdf', fileSize: 1 })

        const merged = mergeDocumentCarouselRows([a], [b])

        expect(merged).toHaveLength(2)
    })

    it('returns an empty list when given no rows', () => {
        expect(mergeDocumentCarouselRows([], [])).toEqual([])
    })
})
