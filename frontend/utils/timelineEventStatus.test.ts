import { describe, expect, it } from 'vitest'

import { classifyTimelineEventStatus } from './timelineEventStatus'

describe('classifyTimelineEventStatus', () => {
    it('recognizes completed', () => {
        expect(classifyTimelineEventStatus('completed')).toBe('completed')
        expect(classifyTimelineEventStatus('  COMPLETED ')).toBe('completed')
    })

    it('buckets failure synonyms as failed', () => {
        expect(classifyTimelineEventStatus('failed')).toBe('failed')
        expect(classifyTimelineEventStatus('error')).toBe('failed')
        expect(classifyTimelineEventStatus('rejected')).toBe('failed')
    })

    it('buckets in-flight synonyms as processing', () => {
        for (const s of ['processing', 'running', 'queued', 'submitted', 'accepted']) {
            expect(classifyTimelineEventStatus(s)).toBe('processing')
        }
    })

    it('falls back to pending for unknown or empty input', () => {
        expect(classifyTimelineEventStatus('waiting')).toBe('pending')
        expect(classifyTimelineEventStatus('')).toBe('pending')
        expect(classifyTimelineEventStatus(undefined)).toBe('pending')
    })
})
