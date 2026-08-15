import React, { Suspense } from 'react'
import ReturnsDecisionSummary from '../ReturnsDecisionSummary'
import AllCashReturnsCard from '../AllCashReturnsCard'
import FinancedReturnsCard from '../FinancedReturnsCard'
import FinancedScenarioComparisonCard from '../FinancedScenarioComparisonCard'
import BaseReturnMetricsCard from '../BaseReturnMetricsCard'
import CashOnCashCalculatorCard from '../CashOnCashCalculatorCard'
import MonteCarloCard from '../MonteCarloCard'
import BreakevenAnalysisCard from '../BreakevenAnalysisCard'
import PaybackTimelineCard from '../PaybackTimelineCard'
import AnnualCashFlowCard from '../AnnualCashFlowCard'
import DebtServiceCoverageCard from '../DebtServiceCoverageCard'
import WeeklyProjectionCard from '../WeeklyProjectionCard'
import SensitivityRankingCard from '../SensitivityRankingCard'
import WhatIfScenariosCard from '../WhatIfScenariosCard'
import TaxImpactCard from '../TaxImpactCard'
import SensitivityAnalysisCard from '../SensitivityAnalysisCard'
import HoldPeriodSensitivity from '../HoldPeriodSensitivity'
import MathChecksSection from '../MathChecksSection'
import DealModelPendingCard from '../DealModelPendingCard'
import ModelAssumptionsSummary from '../ModelAssumptionsSummary'

function IllustrativeModelPreviewNotice() {
    return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-medium text-foreground flex items-center justify-between gap-2">
            <span>💡 Illustrative return preview active — inputs adjust live with deal parameters.</span>
        </div>
    )
}

type ReturnsWorkspaceViewProps = {
    activeDealModel: any
    returnsDisplayModel: any
    isReturnsIllustrativePreview: boolean
    submissionHistory: any[]
    setActiveEvidence: (evidence: any) => void
    activeProjectDocuments: any[]
    handleDealModelChange: (field: any, value: any) => void
    handleDealModelDefaults: (values?: any) => void
}

export function ReturnsWorkspaceView({
    activeDealModel,
    returnsDisplayModel,
    isReturnsIllustrativePreview,
    submissionHistory,
    setActiveEvidence,
    activeProjectDocuments,
    handleDealModelChange,
    handleDealModelDefaults,
}: ReturnsWorkspaceViewProps) {
    return (
        <section className="space-y-6">
            <div id="returns-header" className="scroll-mt-6">
                <ModelAssumptionsSummary model={activeDealModel} area="returns" />
                <ReturnsDecisionSummary model={returnsDisplayModel} />
            </div>
            {isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}
            <div id="returns-all-cash" className="scroll-mt-6">
                <AllCashReturnsCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />
            </div>
            {isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}
            <div id="returns-financed" className="scroll-mt-6">
                <FinancedReturnsCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />
            </div>
            {isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}
            <div id="returns-scenario" className="scroll-mt-6">
                <FinancedScenarioComparisonCard model={returnsDisplayModel} />
            </div>
            <Suspense fallback={null}>
                <div id="returns-base" className="scroll-mt-6">
                    <BaseReturnMetricsCard model={returnsDisplayModel} />
                </div>
                <div id="returns-cash-on-cash" className="scroll-mt-6">
                    <CashOnCashCalculatorCard model={returnsDisplayModel} />
                </div>
                <MonteCarloCard model={returnsDisplayModel} />
                <BreakevenAnalysisCard model={returnsDisplayModel} />
                <div id="returns-payback" className="scroll-mt-6">
                    <PaybackTimelineCard model={returnsDisplayModel} />
                </div>
                <AnnualCashFlowCard model={returnsDisplayModel} />
                <DebtServiceCoverageCard model={returnsDisplayModel} />
                <WeeklyProjectionCard model={returnsDisplayModel} />
                <SensitivityRankingCard model={returnsDisplayModel} />
                <WhatIfScenariosCard model={returnsDisplayModel} />
                <TaxImpactCard model={returnsDisplayModel} />
            </Suspense>
            <SensitivityAnalysisCard model={returnsDisplayModel} />
            <div id="returns-hold-period" className="scroll-mt-6">
                <HoldPeriodSensitivity model={returnsDisplayModel} />
            </div>
            <MathChecksSection
                documents={activeProjectDocuments}
                onOpenEvidence={setActiveEvidence}
                compact
                title="Input data checks"
                description="Verifies EBITDA and revenue figures used in returns calculations."
            />
            <DealModelPendingCard area="returns" model={activeDealModel} onChange={handleDealModelChange} onApplyDefaults={handleDealModelDefaults} />
        </section>
    )
}
