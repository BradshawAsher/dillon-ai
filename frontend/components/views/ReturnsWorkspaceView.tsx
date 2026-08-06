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
            <ModelAssumptionsSummary model={activeDealModel} area="returns" />
            <ReturnsDecisionSummary model={returnsDisplayModel} />
            {isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}
            <AllCashReturnsCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />
            {isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}
            <FinancedReturnsCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />
            {isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}
            <FinancedScenarioComparisonCard model={returnsDisplayModel} />
            <Suspense fallback={null}>
                <BaseReturnMetricsCard model={returnsDisplayModel} />
                <CashOnCashCalculatorCard model={returnsDisplayModel} />
                <MonteCarloCard model={returnsDisplayModel} />
                <BreakevenAnalysisCard model={returnsDisplayModel} />
                <PaybackTimelineCard model={returnsDisplayModel} />
                <AnnualCashFlowCard model={returnsDisplayModel} />
                <DebtServiceCoverageCard model={returnsDisplayModel} />
                <WeeklyProjectionCard model={returnsDisplayModel} />
                <SensitivityRankingCard model={returnsDisplayModel} />
                <WhatIfScenariosCard model={returnsDisplayModel} />
                <TaxImpactCard model={returnsDisplayModel} />
            </Suspense>
            <SensitivityAnalysisCard model={returnsDisplayModel} />
            <HoldPeriodSensitivity model={returnsDisplayModel} />
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
