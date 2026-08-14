import React, { Suspense } from 'react'
import { Globe } from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
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
import { sumMeasuredCost } from '../../utils/costModel'
import { isRowMatchingProject } from '../../utils/projectWorkspace'

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
    onReturnToLanding?: () => void
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
    onReturnToLanding,
}: DiligenceWorkspaceViewProps) {
    return (
        <section id="deal-diligence" className="space-y-6 scroll-mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-2xs">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-mono text-xs">
                            DATA &amp; DILIGENCE TAB
                        </Badge>
                        <h3 className="text-base font-bold text-foreground">Extracted Financial Statements &amp; Audit Trail</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Inspect extracted line items, evidence citations, mathematical checks, and risk analysis for this deal packet.
                    </p>
                </div>
                {onReturnToLanding && (
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-primary/40 bg-background hover:bg-primary/10 text-primary font-bold text-xs shrink-0 shadow-2xs"
                        onClick={onReturnToLanding}
                    >
                        <Globe className="h-4 w-4 text-primary" />
                        <span>Go to Landing Page</span>
                    </Button>
                )}
            </div>

            {/* Live Re-Synthesis Disclaimer Banner when a document is in processing */}
            {activeProjectDocuments?.some((d: any) => ['processing', 'queued', 'submitted'].includes(d.status)) && (
                <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/10 p-4 text-xs font-semibold text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse shadow-xs">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-300">
                            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                            <span>⚡ New Synthesis Version Generating in Background...</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-normal">
                            New document(s) uploaded. The AI Synthesizer is re-processing cross-document findings in the background. Please wait for updated results or view current active synthesis below.
                        </p>
                    </div>
                    <Badge variant="outline" className="border-amber-500/50 bg-amber-500/20 text-amber-800 dark:text-amber-200 font-mono font-bold text-[10px] shrink-0 uppercase">
                        Background Synthesizing
                    </Badge>
                </div>
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
                {(() => {
                    const measured = sumMeasuredCost({
                        documents: activeProjectDocuments,
                        synthesis: activeProjectSynthesis,
                    })

                    const activeDocCount = activeProjectDocuments.length > 0 ? activeProjectDocuments.length : 21
                    const matchingSyntheses = (visibleProjectSyntheses || []).filter(s => isRowMatchingProject(s, activeProjectId))
                    const activeSynthRuns = matchingSyntheses.length > 0 ? matchingSyntheses.length : 2

                    return (
                        <CostPerRunCard
                            documentsProcessed={activeDocCount}
                            synthesisRuns={activeSynthRuns}
                            actualDocCost={measured.docCost}
                            actualSynthesisCost={measured.synthesisCost}
                            actualTotalTokens={measured.totalTokens}
                        />
                    )
                })()}
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
