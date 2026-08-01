import { describe, expect, it } from 'vitest'

import {
    estimateAllSonnetCost,
    estimateCallCost,
    estimatePerDocumentCost,
    MEASURED_COST_PER_DOCUMENT,
    MEASURED_ROUTING_SAVINGS,
    routingSavingsFraction,
    SAMPLE_DOCUMENT_LEGS,
} from './costModel'

describe('estimateCallCost', () => {
    it('prices a Sonnet call at $3/$15 per MTok', () => {
        // 2554 in, 1090 out -> 0.002554*3 + 0.001090*15... expressed per-MTok
        expect(estimateCallCost(2554, 1090, 'sonnet-4-6')).toBeCloseTo(0.024012, 6)
    })

    it('prices a Haiku call at $1/$5 per MTok', () => {
        expect(estimateCallCost(3121, 1103, 'haiku-4-5')).toBeCloseTo(0.008636, 6)
    })
})

describe('estimatePerDocumentCost', () => {
    it('sums all legs of a document', () => {
        expect(estimatePerDocumentCost(SAMPLE_DOCUMENT_LEGS)).toBeCloseTo(0.032648, 6)
    })

    it('returns 0 for a document with no model calls', () => {
        expect(estimatePerDocumentCost([])).toBe(0)
    })
})

describe('routingSavingsFraction', () => {
    it('is ~35% for the measured two-model sample', () => {
        expect(estimateAllSonnetCost(SAMPLE_DOCUMENT_LEGS)).toBeCloseTo(0.04992, 6)
        expect(routingSavingsFraction(SAMPLE_DOCUMENT_LEGS)).toBeGreaterThan(0.3)
        expect(routingSavingsFraction(SAMPLE_DOCUMENT_LEGS)).toBeLessThan(0.4)
    })

    it('is 0 when every leg is already Sonnet', () => {
        expect(
            routingSavingsFraction([{ model: 'sonnet-4-6', inputTokens: 1000, outputTokens: 1000 }]),
        ).toBe(0)
    })
})

describe('derived constants', () => {
    it('expose the measured per-document cost and savings', () => {
        expect(MEASURED_COST_PER_DOCUMENT).toBeCloseTo(0.0326, 3)
        expect(MEASURED_ROUTING_SAVINGS).toBeGreaterThan(0.3)
    })
})
