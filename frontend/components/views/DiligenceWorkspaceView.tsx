import React, { Suspense } from 'react'
import { Globe, Loader2, Sparkles, Clock } from 'lucide-react'
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
import { formatElapsedDuration } from '../../utils/diligenceDashboardUtils'

import { lazyWithRetry } from '../../utils/lazyWithRetry'
const EbitdaReconstructionCard = lazyWithRetry(() => import('../EbitdaReconstructionCard'))
const DealTimelineCard = lazyWithRetry(() => import('../DealTimelineCard'))
const WhatsNewCard = lazyWithRetry(() => import('../WhatsNewCard'))

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
    handleRunSynthesis?: () => void
    isCurrentProjectAwaitingSynthesis?: boolean
    isCurrentProjectSynthesisRunning?: boolean
    isCurrentProjectExtractingDocs?: boolean
    synthesisElapsedSeconds?: number
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
    handleRunSynthesis,
    isCurrentProjectAwaitingSynthesis = false,
    isCurrentProjectSynthesisRunning = false,
    isCurrentProjectExtractingDocs = false,
    synthesisElapsedSeconds = 0,
}: DiligenceWorkspaceViewProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <span>Project Diligence &amp; Findings</span>
                        <Badge variant="secondary" className="font-mono text-[10px] font-normal tracking-wide">
                            {activeProjectDocuments?.length || 0} Docs
                        </Badge>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Document-by-document forensic extraction, evidence cross-checking, and live risk flags.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {handleRunSynthesis && (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 border-primary/40 bg-background hover:bg-primary/10 text-primary font-bold text-xs shrink-0 shadow-2xs"
                            onClick={handleRunSynthesis}
                            disabled={isCurrentProjectAwaitingSynthesis || isCurrentProjectSynthesisRunning}
                        >
                            {isCurrentProjectAwaitingSynthesis || isCurrentProjectSynthesisRunning ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                            )}
                            <span>Re-run Synthesis</span>
                        </Button>
                    )}
                    {onReturnToLanding && (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 border-border bg-background hover:bg-muted text-foreground font-bold text-xs shrink-0 shadow-2xs"
                            onClick={onReturnToLanding}
                        >
                            <Globe className="h-4 w-4 text-primary" />
                            <span>Go to Landing Page</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Phase 1: During Document Extraction - Show 2 Companion Cards (Extraction in Progress + Synthesis Queued) */}
            {(isCurrentProjectExtractingDocs || activeProjectDocuments?.some((d: any) => ['processing', 'queued', 'submitted'].includes((d.status || '').trim().toLowerCase()))) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Document Extraction in Progress (Blue) */}
                    <div className="rounded-xl border-2 border-blue-500/40 bg-blue-500/10 p-4 text-xs font-semibold text-blue-900 dark:text-blue-200 flex flex-col justify-between gap-3 shadow-xs">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 font-bold text-sm text-blue-700 dark:text-blue-300">
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
                                    <span>Document Extraction in Progress...</span>
                                </div>
                                <Badge variant="outline" className="border-blue-500/50 bg-blue-500/20 text-blue-800 dark:text-blue-200 font-mono font-bold text-[10px] shrink-0 uppercase">
                                    Extracting Docs
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal leading-relaxed">
                                Financial statements, schedules, and disclosures are being extracted and verified. Individual document flags will appear below as each file finishes.
                            </p>
                        </div>
                    </div>

                    {/* Card 2: Synthesis Has Not Started (Queued / Waiting) */}
                    <div className="rounded-xl border-2 border-slate-300 dark:border-slate-700/60 bg-slate-100/70 dark:bg-slate-900/40 p-4 text-xs font-semibold text-slate-800 dark:text-slate-200 flex flex-col justify-between gap-3 shadow-xs">
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-300">
                                    <Clock className="h-4 w-4 text-slate-500 dark:text-slate-400 animate-pulse shrink-0" />
                                    <span>Synthesis Has Not Started</span>
                                </div>
                                <Badge variant="outline" className="border-slate-400/50 dark:border-slate-600/50 bg-slate-200/60 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-mono font-bold text-[10px] shrink-0 uppercase">
                                    Queued
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground font-normal leading-relaxed">
                                Reconciles multi-document financial facts, cross-checks disclosures, and computes valuation bounds. Triggers automatically once document extraction finishes.
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Phase 2: When Document Batch Finishes - Show 1 Prominent Project Synthesis Card */}
            {!isExampleMode &&
                !activeProjectDocuments?.some((d: any) => ['processing', 'queued', 'submitted'].includes((d.status || '').trim().toLowerCase())) &&
                !isCurrentProjectExtractingDocs &&
                (isCurrentProjectSynthesisRunning || isCurrentProjectAwaitingSynthesis) && (
                <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="relative mt-0.5">
                                <Loader2 className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-base text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                                        ⚡ Project Synthesis in Progress
                                    </h4>
                                    <Badge className="border-amber-500/50 bg-amber-500/20 text-amber-900 dark:text-amber-100 font-semibold text-[11px] uppercase tracking-wider font-mono">
                                        Consolidating Deal Evidence • {formatElapsedDuration(synthesisElapsedSeconds)}
                                    </Badge>
                                </div>
                                <p className="text-xs text-foreground/85 leading-relaxed max-w-2xl">
                                    All <strong>{activeProjectDocuments.length} documents</strong> in this batch have completed individual extraction. The AI Synthesis Engine is now performing cross-document math reconciliation, uncovering discrepancies across tax filings, general ledger, and CIM disclosures, and computing unified deal valuation bounds.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 bg-background/90 dark:bg-card/90 border border-border px-3.5 py-2 rounded-lg shadow-2xs">
                            <Clock className="h-4 w-4 text-amber-500 animate-pulse shrink-0" />
                            <span className="text-xs font-mono font-bold text-foreground">
                                Reconciling Evidence... ({formatElapsedDuration(synthesisElapsedSeconds)})
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <div id="diligence-project-synth" className="scroll-mt-6">
                <DealOverviewCard
                    syntheses={visibleProjectSyntheses}
                    projects={projectSummaries}
                    currentProjectId={activeProjectId}
                    askingPrice={askingPrice}
                    onAskingPriceChange={handleAskingPriceChange}
                    impact={activeProjectImpact}
                    model={hydratedDealModel}
                    documents={submissionHistory.filter((row) => getProjectKey(row) === activeProjectId)}
                    onOpenEvidence={setActiveEvidence}
                    exampleMode={isExampleMode}
                    onSwitchTab={setActiveWorkspaceTab}
                />
            </div>
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
            <div id="diligence-quality" className="space-y-6 scroll-mt-6 border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Financial data quality &amp; Math Reconciliation</h3>
                <div id="diligence-documents" className="scroll-mt-6">
                    <DealModelReadinessCard model={hydratedDealModel} documents={activeProjectDocuments} onOpenEvidence={setActiveEvidence} />
                </div>
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
            </div>

            <div id="diligence-context" className="space-y-6 scroll-mt-6 border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Context, Operations &amp; Diligence Checklist</h3>
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

                        // Sum live token telemetry across ALL matching syntheses for this project (Pre-LOI + Post-LOI)
                        const totalSynthCost = matchingSyntheses.reduce((acc, s) => acc + (typeof s.costUsd === 'number' && s.costUsd > 0 ? s.costUsd : (s.totalTokens ? s.totalTokens * 0.0000075 : 0.069)), 0)
                        const totalSynthTokens = matchingSyntheses.reduce((acc, s) => acc + (s.totalTokens ?? 0), 0)

                        const actualDocCost = measured.docCost
                        const actualSynthCost = totalSynthCost > 0 ? totalSynthCost : measured.synthesisCost
                        const totalTokens = measured.docTokens + totalSynthTokens

                        return (
                            <CostPerRunCard
                                documentsProcessed={activeDocCount}
                                synthesisRuns={activeSynthRuns}
                                actualDocCost={actualDocCost}
                                actualSynthesisCost={actualSynthCost}
                                actualTotalTokens={totalTokens}
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
                    hasAskingPrice={askingPrice.trim().length > 0 || Boolean(hydratedDealModel?.askingPrice) || Boolean(hydratedDealModel?.purchasePrice)}
                />
                <Suspense fallback={null}>
                    <WhatsNewCard />
                </Suspense>
            </div>
        </div>
    )
}
