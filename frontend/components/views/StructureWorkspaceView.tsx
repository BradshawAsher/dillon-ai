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
            <div id="structure-header" className="scroll-mt-6">
                <ModelAssumptionsSummary model={hydratedDealModel} area="structure" />
            </div>
            <div id="structure-visual" className="scroll-mt-6">
                <DealStructureVisualCard model={hydratedDealModel} onOpenEvidence={setActiveEvidence} />
            </div>
            <Suspense fallback={null}>
                <div id="structure-stack" className="scroll-mt-6">
                    <DealStackCard model={hydratedDealModel} />
                </div>
                <div id="structure-leverage" className="scroll-mt-6 space-y-6">
                    <div id="structure-dscr" className="scroll-mt-6">
                        <LeverageSafetyCard model={hydratedDealModel} />
                    </div>
                    <DownsideProtectionCard model={hydratedDealModel} />
                    <CashReserveAnalysisCard model={hydratedDealModel} />
                </div>
                <div id="structure-financing" className="scroll-mt-6 space-y-6">
                    <FinancingComparisonCard model={hydratedDealModel} />
                    <WorkingCapitalCard model={hydratedDealModel} />
                </div>
            </Suspense>
            <div id="structure-pending" className="scroll-mt-6">
                <DealModelPendingCard area="structure" model={activeDealModel} onChange={handleDealModelChange} onApplyDefaults={handleDealModelDefaults} />
            </div>
        </section>
    )
}
