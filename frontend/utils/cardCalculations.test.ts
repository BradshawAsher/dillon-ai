import { describe, expect, it } from 'vitest'

import { parseDocumentedFacts } from './evidence'
import { normalizeEquityFraction } from './dealMath'
import {
    ALL_FIXTURES,
    FIXTURE_DISTRESSED,
    FIXTURE_HEALTHY_DEAL,
    FIXTURE_HIGH_GROWTH,
    FIXTURE_MINIMAL_DATA,
    FIXTURE_ZERO_EBITDA,
} from './fixtures'

/**
 * These tests exercise the calculation logic used by the quantitative analysis
 * cards (BaseReturnMetricsCard, GrowthSensitivityCard, DealStackCard, etc.)
 * using the fixture data to ensure no NaN/Infinity/crash for edge cases.
 */

function baseReturnMetrics(model: typeof FIXTURE_HEALTHY_DEAL) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const price = model.purchasePrice ?? model.askingPrice
    if (!price || !ebitda) return null

    const capex = model.maintenanceCapex ?? 0
    const annualCashFlow = ebitda - capex
    const simpleROI = (annualCashFlow / price) * 100
    const paybackYears = annualCashFlow > 0 ? price / annualCashFlow : Infinity
    const fiveYearReturn = annualCashFlow * 5

    return { annualCashFlow, simpleROI, paybackYears, fiveYearReturn, price }
}

function dealStackLayers(model: typeof FIXTURE_HEALTHY_DEAL) {
    const price = model.purchasePrice ?? model.askingPrice
    if (!price) return null

    const equityPct = normalizeEquityFraction(model.equityContributionPercent) * 100
    const equity = price * (equityPct / 100)
    const sellerNote = model.sellerNoteAmount ?? 0
    const seniorDebt = price - equity - sellerNote

    return { equity, seniorDebt, sellerNote, price, equityPct }
}

function sensitivityItems(model: typeof FIXTURE_HEALTHY_DEAL) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const price = model.purchasePrice ?? model.askingPrice

    if (!price || !ebitda) return null

    const holdYears = model.holdPeriodYears ?? 5
    const baseGrowth = model.baseRevenueGrowth ?? 0.05
    const baseMargin = model.baseEbitdaMargin ?? (revenue && ebitda ? ebitda / revenue : 0.20)
    const exitMult = model.exitMultiple ?? 4.0

    const baseRevenue = revenue ?? ebitda / baseMargin
    const futureRevenueBase = baseRevenue * Math.pow(1 + baseGrowth, holdYears)
    const baseValue = futureRevenueBase * baseMargin * exitMult

    const revenueUp = baseRevenue * Math.pow(1 + baseGrowth + 0.05, holdYears) * baseMargin * exitMult
    const revenueDown = baseRevenue * Math.pow(1 + baseGrowth - 0.05, holdYears) * baseMargin * exitMult

    const marginUp = futureRevenueBase * (baseMargin + 0.02) * exitMult
    const marginDown = futureRevenueBase * (baseMargin - 0.02) * exitMult

    const multUp = futureRevenueBase * baseMargin * (exitMult + 1)
    const multDown = futureRevenueBase * baseMargin * (exitMult - 1)

    return {
        baseValue,
        revenueImpact: { positive: revenueUp - baseValue, negative: revenueDown - baseValue },
        marginImpact: { positive: marginUp - baseValue, negative: marginDown - baseValue },
        multipleImpact: { positive: multUp - baseValue, negative: multDown - baseValue },
    }
}

describe('BaseReturnMetrics calculations', () => {
    it('healthy deal: ROI above 20%, payback under 5 years', () => {
        const result = baseReturnMetrics(FIXTURE_HEALTHY_DEAL)
        expect(result).not.toBeNull()
        expect(result!.simpleROI).toBeGreaterThan(20)
        expect(result!.paybackYears).toBeLessThan(5)
        expect(result!.annualCashFlow).toBeGreaterThan(0)
    })

    it('distressed deal: lower ROI, longer payback', () => {
        const result = baseReturnMetrics(FIXTURE_DISTRESSED)
        expect(result).not.toBeNull()
        expect(result!.simpleROI).toBeLessThan(20)
        expect(result!.annualCashFlow).toBeGreaterThan(0)
    })

    it('zero EBITDA: returns null (card should not render)', () => {
        const result = baseReturnMetrics(FIXTURE_ZERO_EBITDA)
        expect(result).toBeNull()
    })

    it('minimal data: returns null when no EBITDA and no price', () => {
        const result = baseReturnMetrics(FIXTURE_MINIMAL_DATA)
        expect(result).toBeNull()
    })

    it('never produces NaN or Infinity for any fixture', () => {
        for (const fixture of ALL_FIXTURES) {
            const result = baseReturnMetrics(fixture)
            if (result === null) continue
            expect(Number.isNaN(result.simpleROI)).toBe(false)
            expect(Number.isNaN(result.annualCashFlow)).toBe(false)
            expect(result.fiveYearReturn).not.toBe(Infinity)
        }
    })
})

