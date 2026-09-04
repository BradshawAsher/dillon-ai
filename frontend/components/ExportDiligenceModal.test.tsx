import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { ExportDiligenceModal } from './ExportDiligenceModal'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'

const mockModel = {
    projectId: 'test-proj',
    purchasePrice: 6000000,
    askingPrice: 6500000,
    baseEbitdaMargin: 0.25,
    baseRevenueGrowth: 0.1,
    equityContributionPercent: 0.2,
    sellerNoteAmount: 500000,
    transactionFees: 150000,
    workingCapitalRequirement: 200000,
    documentedFactsJson: JSON.stringify({
        revenue: { value: 5000000, status: 'confirmed', provenance: 'Tax Return 2024' },
        ebitda_sde: { value: 1250000, status: 'confirmed', provenance: 'Tax Return 2024' },
    }),
} as unknown as DealModel

const mockSynthesis = {
    finalTrafficLight: 'green',
    finalRecommendation: 'Buy / Proceed',
    finalRiskLevel: 'Low',
    finalJudgmentSummary: 'Strong cash flow business with defensible market moat.',
    keyTakeaways: ['High gross margins', 'Recurring customer base'],
    redFlags: ['Independent contractor classification ambiguity: $120,000 risk'],
    yellowFlags: ['Customer concentration: Top customer is 22%'],
    industry: 'HVAC Services',
    valuationBaseEstimate: '6000000',
    valuationLowerBound: '5400000',
    valuationUpperBound: '6600000',
    valuationConfidence: '0.88',
    openQuestions: ['Confirm technician overtime rates'],
} as unknown as ProjectSynthesisItem

describe('ExportDiligenceModal', () => {
    it('returns null when open is false', () => {
        const html = renderToStaticMarkup(
            <ExportDiligenceModal
                open={false}
                onOpenChange={() => {}}
                dealName="Apex Mechanical"
                projectId="test-proj"
                dealModel={mockModel}
                synthesis={mockSynthesis}
            />
        )
        expect(html).toBe('')
    })

    it('renders publication-grade modal and preview when open is true', () => {
        const html = renderToStaticMarkup(
            <ExportDiligenceModal
                open={true}
                onOpenChange={() => {}}
                dealName="Apex Mechanical"
                projectId="test-proj"
                dealModel={mockModel}
                synthesis={mockSynthesis}
                documents={[{ fileName: '2024_Tax_Return.pdf', documentType: 'Tax Return', status: 'verified' } as any]}
            />
        )

        expect(html).toContain('Investment Committee Deal Memorandum')
        expect(html).toContain('Apex Mechanical')
        expect(html).toContain('IC RECOMMENDATION: BUY / PROCEED')
        expect(html).toContain('GREEN')
        expect(html).toContain('Defensible Valuation Bridge')
        expect(html).toContain('Print / Save as PDF')
        expect(html).toContain('Download Markdown')
        expect(html).toContain('Copy Markdown')
        expect(html).toContain('Executive IC Preview')
        expect(html).toContain('Exact IC Memo Markdown')
    })

    it('renders Non-Binding Letter of Intent (LOI) when initialDocumentType is loi', () => {
        const html = renderToStaticMarkup(
            <ExportDiligenceModal
                open={true}
                onOpenChange={() => {}}
                dealName="Apex Mechanical"
                projectId="test-proj"
                dealModel={mockModel}
                synthesis={mockSynthesis}
                initialDocumentType="loi"
            />
        )

        expect(html).toContain('Non-Binding Letter of Intent (LOI)')
        expect(html).toContain('Proposed Financing &amp; Capital Stack')
        expect(html).toContain('Senior SBA 7(a) / Bank Debt')
        expect(html).toContain('Seller Subordinated Note')
        expect(html).toContain('Buyer Cash Equity Check')
        expect(html).toContain('Working Capital Target (NWC Peg)')
        expect(html).toContain('Indemnity Escrows &amp; Holdbacks')
        expect(html).toContain('Legally Binding Exclusivity (&quot;No-Shop&quot;) &amp; Confidentiality')
        expect(html).toContain('Exact LOI Markdown')
    })
})
