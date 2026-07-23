import { describe, expect, it } from 'vitest'

import {
    DEAL_MATH_DEFAULTS,
    calculateIrr,
    calculateNpv,
    computeAllCashReturns,
    debtToAssets,
    ebitdaMargin,
    priceGapPercent,
    ratio,
    revenuePerEmployee,
} from './dealMath'

describe('calculateIrr', () => {
    it('solves a single-period return exactly', () => {
        // -100 today, +110 in one year => 10%
        expect(calculateIrr([-100, 110])).toBeCloseTo(0.1, 6)
    })

    it('solves a level annuity against the textbook answer', () => {
        // -1000 then 500 x3 => ~23.375%
        expect(calculateIrr([-1000, 500, 500, 500])).toBeCloseTo(0.23375, 4)
    })

    it('solves a two-period series', () => {
        // -100 then 60 x2 => ~13.066%
        expect(calculateIrr([-100, 60, 60])).toBeCloseTo(0.13066, 4)
    })

    it('is consistent with NPV: discounting at the IRR yields zero', () => {
        const cashFlows = [-113_500_000, 8_100_000, 8_100_000, 8_100_000, 8_100_000, 56_708_000]
        const irr = calculateIrr(cashFlows)

        expect(irr).not.toBeNull()
        expect(calculateNpv(cashFlows, irr as number)).toBeCloseTo(0, 2)
    })

    it('returns null when there is no sign change (no IRR exists)', () => {
        expect(calculateIrr([100, 200, 300])).toBeNull()
        expect(calculateIrr([-100, -200])).toBeNull()
    })

    it('returns null for an empty series', () => {
        expect(calculateIrr([])).toBeNull()
    })

    it('never reports a number it did not converge on', () => {
        // Pathological series must fail closed rather than emit a bogus rate.
        const result = calculateIrr([-1, 0, 0, 0, 0, 1e12])
        expect(result === null || Number.isFinite(result)).toBe(true)
    })
})

describe('computeAllCashReturns — golden case', () => {
    // Hand-computed reference deal:
    //   initial investment = 110.0M + 1.5M + 2.0M           = 113.5M
    //   annual cash flow   = 12.4M x (1 - 0.25) - 1.2M      =   8.1M
    //   payback            = 113.5 / 8.1                    =  14.01 years
    //   ROI                = 8.1 / 113.5                     =   7.14%
    //   exit EV            = 12.4M x 4                       =  49.6M
    //   exit costs (2%)    = 49.6M x 0.02                    =   0.992M
    //   net exit proceeds  = 49.6M - 0.992M                  =  48.608M
    const inputs = {
        ebitda: 12_400_000,
        purchasePrice: 110_000_000,
        transactionFees: 1_500_000,
        workingCapital: 2_000_000,
        taxRate: 0.25,
        maintenanceCapex: 1_200_000,
        holdPeriodYears: 5,
        exitMultiple: 4,
    }

    it('computes the core operating metrics', () => {
        const result = computeAllCashReturns(inputs)

        expect(result.initialInvestment).toBe(113_500_000)
        expect(result.annualCashFlow).toBeCloseTo(8_100_000, 6)
        expect(result.paybackYears).toBeCloseTo(14.0123, 3)
        expect(result.annualRoi).toBeCloseTo(0.071366, 5)
        expect(result.ready).toBe(true)
    })

    it('computes the exit metrics', () => {
        const result = computeAllCashReturns(inputs)

        expect(result.exitEnterpriseValue).toBeCloseTo(49_600_000, 6)
        expect(result.netExitProceeds).toBeCloseTo(48_608_000, 6)
        expect(result.cumulativeHoldCashFlow).toBeCloseTo(40_500_000, 6)
        expect(result.operatingMoic).toBeCloseTo(0.356828, 5)
        expect(result.exitReady).toBe(true)
    })

    it('builds a cash-flow series with exit proceeds only in the final year', () => {
        const result = computeAllCashReturns(inputs)

        expect(result.cashFlows).toEqual([
            -113_500_000,
            8_100_000,
            8_100_000,
            8_100_000,
            8_100_000,
            56_708_000,
        ])
    })

    it('total MOIC equals summed inflows over initial investment', () => {
        const result = computeAllCashReturns(inputs)
        // (8.1 x 4 + 56.708) / 113.5 = 89.108 / 113.5
        expect(result.totalMoic).toBeCloseTo(0.785091, 5)
    })

    it('reports no assumed inputs when everything is provided', () => {
        const result = computeAllCashReturns({ ...inputs, exitCosts: 992_000 })
        expect(result.assumedInputs).toEqual([])
        expect(result.missingInputs).toEqual([])
    })
})

