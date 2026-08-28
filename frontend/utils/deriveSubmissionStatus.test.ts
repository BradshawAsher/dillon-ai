import { describe, expect, it } from 'vitest'

import { deriveSubmissionStatus } from '../../backend/diligence/getSubmissionHistory'

describe('deriveSubmissionStatus', () => {
    it('marks a long-stalled active row as failed even when updated_at is unparseable', () => {
        // A garbage updated_at must not wipe out a valid created_at: Math.max(NaN, x)
        // is NaN, which previously skipped the stuck-row timeout entirely.
        const row = {
            status: 'processing',
            created_at: '2020-01-01T00:00:00Z',
            updated_at: 'not-a-real-date',
            expected_batch_document_count: 1,
        }
        expect(deriveSubmissionStatus(row)).toBe('failed')
    })

    it('keeps a freshly-updated active row in its running state', () => {
        const row = {
            status: 'processing',
            created_at: '2020-01-01T00:00:00Z',
            updated_at: new Date().toISOString(),
            expected_batch_document_count: 1,
        }
        expect(deriveSubmissionStatus(row)).toBe('processing')
    })

    it('treats a completed row as completed regardless of timestamps', () => {
        expect(deriveSubmissionStatus({ status: 'completed' })).toBe('completed')
    })

    it('preserves an explicit stopped status', () => {
        expect(deriveSubmissionStatus({ status: 'stopped_by_user' })).toBe('stopped_by_user')
    })
})
