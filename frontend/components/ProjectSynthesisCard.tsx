import { useEffect, useState } from 'react'
import { Download, FileText, Landmark, Loader2, MessageCircleQuestion, RefreshCw, Scale, ShieldAlert, TriangleAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import ExpandableInsightGroup from './ExpandableInsightGroup'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Progress } from '../lib/shadcn/progress'
import { formatCurrencyValue, getSubmissionInsightTone } from '../utils/aiSubmissionData'
import { downloadTextFile, fileSafeName } from '../utils/downloadFile'
import { formatHours, type ImpactMetrics } from '../utils/impactMetrics'
import type { ProjectSummary } from '../utils/projectWorkspace'

type ProjectSynthesisCardProps = {
    syntheses: ProjectSynthesisItem[]
    projects: ProjectSummary[]
    currentProjectId: string
    documentAnalysisPending: boolean
    synthesisPending: boolean
    synthesisProgress: number
    synthesisStage: string
    loading: boolean
    error: string | null
    onRefresh: () => void
    impact: ImpactMetrics
}

function getRiskVariant(riskLevel: string): 'destructive' | 'warning' | 'secondary' | 'outline' {
    const normalized = riskLevel.trim().toLowerCase()

    if (normalized === 'critical' || normalized === 'high') {
        return 'destructive'
    }

    if (normalized === 'medium') {
        return 'warning'
    }

    if (normalized === 'low') {
        return 'secondary'
    }

    return 'outline'
}

function formatTimestamp(value: string) {
    if (value.trim().length === 0) {
        return 'Pending'
    }

    const parsed = Date.parse(value)

    if (Number.isNaN(parsed)) {
        return value
    }

    return new Date(parsed).toLocaleString()
}

export function downloadSynthesisReport(synthesis: ProjectSynthesisItem, projectName: string) {
    const section = (title: string, items: string[]) => [
        '## ' + title,
        ...(items.length > 0 ? items.map((item) => '- ' + item) : ['- None recorded.']),
        '',
    ]

    const report = [
        '# ' + projectName + ' — Project Synthesis',
        '',
        'Generated: ' + new Date().toLocaleString(),
        'Recommendation: ' + (synthesis.finalRecommendation || 'Pending'),
        'Risk level: ' + (synthesis.finalRiskLevel || 'Pending'),
        'Documents processed: ' + synthesis.documentsCompletedCount + '/' + synthesis.documentsReceivedCount,
        '',
        '## Acquisition judgment',
        synthesis.finalJudgmentSummary || 'No final judgment recorded.',
        '',
        '## Valuation range',
        'Lower: ' + (synthesis.valuationLowerBound || 'Pending') + ' ' + synthesis.valuationCurrency,
        'Base: ' + (synthesis.valuationBaseEstimate || 'Pending') + ' ' + synthesis.valuationCurrency,
        'Upper: ' + (synthesis.valuationUpperBound || 'Pending') + ' ' + synthesis.valuationCurrency,
        '',
        ...section('Cross-document conflicts', synthesis.crossDocumentConflicts),
        ...section('Negotiation levers', synthesis.negotiationLevers),
        ...section('Missing diligence materials', synthesis.missingDocuments),
        ...section('Open questions for management', synthesis.openQuestions),
        ...section('Citations', synthesis.citations ?? []),
        '## Full structured synthesis record',
        synthesis.finalJudgmentJson ? '```json\n' + synthesis.finalJudgmentJson + '\n```' : 'The workflow did not return a separate structured synthesis record for this project.',
        '',
    ].join('\n')

    downloadTextFile(fileSafeName(projectName) + '-project-synthesis.md', report, 'text/markdown;charset=utf-8')
}

function formatProjectDisplayName(project: ProjectSummary) {
    const projectName = project.projectName.trim()
    const companyName = project.companyName.trim()

    if (companyName.length === 0 || projectName.toLocaleLowerCase() === companyName.toLocaleLowerCase()) {
        return projectName || companyName || project.projectId || project.projectKey
    }

    return `${projectName} • ${companyName}`
}

