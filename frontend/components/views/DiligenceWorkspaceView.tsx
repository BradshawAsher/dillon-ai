import React, { Suspense } from 'react'
import ProjectComparisonCard from '../ProjectComparisonCard'
import DealOverviewCard from '../DealOverviewCard'
import QuickFilterBar from '../QuickFilterBar'
import DealModelReadinessCard from '../DealModelReadinessCard'
import FinancialCompletenessCard from '../FinancialCompletenessCard'
import MathChecksSection from '../MathChecksSection'
import DataQualityChecksCard from '../DataQualityChecksCard'
import AddBackQualityCard from '../AddBackQualityCard'
import RecurringVsOneTimeCard from '../RecurringVsOneTimeCard'
import CustomerConcentrationCard from '../CustomerConcentrationCard'
import BuyerProfileCard from '../BuyerProfileCard'
import IndustryBenchmarksCard from '../IndustryBenchmarksCard'
import CostPerRunCard from '../CostPerRunCard'
import ProjectChecklistCard from '../ProjectChecklistCard'

const EbitdaReconstructionCard = React.lazy(() => import('../EbitdaReconstructionCard'))
const DealTimelineCard = React.lazy(() => import('../DealTimelineCard'))
const WhatsNewCard = React.lazy(() => import('../WhatsNewCard'))

type DiligenceWorkspaceViewProps = {
    projectSummaries: any[]
    dealModelsData: any
    visibleProjectSyntheses: any[]
    activeProjectId: string
    setSelectedProjectKey: (key: string) => void
    askingPrice: string
    handleAskingPriceChange: (value: string) => void
    activeProjectImpact: any
    activeDealModel: any
    submissionHistory: any[]
    getProjectKey: (row: any) => string
    setActiveEvidence: (evidence: any) => void
    isExampleMode: boolean
    setActiveWorkspaceTab: (tab: any) => void
    hydratedDealModel: any
    activeProjectDocuments: any[]
    activeProjectSynthesis: any
    dealName: string
    suggestedProjectName: string
    projectChecklistById: Record<string, any>
    setProjectChecklistById: React.Dispatch<React.SetStateAction<Record<string, any>>>
    impact: any
}

