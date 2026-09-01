import { describe, it, expect } from 'vitest'
import { calculateWorkingCapitalPeg } from '../utils/workingCapitalPeg'

describe('WorkingCapitalCard & Peg Engine', () => {
    const mockModel: any = {
        businessName: 'Northstar Industrial Supply, LLC',
        workingCapitalRequirement: 650000,
        baseRevenueGrowth: 0.08,
        documentedFactsJson: JSON.stringify({
            revenue: { value: 18500000 },
            accounts_receivable: { value: 1480000 },
            inventory: { value: 740000 },
            accounts_payable: { value: 925000 },
            cash_equivalents: { value: 450000 }
        })
    }

    it('computes rolling NWC peg accurately for 12-month standard', () => {
        const peg = calculateWorkingCapitalPeg(mockModel, '12m', 5)
        expect(peg.targetPeg).toBeGreaterThan(500000)
        expect(peg.selectedTimeframe).toBe('12m')
        expect(peg.collarBandPercent).toBe(5)
        expect(peg.collarLowerLimit).toBeLessThan(peg.targetPeg)
        expect(peg.collarUpperLimit).toBeGreaterThan(peg.targetPeg)
        expect(peg.definitiveAgreementClause).toContain('Northstar Industrial Supply, LLC')
        expect(peg.definitiveAgreementClause).toContain('SECTION 2.4 Working Capital Adjustment')
    })

    it('handles custom closing estimates and generates purchase price adjustment amounts', () => {
        // Closing NWC below collar
        const deficitRes = calculateWorkingCapitalPeg(mockModel, '12m', 5, 200000)
        expect(deficitRes.adjustmentType).toBe('deficit_to_buyer')
        expect(deficitRes.adjustmentAmount).toBe(deficitRes.collarLowerLimit - 200000)

        // Closing NWC above collar
        const surplusRes = calculateWorkingCapitalPeg(mockModel, '12m', 5, 3000000)
        expect(surplusRes.adjustmentType).toBe('surplus_to_seller')
        expect(surplusRes.adjustmentAmount).toBe(3000000 - surplusRes.collarUpperLimit)
    })
})
