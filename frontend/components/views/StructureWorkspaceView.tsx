import React, { Suspense } from 'react'
import ModelAssumptionsSummary from '../ModelAssumptionsSummary'
import DealStructureVisualCard from '../DealStructureVisualCard'
import DealStackCard from '../DealStackCard'
import LeverageSafetyCard from '../LeverageSafetyCard'
import DownsideProtectionCard from '../DownsideProtectionCard'
import CashReserveAnalysisCard from '../CashReserveAnalysisCard'
import FinancingComparisonCard from '../FinancingComparisonCard'
import WorkingCapitalCard from '../WorkingCapitalCard'
import DealModelPendingCard from '../DealModelPendingCard'

type StructureWorkspaceViewProps = {
    activeDealModel: any
    hydratedDealModel: any
    setActiveEvidence: (evidence: any) => void
    handleDealModelChange: (field: any, value: any) => void
    handleDealModelDefaults: (values?: any) => void
}

export function StructureWorkspaceView({
    activeDealModel,
    hydratedDealModel,
    setActiveEvidence,
    handleDealModelChange,
    handleDealModelDefaults,
}: StructureWorkspaceViewProps) {
    return (
        <section className="space-y-6">
            <ModelAssumptionsSummary model={activeDealModel} area="structure" />
            <DealStructureVisualCard model={hydratedDealModel} onOpenEvidence={setActiveEvidence} />
            <Suspense fallback={null}>
                <DealStackCard model={hydratedDealModel} />
                <LeverageSafetyCard model={hydratedDealModel} />
                <DownsideProtectionCard model={hydratedDealModel} />
                <CashReserveAnalysisCard model={hydratedDealModel} />
                <FinancingComparisonCard model={hydratedDealModel} />
                <WorkingCapitalCard model={hydratedDealModel} />
            </Suspense>
            <DealModelPendingCard area="structure" model={activeDealModel} onChange={handleDealModelChange} onApplyDefaults={handleDealModelDefaults} />
        </section>
    )
}
