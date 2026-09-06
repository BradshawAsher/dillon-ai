import { describe, it, expect } from 'vitest'
import { resolveLoanTermYears, computeAmortizingLoan, DEAL_MATH_DEFAULTS } from '../utils/dealMath'

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

        const annualSeniorService = (computeAmortizingLoan(debt, rate, term)?.monthlyPayment ?? 0) * 12
        const sellerNoteService = computeAmortizingLoan(sellerNote, DEAL_MATH_DEFAULTS.sellerNoteRate, DEAL_MATH_DEFAULTS.sellerNoteTermYears)?.annualDebtService ?? 0
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
        const shockedSeniorService = (computeAmortizingLoan(4000000, shockedRate, term)?.monthlyPayment ?? 0) * 12
        const sellerNoteService = computeAmortizingLoan(1000000, DEAL_MATH_DEFAULTS.sellerNoteRate, DEAL_MATH_DEFAULTS.sellerNoteTermYears)?.annualDebtService ?? 0
        const totalService = shockedSeniorService + sellerNoteService

        const shockedDscr = shockedAfterTax / totalService
        expect(shockedDscr).toBeLessThan(1.15) // SBA covenant breached
    })
})
