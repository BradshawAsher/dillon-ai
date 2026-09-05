import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

import {
    MAX_QUESTIONNAIRE_IMPORT_BYTES,
    extractQuestionnaireTextFromFile,
    parseQuestionnaireFile,
    parseQuestionnaireText,
} from './questionnaireImport'

describe('questionnaireImport', () => {
    // exceljs is a heavy dependency whose first dynamic import can take several
    // seconds. Warm it once here so the cold-import cost is paid outside any
    // individual test's timeout budget rather than causing the first
    // spreadsheet test to flakily time out.
    beforeAll(async () => {
        await import('exceljs')
    }, 30000)

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('extracts supported label/value statistics and normalizes earnings and location', () => {
        const result = parseQuestionnaireText(`
Company Name: Atlantic Beverage Distribution
Industry: Food & Beverage Distribution
Location: Tampa, fl
Asking Price: $4.8M
TTM Revenue: 5.2 million
SDE: $1.1M
Gross Margin: 38%
Employees: 24
Top Customer Concentration: 17%
Key Person Risk: Medium
        `)

        expect(result.values).toMatchObject({
            dealName: 'Atlantic Beverage Distribution',
            companyName: 'Atlantic Beverage Distribution',
            city: 'Tampa',
            state: 'FL',
            askingPrice: 4_800_000,
            annualRevenue: 5_200_000,
            reportedEbitda: 1_100_000,
            ebitdaOrSdeType: 'SDE',
            grossMarginPercent: 38,
            employeeCount: 24,
            topCustomerConcentrationPercent: 17,
            keyPersonRisk: 'moderate',
        })
        expect(result.warnings).toEqual([])
    })

    it('supports values placed on the line after a label as Word tables often produce', () => {
        const result = parseQuestionnaireText(`
Deal Name
Terranova Services
Seller Ask
$3.25M
Annual Revenue
$4,100,000
EBITDA
$825K
        `)

        expect(result.values).toMatchObject({
            dealName: 'Terranova Services',
            askingPrice: 3_250_000,
            annualRevenue: 4_100_000,
            reportedEbitda: 825_000,
        })
    })

    it('does not guess when a document contains conflicting values for the same field', () => {
        const result = parseQuestionnaireText('Annual Revenue: $5.2M\nRevenue: $4.9M\nAsking Price: $4M')

        expect(result.values.annualRevenue).toBeUndefined()
        expect(result.values.askingPrice).toBe(4_000_000)
        expect(result.warnings).toContain('Multiple values were found for Annual Revenue; review and enter it manually.')
    })

    it('rejects out-of-range values instead of silently applying them', () => {
        const result = parseQuestionnaireText('Company Name: Example Co\nGross Margin: 140%\nEmployees: -4')

        expect(result.values.dealName).toBe('Example Co')
        expect(result.values.grossMarginPercent).toBeUndefined()
        expect(result.values.employeeCount).toBeUndefined()
    })

    it('reads text files locally without invoking fetch or an external API', async () => {
        const fetchSpy = vi.fn(() => {
            throw new Error('network access is forbidden')
        })
        vi.stubGlobal('fetch', fetchSpy)
        const file = new File(['Company Name: Local Co\nAsking Price: $2M'], 'teaser.txt', { type: 'text/plain' })

        const result = await parseQuestionnaireFile(file)

        expect(result.values).toMatchObject({ dealName: 'Local Co', askingPrice: 2_000_000 })
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    it.each([
        ['teaser.csv', 'Company Name,CSV Co\nAsking Price,$2.4M\nRevenue,$3.1M\nEBITDA,$620K'],
        ['teaser.tsv', 'Company Name\tTSV Co\nAsking Price\t$2.4M\nRevenue\t$3.1M\nEBITDA\t$620K'],
    ])('parses source-aware delimited file %s', async (name, contents) => {
        const result = await parseQuestionnaireFile(new File([contents], name))

        expect(result.values).toMatchObject({ askingPrice: 2_400_000, annualRevenue: 3_100_000, reportedEbitda: 620_000 })
        expect(result.recognized.find((field) => field.field === 'askingPrice')?.source).toMatch(/Row 2/)
    })

    it('parses nested structured JSON without sending it anywhere', async () => {
        const file = new File([JSON.stringify({ company_name: 'JSON Co', financials: { asking_price: '$3M', ttm_revenue: '$4.2M', ebitda: '$800K' } })], 'teaser.json')

        const result = await parseQuestionnaireFile(file)

        expect(result.values).toMatchObject({ dealName: 'JSON Co', askingPrice: 3_000_000, annualRevenue: 4_200_000, reportedEbitda: 800_000 })
        expect(result.recognized.find((field) => field.field === 'annualRevenue')?.source).toBe('JSON $.financials.ttm_revenue')
    })

    it('parses Excel cells locally and preserves worksheet/cell provenance', async () => {
        const ExcelJS = (await import('exceljs')).default
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet('Deal Summary')
        sheet.addRows([
            ['Company Name', 'Spreadsheet Co'],
            ['Asking Price', 4_800_000],
            ['TTM Revenue', 5_200_000],
            ['EBITDA', 1_100_000],
        ])
        const bytes = await workbook.xlsx.writeBuffer()

        const result = await parseQuestionnaireFile(new File([bytes], 'deal.xlsx'))

        expect(result.values).toMatchObject({ dealName: 'Spreadsheet Co', askingPrice: 4_800_000, annualRevenue: 5_200_000, reportedEbitda: 1_100_000 })
        expect(result.recognized.find((field) => field.field === 'askingPrice')?.source).toMatch(/Deal Summary!A2:B2/)
    })

    it('omits conflicting Excel periods rather than choosing one silently', async () => {
        const ExcelJS = (await import('exceljs')).default
        const workbook = new ExcelJS.Workbook()
        workbook.addWorksheet('Historical').addRow(['Revenue', 4_900_000])
        workbook.addWorksheet('TTM').addRow(['Revenue', 5_200_000])
        const bytes = await workbook.xlsx.writeBuffer()

        const result = await parseQuestionnaireFile(new File([bytes], 'conflicting.xlsx'))

        expect(result.values.annualRevenue).toBeUndefined()
        expect(result.warnings).toContain('Multiple values were found for Annual Revenue; review and enter it manually.')
    })

    it('extracts text from a real local Word document', async () => {
        const fixture = readFileSync(new URL('../../test_sets/MergeWorks Testing/WidgetCo - Master Explanation & Ground Truth.docx', import.meta.url))
        const file = new File([fixture], 'WidgetCo - Master Explanation & Ground Truth.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        })

        const extracted = await extractQuestionnaireTextFromFile(file)

        expect(extracted.text.length).toBeGreaterThan(100)
        expect(extracted.text).toMatch(/WidgetCo/i)
    })

    it('rejects legacy, unsupported, and oversized files with actionable messages', async () => {
        await expect(extractQuestionnaireTextFromFile(new File(['x'], 'old.doc'))).rejects.toThrow(/Save a copy as \.docx/i)
        await expect(extractQuestionnaireTextFromFile(new File(['x'], 'image.pdf'))).rejects.toThrow(/\.docx, \.xlsx, \.xlsm/i)

        const oversized = {
            name: 'large.docx',
            size: MAX_QUESTIONNAIRE_IMPORT_BYTES + 1,
        } as File
        await expect(extractQuestionnaireTextFromFile(oversized)).rejects.toThrow(/larger than 5 MB/i)
    })

    it('warns when no supported labeled statistics are present', () => {
        const result = parseQuestionnaireText('This business is interesting and the owner may retire next year.')

        expect(result.recognized).toEqual([])
        expect(result.warnings[0]).toMatch(/No supported labeled deal statistics/i)
    })
})
