import React, { Suspense } from 'react'
import ModelAssumptionsSummary from '../ModelAssumptionsSummary'
import GrowthDecisionSummary from '../GrowthDecisionSummary'
import ScenarioComparisonCard from '../ScenarioComparisonCard'
import EbitdaProjectionCard from '../EbitdaProjectionCard'
import BusinessValueEvolutionCard from '../BusinessValueEvolutionCard'
import RevenueBridgeCard from '../RevenueBridgeCard'
import GrowthSensitivityCard from '../GrowthSensitivityCard'
import ExitReadinessCard from '../ExitReadinessCard'
import ValueCreationPlanCard from '../ValueCreationPlanCard'
import First100DaysCard from '../First100DaysCard'
import KeyMetricsTrendCard from '../KeyMetricsTrendCard'
import OperatingLeverageCard from '../OperatingLeverageCard'
import MathChecksSection from '../MathChecksSection'
import DealModelPendingCard from '../DealModelPendingCard'

function IllustrativeModelPreviewNotice() {
    return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-xs font-medium text-foreground flex items-center justify-between gap-2">
            <span>💡 Illustrative return preview active — inputs adjust live with deal parameters.</span>
        </div>
    )
}

type GrowthWorkspaceViewProps = {
    activeDealModel: any
    isGrowthIllustrativePreview: boolean
    returnsDisplayModel: any
    submissionHistory: any[]
    setActiveEvidence: (evidence: any) => void
    activeProjectSynthesis: any
    activeProjectDocuments: any[]
    handleDealModelChange: (field: any, value: any) => void
    handleDealModelDefaults: (values?: any) => void
}

export function GrowthWorkspaceView({
    activeDealModel,
    isGrowthIllustrativePreview,
    returnsDisplayModel,
    submissionHistory,
    setActiveEvidence,
    activeProjectSynthesis,
    activeProjectDocuments,
    handleDealModelChange,
    handleDealModelDefaults,
}: GrowthWorkspaceViewProps) {
    return (
        <section className="space-y-6">
            <ModelAssumptionsSummary model={activeDealModel} area="growth" />
            {isGrowthIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}
            <GrowthDecisionSummary model={returnsDisplayModel} />
            <ScenarioComparisonCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />
            <EbitdaProjectionCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />
            <Suspense fallback={null}>
                <BusinessValueEvolutionCard model={returnsDisplayModel} />
                <RevenueBridgeCard model={returnsDisplayModel} />
                <GrowthSensitivityCard model={returnsDisplayModel} />
                <ExitReadinessCard model={returnsDisplayModel} synthesis={activeProjectSynthesis} />
                <ValueCreationPlanCard model={returnsDisplayModel} />
                <First100DaysCard model={returnsDisplayModel} synthesis={activeProjectSynthesis} />
                <KeyMetricsTrendCard model={returnsDisplayModel} />
                <OperatingLeverageCard model={returnsDisplayModel} />
            </Suspense>
            <MathChecksSection
                documents={activeProjectDocuments}
                onOpenEvidence={setActiveEvidence}
                compact
                title="Revenue & margin checks"
                description="Verifies starting revenue and margin figures used in growth projections."
            />
            <DealModelPendingCard area="growth" model={activeDealModel} onChange={handleDealModelChange} onApplyDefaults={handleDealModelDefaults} />
        </section>
    )
}
