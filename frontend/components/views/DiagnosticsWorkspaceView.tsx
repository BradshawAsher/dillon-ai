import React, { Suspense, useState } from 'react'
import { ShieldAlert, Compass, Sparkles, Filter } from 'lucide-react'

import DealQuickInsights from '../DealQuickInsights'
import InvestmentThesisCard from '../InvestmentThesisCard'
import DecisionFrameworkCard from '../DecisionFrameworkCard'
import QuickWinsCard from '../QuickWinsCard'
import StrengthsWeaknessesCard from '../StrengthsWeaknessesCard'
import RiskSummaryCard from '../RiskSummaryCard'
import RiskMatrixCard from '../RiskMatrixCard'
import KeyPersonRiskCard from '../KeyPersonRiskCard'
import OwnerDependencyCard from '../OwnerDependencyCard'
import DiligenceCompletenessCard from '../DiligenceCompletenessCard'
import RiskRewardScatterCard from '../RiskRewardScatterCard'
import DealKillerCheckCard from '../DealKillerCheckCard'
import SecondOpinionCard from '../SecondOpinionCard'
import AlertRulesCard from '../AlertRulesCard'
import TimeToCloseCard from '../TimeToCloseCard'
import ClosingChecklistCard from '../ClosingChecklistCard'
import SellerQuestionsCard from '../SellerQuestionsCard'
import ManagementQuestionTracker from '../ManagementQuestionTracker'
import NegotiationPlaybook from '../NegotiationPlaybook'
import NegotiationImpactCard from '../NegotiationImpactCard'
import DealTimingCard from '../DealTimingCard'
import AcquisitionTimelineCard from '../AcquisitionTimelineCard'
import InvestorReadinessCard from '../InvestorReadinessCard'
import TermSheetCard from '../TermSheetCard'
import DDRequestListCard from '../DDRequestListCard'
import ActivityFeed from '../ActivityFeed'
import PublicDataEnrichmentCard from '../PublicDataEnrichmentCard'

type DiagnosticsSubView = 'all' | 'risks' | 'playbook'

type DiagnosticsWorkspaceViewProps = {
    hydratedDealModel: any
    activeProjectSynthesis: any
    dealName: string
    suggestedProjectName: string
    activeProjectDocuments: any[]
    activeProjectId: string
    setActiveWorkspaceTab: (tab: any) => void
}

