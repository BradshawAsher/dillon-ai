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
                <DealOnAPageCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                <DealScorecardExportCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                <BusinessSnapshotCard
                    model={hydratedDealModel}
                    synthesis={activeProjectSynthesis}
                    projectName={dealName || suggestedProjectName}
                    onSwitchTab={setActiveWorkspaceTab}
                />
                <OpportunityScoreCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <RiskAdjustedValuationCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            </Suspense>
            <div id="analysis-deal-grade" className="scroll-mt-6 space-y-6">
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
                <DealReadinessGauge
                    model={hydratedDealModel}
                    synthesis={activeProjectSynthesis}
                    documentsCount={activeProjectDocuments.length}
                    completedDocuments={activeProjectImpact.completedDocuments}
                />
                <DocumentCoverageMatrix documents={activeProjectDocuments} />
                <DealScorecard
                    model={hydratedDealModel}
                    synthesis={activeProjectSynthesis}
                    impact={activeProjectImpact}
                    documentsCount={activeProjectDocuments.length}
                />
                <DealRulesOfThumb model={hydratedDealModel} />
                <ConfidenceMeterCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
            </div>
            <div id="analysis-fit" className="border-t border-border pt-4 scroll-mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Health, benchmarks &amp; modeling</h3>
            </div>
            <FinancialHealthCard model={hydratedDealModel} />
            <EBITDAQualityScoreCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            <BenchmarkComparisonCard model={hydratedDealModel} />
            <MarketPositionCard model={hydratedDealModel} />
            <Suspense fallback={null}>
                <AssumptionGapsCard model={hydratedDealModel} />
            </Suspense>
            <WhatsMissingCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
            <Suspense fallback={null}>
                <MarketCompsCard model={hydratedDealModel} />
            </Suspense>
            <Suspense fallback={null}>
                <FinancingScenariosCard model={hydratedDealModel} />
                <InvestmentMetricsCard model={hydratedDealModel} />
                <IndustryPercentileCard model={hydratedDealModel} />
                <DealTypeAnalysisCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <DealFitCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <AssetCompositionCard model={hydratedDealModel} />
                <ValuationGapCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <CashOnCashCalculatorCard model={hydratedDealModel} />
                <BusinessValueEvolutionCard model={hydratedDealModel} />
                <RevenueBridgeCard model={hydratedDealModel} />
                <BaseReturnMetricsCard model={hydratedDealModel} />
                <GrowthSensitivityCard model={hydratedDealModel} />
                <MonteCarloCard model={hydratedDealModel} />
                <BreakevenAnalysisCard model={hydratedDealModel} />
            </Suspense>

            <Suspense fallback={null}>
                <div id="analysis-thesis" className="border-t border-border pt-4 scroll-mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Analysis &amp; Insights</h3>
                </div>
                <DealQuickInsights model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <InvestmentThesisCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                <DecisionFrameworkCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <QuickWinsCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <div id="analysis-strengths" className="scroll-mt-6">
                    <StrengthsWeaknessesCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                </div>

                <div id="analysis-risks" className="border-t border-border pt-4 scroll-mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Risk Assessment</h3>
                </div>
                <RiskSummaryCard synthesis={activeProjectSynthesis} />
                <RiskMatrixCard synthesis={activeProjectSynthesis} />
                <KeyPersonRiskCard synthesis={activeProjectSynthesis} />
                <OwnerDependencyCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
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
                <RiskRewardScatterCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <DealKillerCheckCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <SecondOpinionCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <AlertRulesCard synthesis={activeProjectSynthesis} />

                <div id="analysis-closing" className="border-t border-border pt-4 scroll-mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Negotiation &amp; Closing</h3>
                </div>
                <TimeToCloseCard
                    documentsCount={activeProjectDocuments.length}
                    completedDocuments={activeProjectDocuments.filter((d) => d.status === 'completed').length}
                    hasSynthesis={!!activeProjectSynthesis}
                    hasValuation={!!activeProjectSynthesis?.valuationBaseEstimate && activeProjectSynthesis.valuationBaseEstimate !== '0'}
                    hasFinancing={hydratedDealModel.equityContributionPercent != null}
                />
                <ClosingChecklistCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
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
            </Suspense>
            <ActivityFeed documents={activeProjectDocuments} />
            <Suspense fallback={null}>
                <PublicDataEnrichmentCard model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
            </Suspense>
        </section>
    )
}
