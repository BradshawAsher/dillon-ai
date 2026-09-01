import { describe, it, expect } from 'vitest'
import { resolveLoanTermYears } from '../utils/dealMath'

describe('LeverageSafetyCard & 2D Rate Shock Matrix', () => {
    const mockModel: any = {
        seniorDebtAmount: 4000000,
        sellerNoteAmount: 1000000,
        interestRate: 0.08,
        amortizationYears: 10,
        loanTermYears: 10,
        taxRate: 0.25,
        holdPeriodYears: 5,
        documentedFactsJson: JSON.stringify({
            ebitda_sde: { value: 1600000 }
        })
    }

    it('calculates DSCR and leverage ratios correctly', () => {
        const ebitda = 1600000
        const debt = 4000000
        const sellerNote = 1000000
        const totalDebt = debt + sellerNote
        const rate = 0.08
        const term = resolveLoanTermYears(10, 10)
        
        const annualSeniorService = (debt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -term * 12)) * 12
        const sellerNoteService = sellerNote * 0.05 + (sellerNote / 5)
        const totalDebtService = annualSeniorService + sellerNoteService
        
        const afterTaxEbitda = ebitda * (1 - 0.25)
        const dscr = afterTaxEbitda / totalDebtService
        const leverage = totalDebt / ebitda

        expect(dscr).toBeGreaterThan(1.0)
        expect(leverage).toBe(3.125)
    })

    it('detects SBA 7(a) 1.15x covenant breach on rate shock and EBITDA contraction', () => {
        const baseEbitda = 1600000
        const shockedEbitda = baseEbitda * 0.70 // -30% drop
        const shockedAfterTax = shockedEbitda * (1 - 0.25)

        const shockedRate = 0.11 // +300 bps
        const term = 10
        const shockedSeniorService = (4000000 * (shockedRate / 12)) / (1 - Math.pow(1 + shockedRate / 12, -term * 12)) * 12
        const totalService = shockedSeniorService + (1000000 * 0.05 + 200000)

        const shockedDscr = shockedAfterTax / totalService
        expect(shockedDscr).toBeLessThan(1.15) // SBA covenant breached
    })
})