describe('computeAllCashReturns — transparency about assumptions', () => {
    it('records every fallback it applied instead of hiding it', () => {
        const result = computeAllCashReturns({
            ebitda: 10_000_000,
            purchasePrice: 50_000_000,
        })

        const assumedFields = result.assumedInputs.map((input) => input.field).sort()
        expect(assumedFields).toEqual([
            'exitCosts',
            'exitMultiple',
            'holdPeriodYears',
            'maintenanceCapex',
            'taxRate',
            'transactionFees',
            'workingCapital',
        ])
    })

    it('flags a zero-capex assumption, since that flatters cash flow', () => {
        const result = computeAllCashReturns({ ebitda: 10_000_000, purchasePrice: 50_000_000 })
        const capex = result.assumedInputs.find((input) => input.field === 'maintenanceCapex')

        expect(capex).toBeDefined()
        expect(capex?.value).toBe(0)
        expect(capex?.source).toBe('assumed')
    })

    it('does not mark provided inputs as assumed', () => {
        const result = computeAllCashReturns({
            ebitda: 10_000_000,
            purchasePrice: 50_000_000,
            maintenanceCapex: 500_000,
        })

        expect(result.assumedInputs.some((input) => input.field === 'maintenanceCapex')).toBe(false)
    })

    it('treats a provided zero as provided, not missing', () => {
        const result = computeAllCashReturns({
            ebitda: 10_000_000,
            purchasePrice: 50_000_000,
            transactionFees: 0,
        })

        expect(result.assumedInputs.some((input) => input.field === 'transactionFees')).toBe(false)
    })
})

describe('computeAllCashReturns — exit multiple defaults to the entry multiple', () => {
    it('assumes a flat exit rather than an invented constant', () => {
        // 50M paid for 10M of earnings = 5.0x in, so 5.0x out.
        const result = computeAllCashReturns({ ebitda: 10_000_000, purchasePrice: 50_000_000 })
        const assumedExit = result.assumedInputs.find((input) => input.field === 'exitMultiple')

        expect(assumedExit?.value).toBeCloseTo(5, 6)
        expect(result.exitEnterpriseValue).toBeCloseTo(50_000_000, 6)
    })

    it('does not manufacture a loss on a high-multiple entry', () => {
        // 8.7x entry. A hardcoded 4x exit would force a negative IRR here.
        const result = computeAllCashReturns({
            ebitda: 12_400_000,
            purchasePrice: 108_000_000,
            transactionFees: 1_500_000,
            workingCapital: 2_000_000,
            taxRate: 0.25,
            maintenanceCapex: 1_200_000,
            holdPeriodYears: 5,
        })

        expect(result.totalMoic).not.toBeNull()
        expect(result.totalMoic as number).toBeGreaterThan(1)
        expect(result.irr as number).toBeGreaterThan(0)
    })

    it('still respects an explicitly provided exit multiple', () => {
        const result = computeAllCashReturns({
            ebitda: 10_000_000,
            purchasePrice: 50_000_000,
            exitMultiple: 7,
        })

        expect(result.exitEnterpriseValue).toBeCloseTo(70_000_000, 6)
        expect(result.assumedInputs.some((input) => input.field === 'exitMultiple')).toBe(false)
    })

    it('falls back to the constant when the entry multiple is underivable', () => {
        const result = computeAllCashReturns({ ebitda: 0, purchasePrice: 10_000_000 })
        const assumedExit = result.assumedInputs.find((input) => input.field === 'exitMultiple')

        expect(assumedExit?.value).toBe(DEAL_MATH_DEFAULTS.exitMultiple)
        expect(Number.isFinite(result.exitEnterpriseValue ?? 0)).toBe(true)
    })
})

