import { describe, expect, it } from 'vitest'

import {
    estimateAllSonnetCost,
    estimateCallCost,
    estimateMonthlyCost,
    estimatePerDocumentCost,
    MEASURED_COST_PER_DOCUMENT,
    MEASURED_ROUTING_SAVINGS,
    routingSavingsFraction,
    SAMPLE_DOCUMENT_LEGS,
    topSpendDrivers,
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

describe('topSpendDrivers', () => {
    it('ranks Sonnet output as the top spend driver for the measured sample', () => {
        const drivers = topSpendDrivers(SAMPLE_DOCUMENT_LEGS)
        expect(drivers[0].label).toBe('Sonnet 4.6 output')
        expect(drivers[0].model).toBe('sonnet-4-6')
        expect(drivers[0].direction).toBe('output')
    })

    it('returns at most `limit` drivers with shares that sum within the whole', () => {
        const drivers = topSpendDrivers(SAMPLE_DOCUMENT_LEGS, 3)
        expect(drivers.length).toBe(3)
        for (const d of drivers) {
            expect(d.share).toBeGreaterThan(0)
            expect(d.share).toBeLessThanOrEqual(1)
        }
        // descending by cost
        expect(drivers[0].costUsd).toBeGreaterThanOrEqual(drivers[1].costUsd)
        expect(drivers[1].costUsd).toBeGreaterThanOrEqual(drivers[2].costUsd)
    })

    it('folds repeated model+direction legs together', () => {
        const drivers = topSpendDrivers(
            [
                { model: 'sonnet-4-6', inputTokens: 1000, outputTokens: 0 },
                { model: 'sonnet-4-6', inputTokens: 1000, outputTokens: 0 },
            ],
            5,
        )
        const sonnetInput = drivers.find((d) => d.model === 'sonnet-4-6' && d.direction === 'input')
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
})
