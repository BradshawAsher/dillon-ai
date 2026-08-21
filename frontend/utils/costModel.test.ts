import { describe, expect, it } from 'vitest'

import {
    estimateAllSonnetCost,
    estimateCallCost,
    estimateMonthlyCost,
    estimatePerDocumentCost,
    sumMeasuredCost,
    MEASURED_COST_PER_DOCUMENT,
    MEASURED_ROUTING_SAVINGS,
    routingSavingsFraction,
    SAMPLE_DOCUMENT_LEGS,
    topSpendDrivers,
} from './costModel'

describe('estimateCallCost', () => {
    it('prices a Sonnet 5 call at its $2/$10 intro rate per MTok', () => {
        // 2554 in * $2 + 1090 out * $10, per MTok.
        expect(estimateCallCost(2554, 1090, 'sonnet-5')).toBeCloseTo(0.016008, 6)
    })

    it('prices an OpenAI 5.6 Terra call at $2/$12 per MTok', () => {
        // 3121 in * $2 + 1103 out * $12, per MTok.
        expect(estimateCallCost(3121, 1103, 'openai-5-6-terra')).toBeCloseTo(0.019478, 6)
    })

    it('prices the remaining benchmark models from their published rates', () => {
        // 1M in + 1M out makes each result read directly as (input + output) $/MTok.
        expect(estimateCallCost(1_000_000, 1_000_000, 'opus-5')).toBeCloseTo(30, 6) // $5 + $25
        expect(estimateCallCost(1_000_000, 1_000_000, 'openai-5-6-sol')).toBeCloseTo(35, 6) // $5 + $30
        expect(estimateCallCost(1_000_000, 1_000_000, 'gemini-3-1-flash-lite')).toBeCloseTo(1.75, 6) // $0.25 + $1.50
        expect(estimateCallCost(1_000_000, 1_000_000, 'gemini-3-5-flash-lite')).toBeCloseTo(1.75, 6)
        expect(estimateCallCost(1_000_000, 1_000_000, 'gemini-flash')).toBeCloseTo(1.75, 6)
    })

    it('falls back to Terra pricing for an unrecognized model', () => {
        // An unexpected model id (e.g. a newly routed model not yet in the table)
        // must still cost something sane rather than throw on undefined rates.
        const unknown = estimateCallCost(1_000_000, 1_000_000, 'model-not-in-table' as never)
        expect(unknown).toBeCloseTo(14, 6) // Terra: $2 + $12
    })
})

describe('estimatePerDocumentCost', () => {
    it('sums all legs of a document', () => {
        expect(estimatePerDocumentCost(SAMPLE_DOCUMENT_LEGS)).toBeGreaterThan(0)
    })

    it('returns 0 for a document with no model calls', () => {
        expect(estimatePerDocumentCost([])).toBe(0)
    })
})

describe('routingSavingsFraction', () => {
    it('calculates savings vs single model pipeline', () => {
        expect(estimateAllSonnetCost(SAMPLE_DOCUMENT_LEGS)).toBeGreaterThan(0)
        expect(routingSavingsFraction(SAMPLE_DOCUMENT_LEGS)).toBeGreaterThanOrEqual(0)
    })

    it('is 0 when every leg is already Sonnet 5', () => {
        expect(
            routingSavingsFraction([{ model: 'sonnet-5', inputTokens: 1000, outputTokens: 1000 }]),
        ).toBe(0)
    })
})

describe('derived constants', () => {
    it('expose the measured per-document cost and savings', () => {
        expect(MEASURED_COST_PER_DOCUMENT).toBeGreaterThan(0)
        expect(MEASURED_ROUTING_SAVINGS).toBeGreaterThanOrEqual(0)
    })
})

