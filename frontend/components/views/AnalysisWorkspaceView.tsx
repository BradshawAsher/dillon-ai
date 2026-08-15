import React, { Suspense } from 'react'
import DealOnAPageCard from '../DealOnAPageCard'
import DealScorecardExportCard from '../DealScorecardExportCard'
import BusinessSnapshotCard from '../BusinessSnapshotCard'
import OpportunityScoreCard from '../OpportunityScoreCard'
import RiskAdjustedValuationCard from '../RiskAdjustedValuationCard'
import NextActionsCard from '../NextActionsCard'
import DealReadinessGauge from '../DealReadinessGauge'
import DocumentCoverageMatrix from '../DocumentCoverageMatrix'
import DealScorecard from '../DealScorecard'
import DealRulesOfThumb from '../DealRulesOfThumb'
import ConfidenceMeterCard from '../ConfidenceMeterCard'
import FinancialHealthCard from '../FinancialHealthCard'
import EBITDAQualityScoreCard from '../EBITDAQualityScoreCard'
import BenchmarkComparisonCard from '../BenchmarkComparisonCard'
import MarketPositionCard from '../MarketPositionCard'
import AssumptionGapsCard from '../AssumptionGapsCard'
import WhatsMissingCard from '../WhatsMissingCard'
import MarketCompsCard from '../MarketCompsCard'
import FinancingScenariosCard from '../FinancingScenariosCard'
import InvestmentMetricsCard from '../InvestmentMetricsCard'
import IndustryPercentileCard from '../IndustryPercentileCard'
import DealTypeAnalysisCard from '../DealTypeAnalysisCard'
import DealFitCard from '../DealFitCard'
import AssetCompositionCard from '../AssetCompositionCard'
import ValuationGapCard from '../ValuationGapCard'
import CashOnCashCalculatorCard from '../CashOnCashCalculatorCard'
import BusinessValueEvolutionCard from '../BusinessValueEvolutionCard'
import RevenueBridgeCard from '../RevenueBridgeCard'
import BaseReturnMetricsCard from '../BaseReturnMetricsCard'
import GrowthSensitivityCard from '../GrowthSensitivityCard'
import MonteCarloCard from '../MonteCarloCard'
import BreakevenAnalysisCard from '../BreakevenAnalysisCard'
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

type AnalysisWorkspaceViewProps = {
    hydratedDealModel: any
    activeProjectSynthesis: any
    dealName: string
    suggestedProjectName: string
    activeProjectDocuments: any[]
    activeProjectImpact: any
    activeProjectId: string
    setActiveWorkspaceTab: (tab: any) => void
}

