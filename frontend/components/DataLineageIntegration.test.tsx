import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import ValuationGapCard from './ValuationGapCard'
import DealValuationCard from './DealValuationCard'
import FinancedReturnsCard from './FinancedReturnsCard'
import AllCashReturnsCard from './AllCashReturnsCard'
import RevenueBridgeCard from './RevenueBridgeCard'
import ScenarioComparisonCard from './ScenarioComparisonCard'
import DealStructureVisualCard from './DealStructureVisualCard'
import LeverageSafetyCard from './LeverageSafetyCard'
import NegotiationValuationBridgeCard from './NegotiationValuationBridgeCard'
import ComparableTransactionsCard from './ComparableTransactionsCard'
import { ValuationWorkspaceView } from './views/ValuationWorkspaceView'
import { ReturnsWorkspaceView } from './views/ReturnsWorkspaceView'
import { GrowthWorkspaceView } from './views/GrowthWorkspaceView'
import { StructureWorkspaceView } from './views/StructureWorkspaceView'
import { NegotiationWorkspaceView } from './views/NegotiationWorkspaceView'

const baseModel = {
    projectId: 'test-proj',
    askingPrice: 5000000,
    purchasePrice: 4800000,
    debtAssumed: 0,
    cashAcquired: 0,
    workingCapitalRequirement: 200000,
    transactionFees: 150000,
    holdPeriodYears: 5,
    taxRate: 0.25,
    closingCosts: null,
    maintenanceCapex: 50000,
    exitMultiple: 4.5,
    exitCosts: 50000,
    equityContributionPercent: 0.2,
    interestRate: 0.08,
    amortizationYears: 10,
    sellerNoteAmount: 500000,
    bearRevenueGrowth: -0.02,
    baseRevenueGrowth: 0.08,
    bullRevenueGrowth: 0.15,
    bearEbitdaMargin: 0.12,
    baseEbitdaMargin: 0.18,
    bullEbitdaMargin: 0.22,
    bearExitMultiple: 3.5,
    baseExitMultiple: 4.5,
    bullExitMultiple: 5.5,
    revenueMultiple: 1.2,
    ebitdaMultiple: 4.0,
    assetHaircutPercent: 0.1,
    modelUpdatedAt: '',
    modelUpdatedBy: '',
    documentedFactsJson: JSON.stringify({
        revenue: { value: 6500000, status: 'confirmed' },
        ebitda_sde: { value: 1200000, status: 'confirmed' },
        gross_profit: { value: 3120000, status: 'confirmed' },
        inventory: { value: 400000, status: 'confirmed' },
        ar_total: { value: 300000, status: 'confirmed' },
        ap_total: { value: 150000, status: 'confirmed' },
        fixed_assets: { value: 800000, status: 'confirmed' },
    }),
    documentedFactsStatus: 'confirmed',
} as unknown as DealModel

const emptyFindingGroups = {
    keyTakeaways: [],
    redFlags: [],
    yellowFlags: [],
    greenFlags: [],
    crossDocumentConflicts: [],
    openQuestions: [],
    negotiationLevers: [],
    missingDocuments: [],
}

const baseSynthesis: ProjectSynthesisItem = {
    projectId: 'test-proj',
    companyName: 'Test Corp',
    projectStatus: 'complete',
    documentsReceivedCount: 3,
    documentsCompletedCount: 3,
    missingDocuments: [],
    crossDocumentConflicts: [],
    openQuestions: [],
    negotiationLevers: ['Renegotiate master agreement'],
    keyTakeaways: ['High recurring service contracts'],
    redFlags: ['Key-person customer risk'],
    yellowFlags: [],
    greenFlags: [],
    red_flags: ['Key-person customer risk'],
    citations: [],
    citationDetails: [],
    structuredFindings: emptyFindingGroups,
    finalRiskLevel: 'Medium',
    finalTrafficLight: 'yellow',
    finalRecommendation: 'Proceed with conditions',
    finalJudgmentSummary: 'Test summary',
    finalJudgmentJson: '{}',
    aiErrorMessage: '',
    aiConfidence: '0.8',
    valuationConfidence: '0.75',
    valuationLowerBound: '$4,200,000',
    valuationBaseEstimate: '$4,800,000',
    valuationUpperBound: '$5,400,000',
    valuationCurrency: 'USD',
    projectProcessedAt: '2026-01-01T00:00:00Z',
    id: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    valuation_multiples: {
        ev_to_revenue_low: 0.9,
        ev_to_revenue_high: 1.4,
        ev_to_ebitda_low: 3.8,
        ev_to_ebitda_high: 5.2,
    },
    risk_factors: [{ category: 'Operational', risk: 'Customer concentration', severity: 'High' }],
    financial_analysis: {
        revenue_trajectory: 'Growing',
        margin_trend: 'Stable',
        working_capital_health: 'Healthy',
    },
} as unknown as ProjectSynthesisItem