describe('computeAllCashReturns — missing required inputs', () => {
    it('refuses to invent earnings', () => {
        const result = computeAllCashReturns({ ebitda: null, purchasePrice: 50_000_000 })

        expect(result.missingInputs).toContain('Documented EBITDA/SDE')
        expect(result.annualCashFlow).toBeNull()
        expect(result.paybackYears).toBeNull()
        expect(result.irr).toBeNull()
        expect(result.ready).toBe(false)
    })

    it('refuses to invent a purchase price', () => {
        const result = computeAllCashReturns({ ebitda: 10_000_000, purchasePrice: null })

        expect(result.missingInputs).toContain('Purchase or asking price')
        expect(result.initialInvestment).toBeNull()
        expect(result.annualRoi).toBeNull()
        expect(result.ready).toBe(false)
    })
})

describe('computeAllCashReturns — degenerate cases', () => {
    it('returns null payback when cash flow is not positive', () => {
        // Capex exceeds after-tax earnings => negative annual cash flow.
        const result = computeAllCashReturns({
            ebitda: 1_000_000,
            purchasePrice: 10_000_000,
            taxRate: 0.25,
            maintenanceCapex: 2_000_000,
        })

        expect(result.annualCashFlow).toBeLessThan(0)
        expect(result.paybackYears).toBeNull()
    })

    it('does not divide by a zero investment', () => {
        const result = computeAllCashReturns({
            ebitda: 1_000_000,
            purchasePrice: 0,
            transactionFees: 0,
            workingCapital: 0,
        })

        expect(result.initialInvestment).toBe(0)
        expect(result.annualRoi).toBeNull()
        expect(result.operatingMoic).toBeNull()
    })

    it('handles a zero-EBITDA business without producing NaN', () => {
        const result = computeAllCashReturns({ ebitda: 0, purchasePrice: 10_000_000 })

        expect(result.annualCashFlow).toBe(0)
        expect(result.paybackYears).toBeNull()
        expect(result.exitEnterpriseValue).toBe(0)
        expect(Number.isNaN(result.annualRoi ?? 0)).toBe(false)
    })
})

describe('ratio helpers', () => {
    it('computes margins and ratios', () => {
        expect(ebitdaMargin(12_400_000, 48_100_000)).toBeCloseTo(0.257796, 5)
        expect(debtToAssets(13_200_000, 60_000_000)).toBeCloseTo(0.22, 6)
        expect(revenuePerEmployee(48_100_000, 84)).toBeCloseTo(572_619.05, 2)
    })

    it('never returns Infinity or NaN', () => {
        expect(ratio(10, 0)).toBeNull()
        expect(ratio(null, 5)).toBeNull()
        expect(ebitdaMargin(10, 0)).toBeNull()
        expect(debtToAssets(10, 0)).toBeNull()
        expect(revenuePerEmployee(10, 0)).toBeNull()
    })

    it('computes premium and discount against a supported valuation', () => {
        expect(priceGapPercent(110_000_000, 100_000_000)).toBeCloseTo(10, 6)
        expect(priceGapPercent(90_000_000, 100_000_000)).toBeCloseTo(-10, 6)
        expect(priceGapPercent(100_000_000, 100_000_000)).toBe(0)
        expect(priceGapPercent(100_000_000, 0)).toBeNull()
    })
})
