import { useEffect, useState } from 'react'
import { Download, FileText, Landmark, Loader2, MessageCircleQuestion, RefreshCw, Scale, ShieldAlert, TriangleAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import ExpandableInsightGroup from './ExpandableInsightGroup'
import AcquisitionJudgmentCallout from './AcquisitionJudgmentCallout'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Progress } from '../lib/shadcn/progress'
import { formatCurrencyValue, getSubmissionInsightTone } from '../utils/aiSubmissionData'
import { downloadTextFile, fileSafeName } from '../utils/downloadFile'
import { formatHours, type ImpactMetrics } from '../utils/impactMetrics'
import type { ProjectSummary } from '../utils/projectWorkspace'
import { findCitedDocument, type EvidenceItem } from '../utils/evidence'

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
    documents?: SubmissionHistoryItem[]
    onOpenEvidence?: (evidence: EvidenceItem) => void
    onExcludeDocument?: (requestID: string) => void
    onIncludeDocument?: (requestID: string) => void
    onRetryDocument?: (requestID: string) => void
    retryingRequestId?: string | null
    onRunSynthesis?: () => void
    runningSynthesis?: boolean
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

function detectedTypes(document: SubmissionHistoryItem) {
    try {
        const parsed = JSON.parse(document.detectedDocumentTypesJson || '')
        if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    } catch {}
    return [document.detectedDocumentType || document.documentType].filter(Boolean)
}

function shortList(value: string) {
    return value.split(/\n|•|;|\|/).map((item) => item.trim()).filter(Boolean).slice(0, 5)
}

function compactTakeaway(value: string) {
    const normalized = value.replace(/\s+/g, ' ').trim()
    const firstSentence = normalized.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || normalized
    return firstSentence.length <= 220 ? firstSentence : `${firstSentence.slice(0, 217).trimEnd()}…`
}

type DocumentThesisTakeaway = { fileName: string; takeaway: string; stance: string; documentId: string; documentUrl: string; status: string }