describe('Data Lineage & Origin Badges Integration', () => {
    it('ValuationGapCard labels user-entered asking price, calculated fair value, and growth assumptions', () => {
        const html = renderToStaticMarkup(<ValuationGapCard model={baseModel} synthesis={baseSynthesis} />)
        expect(html).toContain('data-origin-badge="user_entered"')
        expect(html).toContain('data-origin-badge="calculated"')
        expect(html).toContain('data-origin-badge="assumption"')
        expect(html).toContain('+15% EBITDA')
        expect(html).toContain('+300 bps')
    })

    it('DealValuationCard labels supported base value and user-entered price position', () => {
        const html = renderToStaticMarkup(<DealValuationCard model={baseModel} synthesis={baseSynthesis} askingPrice="5000000" />)
        expect(html).toContain('data-origin-badge="calculated"')
        expect(html).toContain('Supported base value')
        expect(html).toContain('data-origin-badge="user_entered"')
    })

    it('ComparableTransactionsCard distinguishes Sector Multiples Benchmark from deal multiple', () => {
        const html = renderToStaticMarkup(<ComparableTransactionsCard model={baseModel} />)
        expect(html).toContain('Sector Multiples Benchmark')
        expect(html).toContain('Calculated Multiple')
        expect(html).toContain('data-origin-badge="benchmark"')
    })

    it('FinancedReturnsCard labels all key metrics as calculated formulas', () => {
        const html = renderToStaticMarkup(<FinancedReturnsCard model={baseModel} />)
        expect(html).toContain('data-origin-badge="calculated"')
        expect(html).toContain('Total MOIC / IRR')
        expect(html).toContain('Levered Returns')
        expect(html).toContain('Equity at close')
        expect(html).toContain('Annual debt service')
    })

    it('AllCashReturnsCard labels all return metrics as calculated formulas', () => {
        const html = renderToStaticMarkup(<AllCashReturnsCard model={baseModel} />)
        expect(html).toContain('data-origin-badge="calculated"')
        expect(html).toContain('Total MOIC / IRR')
        expect(html).toContain('All-Cash Return')
        expect(html).toContain('Net exit proceeds')
    })

    it('RevenueBridgeCard separates extracted LTM revenue from assumption drivers and calculated exit', () => {
        const html = renderToStaticMarkup(<RevenueBridgeCard model={baseModel} />)
        expect(html).toContain('Growth Attribution Model')
        expect(html).toContain('data-origin-badge="extracted"')
        expect(html).toContain('data-origin-badge="assumption"')
        expect(html).toContain('data-origin-badge="calculated"')
    })

    it('ScenarioComparisonCard marks scenarios as assumptions and exit results as calculated', () => {
        const html = renderToStaticMarkup(<ScenarioComparisonCard model={baseModel} />)
        expect(html).toContain('Multi-Scenario Projection')
        expect(html).toContain('Scenario Model')
        expect(html).toContain('data-origin-badge="calculated"')
        expect(html).toContain('Year 5 revenue / EBITDA')
    })

    it('DealStructureVisualCard distinguishes user inputs, benchmark limits, and calculated totals', () => {
        const html = renderToStaticMarkup(<DealStructureVisualCard model={baseModel} />)
        expect(html).toContain('Saved Capital Stack')
        expect(html).toContain('data-origin-badge="user_entered"')
        expect(html).toContain('data-origin-badge="calculated"')
        expect(html).toContain('Total Uses')
        expect(html).toContain('Debt Plug')
    })

    it('LeverageSafetyCard tags covenant standards as Institutional Covenant Benchmark', () => {
        const html = renderToStaticMarkup(<LeverageSafetyCard model={baseModel} />)
        expect(html).toContain('Institutional Covenant Benchmark')
        expect(html).toContain('data-origin-badge="calculated"')
        expect(html).toContain('Current DSCR')
        expect(html).toContain('Debt/EBITDA')
        expect(html).toContain('SBA Default Cushion')
    })

    it('NegotiationValuationBridgeCard labels initial LOI, deductions, and counter-offer', () => {
        const html = renderToStaticMarkup(
            <NegotiationValuationBridgeCard model={baseModel} synthesis={baseSynthesis} projectName="Test Corp Acquisition" />
        )
        expect(html).toContain('Contract Bridge Model')
        expect(html).toContain('data-origin-badge="user_entered"')
        expect(html).toContain('data-origin-badge="calculated"')
    })

    describe('Workspace Views DataLineageLegend Mounting', () => {
        it('ValuationWorkspaceView renders DataLineageLegend', () => {
            const html = renderToStaticMarkup(
                <ValuationWorkspaceView
                    hydratedDealModel={baseModel}
                    activeProjectSynthesis={baseSynthesis}
                    askingPrice="5000000"
                    handleDealModelChange={() => {}}
                    submissionHistory={[]}
                    setActiveEvidence={() => {}}
                    returnsDisplayModel={baseModel}
                    activeProjectDocuments={[]}
                />
            )
            expect(html).toContain('Financial Data Lineage &amp; Provenance')
            expect(html).toContain('data-origin-badge="extracted"')
            expect(html).toContain('data-origin-badge="user_entered"')
            expect(html).toContain('data-origin-badge="benchmark"')
            expect(html).toContain('data-origin-badge="assumption"')
            expect(html).toContain('data-origin-badge="calculated"')
        })

        it('ReturnsWorkspaceView renders DataLineageLegend', () => {
            const html = renderToStaticMarkup(
                <ReturnsWorkspaceView
                    activeDealModel={baseModel}
                    returnsDisplayModel={baseModel}
                    isReturnsIllustrativePreview={false}
                    submissionHistory={[]}
                    setActiveEvidence={() => {}}
                    activeProjectDocuments={[]}
                    handleDealModelChange={() => {}}
                    handleDealModelDefaults={() => {}}
                />
            )
            expect(html).toContain('Financial Data Lineage &amp; Provenance')
        })

        it('GrowthWorkspaceView renders DataLineageLegend', () => {
            const html = renderToStaticMarkup(
                <GrowthWorkspaceView
                    activeDealModel={baseModel}
                    isGrowthIllustrativePreview={false}
                    returnsDisplayModel={baseModel}
                    submissionHistory={[]}
                    setActiveEvidence={() => {}}
                    activeProjectSynthesis={baseSynthesis}
                    activeProjectDocuments={[]}
                    handleDealModelChange={() => {}}
                    handleDealModelDefaults={() => {}}
                />
            )
            expect(html).toContain('Financial Data Lineage &amp; Provenance')
        })

        it('StructureWorkspaceView renders DataLineageLegend', () => {
            const html = renderToStaticMarkup(
                <StructureWorkspaceView
                    activeDealModel={baseModel}
                    hydratedDealModel={baseModel}
                    setActiveEvidence={() => {}}
                    handleDealModelChange={() => {}}
                    handleDealModelDefaults={() => {}}
                />
            )
            expect(html).toContain('Financial Data Lineage &amp; Provenance')
        })

        it('NegotiationWorkspaceView renders DataLineageLegend', () => {
            const html = renderToStaticMarkup(
                <NegotiationWorkspaceView
                    activeProjectSynthesis={baseSynthesis}
                    hydratedDealModel={baseModel}
                    activeProjectId="test-proj"
                    activeProjectDocuments={[]}
                    dealName="Test Corp"
                    suggestedProjectName="Test Corp Acquisition"
                />
            )
            expect(html).toContain('Financial Data Lineage &amp; Provenance')
        })
    })
})
