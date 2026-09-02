import { describe, it, expect } from 'vitest'
import { parseQuestionnaireText } from './questionnaireImport'
import {
    questionnaireDraftValues,
    questionnaireDraftFromImport,
    QUESTIONNAIRE_REQUIRED_FIELDS
} from './questionnaireDraft'
import { sanitizeQuestionnaireDraftResponse } from '../../backend/diligence/questionnaireDraftAssistant'

interface TeaserBenchmark {
    id: string
    title: string
    industry: string
    rawText: string
    groundTruth: {
        dealName?: string
        companyName?: string
        industry?: string
        askingPrice?: number
        annualRevenue?: number
        reportedEbitda?: number
        ebitdaOrSdeType?: 'ebitda' | 'sde'
        grossMarginPercent?: number
        ownerCompensation?: number
        disallowedAddBacks?: number
        inventory?: number
        accountsReceivable?: number
        equipmentAndVehicles?: number
        accountsPayable?: number
        topCustomerConcentrationPercent?: number
        employeeCount?: number
        sellerNoteAmount?: number
        sellerNoteInterestRate?: number
    }
    expectedWarnings?: string[]
}

const BENCHMARKS: TeaserBenchmark[] = [
    {
        id: 'hvac-mechanical-01',
        title: 'Precision Commercial & Industrial HVAC Services',
        industry: 'HVAC / Facility Maintenance',
        rawText: `
CONFIDENTIAL BUSINESS REVIEW
Company Name: Precision Air & Thermal Solutions
Asking Price: $4,250,000
Annual Revenue: $5,800,000
Reported EBITDA: $1,150,000
Owner Compensation: $250,000
Disallowed Add-Backs: $85,000
Top Customer Concentration: 14%
Employees: 28
Equipment & Vehicles: $650,000
Seller Note: $425,000
        `.trim(),
        groundTruth: {
            companyName: 'Precision Air & Thermal Solutions',
            askingPrice: 4250000,
            annualRevenue: 5800000,
            reportedEbitda: 1150000,
            ownerCompensation: 250000,
            disallowedAddBacks: 85000,
            equipmentAndVehicles: 650000,
            topCustomerConcentrationPercent: 14,
            employeeCount: 28,
            sellerNoteAmount: 425000
        }
    },
    {
        id: 'saas-workflow-02',
        title: 'B2B Workflow Automation Cloud Software',
        industry: 'Software / SaaS',
        rawText: `
EXECUTIVE SUMMARY: Project CloudFlow
Company Name: CloudFlow Systems
Asking Price: $8,500,000
Annual Revenue: $3,200,000
Gross Margin: 82%
Reported EBITDA: $640,000
Employees: 14
Top Customer Concentration: 8.5%
        `.trim(),
        groundTruth: {
            companyName: 'CloudFlow Systems',
            askingPrice: 8500000,
            annualRevenue: 3200000,
            grossMarginPercent: 82,
            reportedEbitda: 640000,
            employeeCount: 14,
            topCustomerConcentrationPercent: 8.5
        }
    },
    {
        id: 'cnc-machining-03',
        title: 'Aerospace CNC Precision Component Manufacturer',
        industry: 'Precision Manufacturing',
        rawText: `
BUSINESS TEASER: AS9100 Certified CNC Machine Shop
Company Name: Apex Precision Machining Corp
Asking Price: $3,100,000
Annual Revenue: $4,400,000
Reported SDE: $780,000
Inventory: $420,000
Accounts Receivable: $360,000
Equipment & Vehicles: $1,200,000
Accounts Payable: $190,000
Employees: 19
        `.trim(),
        groundTruth: {
            companyName: 'Apex Precision Machining Corp',
            askingPrice: 3100000,
            annualRevenue: 4400000,
            reportedEbitda: 780000,
            inventory: 420000,
            accountsReceivable: 360000,
            equipmentAndVehicles: 1200000,
            accountsPayable: 190000,
            employeeCount: 19
        }
    }
]