function getDocumentThesisTakeaway(document: SubmissionHistoryItem): DocumentThesisTakeaway | null {
    try {
        const parsed = JSON.parse(document.extractedJson || '{}') as { investment_thesis?: { buy_reasoning?: unknown; is_favorable_indicator?: unknown }; response?: { summary?: unknown } }
        const reasoning = typeof parsed.investment_thesis?.buy_reasoning === 'string' ? parsed.investment_thesis.buy_reasoning.trim() : ''
        const summary = typeof parsed.response?.summary === 'string' ? parsed.response.summary.trim() : document.aiSummary.trim()
        const takeaway = reasoning || summary
        if (!takeaway) return null
        const favorable = parsed.investment_thesis?.is_favorable_indicator
        return { fileName: document.fileName || 'Unnamed document', takeaway, stance: favorable === true ? 'Supportive indicator' : favorable === false ? 'Caution indicator' : 'Document insight', documentId: document.storageFileId, documentUrl: document.storageFileUrl, status: document.status }
    } catch {
        if (!document.aiSummary.trim()) return null
        return { fileName: document.fileName || 'Unnamed document', takeaway: document.aiSummary.trim(), stance: 'Document insight', documentId: document.storageFileId, documentUrl: document.storageFileUrl, status: document.status }
    }
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

export default function ProjectSynthesisCard({ syntheses, projects, currentProjectId, documentAnalysisPending, synthesisPending, synthesisProgress, synthesisStage, loading, error, onRefresh, impact, documents = [], onOpenEvidence, onExcludeDocument, onIncludeDocument, onRetryDocument, retryingRequestId, onRunSynthesis, runningSynthesis = false }: ProjectSynthesisCardProps) {
    const [synthesisElapsedSeconds, setSynthesisElapsedSeconds] = useState(0)
    const [selectedDocumentRequestId, setSelectedDocumentRequestId] = useState('')
    const projectNameById = new Map(
        projects.map((project) => [project.projectId || project.projectKey, formatProjectDisplayName(project)])
    )

    const normalizedProjectId = currentProjectId.trim()
    const visibleSyntheses = syntheses.filter((synthesis) => synthesis.projectId === normalizedProjectId)
    const currentProject = projects.find((project) => (project.projectId || project.projectKey) === normalizedProjectId)
    const projectDocuments = documents.filter((document) => document.projectId === normalizedProjectId)
    const failedProjectDocuments = projectDocuments.filter((document) => ['failed', 'error', 'rejected', 'needs_review', 'needs review'].includes(document.status.trim().toLowerCase()))
    const selectedProjectDocument = projectDocuments.find((document) => document.requestID === selectedDocumentRequestId)
    const documentThesisTakeaways = projectDocuments
        .filter((document) => document.isConsidered && document.status.trim().toLowerCase() === 'completed')
        .map(getDocumentThesisTakeaway)
        .filter((takeaway): takeaway is DocumentThesisTakeaway => takeaway !== null)
        .slice(0, 4)
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
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onRefresh} disabled={loading}>
                            <RefreshCw className={loading ? 'animate-spin' : undefined} />
                            Refresh view
                        </Button>
                        <Button onClick={onRunSynthesis} disabled={!onRunSynthesis || runningSynthesis || documentAnalysisPending}>
                            <RefreshCw className={runningSynthesis ? 'animate-spin' : undefined} />
                            {runningSynthesis ? 'Starting synthesis…' : 'Run synthesis now'}
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 p-4">
                <AcquisitionJudgmentCallout synthesis={visibleSyntheses[0]} impact={impact} />
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
                                        <Button type="button" size="sm" variant="outline" onClick={() => setSelectedDocumentRequestId(document.requestID)}>View analysis</Button>
                                        {document.isConsidered ? <Button type="button" size="sm" variant="outline" onClick={() => onExcludeDocument?.(document.requestID)}>Exclude from synthesis</Button> : <Button type="button" size="sm" variant="outline" onClick={() => onIncludeDocument?.(document.requestID)}>Include again</Button>}
                                        {['failed', 'error', 'rejected'].includes(document.status.trim().toLowerCase()) ? <Button type="button" size="sm" variant="outline" disabled={retryingRequestId === document.requestID} onClick={() => onRetryDocument?.(document.requestID)}>{retryingRequestId === document.requestID ? 'Retrying…' : 'Retry document'}</Button> : null}
                                    </div>
                                </div>
                            )) : <p className="text-sm text-muted-foreground">No project documents have been recorded yet.</p>}
                        </div>
                    </details>
                ) : null}

                {selectedProjectDocument ? <div className="rounded-lg border border-primary/25 bg-primary/[0.035] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-foreground">Document analysis</p><p className="mt-1 text-sm text-muted-foreground">{selectedProjectDocument.fileName}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDocumentRequestId('')}>Close</Button></div><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">{selectedProjectDocument.status || 'Pending'}</Badge>{detectedTypes(selectedProjectDocument).map((type) => <Badge key={type} variant="secondary">{type}</Badge>)}</div>{selectedProjectDocument.aiSummary ? <div className="mt-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI summary</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedProjectDocument.aiSummary}</p></div> : <p className="mt-4 text-sm text-muted-foreground">No document-specific summary has returned yet.</p>}<div className="mt-4 grid gap-3 md:grid-cols-2">{selectedProjectDocument.aiRedFlags ? <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-destructive">Red flags</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">{shortList(selectedProjectDocument.aiRedFlags).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{selectedProjectDocument.aiYellowFlags ? <div className="rounded-md border border-warning/25 bg-warning/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-warning">Items to review</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">{shortList(selectedProjectDocument.aiYellowFlags).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}</div>{onOpenEvidence && (selectedProjectDocument.storageFileId || selectedProjectDocument.storageFileUrl) ? <Button type="button" variant="outline" className="mt-4" onClick={() => onOpenEvidence({ title: `Source document: ${selectedProjectDocument.fileName}`, sourceFile: selectedProjectDocument.fileName, sourceLocation: 'Document-level analysis', excerpt: selectedProjectDocument.aiSummary, status: selectedProjectDocument.status, provenance: 'Uploaded document', documentId: selectedProjectDocument.storageFileId, documentUrl: selectedProjectDocument.storageFileUrl })}>Open source document</Button> : null}</div> : null}

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

                            {hasRefreshFailure ? synthesisStatus === 'synthesis_blocked' ? (
                                <div role="alert" className="rounded-xl border-2 border-destructive/55 bg-destructive/10 p-5 text-foreground shadow-md">
                                    <p className="text-base font-bold text-destructive">Synthesis blocked — {failedProjectDocuments.length || synthesis.documentsFailedCount || 1} document{(failedProjectDocuments.length || synthesis.documentsFailedCount || 1) === 1 ? '' : 's'} need action</p>
                                    <p className="mt-2 text-sm leading-6 text-foreground">{synthesis.aiErrorMessage || 'No completed document currently has usable analysis.'} Retry a document to recover its analysis, or exclude a document you do not want considered. Excluding keeps it in the audit trail but lets the remaining completed documents synthesize.</p>
                                    {failedProjectDocuments.length > 0 ? <div className="mt-4 space-y-3">{failedProjectDocuments.map((document) => <div key={document.requestID} className="rounded-lg border border-destructive/25 bg-background/75 p-4"><p className="break-words text-sm font-semibold text-foreground">{document.fileName || 'Failed document'}</p>{document.errorMessage ? <p className="mt-1 text-xs text-muted-foreground">{document.errorMessage}</p> : null}<div className="mt-3 grid gap-2 sm:grid-cols-2"><Button type="button" size="lg" className="h-12 font-semibold" disabled={retryingRequestId === document.requestID} onClick={() => onRetryDocument?.(document.requestID)}>{retryingRequestId === document.requestID ? 'Retrying document…' : 'Retry document'}</Button><Button type="button" size="lg" variant="outline" className="h-12 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onExcludeDocument?.(document.requestID)}>Exclude from synthesis</Button></div></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Open the project document list above to retry or exclude the affected document.</p>}
                                </div>
                            ) : (
                                <div role="alert" className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
                                    <p className="font-medium">Latest synthesis refresh failed after automatic retries.</p>
                                    <p className="mt-1 text-muted-foreground">{hasPriorSynthesis ? 'The prior synthesis below remains available. ' : 'No new synthesis was produced. '}{synthesis.aiErrorMessage || 'A provider or processing step did not complete.'}</p>
                                </div>
                            ) : null}

                            {false && synthesis.finalJudgmentSummary ? (
                                <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Scale className="h-5 w-5 text-primary" />
                                            <p className="text-sm font-bold uppercase tracking-wide text-primary">Start here — acquisition judgment</p>
                                        </div>
                                        {impact.completedDocuments > 0 ? <Badge variant="success">~{formatHours(impact.timeSavedHours)} analyst time saved</Badge> : null}
                                    </div>
                                    <p className="mt-4 whitespace-pre-wrap rounded-lg border border-primary/25 bg-background/90 p-4 text-sm leading-6 text-foreground">
                                        {synthesis.finalJudgmentSummary}
                                    </p>
                                    {impact.completedDocuments > 0 ? (
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            This judgment consolidates {impact.completedDocuments} completed document{impact.completedDocuments === 1 ? '' : 's'}: ~{formatHours(impact.analystHours)} estimated manual review versus {impact.agentMinutes >= 1 ? `${Math.round(impact.agentMinutes)}m` : '<1m'} of recorded agent runtime.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            {!synthesis.finalJudgmentSummary ? <div className="rounded-xl border-2 border-warning bg-warning/10 p-5 shadow-md"><div className="flex items-center gap-2"><Scale className="h-5 w-5 text-warning" /><p className="text-sm font-bold uppercase tracking-wide text-warning">Acquisition judgment pending</p></div><p className="mt-3 text-sm leading-6 text-foreground">{synthesis.finalRecommendation ? `n8n returned the recommendation “${synthesis.finalRecommendation},” but did not return its final plain-English judgment yet. Refresh after the next synthesis pass.` : 'This synthesis row has no final judgment text yet. It may still be processing, or the consolidator returned an incomplete payload. Refresh after the next synthesis pass.'}</p></div> : null}

                            <div className="rounded-xl border-2 border-primary/60 bg-primary/10 p-4 shadow-sm"><p className="text-sm font-bold uppercase tracking-wide text-primary">Next step after the synthesis</p><p className="mt-1 text-sm leading-6 text-foreground">Use the Management Question Tracker immediately below this synthesis to turn the open questions into an owner, due date, and follow-up plan. It is the best place to resolve the gaps that could change the acquisition decision.</p></div>

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
                                    title="Project-level red flags"
                                    icon={<TriangleAlert className="h-4 w-4 text-destructive" />}
                                    items={synthesis.redFlags}
                                    emptyLabel="No material project-level red flags returned."
                                    badgeVariant="destructive"
                                    className="border-destructive/30 bg-destructive/5"
                                    itemClassName="border-destructive/20"
                                    defaultOpen
                                />
                                <ExpandableInsightGroup
                                    title="Project-level yellow flags"
                                    icon={<TriangleAlert className="h-4 w-4 text-warning" />}
                                    items={synthesis.yellowFlags}
                                    emptyLabel="No project-level items requiring follow-up returned."
                                    badgeVariant="warning"
                                    className="border-warning/30 bg-warning/5"
                                    itemClassName="border-warning/20"
                                    defaultOpen
                                />
                                <ExpandableInsightGroup
                                    title="Project-level green flags"
                                    icon={<Scale className="h-4 w-4 text-success" />}
                                    items={synthesis.greenFlags}
                                    emptyLabel="No project-level supportive indicators returned."
                                    badgeVariant="success"
                                    className="border-success/30 bg-success/5"
                                    itemClassName="border-success/20"
                                    defaultOpen
                                />
                                <ExpandableInsightGroup
                                    title="Key acquisition takeaways"
                                    icon={<Scale className="h-4 w-4 text-primary" />}
                                    items={synthesis.keyTakeaways}
                                    emptyLabel="No concise takeaways were returned by this synthesis yet."
                                    badgeVariant="success"
                                    className="border-primary/25 bg-primary/5"
                                    itemClassName="border-primary/20"
                                    defaultOpen
                                />
                                <section className="rounded-lg border border-border bg-muted/20 p-4">
                                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Document-level thesis takeaways</p></div><Badge variant="outline">{documentThesisTakeaways.length}</Badge></div>
                                    <p className="mt-1 text-xs text-muted-foreground">Each point is from one completed document—not a new project-level conclusion.</p>
                                    {documentThesisTakeaways.length ? <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">{documentThesisTakeaways.map((takeaway, index) => <button key={`${takeaway.fileName}-${index}`} type="button" onClick={() => onOpenEvidence?.({ title: `Document thesis: ${takeaway.fileName}`, sourceFile: takeaway.fileName, sourceLocation: 'Document-level investment thesis', excerpt: takeaway.takeaway, status: takeaway.status || takeaway.stance, provenance: takeaway.stance, documentId: takeaway.documentId, documentUrl: takeaway.documentUrl })} className="w-full rounded-md border border-border bg-background/80 p-3 text-left text-sm leading-6 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/30"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{takeaway.fileName}</span><Badge variant={takeaway.stance === 'Caution indicator' ? 'warning' : takeaway.stance === 'Supportive indicator' ? 'success' : 'outline'}>{takeaway.stance}</Badge></div><p className="mt-1">{compactTakeaway(takeaway.takeaway)}</p><span className="mt-1 block text-xs font-medium text-primary">View full source evidence</span></button>)}</div> : <p className="mt-3 rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground">No document-level investment-thesis takeaway has returned yet.</p>}
                                </section>
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
                                {(synthesis.citationDetails?.length ?? synthesis.citations?.length ?? 0) > 0 ? (
                                    <div className="rounded-lg border border-border bg-muted/20 p-4">
                                        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Synthesis citations</p></div>
                                        <div className="mt-3 h-64 space-y-2 overflow-y-auto pr-1">
                                            {(synthesis.citationDetails?.length ? synthesis.citationDetails : (synthesis.citations ?? []).map((sourceFile) => ({ sourceFile, sourceLocation: 'Project-level synthesis', excerpt: synthesis.finalJudgmentSummary, period: '', currency: '', confidence: null, status: 'Synthesized' }))).map((citation, index) => {
                                                const document = findCitedDocument(citation.sourceFile, documents)
                                                return <button key={`${citation.sourceFile}-${citation.sourceLocation}-${index}`} type="button" onClick={() => onOpenEvidence?.({ title: 'Project synthesis citation', sourceFile: citation.sourceFile, sourceLocation: citation.sourceLocation || 'Project-level synthesis', excerpt: citation.excerpt || synthesis.finalJudgmentSummary, period: citation.period, currency: citation.currency, confidence: citation.confidence ?? undefined, status: citation.status || 'Synthesized', provenance: 'Project synthesis', documentId: document?.storageFileId, documentUrl: document?.storageFileUrl })} className="w-full rounded-md border border-border bg-background p-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/30">
                                                    <span className="font-medium">{citation.sourceFile}</span>{citation.sourceLocation ? <span className="ml-2 text-xs text-muted-foreground">{citation.sourceLocation}</span> : null}<span className="ml-2 text-xs text-primary">View evidence</span>
                                                </button>
                                            })}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