export function DiagnosticsWorkspaceView({
    hydratedDealModel,
    activeProjectSynthesis,
    dealName,
    suggestedProjectName,
    activeProjectDocuments,
    activeProjectId,
    setActiveWorkspaceTab,
}: DiagnosticsWorkspaceViewProps) {
    const [subView, setSubView] = useState<DiagnosticsSubView>('all')

    return (
        <section id="deal-diagnostics" className="space-y-6 scroll-mt-6">
            {/* Sticky Sub-view Segmented Control */}
            <div className="sticky top-14 z-30 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background/90 p-2 shadow-sm backdrop-blur-md">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setSubView('all')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            subView === 'all'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        <span>All Diagnostics</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubView('risks')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            subView === 'risks'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <ShieldAlert className="h-3.5 w-3.5" />
                        <span>Risk &amp; Deal Killers</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubView('playbook')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            subView === 'playbook'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <Compass className="h-3.5 w-3.5" />
                        <span>Negotiation &amp; Playbook</span>
                    </button>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>Deep diligence diagnostics</span>
                </div>
            </div>

            {/* Section 1: Risk & Insights */}
            {(subView === 'all' || subView === 'risks') && (
                <Suspense fallback={null}>
                    <div id="diag-risks-header" className="scroll-mt-6 pt-1">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                            Strategic Insights &amp; Risk Assessment
                        </h3>
                    </div>
                    <div id="diag-quick-insights" className="scroll-mt-6">
                        <DealQuickInsights model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-thesis" className="scroll-mt-6">
                        <InvestmentThesisCard
                            model={hydratedDealModel}
                            synthesis={activeProjectSynthesis}
                            projectName={dealName || suggestedProjectName}
                        />
                    </div>
                    <div id="diag-decision" className="scroll-mt-6">
                        <DecisionFrameworkCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-quick-wins" className="scroll-mt-6">
                        <QuickWinsCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-strengths" className="scroll-mt-6">
                        <StrengthsWeaknessesCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-risk-summary" className="scroll-mt-6">
                        <RiskSummaryCard synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-risk-matrix" className="scroll-mt-6">
                        <RiskMatrixCard synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-key-person" className="scroll-mt-6">
                        <KeyPersonRiskCard synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-owner-dep" className="scroll-mt-6">
                        <OwnerDependencyCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-diligence-comp" className="scroll-mt-6">
                        <DiligenceCompletenessCard
                            model={hydratedDealModel}
                            synthesis={activeProjectSynthesis}
                            documentCount={activeProjectDocuments.length}
                            onNavigate={(target) => {
                                if (target === 'upload') {
                                    document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                } else {
                                    setActiveWorkspaceTab(target)
                                }
                            }}
                        />
                    </div>
                    <div id="diag-risk-reward" className="scroll-mt-6">
                        <RiskRewardScatterCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-deal-killer" className="scroll-mt-6">
                        <DealKillerCheckCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-second-opinion" className="scroll-mt-6">
                        <SecondOpinionCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-alert-rules" className="scroll-mt-6">
                        <AlertRulesCard synthesis={activeProjectSynthesis} />
                    </div>
                </Suspense>
            )}

            {/* Section 2: Negotiation, Closing & Action Plans */}
            {(subView === 'all' || subView === 'playbook') && (
                <Suspense fallback={null}>
                    <div id="diag-closing-header" className="border-t border-border pt-4 scroll-mt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                            Negotiation &amp; Closing Playbook
                        </h3>
                    </div>
                    <div id="diag-time-to-close" className="scroll-mt-6">
                        <TimeToCloseCard
                            documentsCount={activeProjectDocuments.length}
                            completedDocuments={activeProjectDocuments.filter((d) => d.status === 'completed').length}
                            hasSynthesis={!!activeProjectSynthesis}
                            hasValuation={!!activeProjectSynthesis?.valuationBaseEstimate && activeProjectSynthesis.valuationBaseEstimate !== '0'}
                            hasFinancing={hydratedDealModel.equityContributionPercent != null}
                        />
                    </div>
                    <div id="diag-closing-checklist" className="scroll-mt-6">
                        <ClosingChecklistCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
                    </div>
                    <div id="diag-seller-qa" className="scroll-mt-6">
                        <SellerQuestionsCard synthesis={activeProjectSynthesis} model={hydratedDealModel} />
                    </div>
                    <div id="diag-mgmt-questions" className="scroll-mt-6">
                        <ManagementQuestionTracker projectId={activeProjectId} suggestedQuestions={activeProjectSynthesis?.openQuestions ?? []} />
                    </div>
                    <div id="diag-playbook" className="scroll-mt-6">
                        <NegotiationPlaybook synthesis={activeProjectSynthesis} model={hydratedDealModel} />
                    </div>
                    <div id="diag-negotiation-impact" className="scroll-mt-6">
                        <NegotiationImpactCard model={hydratedDealModel} />
                    </div>
                    <div id="diag-deal-timing" className="scroll-mt-6">
                        <DealTimingCard model={hydratedDealModel} />
                    </div>
                    <div id="diag-timeline" className="scroll-mt-6">
                        <AcquisitionTimelineCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                    </div>
                    <div id="diag-investor-readiness" className="scroll-mt-6">
                        <InvestorReadinessCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documentCount={activeProjectDocuments.length} />
                    </div>
                    <div id="diag-term-sheet" className="scroll-mt-6">
                        <TermSheetCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                    </div>
                    <div id="diag-dd-requests" className="scroll-mt-6">
                        <DDRequestListCard
                            model={hydratedDealModel}
                            synthesis={activeProjectSynthesis}
                            documents={activeProjectDocuments}
                            projectName={dealName || suggestedProjectName}
                        />
                    </div>
                    <div id="diag-activity-feed" className="scroll-mt-6">
                        <ActivityFeed documents={activeProjectDocuments} />
                    </div>
                    <div id="diag-public-data" className="scroll-mt-6">
                        <PublicDataEnrichmentCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                    </div>
                </Suspense>
            )}
        </section>
    )
}
