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

    it('contains all 5 expected worksheets with live formulas, valuation bridge, and styling', async () => {
        const ExcelJS = (await import('exceljs')).default
        const blob = await generateLiveExcelModel({
            model: mockModel,
            synthesis: {
                redFlags: [
                    'Discovered $180,000 undocumented contractor payroll tax liability',
                    'Key customer accounts for 32% of total volume',
                ],
            } as any,
            projectName: 'Apex Industrial Services',
        })

        const arrayBuffer = await blob.arrayBuffer()
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(arrayBuffer)

        expect(wb.worksheets.length).toBe(5)
        
        const wsAssumptions = wb.getWorksheet('Assumptions & Structure')
        expect(wsAssumptions).toBeDefined()
        expect(wsAssumptions?.getCell('B2').value).toBe('Apex Industrial Services')
        expect(wsAssumptions?.getCell('B4').value).toBe(5500000)
        expect((wsAssumptions?.getCell('B6').value as any)?.formula).toBe('B4*B5')

        const wsProjections = wb.getWorksheet('5-Yr Projections & Cash Flow')
        expect(wsProjections).toBeDefined()
        expect(wsProjections?.getCell('A2').value).toBe('Revenue')
        expect(wsProjections?.getCell('B2').value).toBe(9200000)
        expect((wsProjections?.getCell('C2').value as any)?.formula).toContain('Assumptions & Structure')
        expect((wsProjections?.getCell('B4').value as any)?.formula).toBe('B2-B3')

        const wsReturns = wb.getWorksheet('LBO Returns & Valuation')
        expect(wsReturns).toBeDefined()
        expect(wsReturns?.rowCount).toBeGreaterThanOrEqual(7)
        expect((wsReturns?.getCell('B2').value as any)?.formula).toContain('5-Yr Projections & Cash Flow')

        const wsAudit = wb.getWorksheet('Documented Facts Audit Trail')
        expect(wsAudit).toBeDefined()
        expect(wsAudit?.rowCount).toBeGreaterThanOrEqual(3)

        const wsBridge = wb.getWorksheet('Valuation Bridge & Escrow')
        expect(wsBridge).toBeDefined()
        expect(wsBridge?.getCell('A2').value).toBe('Initial Asking / LOI Valuation')
        expect(wsBridge?.getCell('B2').value).toBe(5500000)

        // Find counter offer row and verify formula
        const cellValues: string[] = []
        wsBridge?.eachRow((row) => {
            const val = row.getCell(1).value
            if (typeof val === 'string') cellValues.push(val)
        })
        expect(cellValues).toContain('Total Enterprise Value Deductions')
        expect(cellValues).toContain('Special Indemnity Escrow Fund (Holdback)')
        expect(cellValues).toContain('Defensible Adjusted Counter-Offer')
        expect(cellValues).toContain('Section 2.3: Purchase Price Adjustment')
        expect(cellValues).toContain('Section 8.2(c): Special Indemnity Escrow Fund')
    })
})
