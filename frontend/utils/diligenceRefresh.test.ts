import { describe, expect, it } from 'vitest'
import { mergeDiligenceRows, shouldPollDiligence } from './diligenceRefresh'

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
})