export function DiligenceWorkspaceView({
    projectSummaries,
    dealModelsData,
    visibleProjectSyntheses,
    activeProjectId,
    setSelectedProjectKey,
    askingPrice,
    handleAskingPriceChange,
    activeProjectImpact,
    activeDealModel,
    submissionHistory,
    getProjectKey,
    setActiveEvidence,
    isExampleMode,
    setActiveWorkspaceTab,
    hydratedDealModel,
    activeProjectDocuments,
    activeProjectSynthesis,
    dealName,
    suggestedProjectName,
    projectChecklistById,
    setProjectChecklistById,
    impact,
}: DiligenceWorkspaceViewProps) {
    return (
        <section id="deal-diligence" className="space-y-6 scroll-mt-6">
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Portfolio &amp; deal overview</h3>
            </div>
            {projectSummaries.length > 1 && (
                <ProjectComparisonCard
                    projects={projectSummaries.map((ps) => ({
                        projectId: ps.projectId || ps.projectKey,
                        projectName: ps.projectName || ps.companyName || ps.projectKey,
                        model: (Array.isArray(dealModelsData) ? dealModelsData.find((m: any) => m.projectId === (ps.projectId || ps.projectKey)) : undefined) ?? {
                            projectId: ps.projectId || ps.projectKey,
                            askingPrice: null,
                            purchasePrice: null,
                            debtAssumed: null,
                            cashAcquired: null,
                            workingCapitalRequirement: null,
                            transactionFees: null,
                            holdPeriodYears: null,
                            taxRate: null,
                            closingCosts: null,
                            maintenanceCapex: null,
                            exitMultiple: null,
                            exitCosts: null,
                            equityContributionPercent: null,
                            interestRate: null,
                            amortizationYears: null,
                            sellerNoteAmount: null,
                            bearRevenueGrowth: null,
                            baseRevenueGrowth: null,
                            bullRevenueGrowth: null,
                            bearEbitdaMargin: null,
                            baseEbitdaMargin: null,
                            bullEbitdaMargin: null,
                            bearExitMultiple: null,
                            baseExitMultiple: null,
                            bullExitMultiple: null,
                            revenueMultiple: null,
                            ebitdaMultiple: null,
                            assetHaircutPercent: null,
                            modelUpdatedAt: '',
                            modelUpdatedBy: '',
                            documentedFactsJson: '',
                            documentedFactsStatus: '',
                        },
                        synthesis: visibleProjectSyntheses.find((s) => s.projectId === (ps.projectId || ps.projectKey)),
                        documentsCount: ps.documentCount,
                        completedDocuments: ps.completedCount,
                    }))}
                    activeProjectId={activeProjectId}
                    onSelectProject={(id: string) => {
                        setSelectedProjectKey(id)
                    }}
                />
            )}
            <DealOverviewCard
                syntheses={visibleProjectSyntheses}
                projects={projectSummaries}
                currentProjectId={activeProjectId}
                askingPrice={askingPrice}
                onAskingPriceChange={handleAskingPriceChange}
                impact={activeProjectImpact}
                model={activeDealModel}
                documents={submissionHistory.filter((row) => getProjectKey(row) === activeProjectId)}
                onOpenEvidence={setActiveEvidence}
                exampleMode={isExampleMode}
            />
            <QuickFilterBar
                synthesis={activeProjectSynthesis}
                onJumpTo={(target: string) => {
                    setActiveWorkspaceTab('synthesis')
                    setTimeout(() => {
                        const el = document.getElementById(`synthesis-${target}`)
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }, 150)
                }}
            />
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Financial data quality</h3>
            </div>
            <DealModelReadinessCard model={hydratedDealModel} documents={activeProjectDocuments} onOpenEvidence={setActiveEvidence} />
            <FinancialCompletenessCard model={hydratedDealModel} documents={activeProjectDocuments} onOpenEvidence={setActiveEvidence} />
            <MathChecksSection
                documents={activeProjectDocuments}
                onOpenEvidence={setActiveEvidence}
                compact
                title="Project math checks"
                description="Aggregated deterministic checks across all processed documents."
            />
            <DataQualityChecksCard model={hydratedDealModel} />
            <Suspense fallback={null}>
                <EbitdaReconstructionCard model={hydratedDealModel} onOpenEvidence={setActiveEvidence} />
            </Suspense>
            <AddBackQualityCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} onOpenEvidence={setActiveEvidence} />
            {activeProjectSynthesis && (
                <RecurringVsOneTimeCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} onOpenEvidence={setActiveEvidence} />
            )}
            {activeProjectSynthesis && (
                <CustomerConcentrationCard synthesis={activeProjectSynthesis} documents={activeProjectDocuments} onOpenEvidence={setActiveEvidence} />
            )}
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Context &amp; settings</h3>
            </div>
            <Suspense fallback={null}>
                <DealTimelineCard documents={activeProjectDocuments} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                <BuyerProfileCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
                <IndustryBenchmarksCard />
                <CostPerRunCard documentsProcessed={impact.completedDocuments} synthesisRuns={visibleProjectSyntheses.length} />
            </Suspense>
            <ProjectChecklistCard
                projectId={activeProjectId}
                state={projectChecklistById[activeProjectId] ?? {}}
                onChange={(next: any) => setProjectChecklistById((current) => ({ ...current, [activeProjectId]: next }))}
                missingDocuments={activeProjectSynthesis?.missingDocuments ?? []}
                employeeConfirmed={Boolean(projectSummaries.find((project) => (project.projectId || project.projectKey) === activeProjectId)?.employeeCount) || isExampleMode}
                hasAskingPrice={askingPrice.trim().length > 0 || activeDealModel.askingPrice !== null}
            />
            <Suspense fallback={null}>
                <WhatsNewCard />
            </Suspense>
        </section>
    )
}
