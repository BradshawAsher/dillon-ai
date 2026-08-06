import React from 'react'
import ModelAssumptionsSummary from '../ModelAssumptionsSummary'
import DealValuationCard from '../DealValuationCard'
import ValuationGapCard from '../ValuationGapCard'
import ComparableTransactionsCard from '../ComparableTransactionsCard'
import SensitivityAnalysisCard from '../SensitivityAnalysisCard'
import MathChecksSection from '../MathChecksSection'

type ValuationWorkspaceViewProps = {
    hydratedDealModel: any
    activeProjectSynthesis: any
    askingPrice: string
    handleDealModelChange: (field: any, value: any) => void
    submissionHistory: any[]
    setActiveEvidence: (evidence: any) => void
    returnsDisplayModel: any
    activeProjectDocuments: any[]
}

export function ValuationWorkspaceView({
    hydratedDealModel,
    activeProjectSynthesis,
    askingPrice,
    handleDealModelChange,
    submissionHistory,
    setActiveEvidence,
    returnsDisplayModel,
    activeProjectDocuments,
}: ValuationWorkspaceViewProps) {
    return (
        <section className="space-y-6">
            <ModelAssumptionsSummary model={hydratedDealModel} area="valuation" />
            <DealValuationCard
                synthesis={activeProjectSynthesis}
                askingPrice={askingPrice}
                model={hydratedDealModel}
                onModelChange={handleDealModelChange}
                documents={submissionHistory}
                onOpenEvidence={setActiveEvidence}
            />
            <ValuationGapCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            <ComparableTransactionsCard model={hydratedDealModel} />
            <SensitivityAnalysisCard model={returnsDisplayModel} />
            <MathChecksSection
                documents={activeProjectDocuments}
                onOpenEvidence={setActiveEvidence}
                compact
                title="Data integrity checks"
                description="Verifies the financial numbers feeding into valuation methods."
            />
        </section>
    )
}
