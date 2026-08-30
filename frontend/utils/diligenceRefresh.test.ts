import { describe, expect, it } from 'vitest'
import {
    isSynthesisActivityFresh,
    mergeDiligenceRows,
    shouldPollDiligence,
    sortSynthesisRowsNewestFirst,
    SYNTHESIS_ACTIVITY_TIMEOUT_MS,
} from './diligenceRefresh'

describe('shouldPollDiligence', () => {
    const idleSignals = {
        batchIsComplete: false,
        hasActiveSubmissions: false,
        isProcessingDocuments: false,
        isAwaitingSynthesis: false,
    }

    it('polls for an unfinished batch', () => {
        expect(shouldPollDiligence({ ...idleSignals, activeBatch: {} })).toBe(true)
    })

    it.each([
        [{ endedAt: 1 }],
        [{ interruptedAt: 1 }],
        [{ stoppedAt: 1 }],
        [{ stopError: 'stop failed' }],
    ])('does not poll for a terminal batch: %o', (activeBatch) => {
        expect(shouldPollDiligence({ ...idleSignals, activeBatch })).toBe(false)
    })

    it('does not poll once derived batch progress is complete', () => {
        expect(shouldPollDiligence({ ...idleSignals, activeBatch: {}, batchIsComplete: true })).toBe(false)
    })

    it('continues polling when another active-processing signal remains', () => {
        expect(shouldPollDiligence({
            ...idleSignals,
            activeBatch: { endedAt: 1 },
            isAwaitingSynthesis: true,
        })).toBe(true)
    })
})

describe('mergeDiligenceRows', () => {
    type Row = { id: number; status: string; detail?: string }
    const keyOf = (row: Row) => String(row.id)

    it('merges scoped detail without dropping unrelated portfolio rows', () => {
        const result = mergeDiligenceRows<Row>(
            [{ id: 1, status: 'processing' }, { id: 2, status: 'completed' }],
            [{ id: 1, status: 'completed', detail: 'full analysis' }],
            keyOf,
        )

        expect(result).toEqual([
            { id: 1, status: 'completed', detail: 'full analysis' },
            { id: 2, status: 'completed' },
        ])
    })

    it('can preserve previously loaded detail when a compact portfolio row arrives later', () => {
        const result = mergeDiligenceRows<Row>(
            [{ id: 1, status: 'completed', detail: 'full analysis' }],
            [{ id: 1, status: 'completed' }],
            keyOf,
            false,
        )

        expect(result).toEqual([{ id: 1, status: 'completed', detail: 'full analysis' }])
    })

    it('prevents stale out-of-order in-flight rows from downgrading completed rows', () => {
        const result = mergeDiligenceRows<Row>(
            [{ id: 1, status: 'completed', detail: 'full analysis' }],
            [{ id: 1, status: 'processing' }],
            keyOf,
            true,
        )

        expect(result).toEqual([{ id: 1, status: 'completed', detail: 'full analysis' }])
    })

    it('updates compact status while preserving previously loaded detail', () => {
        const result = mergeDiligenceRows<Row>(
            [{ id: 1, status: 'processing', detail: 'full analysis' }],
            [{ id: 1, status: 'completed', detail: '' }],
            keyOf,
            true,
            ['detail'],
        )

        expect(result).toEqual([{ id: 1, status: 'completed', detail: 'full analysis' }])
    })
})

describe('sortSynthesisRowsNewestFirst', () => {
    it('puts a newly appended completed synthesis ahead of its older placeholder', () => {
        const rows = [
            { id: 1177, updatedAt: '2026-08-30T00:22:32.763Z', projectStatus: 'awaiting_documents' },
            { id: 1178, updatedAt: '2026-08-30T00:23:17.001Z', projectStatus: 'synthesized' },
        ]

        expect(sortSynthesisRowsNewestFirst(rows).map((row) => row.id)).toEqual([1178, 1177])
    })

    it('falls back to the monotonic database id when timestamps are unavailable', () => {
        expect(sortSynthesisRowsNewestFirst([{ id: 4 }, { id: 9 }]).map((row) => row.id)).toEqual([9, 4])
    })
})

describe('isSynthesisActivityFresh', () => {
    const now = Date.parse('2026-08-30T01:00:00.000Z')

    it('keeps a recently completed document or updated synthesis active', () => {
        expect(isSynthesisActivityFresh([
            '2026-08-30T00:20:00.000Z',
            '2026-08-30T00:55:00.000Z',
        ], now)).toBe(true)
    })

    it('stops activity after the timeout instead of polling forever', () => {
        expect(isSynthesisActivityFresh([
            new Date(now - SYNTHESIS_ACTIVITY_TIMEOUT_MS - 1).toISOString(),
        ], now)).toBe(false)
    })

    it('does not invent active work when no valid timestamp exists', () => {
        expect(isSynthesisActivityFresh(['', 'not-a-date'], now)).toBe(false)
    })
})
