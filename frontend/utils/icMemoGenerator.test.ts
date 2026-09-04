import { describe, it, expect } from 'vitest'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { generateIcMemoMarkdown, generateIcMemoHtml } from './icMemoGenerator'

const mockModel = {
    projectId: 'proj-apex',
    askingPrice: 6500000,
    purchasePrice: 6000000,
    debtAssumed: 0,
    cashAcquired: 0,
    workingCapitalRequirement: 250000,
    transactionFees: 175000,
    holdPeriodYears: 5,
    taxRate: 0.25,
    closingCosts: null,
    maintenanceCapex: 75000,
    exitMultiple: 4.8,
    exitCosts: 50000,
    equityContributionPercent: 0.25,
    interestRate: 0.08,
    amortizationYears: 10,
    sellerNoteAmount: 750000,
    sellerNoteAmortizationYears: 5,
    bearRevenueGrowth: 0,
    baseRevenueGrowth: 0.07,
    bullRevenueGrowth: 0.12,
    bearEbitdaMargin: 0.15,
    baseEbitdaMargin: 0.20,
    bullEbitdaMargin: 0.24,
    bearExitMultiple: 3.8,
    baseExitMultiple: 4.8,
    bullExitMultiple: 5.8,
    revenueMultiple: 1.2,
    ebitdaMultiple: 4.8,
    assetHaircutPercent: 0.1,
    modelUpdatedAt: '',
    modelUpdatedBy: '',
    documentedFactsJson: JSON.stringify({
        revenue: { value: 7200000, status: 'confirmed' },
        ebitda_sde: { value: 1450000, status: 'confirmed' },
        gross_profit: { value: 3600000, status: 'confirmed' },
    }),
    documentedFactsStatus: 'confirmed',
} as unknown as DealModel

const mockSynthesis = {
    projectId: 'proj-apex',
    companyName: 'Apex Mechanical Services, LLC',
    industry: 'Commercial HVAC & Mechanical Contracting',
    summary: 'Strong commercial customer base with 62% recurring maintenance contracts.',
    finalRecommendation: 'Proceed with Valuation Retrade',
    finalTrafficLight: 'yellow',
    finalRiskLevel: 'Moderate',
    confidenceScore: 0.92,
    finalJudgmentSummary: 'Strong cash generator but discovered $180k in misclassified 1099 technicians requiring APA special indemnity escrow.',
    keyTakeaways: [
        'High recurring commercial service contracts (62% of revenue).',
        'Strong gross margins averaging 50% over past 3 operating years.',
        'Immediate synergy from dispatch automation and technician routing.',
    ],
    redFlags: [
        'Discovered $180k undocumented contractor liability for misclassified 1099 technicians.',
        'Customer concentration: Top customer accounts for 34% of LTM revenue.',
        'Owner personal vehicle and country club dues run through operating expenses ($45k).',
    ],
    yellowFlags: [
        'Aging vehicle fleet requiring $60k deferred maintenance.',
    ],
    greenFlags: [
        'Long-term master service agreements with 95% annual renewal rate.',
    ],
    crossDocumentConflicts: [],
    negotiationLevers: [
        'Require dollar-for-dollar purchase price reduction for contractor back taxes.',
        'Structure 18-month special indemnity escrow for wage compliance.',
    ],
    openQuestions: [
        'Request 3 years of 1099 filings and worker contracts.',
    ],
    missingDocuments: [],
    valuationBaseEstimate: '$5,800,000',
    valuationLowerBound: '$5,200,000',
    valuationUpperBound: '$6,400,000',
    valuationCurrency: 'USD',
    createdAt: '2026-09-04T00:00:00Z',
} as unknown as ProjectSynthesisItem

