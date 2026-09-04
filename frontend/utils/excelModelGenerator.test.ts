import { describe, it, expect } from 'vitest'
import {
    buildLiveExcelModelPreview,
    buildLiveExcelWorkbook,
    generateLiveExcelModel,
} from './excelModelGenerator'

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
        expect((wsProjections?.getCell('B10').value as any)?.formula).not.toMatch(/^-/)
        expect((wsProjections?.getCell('B10').value as any)?.result).toBeGreaterThan(0)
        expect((wsProjections?.getCell('B12').value as any)?.result).toBeLessThan((wsProjections?.getCell('B7').value as any)?.result)

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

    it('derives preview cells and formulas from the same workbook as the download', () => {
        const options = {
            model: mockModel,
            synthesis: {
                redFlags: ['Discovered $180,000 undocumented contractor payroll tax liability'],
            } as any,
            projectName: 'Apex Industrial Services',
        }
        const workbook = buildLiveExcelWorkbook(options)
        const preview = buildLiveExcelModelPreview(options)

        expect(preview.map((sheet) => sheet.name)).toEqual(workbook.worksheets.map((sheet) => sheet.name))

        for (const previewSheet of preview) {
            const worksheet = workbook.getWorksheet(previewSheet.name)
            expect(worksheet).toBeDefined()
            expect(previewSheet.headers).toEqual(
                Array.from({ length: worksheet!.columnCount }, (_, index) => String(worksheet!.getRow(1).getCell(index + 1).value ?? ''))
            )

            for (const row of previewSheet.rows) {
                for (const previewCell of row) {
                    const workbookValue = worksheet!.getCell(previewCell.coord).value as any
                    const workbookFormula = workbookValue && typeof workbookValue === 'object' && 'formula' in workbookValue
                        ? `=${workbookValue.formula}`
                        : undefined
                    expect(previewCell.formula).toBe(workbookFormula)
                }
            }
        }

        const bridge = preview.find((sheet) => sheet.id === 'bridge')
        const bridgeLabels = bridge?.rows.map((row) => row[0]?.value)
        expect(bridgeLabels).toContain('Section 2.3: Purchase Price Adjustment')
        expect(bridgeLabels).toContain('Section 8.2(c): Special Indemnity Escrow Fund')

        const projections = preview.find((sheet) => sheet.id === 'projections')
        expect(projections?.rows[0]?.[2]?.formula).toBe("=B2*(1+'Assumptions & Structure'!$B$13)")
    })

    it('does not invent audit rows when no documented facts exist', () => {
        const preview = buildLiveExcelModelPreview({
            model: { ...mockModel, documentedFactsJson: undefined },
            projectName: 'No Facts Deal',
        })
        const audit = preview.find((sheet) => sheet.id === 'audit')

        expect(audit?.rows).toEqual([])
    })
})
