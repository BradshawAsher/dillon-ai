import { describe, expect, it } from 'vitest'

import {
    endToEndLatencyMs,
    percentile,
    processingLatencyMs,
    summarizeLatency,
} from './latencyMetrics'

describe('processingLatencyMs', () => {
    it('computes started -> processed delta in ms', () => {
        expect(
            processingLatencyMs({
                processingStartedAt: '2026-07-29T18:26:55.528Z',
                processedAt: '2026-07-29T18:27:40.917Z',
            }),
        ).toBe(45389)
    })

    it('returns null when a timestamp is missing or unparseable', () => {
        expect(processingLatencyMs({ processedAt: '2026-07-29T18:27:40Z' })).toBeNull()
        expect(processingLatencyMs({ processingStartedAt: 'not-a-date', processedAt: '2026-07-29T18:27:40Z' })).toBeNull()
    })

    it('returns null for a negative (clock-skew) delta rather than a bogus number', () => {
        expect(
            processingLatencyMs({
                processingStartedAt: '2026-07-29T18:28:00Z',
                processedAt: '2026-07-29T18:27:00Z',
            }),
        ).toBeNull()
    })
})

describe('endToEndLatencyMs', () => {
    it('computes received -> processed delta in ms', () => {
        expect(
            endToEndLatencyMs({
                receivedAt: '2026-07-29T18:26:40.000Z',
                processedAt: '2026-07-29T18:27:40.000Z',
            }),
        ).toBe(60000)
    })
})

describe('percentile', () => {
    it('returns null for an empty sample', () => {
        expect(percentile([], 0.5)).toBeNull()
    })

    it('uses nearest-rank ordering', () => {
        const values = [10, 20, 30, 40, 50]
        expect(percentile(values, 0.5)).toBe(30)
        expect(percentile(values, 0.95)).toBe(50)
        expect(percentile(values, 0)).toBe(10)
    })

    it('treats a non-finite percentile as the 0th, never returning undefined', () => {
        const values = [10, 20, 30]
        expect(percentile(values, Number.NaN)).toBe(10)
        expect(percentile(values, Number.POSITIVE_INFINITY)).toBe(10)
    })
})

describe('summarizeLatency', () => {
    it('reports zeros/nulls when nothing is measurable', () => {
        expect(summarizeLatency([{ processedAt: '2026-07-29T18:27:40Z' }])).toEqual({
            count: 0,
            p50Ms: null,
            p95Ms: null,
            meanMs: null,
            minMs: null,
            maxMs: null,
        })
    })

    it('summarizes only the measurable documents', () => {
        const summary = summarizeLatency([
            { processingStartedAt: '2026-07-29T18:00:00Z', processedAt: '2026-07-29T18:00:20Z' }, // 20s
            { processingStartedAt: '2026-07-29T18:00:00Z', processedAt: '2026-07-29T18:01:00Z' }, // 60s
            { processingStartedAt: '2026-07-29T18:00:00Z', processedAt: '2026-07-29T18:02:00Z' }, // 120s
            { processingStartedAt: 'bad', processedAt: 'bad' }, // ignored
        ])
        expect(summary.count).toBe(3)
        expect(summary.minMs).toBe(20000)
        expect(summary.maxMs).toBe(120000)
        expect(summary.p50Ms).toBe(60000)
        expect(summary.meanMs).toBe(66667)
    })
})