export default function ProjectSynthesisCard({ syntheses, projects, currentProjectId, documentAnalysisPending, synthesisPending, synthesisProgress, synthesisStage, loading, error, onRefresh, impact }: ProjectSynthesisCardProps) {
    const [synthesisElapsedSeconds, setSynthesisElapsedSeconds] = useState(0)
    const projectNameById = new Map(
        projects.map((project) => [project.projectId || project.projectKey, formatProjectDisplayName(project)])
    )

    const normalizedProjectId = currentProjectId.trim()
    const visibleSyntheses = syntheses.filter((synthesis) => synthesis.projectId === normalizedProjectId)
    const currentProject = projects.find((project) => (project.projectId || project.projectKey) === normalizedProjectId)
    const projectDocuments = currentProject?.documents ?? []
    const currentProjectName = projectNameById.get(normalizedProjectId) ?? normalizedProjectId ?? 'this project'
    const hasPriorSynthesis = visibleSyntheses.some((synthesis) => {
        return synthesis.finalJudgmentSummary.trim().length > 0 || synthesis.finalRecommendation.trim().length > 0
    })

    useEffect(() => {
        if (!synthesisPending) {
            setSynthesisElapsedSeconds(0)
            return
        }

        setSynthesisElapsedSeconds(0)
        const interval = window.setInterval(() => {
            setSynthesisElapsedSeconds((seconds) => seconds + 1)
        }, 1000)

        return () => window.clearInterval(interval)
    }, [synthesisPending])

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Project synthesis — final acquisition judgment</CardTitle>
                        <CardDescription>
                            Cross-document reconciliation written by the n8n consolidator workflow: one judgment per project, with
                            conflicts, gaps, and negotiation levers pulled from every uploaded document.
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={onRefresh} disabled={loading}>
                        <RefreshCw className={loading ? 'animate-spin' : undefined} />
                        Refresh synthesis
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 p-4">
                {error ? (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                        <p className="font-medium">Synthesis endpoint not reachable yet.</p>
                        <p className="mt-1 text-muted-foreground">
                            The dashboard expects an n8n webhook that returns project-level rows — see{' '}
                            <span className="font-mono">docs/n8n-webhooks.md</span> in the repo for the 5-minute setup. Error:{' '}
                            {error}
                        </p>
                    </div>
                ) : null}

                {currentProject ? (
                    <details className="group rounded-lg border border-border bg-muted/20">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
                            <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Project documents ({projectDocuments.length})</span>
                            <span className="text-xs text-primary group-open:hidden">Show list</span>
                            <span className="hidden text-xs text-primary group-open:inline">Hide list</span>
                        </summary>
                        <div className="space-y-2 border-t border-border p-3">
                            {projectDocuments.length > 0 ? projectDocuments.map((document) => (
                                <div key={document.requestID} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground" title={document.fileName}>{document.fileName}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{document.documentType || 'Document type pending'} · {formatTimestamp(document.processedAt)}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        <Badge variant="outline">{document.status || 'Pending'}</Badge>
                                        {!document.isConsidered ? <Badge variant="secondary">Excluded</Badge> : null}
                                    </div>
                                </div>
                            )) : <p className="text-sm text-muted-foreground">No project documents have been recorded yet.</p>}
                        </div>
                    </details>
                ) : null}

                {!error && synthesisPending ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                        <div>
                            <p className="font-medium">{hasPriorSynthesis ? 'Refreshing the project synthesis' : 'Synthesis starting'}</p>
                            <p className="text-xs font-medium text-primary">Synthesizing {currentProjectName} — {synthesisElapsedSeconds} seconds</p>
                            <p className="text-xs text-muted-foreground">Estimated completion: about 1 min 30 sec</p>
                            <p className="mt-1 text-muted-foreground">
                                {hasPriorSynthesis
                                    ? 'The previous synthesis remains visible below while n8n incorporates the most recent document. This page will update automatically when the new pass is complete.'
                                    : 'All submitted documents are complete. The n8n consolidator is preparing the first project-level judgment and this page will refresh automatically.'}
                            </p>
                        </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>{synthesisStage}</span>
                            <span>{synthesisProgress}%</span>
                        </div>
                        <Progress value={synthesisProgress} className="mt-2 h-2.5" />
                        {synthesisElapsedSeconds >= 300 ? (
                            <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                                <div>
                                    <p className="font-medium">This synthesis is taking longer than expected.</p>
                                    <p className="mt-1 text-muted-foreground">Please reload the page to re-sync the latest n8n status. Reloading will not restart the synthesis.</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {!error && documentAnalysisPending ? (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-warning" />
                            <div>
                                <p className="font-medium">Waiting for document-specific analysis to finish…</p>
                                <p className="mt-1 text-muted-foreground">
                                    The project synthesizer will start after every document reaches a terminal status. This section refreshes automatically.
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>{synthesisStage}</span>
                            <span>{synthesisProgress}%</span>
                        </div>
                        <Progress value={synthesisProgress} className="mt-2 h-2.5" />
                    </div>
                ) : null}

                {!error && visibleSyntheses.length === 0 && !synthesisPending && !documentAnalysisPending ? (
                    <p className="text-sm text-muted-foreground">
                        No project-level syntheses yet. Once the consolidator workflow has processed a project&apos;s documents,
                        its final judgment appears here.
                    </p>
                ) : null}

                {visibleSyntheses.map((synthesis) => {
                    const displayName = projectNameById.get(synthesis.projectId) ?? synthesis.projectId ?? 'Unknown project'
                    const synthesisStatus = synthesis.projectStatus.trim().toLowerCase()
                    const hasRefreshFailure = synthesisStatus === 'synthesis_refresh_failed' || synthesisStatus === 'synthesis_blocked'

                    return (
                        <div key={`${synthesis.projectId}-${synthesis.id}`} className="space-y-4 rounded-xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                    <p className="text-lg font-semibold text-foreground">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {synthesis.documentsCompletedCount} of {synthesis.documentsReceivedCount} documents processed ·
                                        synthesized {formatTimestamp(synthesis.projectProcessedAt)}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button size="lg" onClick={() => downloadSynthesisReport(synthesis, displayName)}>
                                        <Download />
                                        Download project report
                                    </Button>
                                    <Badge variant="outline" className="font-mono">Project ID: {synthesis.projectId}</Badge>
                                    {synthesis.finalRecommendation ? (
                                        <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>
                                            {synthesis.finalRecommendation}
                                        </Badge>
                                    ) : null}
                                    {synthesis.finalRiskLevel ? (
                                        <Badge variant={getRiskVariant(synthesis.finalRiskLevel)}>Risk: {synthesis.finalRiskLevel}</Badge>
                                    ) : null}
                                    {synthesis.finalTrafficLight ? (
                                        <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>
                                            {synthesis.finalTrafficLight}
                                        </Badge>
                                    ) : null}
                                    {synthesis.projectStatus ? <Badge variant="outline">{synthesis.projectStatus}</Badge> : null}
                                </div>
                            </div>

                            {hasRefreshFailure ? (
                                <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                                    <p className="font-medium">{synthesisStatus === 'synthesis_blocked' ? 'Latest synthesis is blocked until document processing is resolved.' : 'Latest synthesis refresh failed after automatic retries.'}</p>
                                    <p className="mt-1 text-muted-foreground">
                                        {hasPriorSynthesis ? 'The prior synthesis below remains available. ' : 'No new synthesis was produced. '}{synthesis.aiErrorMessage || 'A provider or processing step did not complete.'}
                                    </p>
                                </div>
                            ) : null}

                            {synthesis.finalJudgmentSummary ? (
                                <div className="rounded-lg border border-border bg-background p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Scale className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm font-medium text-foreground">Acquisition judgment</p>
                                        </div>
                                        {impact.completedDocuments > 0 ? <Badge variant="success">~{formatHours(impact.timeSavedHours)} analyst time saved</Badge> : null}
                                    </div>
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                        {synthesis.finalJudgmentSummary}
                                    </p>
                                    {impact.completedDocuments > 0 ? (
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            This judgment consolidates {impact.completedDocuments} completed document{impact.completedDocuments === 1 ? '' : 's'}: ~{formatHours(impact.analystHours)} estimated manual review versus {impact.agentMinutes >= 1 ? `${Math.round(impact.agentMinutes)}m` : '<1m'} of recorded agent runtime.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            {synthesis.valuationBaseEstimate || synthesis.valuationLowerBound || synthesis.valuationUpperBound ? (
                                <div className="grid gap-2 md:grid-cols-3">
                                    <div className="rounded-md border border-border bg-background px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lower bound</p>
                                            {synthesis.valuationCurrency ? <Badge variant="outline">{synthesis.valuationCurrency}</Badge> : null}
                                        </div>
                                        <p className="mt-1 text-sm text-foreground">{formatCurrencyValue(synthesis.valuationLowerBound, synthesis.valuationCurrency) || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-background px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base estimate</p>
                                        <p className="mt-1 text-sm text-foreground">{formatCurrencyValue(synthesis.valuationBaseEstimate, synthesis.valuationCurrency) || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-background px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upper bound</p>
                                        <p className="mt-1 text-sm text-foreground">{formatCurrencyValue(synthesis.valuationUpperBound, synthesis.valuationCurrency) || 'Pending'}</p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid gap-3 xl:grid-cols-2">
                                <ExpandableInsightGroup
                                    title="Cross-document conflicts"
                                    icon={<TriangleAlert className="h-4 w-4 text-destructive" />}
                                    items={synthesis.crossDocumentConflicts}
                                    emptyLabel="No contradictions detected across the uploaded documents."
                                    badgeVariant="destructive"
                                    className="border-destructive/30 bg-destructive/5"
                                    itemClassName="border-destructive/20"
                                    defaultOpen
                                />
                                <ExpandableInsightGroup
                                    title="Negotiation levers"
                                    icon={<Landmark className="h-4 w-4 text-foreground" />}
                                    items={synthesis.negotiationLevers}
                                    emptyLabel="No negotiation levers surfaced yet."
                                    defaultOpen
                                />
                                <ExpandableInsightGroup
                                    title="Missing diligence materials"
                                    icon={<ShieldAlert className="h-4 w-4 text-warning" />}
                                    items={synthesis.missingDocuments}
                                    emptyLabel="All core diligence materials appear to be present."
                                    badgeVariant="warning"
                                    className="border-warning/30 bg-warning/5"
                                    itemClassName="border-warning/20"
                                    defaultOpen
                                />
                                <ExpandableInsightGroup
                                    title="Open questions for management"
                                    icon={<MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />}
                                    items={synthesis.openQuestions}
                                    emptyLabel="No open questions recorded."
                                    defaultOpen
                                />
                                {(synthesis.citations?.length ?? 0) > 0 ? (
                                    <ExpandableInsightGroup
                                        title="Synthesis citations"
                                        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                                        items={synthesis.citations ?? []}
                                        emptyLabel="No synthesis citations recorded."
                                        defaultOpen
                                    />
                                ) : null}
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