describe('topSpendDrivers', () => {
    it('ranks OpenAI 5.6 Terra output as top spend driver', () => {
        // Both sample legs now run on Terra, whose $12 output rate makes the
        // folded output leg the single largest contributor.
        const drivers = topSpendDrivers(SAMPLE_DOCUMENT_LEGS)
        expect(drivers[0].label).toBe('OpenAI 5.6 Terra output')
        expect(drivers[0].model).toBe('openai-5-6-terra')
        expect(drivers[0].direction).toBe('output')
    })

    it('returns at most `limit` drivers with shares that sum within the whole', () => {
        const drivers = topSpendDrivers(SAMPLE_DOCUMENT_LEGS, 3)
        expect(drivers.length).toBeLessThanOrEqual(3)
        for (const d of drivers) {
            expect(d.share).toBeGreaterThan(0)
            expect(d.share).toBeLessThanOrEqual(1)
        }
    })

    it('folds repeated model+direction legs together', () => {
        const drivers = topSpendDrivers(
            [
                { model: 'sonnet-5', inputTokens: 1000, outputTokens: 0 },
                { model: 'sonnet-5', inputTokens: 1000, outputTokens: 0 },
            ],
            5,
        )
        const sonnetInput = drivers.find((d) => d.model === 'sonnet-5' && d.direction === 'input')
        expect(sonnetInput?.tokens).toBe(2000)
        expect(sonnetInput?.share).toBe(1)
    })
})

describe('estimateMonthlyCost', () => {
    it('sums documents and syntheses at monthly throughput', () => {
        const monthly = estimateMonthlyCost(100, 20)
        expect(monthly).toBeCloseTo(100 * MEASURED_COST_PER_DOCUMENT + 20 * 0.12, 6)
    })

    it('never returns a negative projection', () => {
        expect(estimateMonthlyCost(-10, -5)).toBe(0)
    })

    it('treats non-finite throughput as zero instead of NaN', () => {
        expect(estimateMonthlyCost(Number.NaN, 10)).toBeCloseTo(10 * 0.12, 6)
        expect(estimateMonthlyCost(Number.POSITIVE_INFINITY, Number.NaN)).toBe(0)
    })
})

describe('sumMeasuredCost', () => {
    it('aggregates document and synthesis cost/tokens', () => {
        const s = sumMeasuredCost({
            documents: [{ costUsd: 0.03, totalTokens: 4000 }, { costUsd: 0.05, totalTokens: 6000 }],
            synthesis: { costUsd: 0.12, totalTokens: 8000 },
        })
        expect(s.docCost).toBeCloseTo(0.08, 6)
        expect(s.docTokens).toBe(10000)
        expect(s.synthesisCost).toBeCloseTo(0.12, 6)
        expect(s.totalCost).toBeCloseTo(0.20, 6)
        expect(s.totalTokens).toBe(18000)
        expect(s.hasMeasured).toBe(true)
    })

    it('reports hasMeasured=false when nothing is logged', () => {
        const s = sumMeasuredCost({ documents: [{}, {}], synthesis: null })
        expect(s.totalCost).toBe(0)
        expect(s.totalTokens).toBe(0)
        expect(s.hasMeasured).toBe(false)
    })

    it('handles a missing synthesis', () => {
        const s = sumMeasuredCost({ documents: [{ costUsd: 0.03, totalTokens: 4000 }] })
        expect(s.synthesisCost).toBe(0)
        expect(s.totalCost).toBeCloseTo(0.03, 6)
        expect(s.hasMeasured).toBe(true)
    })

    it('coerces stringified and non-finite telemetry to finite numbers', () => {
        const s = sumMeasuredCost({
            documents: [
                { costUsd: '0.05' as unknown as number, totalTokens: '6000' as unknown as number },
                { costUsd: NaN, totalTokens: 4000 },
            ],
            synthesis: { costUsd: '0.10' as unknown as number, totalTokens: 8000 },
        })
        // "0.05" is added numerically (not concatenated), and NaN is treated as 0.
        expect(s.docCost).toBeCloseTo(0.05, 6)
        expect(s.docTokens).toBe(10000)
        expect(s.synthesisCost).toBeCloseTo(0.10, 6)
        expect(s.totalCost).toBeCloseTo(0.15, 6)
        expect(s.hasMeasured).toBe(true)
    })
})
