import React from 'react'
import SectionHeader from '../SectionHeader'
import SellerQuestionsCard from '../SellerQuestionsCard'
import ManagementQuestionTracker from '../ManagementQuestionTracker'
import NegotiationPlaybook from '../NegotiationPlaybook'
import NegotiationImpactCard from '../NegotiationImpactCard'
import DealTimingCard from '../DealTimingCard'
import AcquisitionTimelineCard from '../AcquisitionTimelineCard'
import InvestorReadinessCard from '../InvestorReadinessCard'
import TermSheetCard from '../TermSheetCard'
import DDRequestListCard from '../DDRequestListCard'

type NegotiationWorkspaceViewProps = {
    activeProjectSynthesis: any
    hydratedDealModel: any
    activeProjectId: string
    activeProjectDocuments: any[]
    dealName: string
    suggestedProjectName: string
}

export function NegotiationWorkspaceView({
    activeProjectSynthesis,
    hydratedDealModel,
    activeProjectId,
    activeProjectDocuments,
    dealName,
    suggestedProjectName,
}: NegotiationWorkspaceViewProps) {
    return (
        <section className="space-y-6">
            <div id="negotiation-header" className="scroll-mt-6">
                <SectionHeader
                    step={1}
                    title="Negotiation playbook"
                    description="Seller questions, management follow-up, leverage, timing, and request-list workflow in one place."
                />
            </div>
            <div id="negotiation-seller" className="scroll-mt-6">
                <SellerQuestionsCard synthesis={activeProjectSynthesis} model={hydratedDealModel} />
            </div>
            <div id="negotiation-mgmt" className="scroll-mt-6">
                <ManagementQuestionTracker projectId={activeProjectId} suggestedQuestions={activeProjectSynthesis?.openQuestions ?? []} />
            </div>
            <div id="negotiation-playbook" className="scroll-mt-6">
                <NegotiationPlaybook synthesis={activeProjectSynthesis} model={hydratedDealModel} />
            </div>
            <div id="negotiation-impact" className="scroll-mt-6">
                <NegotiationImpactCard model={hydratedDealModel} />
            </div>
            <div id="negotiation-timeline" className="scroll-mt-6 space-y-6">
                <DealTimingCard model={hydratedDealModel} />
                <AcquisitionTimelineCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            </div>
            <div id="negotiation-terms" className="scroll-mt-6 space-y-6">
                <InvestorReadinessCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documentCount={activeProjectDocuments.length} />
                <TermSheetCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                <DDRequestListCard
                    model={hydratedDealModel}
                    synthesis={activeProjectSynthesis}
                    documents={activeProjectDocuments}
                    projectName={dealName || suggestedProjectName}
                />
            </div>
        </section>
    )
}
