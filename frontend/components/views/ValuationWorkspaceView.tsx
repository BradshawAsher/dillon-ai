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
            <div id="valuation-header" className="scroll-mt-6">
                <ModelAssumptionsSummary model={hydratedDealModel} area="valuation" />
            </div>
            <div id="valuation-quick" className="scroll-mt-6">
                <DealValuationCard
                    synthesis={activeProjectSynthesis}
                    askingPrice={askingPrice}
                    model={hydratedDealModel}
                    onModelChange={handleDealModelChange}
                    documents={submissionHistory}
                    onOpenEvidence={setActiveEvidence}
                />
            </div>
            <div id="valuation-gap" className="scroll-mt-6">
                <ValuationGapCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            </div>
            <div id="valuation-comps" className="scroll-mt-6">
                <ComparableTransactionsCard model={hydratedDealModel} />
            </div>
            <div id="valuation-sensitivity" className="scroll-mt-6">
                <SensitivityAnalysisCard model={returnsDisplayModel} />
            </div>
            <div id="valuation-risk-adjusted" className="scroll-mt-6">
                <MathChecksSection
                    documents={activeProjectDocuments}
                    onOpenEvidence={setActiveEvidence}
                    compact
                    title="Data integrity checks"
                    description="Verifies the financial numbers feeding into valuation methods."
                />
            </div>
        </section>
    )
}
