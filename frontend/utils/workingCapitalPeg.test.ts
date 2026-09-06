import { describe, it, expect } from 'vitest'
import { calculateWorkingCapitalPeg, generateMonthlyNwcSeries } from './workingCapitalPeg'

describe('workingCapitalPeg utility', () => {
    const mockModel: any = {
        businessName: 'Cascadia Climate Services, Inc.',
        documentedFactsJson: JSON.stringify({
            revenue: { value: 12400000 },
            accounts_receivable: { value: 950000 },
            inventory: { value: 450000 },
            accounts_payable: { value: 600000 },
        })
    }

    it('generates 24-month monthly series with positive current assets and liabilities', () => {
        const series = generateMonthlyNwcSeries(12400000, 950000, 450000, 600000, 240000, 24)
        expect(series.length).toBe(24)
        expect(series[0].nwc).toBeGreaterThan(0)
        expect(series[0].period).toBeDefined()
        expect(series[0].ar).toBeGreaterThan(0)
    })

    it('calculates 12m rolling average target peg and collar boundaries', () => {
        const result = calculateWorkingCapitalPeg(mockModel, '12m', 5)
        expect(result.selectedTimeframe).toBe('12m')
        expect(result.monthlyData.length).toBe(12)
        expect(result.targetPeg).toBeGreaterThan(0)
        expect(result.collarLowerLimit).toBe(Math.round(result.targetPeg * 0.95))
        expect(result.collarUpperLimit).toBe(Math.round(result.targetPeg * 1.05))
        expect(result.definitiveAgreementClause).toContain('SECTION 2.4 Working Capital Adjustment')
        expect(result.definitiveAgreementClause).toContain('Cascadia Climate Services, Inc.')
        expect(result.definitiveAgreementClause).toContain('trailing twelve (12) month')
        expect(result.definitiveAgreementClause).toContain('ILLUSTRATIVE DRAFT')
        expect(result.isIllustrative).toBe(true)
        expect(result.assumedInputs[0]).toContain('synthetically modeled')
    })

    it('calculates 6m and 24m timeframes correctly', () => {
        const res6 = calculateWorkingCapitalPeg(mockModel, '6m', 10)
        expect(res6.selectedTimeframe).toBe('6m')
        expect(res6.monthlyData.length).toBe(6)
        expect(res6.collarBandPercent).toBe(10)

        const res24 = calculateWorkingCapitalPeg(mockModel, '24m', 5)
        expect(res24.selectedTimeframe).toBe('24m')
        expect(res24.monthlyData.length).toBe(24)
    })

    it('computes closing purchase price deficit adjustment when closing NWC is below collar', () => {
        const result = calculateWorkingCapitalPeg(mockModel, '12m', 5, 200000)
        expect(result.adjustmentType).toBe('deficit_to_buyer')
        expect(result.adjustmentAmount).toBe(result.collarLowerLimit - 200000)
    })

    it('computes closing purchase price surplus adjustment when closing NWC is above collar', () => {
        const result = calculateWorkingCapitalPeg(mockModel, '12m', 5, 2000000)
        expect(result.adjustmentType).toBe('surplus_to_seller')
        expect(result.adjustmentAmount).toBe(2000000 - result.collarUpperLimit)
    })

    it('returns an empty series for a non-positive or non-finite month count', () => {
        expect(generateMonthlyNwcSeries(12_400_000, 950000, 450000, 600000, 240000, 0)).toEqual([])
        expect(generateMonthlyNwcSeries(12_400_000, 950000, 450000, 600000, 240000, Number.NaN)).toEqual([])
        expect(generateMonthlyNwcSeries(12_400_000, 950000, 450000, 600000, 240000, -3)).toEqual([])
    })

    it('falls back to the default 5% collar when the percent is non-finite', () => {
        const result = calculateWorkingCapitalPeg(mockModel, '12m', Number.NaN)
        expect(result.collarBandPercent).toBe(5)
        expect(result.collarLowerLimit).toBe(Math.round(result.targetPeg * 0.95))
        expect(Number.isFinite(result.collarUpperLimit)).toBe(true)
    })

    it('ignores a non-finite custom closing NWC instead of leaking NaN into the adjustment', () => {
        const result = calculateWorkingCapitalPeg(mockModel, '12m', 5, Number.NaN)
        expect(Number.isFinite(result.closingEstimatedNwc)).toBe(true)
        expect(result.adjustmentType).toBeDefined()
        expect(Number.isFinite(result.adjustmentAmount)).toBe(true)
    })

    it('does not invent a $12.4M company when revenue is missing', () => {
        const result = calculateWorkingCapitalPeg({ documentedFactsJson: '{}' } as any)
        expect(result.monthlyData).toEqual([])
        expect(result.targetPeg).toBe(0)
        expect(result.definitiveAgreementClause).toBe('')
        expect(result.assumedInputs[0]).toContain('revenue is missing')
    })
})