describe('icMemoGenerator Utility', () => {
    it('generates institutional markdown memo with all 7 core sections', () => {
        const md = generateIcMemoMarkdown({
            model: mockModel,
            synthesis: mockSynthesis,
            projectName: 'Apex Mechanical Services',
            projectId: 'proj-apex',
        })

        // Header & Metadata
        expect(md).toContain('CONFIDENTIAL INVESTMENT COMMITTEE MEMORANDUM')
        expect(md).toContain('Apex Mechanical Services')
        expect(md).toContain('HVAC')

        // 1. Executive Summary & Verdict
        expect(md).toContain('1. EXECUTIVE SUMMARY & IC RECOMMENDATION')
        expect(md).toContain('Proceed with Valuation Retrade')
        expect(md).toContain('92%')

        // 2. Transaction Economics & Capital Stack
        expect(md).toContain('2. TRANSACTION ECONOMICS & CAPITAL STACK')
        expect(md).toContain('$6,000,000')
        expect(md).toContain('$7,200,000')
        expect(md).toContain('Proposed Sources & Uses')

        // 3. QoE & Add-Backs
        expect(md).toContain('3. QUALITY OF EARNINGS (QoE) & ADD-BACK DISALLOWANCES')

        // 4. Valuation Bridge
        expect(md).toContain('4. VALUATION BRIDGE & RECOMMENDED COUNTER-OFFER')
        expect(md).toContain('Defensible Net Counter-Offer')

        // 5. Red Flags & APA Covenants
        expect(md).toContain('5. CRITICAL DILIGENCE RED FLAGS & APA LEGAL COVENANTS')
        expect(md).toContain('SECTION 2.3. Purchase Price Adjustment')
        expect(md).toContain('SECTION 8.2(c). Special Indemnity Escrow Fund')

        // 6. Data Lineage
        expect(md).toContain('6. DATA LINEAGE & PROVENANCE AUDIT')
        expect(md).toContain('[Extracted]')
        expect(md).toContain('[Calculated]')

        // 7. IC Sign-Off
        expect(md).toContain('7. INVESTMENT COMMITTEE APPROVAL & SIGN-OFF')
        expect(md).toContain('Managing Partner')
    })

    it('generates print-ready HTML with @page styling and clean structure', () => {
        const html = generateIcMemoHtml({
            model: mockModel,
            synthesis: mockSynthesis,
            projectName: 'Apex Mechanical Services',
            projectId: 'proj-apex',
            documents: [{ fileName: '2024_Tax_Return_1120S.pdf', documentType: 'Tax Return', status: 'processed' }],
        })

        expect(html).toContain('<!DOCTYPE html>')
        expect(html).toContain('size: letter;')
        expect(html).toContain('Investment Committee Memo')
        expect(html).toContain('Apex Mechanical Services')
        expect(html).toContain('IC RECOMMENDATION:')
        expect(html).toContain('Transaction Economics & Sources / Uses')
        expect(html).toContain('Quality of Earnings (QoE) & Valuation Bridge')
        expect(html).toContain('SECTION 2.3')
        expect(html).toContain('SECTION 8.2(c)')
        expect(html).toContain('2024_Tax_Return_1120S.pdf')
        expect(html).toContain('signature-table')
    })

    it('gracefully handles sparse models without throwing errors or producing NaN', () => {
        const sparseModel = {
            projectId: 'sparse',
            askingPrice: null,
            purchasePrice: null,
            debtAssumed: null,
            cashAcquired: null,
            workingCapitalRequirement: null,
            transactionFees: null,
            holdPeriodYears: null,
            taxRate: null,
            closingCosts: null,
            maintenanceCapex: null,
            exitMultiple: null,
            exitCosts: null,
            equityContributionPercent: null,
            interestRate: null,
            amortizationYears: null,
            sellerNoteAmount: null,
            sellerNoteAmortizationYears: null,
            bearRevenueGrowth: null,
            baseRevenueGrowth: null,
            bullRevenueGrowth: null,
            bearEbitdaMargin: null,
            baseEbitdaMargin: null,
            bullEbitdaMargin: null,
            bearExitMultiple: null,
            baseExitMultiple: null,
            bullExitMultiple: null,
            revenueMultiple: null,
            ebitdaMultiple: null,
            assetHaircutPercent: null,
            modelUpdatedAt: '',
            modelUpdatedBy: '',
            documentedFactsJson: '',
            documentedFactsStatus: 'draft',
        } as unknown as DealModel

        const md = generateIcMemoMarkdown({
            model: sparseModel,
            synthesis: null,
            projectName: 'Sparse Deal',
        })

        expect(md).not.toContain('NaN')
        expect(md).toContain('CONFIDENTIAL INVESTMENT COMMITTEE MEMORANDUM')
        expect(md).toContain('Sparse Deal')

        const html = generateIcMemoHtml({
            model: sparseModel,
            synthesis: null,
            projectName: 'Sparse Deal',
        })

        expect(html).not.toContain('NaN')
        expect(html).toContain('Investment Committee Memo')
    })

    it('handles qualitative confidence and zero-valued unset purchase prices', () => {
        const md = generateIcMemoMarkdown({
            model: { ...mockModel, purchasePrice: 0, askingPrice: 6_500_000 } as DealModel,
            synthesis: { ...mockSynthesis, valuationConfidence: 'HIGH' } as ProjectSynthesisItem,
            projectName: 'Confidence Test',
        })

        expect(md).toContain('Confidence Level**: HIGH')
        expect(md).toContain('Enterprise Value (Target)** | $6,500,000')
        expect(md).not.toContain('NaN')
    })

    it('escapes document-derived HTML and preserves the real source-document status', () => {
        const html = generateIcMemoHtml({
            model: mockModel,
            synthesis: {
                ...mockSynthesis,
                finalTrafficLight: 'red',
                finalJudgmentSummary: '<img src=x onerror="window.opener.stolen=true">',
                redFlags: ['<script>window.opener.stolen=true</script>'],
            } as ProjectSynthesisItem,
            projectName: '<script>malicious target</script>',
            documents: [{ fileName: '<img src=x onerror=alert(1)>', documentType: 'Tax Return', status: 'failed' }],
        })

        expect(html).not.toContain('<script>malicious target</script>')
        expect(html).not.toContain('<script>window.opener.stolen=true</script>')
        expect(html).not.toContain('<img src=x onerror=')
        expect(html).toContain('&lt;script&gt;malicious target&lt;/script&gt;')
        expect(html).toContain('&lt;img src=x onerror=')
        expect(html).toContain('>failed</td>')
        expect(html).toContain('class="badge badge-red">RED SIGNAL')
    })
})
