import React, { Suspense, useState } from 'react'
import { LayoutDashboard, TrendingUp, Sparkles, Filter } from 'lucide-react'

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
import CohortRetentionCard from '../CohortRetentionCard'
import BaseReturnMetricsCard from '../BaseReturnMetricsCard'
import GrowthSensitivityCard from '../GrowthSensitivityCard'
import MonteCarloCard from '../MonteCarloCard'
import BreakevenAnalysisCard from '../BreakevenAnalysisCard'

type AnalysisSubView = 'all' | 'snapshot' | 'financials'

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
    setActiveWorkspaceTab,
}: AnalysisWorkspaceViewProps) {
    const [subView, setSubView] = useState<AnalysisSubView>('all')

    return (
        <section id="deal-analysis" className="space-y-6 scroll-mt-6">
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
                        <span>All Analysis</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubView('snapshot')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            subView === 'snapshot'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        <span>Executive Snapshot &amp; Scoring</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSubView('financials')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            subView === 'financials'
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    >
                        <TrendingUp className="h-3.5 w-3.5" />
                        <span>Financial Health &amp; Valuation</span>
                    </button>
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <span>Executive financial intelligence</span>
                </div>
            </div>

            {/* Section 1: Executive Snapshot & Scoring */}
            {(subView === 'all' || subView === 'snapshot') && (
                <>
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
                        <div id="analysis-deal-type" className="scroll-mt-6">
                            <DealTypeAnalysisCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                        </div>
                        <div id="analysis-deal-fit" className="scroll-mt-6">
                            <DealFitCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                        </div>
                    </div>
                </>
            )}

            {/* Section 2: Health, Benchmarks & Modeling */}
            {(subView === 'all' || subView === 'financials') && (
                <>
                    <div id="analysis-fit-header" className="border-t border-border pt-4 scroll-mt-6">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Health, benchmarks &amp; modeling</h3>
                    </div>
                    <div id="analysis-health" className="scroll-mt-6">
                        <FinancialHealthCard model={hydratedDealModel} />
                    </div>
                    <div id="analysis-ebitda-quality" data-analysis-qoe className="scroll-mt-6">
                        <div id="analysis-qoe" className="scroll-mt-6">
                            <EBITDAQualityScoreCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                        </div>
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
                        <div id="analysis-cohort-retention" className="scroll-mt-6">
                            <CohortRetentionCard synthesis={activeProjectSynthesis} dealModel={hydratedDealModel} />
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
                </>
            )}
        </section>
    )
}
