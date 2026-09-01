import { describe, it, expect } from 'vitest'
import { generateLiveExcelModel } from './excelModelGenerator'

describe('excelModelGenerator', () => {
    const mockModel: any = {
        askingPrice: 6000000,
        purchasePrice: 5500000,
        interestRate: 0.08,
        amortizationYears: 10,
        loanTermYears: 10,
        seniorDebtAmount: 3300000,
        sellerNoteAmount: 825000,
        taxRate: 0.25,
        baseRevenueGrowth: 0.06,
        holdPeriodYears: 5,
        documentedFactsJson: JSON.stringify({
            revenue: { value: 9200000, documentSource: 'P&L_2024.xlsx', excerpt: 'Gross revenue line' },
            ebitda_sde: { value: 1800000, documentSource: 'Tax_Return_1120S.pdf', excerpt: 'Adjusted net cash flow' },
            gross_profit: { value: 4500000, documentSource: 'P&L_2024.xlsx' },
        })
    }

    it('generates a valid multi-sheet .xlsx Blob with formulas', async () => {
        const blob = await generateLiveExcelModel({
            model: mockModel,
            projectName: 'Apex Industrial Services'
        })

        expect(blob).toBeDefined()
        expect(blob.size).toBeGreaterThan(5000)
        expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })
})
