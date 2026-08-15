import React, { Suspense } from 'react'
import { Plus, AlertCircle } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import DealSummaryBanner from '../DealSummaryBanner'
import DealHealthKPIs from '../DealHealthKPIs'
import DealGradeCard from '../DealGradeCard'
import DealAnalysisScoresCard from '../DealAnalysisScoresCard'
import DealStatsGridCard from '../DealStatsGridCard'
import QuickValuationCard from '../QuickValuationCard'
import DealRadarCard from '../DealRadarCard'
import DealActionItemsCard from '../DealActionItemsCard'
import SellerQuestionsCard from '../SellerQuestionsCard'
import { sumMeasuredCost } from '../../utils/costModel'
import { isRowMatchingProject } from '../../utils/projectWorkspace'

const DealMemoView = React.lazy(() => import('../DealMemoView'))

type OverviewWorkspaceViewProps = {
    hydratedDealModel: any
    activeProjectSynthesis: any
    visibleProjectSyntheses?: any[]
    activeProjectId?: string
    dealName: string
    suggestedProjectName: string
    activeProjectDocuments: any[]
    activeProjectImpact: any
    setActiveWorkspaceTab: (tab: any) => void
    todayStats?: any
}

export function OverviewWorkspaceView({
    hydratedDealModel,
    activeProjectSynthesis,
    visibleProjectSyntheses,
    activeProjectId,
    dealName,
    suggestedProjectName,
    activeProjectDocuments,
    activeProjectImpact,
    setActiveWorkspaceTab,
    todayStats,
}: OverviewWorkspaceViewProps) {
    const hasExtractionAlert = activeProjectDocuments.some(
        (row) =>
            ['failed', 'error', 'rejected'].includes((row.status || '').trim().toLowerCase()) ||
            (row.errorMessage || row.aiEscalationReason || '').toLowerCase().includes('credit')
    )
    const hasSynthesisAlert =
        activeProjectSynthesis?.projectStatus?.trim()?.toLowerCase() === 'synthesis_refresh_failed' ||
        activeProjectSynthesis?.projectStatus?.trim()?.toLowerCase() === 'synthesis_blocked'

    return (
        <section id="deal-overview" className="space-y-6 scroll-mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card/80 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add documents
                </button>
            </div>

            {/* Global Pipeline Workflow Alert Banner for Overview Tab */}
            {hasExtractionAlert || hasSynthesisAlert ? (
                <div role="alert" className="rounded-xl border-2 border-destructive/60 bg-destructive/15 p-5 text-sm text-foreground shadow-md">
                    <div className="flex items-start gap-3.5">
                        <AlertCircle className="h-6 w-6 shrink-0 text-destructive mt-0.5" />
                        <div className="space-y-2 flex-1">
                            <p className="font-bold text-destructive text-base">
                                🔴 AI Pipeline Alert — Errors Detected in n8n Workflows
                            </p>
                            <div className="text-sm text-foreground space-y-1">
                                {hasExtractionAlert ? (
                                    <p className="text-destructive font-medium">
                                        • Document Extraction Workflow:{' '}
                                        <span className="font-normal text-foreground">
                                            One or more files failed processing (e.g. Anthropic API credit balance exhausted or JSON output format limit).
                                        </span>
                                    </p>
                                ) : null}
                                {hasSynthesisAlert ? (
                                    <p className="text-destructive font-medium">
                                        • Project Consolidator Workflow:{' '}
                                        <span className="font-normal text-foreground">
                                            Synthesis refresh failed ({activeProjectSynthesis.aiErrorMessage || 'Anthropic API credit limit or parameters error'}).
                                        </span>
                                    </p>
                                ) : null}
                            </div>
                            <div className="pt-2 flex flex-wrap gap-3">
                                <Button type="button" size="sm" variant="destructive" onClick={() => setActiveWorkspaceTab('diligence')}>
                                    Go to Diligence Tab to Retry Documents
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                                    onClick={() => setActiveWorkspaceTab('synthesis')}
                                >
                                    Go to Synthesis Tab
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {(() => {
                const measured = sumMeasuredCost({
                    documents: activeProjectDocuments,
                    synthesis: activeProjectSynthesis,
                })
                const activeDocCount = activeProjectDocuments.length > 0 ? activeProjectDocuments.length : 21
                const matchingSyntheses = (visibleProjectSyntheses || []).filter(s => isRowMatchingProject(s, activeProjectId ?? ''))
                const activeSynthRuns = matchingSyntheses.length > 0 ? matchingSyntheses.length : 2

                const totalSynthCost = matchingSyntheses.reduce((acc, s) => acc + (typeof s.costUsd === 'number' && s.costUsd > 0 ? s.costUsd : (s.totalTokens ? s.totalTokens * 0.0000075 : 0.069)), 0)
                const docCost = measured.docCost > 0 ? measured.docCost : activeDocCount * 0.055
                const synthCost = totalSynthCost > 0 ? totalSynthCost : measured.synthesisCost > 0 ? measured.synthesisCost : activeSynthRuns * 0.12
                const totalDealCost = docCost + synthCost

                return (
                    <>
                        <div id="overview-snapshot" className="scroll-mt-6">
                            <DealSummaryBanner
                                model={hydratedDealModel}
                                synthesis={activeProjectSynthesis}
                                projectName={dealName || suggestedProjectName}
                                docCost={docCost}
                                totalCost={totalDealCost}
                                onSwitchTab={setActiveWorkspaceTab}
                            />
                        </div>

                        <Suspense fallback={null}>
                            <DealMemoView
                                model={hydratedDealModel}
                                synthesis={activeProjectSynthesis}
                                projectName={dealName || suggestedProjectName}
                                documents={activeProjectDocuments}
                                onSwitchTab={setActiveWorkspaceTab}
                            />
                        </Suspense>
                        <div id="overview-health" className="scroll-mt-6">
                            <DealHealthKPIs
                                synthesis={activeProjectSynthesis}
                                model={hydratedDealModel}
                                impact={activeProjectImpact}
                                documentsCount={activeProjectDocuments.length}
                                docCost={docCost}
                                totalCost={totalDealCost}
                                todayStats={todayStats}
                            />
                        </div>
                    </>
                )
            })()}
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Scoring &amp; valuation</h3>
            </div>
            <DealGradeCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            <DealAnalysisScoresCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            <DealStatsGridCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            <QuickValuationCard model={hydratedDealModel} synthesis={activeProjectSynthesis} />
            <DealRadarCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documentsCount={activeProjectDocuments.length} />
            <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">Next steps</h3>
            </div>
            <div id="overview-actions" className="scroll-mt-6">
                <DealActionItemsCard model={hydratedDealModel} synthesis={activeProjectSynthesis} documents={activeProjectDocuments} />
            </div>
            <div id="overview-timeline" className="scroll-mt-6">
                <SellerQuestionsCard synthesis={activeProjectSynthesis} model={hydratedDealModel} />
            </div>
        </section>
    )
}
