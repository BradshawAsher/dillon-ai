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
            <SectionHeader
                step={1}
                title="Negotiation playbook"
                description="Seller questions, management follow-up, leverage, timing, and request-list workflow in one place."
            />
            <SellerQuestionsCard synthesis={activeProjectSynthesis} model={hydratedDealModel} />
            <ManagementQuestionTracker projectId={activeProjectId} suggestedQuestions={activeProjectSynthesis?.openQuestions ?? []} />
            <NegotiationPlaybook synthesis={activeProjectSynthesis} model={hydratedDealModel} />
            <NegotiationImpactCard model={hydratedDealModel} />
            <DealTimingCard model={hydratedDealModel} />
            <AcquisitionTimelineCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            <InvestorReadinessCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documentCount={activeProjectDocuments.length} />
            <TermSheetCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
            <DDRequestListCard
                model={hydratedDealModel}
                synthesis={activeProjectSynthesis}
                documents={activeProjectDocuments}
                projectName={dealName || suggestedProjectName}
            />
        </section>
    )
}