describe('Quick Deal Questionnaire Real-Data Evals', () => {
    describe('Deterministic Heuristic Parsing Benchmark', () => {
        BENCHMARKS.forEach((bm) => {
            it(`evaluates ground truth field coverage for ${bm.title} (${bm.id})`, () => {
                const parseResult = parseQuestionnaireText(bm.rawText)
                const draft = questionnaireDraftFromImport(parseResult, `eval_${bm.id}`)
                const values = questionnaireDraftValues(draft)

                expect(parseResult.recognized.length).toBeGreaterThanOrEqual(3)

                if (bm.groundTruth.askingPrice) {
                    expect(Number(values.askingPrice)).toEqual(bm.groundTruth.askingPrice)
                }
                if (bm.groundTruth.annualRevenue) {
                    expect(Number(values.annualRevenue)).toEqual(bm.groundTruth.annualRevenue)
                }
                if (bm.groundTruth.reportedEbitda) {
                    expect(Number(values.reportedEbitda)).toEqual(bm.groundTruth.reportedEbitda)
                }
                if (bm.groundTruth.companyName) {
                    expect(values.dealName).toContain(bm.groundTruth.companyName.split(' ')[0])
                }
            })
        })
    })

    describe('AI Response Sanitization & Validation Evals', () => {
        it('accurately sanitizes high-precision 42-field AI extraction payloads', () => {
            const rawAiResponse = {
                requestId: 'eval_req_001',
                draftId: '00000000-0000-4000-8000-000000000001',
                fields: [
                    {
                        field: 'companyName',
                        value: 'Precision Air & Thermal Solutions, LLC',
                        confidence: 0.95,
                        source: 'Broker Teaser',
                        sourceLocation: 'Page 1 Header',
                        period: '',
                        units: '',
                        kind: 'extracted'
                    },
                    {
                        field: 'askingPrice',
                        value: 4250000,
                        confidence: 0.99,
                        source: 'Broker Teaser',
                        sourceLocation: 'Page 1 Pricing',
                        period: '',
                        units: 'USD',
                        kind: 'extracted'
                    },
                    {
                        field: 'annualRevenue',
                        value: 5800000,
                        confidence: 0.95,
                        source: 'Broker Teaser',
                        sourceLocation: 'Financial Highlights',
                        period: '2024 TTM',
                        units: 'USD',
                        kind: 'extracted'
                    },
                    {
                        field: 'reportedEbitda',
                        value: 1150000,
                        confidence: 0.90,
                        source: 'Broker Teaser',
                        sourceLocation: 'Financial Highlights',
                        period: '2024 TTM',
                        units: 'USD',
                        kind: 'extracted'
                    },
                    {
                        field: 'disallowedAddBacks',
                        value: 85000,
                        confidence: 0.85,
                        source: 'Broker Teaser',
                        sourceLocation: 'Footnote 2',
                        period: '',
                        units: 'USD',
                        kind: 'derived'
                    }
                ],
                warnings: [
                    'Disallowed add-back detected: $85,000 personal vehicle & travel expenses.'
                ]
            }

            const sanitized = sanitizeQuestionnaireDraftResponse(rawAiResponse, 'eval_req_001')

            expect(sanitized.draftId).toBe('00000000-0000-4000-8000-000000000001')
            expect(sanitized.fields).toHaveLength(5)
            expect(sanitized.warnings).toHaveLength(1)
            expect(sanitized.warnings[0]).toContain('$85,000')

            // Verify required field tracking
            expect(sanitized.missingRequiredFields).not.toContain('askingPrice')
            expect(sanitized.missingRequiredFields).not.toContain('annualRevenue')
            expect(sanitized.missingRequiredFields).not.toContain('reportedEbitda')
            expect(sanitized.missingRequiredFields).toContain('dealName') // not provided in payload
        })

        it('handles messy broker teasers with undisclosed EBITDA gracefully', () => {
            const messyTeaser = `
CONFIDENTIAL OPPORTUNITY
Great Retail Store for Sale
Asking Price: $1,500,000
Annual Revenue: $2,100,000
No P&L provided yet. Owner says cash flow is very high.
            `.trim()

            const parseResult = parseQuestionnaireText(messyTeaser)
            const draft = questionnaireDraftFromImport(parseResult, 'eval_messy_01')

            expect(draft.missingRequiredFields).toContain('reportedEbitda')
            expect(draft.fields.map(f => f.field)).toContain('askingPrice')
            expect(draft.fields.map(f => f.field)).toContain('annualRevenue')
        })
    })
})