export function AnalysisWorkspaceView({
    hydratedDealModel,
    activeProjectSynthesis,
    dealName,
    suggestedProjectName,
    activeProjectDocuments,
    activeProjectImpact,
    activeProjectId,
    setActiveWorkspaceTab,
}: AnalysisWorkspaceViewProps) {
    return (
        <section id="deal-analysis" className="space-y-6 scroll-mt-6">
            <div id="analysis-header" className="scroll-mt-6 pt-1">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Snapshot &amp; scoring</h3>
            </div>
            <Suspense fallback={null}>
                <div id="analysis-deal-on-a-page" className="scroll-mt-6">
                    <DealOnAPageCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                </div>
                <div id="analysis-scorecard" className="scroll-mt-6">
                    <DealScorecardExportCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                </div>
                <div id="analysis-snapshot" className="scroll-mt-6">
                    <BusinessSnapshotCard
                        model={hydratedDealModel}
                        synthesis={activeProjectSynthesis}
                        projectName={dealName || suggestedProjectName}
                        onSwitchTab={setActiveWorkspaceTab}
                    />
                </div>
                <div id="analysis-opportunity" className="scroll-mt-6">
                    <OpportunityScoreCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-risk-valuation" className="scroll-mt-6">
                    <RiskAdjustedValuationCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
            </Suspense>
            <div id="analysis-deal-grade" className="scroll-mt-6 space-y-6">
                <div id="analysis-next-actions" className="scroll-mt-6">
                    <NextActionsCard
                        model={hydratedDealModel}
                        synthesis={activeProjectSynthesis}
                        documents={activeProjectDocuments}
                        onNavigate={(target) => {
                            if (target === 'upload') {
                                document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            } else {
                                setActiveWorkspaceTab(target)
                            }
                        }}
                    />
                </div>
                <div id="analysis-readiness" className="scroll-mt-6">
                    <DealReadinessGauge
                        model={hydratedDealModel}
                        synthesis={activeProjectSynthesis}
                        documentsCount={activeProjectDocuments.length}
                        completedDocuments={activeProjectImpact.completedDocuments}
                    />
                </div>
                <div id="analysis-coverage" className="scroll-mt-6">
                    <DocumentCoverageMatrix documents={activeProjectDocuments} />
                </div>
                <div id="analysis-scorecard-breakdown" className="scroll-mt-6">
                    <DealScorecard
                        model={hydratedDealModel}
                        synthesis={activeProjectSynthesis}
                        impact={activeProjectImpact}
                        documentsCount={activeProjectDocuments.length}
                    />
                </div>
                <div id="analysis-rules" className="scroll-mt-6">
                    <DealRulesOfThumb model={hydratedDealModel} />
                </div>
                <div id="analysis-confidence" className="scroll-mt-6">
                    <ConfidenceMeterCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
                </div>
            </div>
            <div id="analysis-fit-header" className="border-t border-border pt-4 scroll-mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Health, benchmarks &amp; modeling</h3>
            </div>
            <div id="analysis-health" className="scroll-mt-6">
                <FinancialHealthCard model={hydratedDealModel} />
            </div>
            <div id="analysis-ebitda-quality" className="scroll-mt-6">
                <EBITDAQualityScoreCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            </div>
            <div id="analysis-benchmark" className="scroll-mt-6">
                <BenchmarkComparisonCard model={hydratedDealModel} />
            </div>
            <div id="analysis-position" className="scroll-mt-6">
                <MarketPositionCard model={hydratedDealModel} />
            </div>
            <Suspense fallback={null}>
                <div id="analysis-assumption-gaps" className="scroll-mt-6">
                    <AssumptionGapsCard model={hydratedDealModel} />
                </div>
            </Suspense>
            <div id="analysis-whats-missing" className="scroll-mt-6">
                <WhatsMissingCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
            </div>
            <Suspense fallback={null}>
                <div id="analysis-market-comps" className="scroll-mt-6">
                    <MarketCompsCard model={hydratedDealModel} />
                </div>
            </Suspense>
            <Suspense fallback={null}>
                <div id="analysis-financing-scenarios" className="scroll-mt-6">
                    <FinancingScenariosCard model={hydratedDealModel} />
                </div>
                <div id="analysis-metrics" className="scroll-mt-6">
                    <InvestmentMetricsCard model={hydratedDealModel} />
                </div>
                <div id="analysis-percentile" className="scroll-mt-6">
                    <IndustryPercentileCard model={hydratedDealModel} />
                </div>
                <div id="analysis-deal-type" className="scroll-mt-6">
                    <DealTypeAnalysisCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-fit" className="scroll-mt-6">
                    <DealFitCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-asset-comp" className="scroll-mt-6">
                    <AssetCompositionCard model={hydratedDealModel} />
                </div>
                <div id="analysis-val-gap" className="scroll-mt-6">
                    <ValuationGapCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-cash-on-cash" className="scroll-mt-6">
                    <CashOnCashCalculatorCard model={hydratedDealModel} />
                </div>
                <div id="analysis-val-evolution" className="scroll-mt-6">
                    <BusinessValueEvolutionCard model={hydratedDealModel} />
                </div>
                <div id="analysis-revenue-bridge" className="scroll-mt-6">
                    <RevenueBridgeCard model={hydratedDealModel} />
                </div>
                <div id="analysis-base-returns" className="scroll-mt-6">
                    <BaseReturnMetricsCard model={hydratedDealModel} />
                </div>
                <div id="analysis-growth-sensitivity" className="scroll-mt-6">
                    <GrowthSensitivityCard model={hydratedDealModel} />
                </div>
                <div id="analysis-monte-carlo" className="scroll-mt-6">
                    <MonteCarloCard model={hydratedDealModel} />
                </div>
                <div id="analysis-breakeven" className="scroll-mt-6">
                    <BreakevenAnalysisCard model={hydratedDealModel} />
                </div>
            </Suspense>

            <Suspense fallback={null}>
                <div id="analysis-thesis-header" className="border-t border-border pt-4 scroll-mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Analysis &amp; Insights</h3>
                </div>
                <div id="analysis-quick-insights" className="scroll-mt-6">
                    <DealQuickInsights model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-thesis" className="scroll-mt-6">
                    <InvestmentThesisCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                </div>
                <div id="analysis-decision" className="scroll-mt-6">
                    <DecisionFrameworkCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-quick-wins" className="scroll-mt-6">
                    <QuickWinsCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-strengths" className="scroll-mt-6">
                    <StrengthsWeaknessesCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>

                <div id="analysis-risks-header" className="border-t border-border pt-4 scroll-mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Risk Assessment</h3>
                </div>
                <div id="analysis-risk-summary" className="scroll-mt-6">
                    <RiskSummaryCard synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-risk-matrix" className="scroll-mt-6">
                    <RiskMatrixCard synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-key-person" className="scroll-mt-6">
                    <KeyPersonRiskCard synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-owner-dep" className="scroll-mt-6">
                    <OwnerDependencyCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-diligence-comp" className="scroll-mt-6">
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
                <div id="analysis-risk-reward" className="scroll-mt-6">
                    <RiskRewardScatterCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-deal-killer" className="scroll-mt-6">
                    <DealKillerCheckCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-second-opinion" className="scroll-mt-6">
                    <SecondOpinionCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-alert-rules" className="scroll-mt-6">
                    <AlertRulesCard synthesis={activeProjectSynthesis} />
                </div>

                <div id="analysis-closing-header" className="border-t border-border pt-4 scroll-mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Negotiation &amp; Closing</h3>
                </div>
                <div id="analysis-time-to-close" className="scroll-mt-6">
                    <TimeToCloseCard
                        documentsCount={activeProjectDocuments.length}
                        completedDocuments={activeProjectDocuments.filter((d) => d.status === 'completed').length}
                        hasSynthesis={!!activeProjectSynthesis}
                        hasValuation={!!activeProjectSynthesis?.valuationBaseEstimate && activeProjectSynthesis.valuationBaseEstimate !== '0'}
                        hasFinancing={hydratedDealModel.equityContributionPercent != null}
                    />
                </div>
                <div id="analysis-closing-checklist" className="scroll-mt-6">
                    <ClosingChecklistCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
                </div>
                <div id="analysis-seller-qa" className="scroll-mt-6">
                    <SellerQuestionsCard synthesis={activeProjectSynthesis} model={hydratedDealModel} />
                </div>
                <div id="analysis-mgmt-questions" className="scroll-mt-6">
                    <ManagementQuestionTracker projectId={activeProjectId} suggestedQuestions={activeProjectSynthesis?.openQuestions ?? []} />
                </div>
                <div id="analysis-playbook" className="scroll-mt-6">
                    <NegotiationPlaybook synthesis={activeProjectSynthesis} model={hydratedDealModel} />
                </div>
                <div id="analysis-negotiation-impact" className="scroll-mt-6">
                    <NegotiationImpactCard model={hydratedDealModel} />
                </div>
                <div id="analysis-deal-timing" className="scroll-mt-6">
                    <DealTimingCard model={hydratedDealModel} />
                </div>
                <div id="analysis-timeline" className="scroll-mt-6">
                    <AcquisitionTimelineCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>
                <div id="analysis-investor-readiness" className="scroll-mt-6">
                    <InvestorReadinessCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documentCount={activeProjectDocuments.length} />
                </div>
                <div id="analysis-term-sheet" className="scroll-mt-6">
                    <TermSheetCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                </div>
                <div id="analysis-dd-requests" className="scroll-mt-6">
                    <DDRequestListCard
                        model={hydratedDealModel}
                        synthesis={activeProjectSynthesis}
                        documents={activeProjectDocuments}
                        projectName={dealName || suggestedProjectName}
                    />
                </div>
            </Suspense>
            <div id="analysis-activity-feed" className="scroll-mt-6">
                <ActivityFeed documents={activeProjectDocuments} />
            </div>
            <Suspense fallback={null}>
                <div id="analysis-public-data" className="scroll-mt-6">
                    <PublicDataEnrichmentCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                </div>
            </Suspense>
        </section>
    )
}