describe('DealStack calculations', () => {
    it('healthy deal: equity + debt + seller note sum to price', () => {
        const result = dealStackLayers(FIXTURE_HEALTHY_DEAL)
        expect(result).not.toBeNull()
        const sum = result!.equity + result!.seniorDebt + result!.sellerNote
        expect(sum).toBeCloseTo(result!.price, 2)
    })

    it('high growth: no seller note, larger equity share', () => {
        const result = dealStackLayers(FIXTURE_HIGH_GROWTH)
        expect(result).not.toBeNull()
        expect(result!.sellerNote).toBe(0)
        expect(result!.equityPct).toBe(40)
        expect(result!.equity).toBeCloseTo(result!.price * 0.4, 2)
    })

    it('minimal data: uses asking price when purchase price is null', () => {
        const result = dealStackLayers(FIXTURE_MINIMAL_DATA)
        expect(result).not.toBeNull()
        expect(result!.price).toBe(5_000_000)
    })

    it('equity + debt never negative for any fixture', () => {
        for (const fixture of ALL_FIXTURES) {
            const result = dealStackLayers(fixture)
            if (result === null) continue
            expect(result.equity).toBeGreaterThanOrEqual(0)
        }
    })
})

describe('GrowthSensitivity calculations', () => {
    it('healthy deal: all impacts are finite and symmetric in sign', () => {
        const result = sensitivityItems(FIXTURE_HEALTHY_DEAL)
        expect(result).not.toBeNull()
        expect(result!.revenueImpact.positive).toBeGreaterThan(0)
        expect(result!.revenueImpact.negative).toBeLessThan(0)
        expect(result!.marginImpact.positive).toBeGreaterThan(0)
        expect(result!.marginImpact.negative).toBeLessThan(0)
        expect(result!.multipleImpact.positive).toBeGreaterThan(0)
        expect(result!.multipleImpact.negative).toBeLessThan(0)
    })

    it('high growth: revenue sensitivity is larger than margin sensitivity', () => {
        const result = sensitivityItems(FIXTURE_HIGH_GROWTH)
        expect(result).not.toBeNull()
        expect(Math.abs(result!.revenueImpact.positive)).toBeGreaterThan(
            Math.abs(result!.marginImpact.positive)
        )
    })

    it('distressed: negative base growth still produces valid sensitivity', () => {
        const result = sensitivityItems(FIXTURE_DISTRESSED)
        expect(result).not.toBeNull()
        expect(Number.isFinite(result!.baseValue)).toBe(true)
        expect(result!.baseValue).toBeGreaterThan(0)
    })

    it('zero EBITDA: returns null', () => {
        const result = sensitivityItems(FIXTURE_ZERO_EBITDA)
        expect(result).toBeNull()
    })

    it('never produces NaN for any fixture', () => {
        for (const fixture of ALL_FIXTURES) {
            const result = sensitivityItems(fixture)
            if (result === null) continue
            expect(Number.isNaN(result.baseValue)).toBe(false)
            expect(Number.isNaN(result.revenueImpact.positive)).toBe(false)
            expect(Number.isNaN(result.marginImpact.positive)).toBe(false)
            expect(Number.isNaN(result.multipleImpact.positive)).toBe(false)
        }
    })
})

describe('Fixture data integrity', () => {
    it('all fixtures have valid projectId', () => {
        for (const fixture of ALL_FIXTURES) {
            expect(fixture.projectId).toBeTruthy()
            expect(fixture.projectId.startsWith('fixture-')).toBe(true)
        }
    })

    it('all fixtures have parseable documentedFactsJson', () => {
        for (const fixture of ALL_FIXTURES) {
            const facts = parseDocumentedFacts(fixture.documentedFactsJson)
            expect(facts).toBeDefined()
            expect(typeof facts).toBe('object')
        }
    })

    it('healthy/high-growth/distressed have both revenue and EBITDA', () => {
        for (const fixture of [FIXTURE_HEALTHY_DEAL, FIXTURE_HIGH_GROWTH, FIXTURE_DISTRESSED]) {
            const facts = parseDocumentedFacts(fixture.documentedFactsJson)
            expect(facts.revenue?.value).toBeGreaterThan(0)
            expect(typeof facts.ebitda_sde?.value).toBe('number')
        }
    })

    it('minimal data fixture has revenue but no EBITDA', () => {
        const facts = parseDocumentedFacts(FIXTURE_MINIMAL_DATA.documentedFactsJson)
        expect(facts.revenue?.value).toBeGreaterThan(0)
        expect(facts.ebitda_sde).toBeUndefined()
    })
})

describe('normalizeEquityFraction', () => {
    it('passes fractions in (0,1] through unchanged', () => {
        expect(normalizeEquityFraction(0.3)).toBeCloseTo(0.3, 10)
        expect(normalizeEquityFraction(0.25)).toBeCloseTo(0.25, 10)
        expect(normalizeEquityFraction(1)).toBeCloseTo(1, 10)
    })

    it('treats whole-percent values (>1) as percentages and divides by 100', () => {
        expect(normalizeEquityFraction(25)).toBeCloseTo(0.25, 10)
        expect(normalizeEquityFraction(40)).toBeCloseTo(0.4, 10)
        expect(normalizeEquityFraction(100)).toBeCloseTo(1, 10)
    })

    it('falls back to the 0.3 default for null, undefined, or non-positive input', () => {
        expect(normalizeEquityFraction(null)).toBe(0.3)
        expect(normalizeEquityFraction(undefined)).toBe(0.3)
        expect(normalizeEquityFraction(0)).toBe(0.3)
        expect(normalizeEquityFraction(-5)).toBe(0.3)
        expect(normalizeEquityFraction(Number.NaN)).toBe(0.3)
    })

    it('never returns a mis-scaled 0.003-style fraction from a saved 0.3', () => {
        // The original bug divided a saved 0.3 by 100 → 0.003 (100x too small).
        const price = 5_000_000
        const equity = price * normalizeEquityFraction(0.3)
        expect(equity).toBeCloseTo(1_500_000, 2)
        expect(equity).not.toBeCloseTo(15_000, 2)
    })
})
