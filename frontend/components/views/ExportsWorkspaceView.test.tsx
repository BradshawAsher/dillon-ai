import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import { ExportsWorkspaceView } from './ExportsWorkspaceView'
import { ExcelModelPreviewModal } from './ExcelModelPreviewModal'
import { DossierPreviewModal } from './DossierPreviewModal'
import { JsonAuditPreviewModal } from './JsonAuditPreviewModal'
import type { DealModel, ProjectSynthesisItem } from '../../hooks/backend/diligence'

const mockModel = {
    projectId: 'proj-123',
    askingPrice: 10_000_000,
    purchasePrice: 9_500_000,
    revenue: 12_400_000,
    ebitda: 2_400_000,
    seniorDebtAmount: 5_700_000,
    sellerNoteAmount: 1_425_000,
    equityContributionPercent: 0.25,
    holdPeriodYears: 5,
    baseRevenueGrowth: 0.05,
    taxRate: 0.25,
    interestRate: 0.08,
    amortizationYears: 10,
    loanTermYears: 10,
    documentedFactsJson: JSON.stringify({
        revenue: { value: 12_400_000, confidence: 0.98, source_document: 'FY24 P&L.pdf', quote_snippet: 'Net sales' },
        ebitda_sde: { value: 2_400_000, confidence: 0.95, source_document: 'Tax Return 2024.pdf', quote_snippet: 'Ordinary business income' },
    }),
} as DealModel

const mockSynthesis: ProjectSynthesisItem = {
    id: 'synth-123',
    projectId: 'proj-123',
    versionNumber: 1,
    finalRecommendation: 'PROCEED WITH CAUTION',
    finalRiskLevel: 'MODERATE',
    finalTrafficLight: 'YELLOW',
    redFlags: ['Customer concentration in top account exceeds 35%'],
    yellowFlags: ['Working capital deficit of $120k vs historical peg'],
    greenFlags: ['High recurring subscription revenue renewal rate (94%)'],
    openQuestions: ['Verify sales tax compliance in 4 non-resident states'],
    negotiationLevers: ['Request $120k purchase price adjustment for NWC deficit'],
    missingDocuments: ['Q4 2024 Accounts Receivable Aging Schedule'],
    createdAt: new Date().toISOString(),
    status: 'completed',
} as any

describe('ExportsWorkspaceView Component & Previews', () => {
    it('renders all deliverable cards and banner', () => {
        const html = renderToStaticMarkup(
            <ExportsWorkspaceView
                dealModel={mockModel}
                synthesis={mockSynthesis}
                projectName="Apex Manufacturing Inc"
                documents={[]}
                onExportIcMemo={vi.fn()}
                onExportLoi={vi.fn()}
                onExportExcel={vi.fn()}
                onExportMarkdown={vi.fn()}
                onExportJson={vi.fn()}
                onCopySummary={vi.fn()}
            />
        )

        expect(html).toContain('Deal Deliverables &amp; Export Hub')
        expect(html).toContain('In-App Previews Active')
        expect(html).toContain('Investment Committee (IC) Memo')
        expect(html).toContain('Letter of Intent (LOI) &amp; Term Sheet')
        expect(html).toContain('Live 5-Sheet Financial Model (.xlsx)')
        expect(html).toContain('Preview Model')
        expect(html).toContain('Executive Deal Dossier (.md)')
        expect(html).toContain('Preview Dossier')
        expect(html).toContain('Structured Diligence JSON (.json)')
        expect(html).toContain('Inspect Payload')
    })

    it('renders ExcelModelPreviewModal with all 5 worksheets and zero-egress notice', () => {
        const closedHtml = renderToStaticMarkup(
            <ExcelModelPreviewModal
                open={false}
                onOpenChange={vi.fn()}
                model={mockModel}
                synthesis={mockSynthesis}
                projectName="Apex Manufacturing Inc"
                onDownloadExcel={vi.fn()}
            />
        )
        expect(closedHtml).toBe('')

        const openHtml = renderToStaticMarkup(
            <ExcelModelPreviewModal
                open={true}
                onOpenChange={vi.fn()}
                model={mockModel}
                synthesis={mockSynthesis}
                projectName="Apex Manufacturing Inc"
                onDownloadExcel={vi.fn()}
            />
        )

        expect(openHtml).toContain('Apex_Manufacturing_Inc_financial_model.xlsx')
        expect(openHtml).toContain('Live Formula Workbook')
        expect(openHtml).toContain('$0.00 Egress')
        expect(openHtml).toContain('Assumptions &amp; Structure')
        expect(openHtml).toContain('5-Yr Projections &amp; Cash Flow')
        expect(openHtml).toContain('LBO Returns &amp; Valuation')
        expect(openHtml).toContain('Documented Facts Audit Trail')
        expect(openHtml).toContain('Valuation Bridge &amp; Escrow')
        expect(openHtml).toContain('Download .xlsx')
    })

    it('renders DossierPreviewModal with executive brief metrics and risk flags', () => {
        const closedHtml = renderToStaticMarkup(
            <DossierPreviewModal
                open={false}
                onOpenChange={vi.fn()}
                model={mockModel}
                synthesis={mockSynthesis}
                projectName="Apex Manufacturing Inc"
                onDownloadMarkdown={vi.fn()}
                onCopyMarkdown={vi.fn()}
            />
        )
        expect(closedHtml).toBe('')

        const openHtml = renderToStaticMarkup(
            <DossierPreviewModal
                open={true}
                onOpenChange={vi.fn()}
                model={mockModel}
                synthesis={mockSynthesis}
                projectName="Apex Manufacturing Inc"
                onDownloadMarkdown={vi.fn()}
                onCopyMarkdown={vi.fn()}
            />
        )

        expect(openHtml).toContain('Apex_Manufacturing_Inc_summary.md')
        expect(openHtml).toContain('Executive Deal Dossier')
        expect(openHtml).toContain('Due Diligence Summary: Apex Manufacturing Inc')
        expect(openHtml).toContain('Customer concentration in top account exceeds 35%')
        expect(openHtml).toContain('Visual Summary')
        expect(openHtml).toContain('Exact .md Content')
        expect(openHtml).toContain('Download .md')
    })

    it('renders JsonAuditPreviewModal with the current export schema and quick stats', () => {
        const closedHtml = renderToStaticMarkup(
            <JsonAuditPreviewModal
                open={false}
                onOpenChange={vi.fn()}
                model={mockModel}
                synthesis={mockSynthesis}
                projectName="Apex Manufacturing Inc"
                onDownloadJson={vi.fn()}
            />
        )
        expect(closedHtml).toBe('')

        const openHtml = renderToStaticMarkup(
            <JsonAuditPreviewModal
                open={true}
                onOpenChange={vi.fn()}
                model={mockModel}
                synthesis={mockSynthesis}
                projectName="Apex Manufacturing Inc"
                onDownloadJson={vi.fn()}
            />
        )

        expect(openHtml).toContain('Apex_Manufacturing_Inc_export.json')
        expect(openHtml).toContain('Current Export Schema')
        expect(openHtml).toContain('Audit Payload')
        expect(openHtml).toContain('Full JSON')
        expect(openHtml).toContain('dealModel')
        expect(openHtml).toContain('documentedFacts')
        expect(openHtml).toContain('synthesis')
        expect(openHtml).toContain('Download .json')
    })
})
