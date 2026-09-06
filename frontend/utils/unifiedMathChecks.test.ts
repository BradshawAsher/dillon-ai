import { describe, expect, it } from 'vitest'

import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import { buildUnifiedMathChecks } from './unifiedMathChecks'

const document = (overrides: Partial<SubmissionHistoryItem>): SubmissionHistoryItem => ({
    requestID: 'request-1',
    id: 1,
    fileName: 'financials.pdf',
    status: 'completed',
    ...overrides,
} as SubmissionHistoryItem)

const model = (overrides: Partial<DealModel>): DealModel => ({
    projectId: 'project-1',
    documentedFactsJson: '{}',
    ...overrides,
} as DealModel)

describe('buildUnifiedMathChecks', () => {
    it('counts only checks with a stated comparator as identity pass/fail checks', () => {
        const checks = buildUnifiedMathChecks([document({
            reconciliationJson: JSON.stringify({
                metrics: {
                    gross_profit_check: {
                        value: 400,
                        actual: 400,
                        withinTolerance: true,
                        formula: 'Revenue - COGS',
                    },
                    ebitda_margin: {
                        value: 0.25,
                        formula: 'EBITDA / Revenue',
                    },
                },
            }),
        })])

        expect(checks.find((check) => check.id.includes('gross_profit_check'))?.status).toBe('passed')
        expect(checks.find((check) => check.id.includes('ebitda_margin'))?.status).toBe('calculated')
    })

    it('does not invent cross-document concordance when there are no comparable facts', () => {
        const checks = buildUnifiedMathChecks([document({ financialFactsJson: '[]' })])
        expect(checks.some((check) => check.category === 'cross_doc')).toBe(false)
    })

    it('does not award a cross-document tie when both facts omit their periods', () => {
        const facts = JSON.stringify([{ metric: 'revenue', normalized_value: 1_000_000 }])
        const checks = buildUnifiedMathChecks([
            document({ requestID: 'a', fileName: 'tax-return.pdf', financialFactsJson: facts }),
            document({ requestID: 'b', fileName: 'p-and-l.xlsx', financialFactsJson: facts }),
        ])
        expect(checks.some((check) => check.category === 'cross_doc')).toBe(false)
    })

    it('creates verified ties and mismatches from independently sourced facts', () => {
        const facts = (revenue: number, ebitda: number) => JSON.stringify([
            { metric: 'revenue', normalized_value: revenue, period: 'FY2025' },
            { metric: 'ebitda_sde', normalized_value: ebitda, period: 'FY2025' },
        ])
        const checks = buildUnifiedMathChecks([
            document({ requestID: 'a', fileName: 'tax-return.pdf', financialFactsJson: facts(1_000_000, 200_000) }),
            document({ requestID: 'b', fileName: 'qoe.xlsx', financialFactsJson: facts(1_010_000, 150_000) }),
        ])
        const crossDocument = checks.filter((check) => check.category === 'cross_doc')

        expect(crossDocument.find((check) => check.title.startsWith('Revenue'))?.status).toBe('passed')
        expect(crossDocument.find((check) => check.title.startsWith('Ebitda'))?.status).toBe('mismatch')
    })

    it('labels margins, entry multiple, payback, leverage, and DSCR as calculations', () => {
        const checks = buildUnifiedMathChecks([], model({
            purchasePrice: 2_000_000,
            transactionFees: 50_000,
            workingCapitalRequirement: 100_000,
            taxRate: 0.25,
            maintenanceCapex: 25_000,
            seniorDebtAmount: 1_000_000,
            interestRate: 0.08,
            amortizationYears: 5,
            documentedFactsJson: JSON.stringify({
                revenue: { value: 2_000_000 },
                gross_profit: { value: 800_000 },
                ebitda_sde: { value: 400_000 },
            }),
        }))

        const expectedTitles = [
            'Gross Margin',
            'EBITDA / SDE Margin',
            'Entry Multiple',
            'Unlevered Payback Period',
            'Senior Debt / EBITDA',
            'Illustrative Senior DSCR',
        ]
        for (const title of expectedTitles) {
            expect(checks.find((check) => check.title === title)?.status, title).toBe('calculated')
        }
    })

    it('uses total liabilities rather than debt for calculated net assets', () => {
        const checks = buildUnifiedMathChecks([], model({
            documentedFactsJson: JSON.stringify({
                total_assets: { value: 1_000_000 },
                total_liabilities: { value: 650_000 },
                debt: { value: 200_000 },
            }),
        }))
        expect(checks.find((check) => check.title === 'Calculated Net Assets')?.computedValue).toBe(350_000)
    })
})
