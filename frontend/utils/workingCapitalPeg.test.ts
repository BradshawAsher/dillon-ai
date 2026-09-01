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
})
