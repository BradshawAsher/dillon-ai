import React from 'react'
import { ChevronLeft, ChevronRight, Clock3, DollarSign } from 'lucide-react'

import ExpandableText from '../ExpandableText'
import ExpandableInsightGroup from '../ExpandableInsightGroup'
import MathChecksSection from '../MathChecksSection'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../lib/shadcn/card'
import { Progress } from '../../lib/shadcn/progress'
import {
    getAiSubmissionViewModel,
    getSubmissionInsightTone,
    splitReadableText,
} from '../../utils/aiSubmissionData'
import {
    formatSubmissionStatus,
    type SubmissionHistoryItem,
} from '../../utils/submissionHistory'
import { formatEasternTime } from '../../utils/dateTime'
import {
    formatConfidencePercent,
    calculateDocumentCost,
    calculateBatchTotalCost,
    formatDocumentCostDisplay,
} from '../../utils/diligenceDashboardUtils'

function getSubmissionStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
    const normalized = (status || '').trim().toLowerCase()
    if (normalized === 'completed' || normalized === 'approved') return 'success'
    if (['accepted', 'queued', 'processing', 'submitted', 'human review', 'human_review', 'needs review'].includes(normalized)) return 'warning'
    if (['error', 'failed', 'rejected'].includes(normalized)) return 'destructive'
    return 'secondary'
}

export type LatestSubmissionSectionProps = {
    displayedSubmissionRow?: SubmissionHistoryItem
    displayedSubmitStatus: string
    submitEnvironment: string
    liveSubmittedRow?: SubmissionHistoryItem
    latestBatchRows: SubmissionHistoryItem[]
    selectedBatchDocIndex?: number | null
    safeBatchDocIndex?: number
    setSelectedBatchDocIndex: React.Dispatch<React.SetStateAction<number>> | React.Dispatch<React.SetStateAction<number | null>> | any
    retryingRequestId?: string | null
    handleRetryFailedDocument?: (requestID: string) => void
    handleOpenProjectSynthesis: (projectId: string) => void
    projectId: string
    projectStage?: string
    documentType?: string
    submitResponse?: any
    webhookResponse?: any
    displayedSubmitRowId?: string
    displayedSubmitReceivedAt?: string
    displayedSubmitTrafficLight?: string
    displayedSubmitRiskLevel?: string
    displayedSubmitCategory?: string
    displayedSubmitConfidence?: string
    displayedSubmitVariance?: string
    displayedSubmitValuationCurrency?: string
    displayedSubmitAiSummary?: string
    liveSubmitCitations?: Array<{ sourceFile?: string; rowOrCell?: string }>
    activeProjectSynthesis?: any
    isCurrentProjectAwaitingSynthesis?: boolean
    setActiveEvidence?: (evidence: any) => void
}

export default function LatestSubmissionSection({
    displayedSubmissionRow,
    displayedSubmitStatus,
    submitEnvironment,
    liveSubmittedRow,
    latestBatchRows,
    selectedBatchDocIndex,
    safeBatchDocIndex: propSafeBatchDocIndex,
    setSelectedBatchDocIndex,
    retryingRequestId,
    handleRetryFailedDocument,
    handleOpenProjectSynthesis,
    projectId,
    projectStage,
    documentType,
    submitResponse,
    webhookResponse,
    displayedSubmitRowId,
    displayedSubmitReceivedAt,
    displayedSubmitTrafficLight,
    displayedSubmitRiskLevel,
    displayedSubmitCategory,
    displayedSubmitConfidence,
    displayedSubmitVariance,
    displayedSubmitValuationCurrency,
    displayedSubmitAiSummary,
    liveSubmitCitations = [],
    activeProjectSynthesis,
    isCurrentProjectAwaitingSynthesis,
    setActiveEvidence,
    setUserHasNavigatedBatchDocs,
}: LatestSubmissionSectionProps & { setUserHasNavigatedBatchDocs?: (navigated: boolean) => void }) {
    const liveSubmitInsight = displayedSubmissionRow ? getAiSubmissionViewModel(displayedSubmissionRow) : null
    const trafficLight = displayedSubmitTrafficLight || displayedSubmissionRow?.trafficLight || ''
    const riskLevel = displayedSubmitRiskLevel || displayedSubmissionRow?.riskLevel || ''
    const confidence = displayedSubmitConfidence || displayedSubmissionRow?.aiConfidence || ''
    const aiSummary = displayedSubmitAiSummary || displayedSubmissionRow?.aiSummary || ''

    const safeBatchDocIndex = typeof propSafeBatchDocIndex === 'number' ? propSafeBatchDocIndex : Math.min(
        latestBatchRows.length - 1,
        Math.max(0, typeof selectedBatchDocIndex === 'number' ? selectedBatchDocIndex : (latestBatchRows.length > 0 ? latestBatchRows.length - 1 : 0))
    )

    const docCost = calculateDocumentCost(displayedSubmissionRow)
    const batchTotalCost = calculateBatchTotalCost(latestBatchRows)
    const formattedConfidence = formatConfidencePercent(confidence)

    return (
        <Card id="latest-submission-section" data-latest-submission className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Latest project document submission</CardTitle>
                        <CardDescription>
                            The most recent document was accepted quickly, then the UI switched to polling for the live n8n row and extracted outputs.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {latestBatchRows.length > 0 && (
                            <Badge variant="outline" className="gap-1 font-mono text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 py-1 px-2.5">
                                <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>Batch Total: ${batchTotalCost.toFixed(4)} ({latestBatchRows.length} doc{latestBatchRows.length > 1 ? 's' : ''}, incl. retries)</span>
                            </Badge>
                        )}
                        {displayedSubmissionRow && ['failed', 'error', 'rejected', 'needs_review', 'needs review'].includes(displayedSubmitStatus.trim().toLowerCase()) && displayedSubmissionRow.requestID && handleRetryFailedDocument ? (
                            <Button type="button" variant="outline" disabled={retryingRequestId === displayedSubmissionRow.requestID} onClick={() => handleRetryFailedDocument(displayedSubmissionRow.requestID)}>
                                {retryingRequestId === displayedSubmissionRow.requestID ? 'Retrying document…' : 'Retry document'}
                            </Button>
                        ) : null}
                        <Badge variant={getSubmissionStatusVariant(displayedSubmitStatus)}>
                            {formatSubmissionStatus(displayedSubmitStatus)}
                        </Badge>
                        <Badge variant={submitEnvironment === 'test' ? 'warning' : 'outline'}>
                            {submitEnvironment}
                        </Badge>
                        <Badge variant={displayedSubmissionRow ? 'success' : 'secondary'}>
                            {liveSubmittedRow ? 'Live project row found' : 'Most recent saved submission'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button type="button" variant="default" onClick={() => handleOpenProjectSynthesis(displayedSubmissionRow?.projectId || projectId)} disabled={!(displayedSubmissionRow?.projectId || projectId)}>
                        View this project&apos;s synthesis
                    </Button>
                    <Button type="button" variant="outline" className="gap-1.5 font-bold" onClick={() => {
                        const targetProj = displayedSubmissionRow?.companyName || displayedSubmissionRow?.dealName || projectId || 'this project'
                        const el = document.getElementById('upload-section')
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        alert(`📁 Adding files to existing project: "${targetProj}"\nYour newly uploaded document will automatically merge into this project's synthesis deliverable.`)
                    }}>
                        Add more files for this project
                    </Button>
                    {displayedSubmitStatus && !['completed', 'failed', 'error'].includes(displayedSubmitStatus.trim().toLowerCase()) && (
                        <Badge variant="secondary" className="gap-1.5">
                            <Clock3 className="h-3 w-3" />
                            Est. ~1 min remaining
                        </Badge>
                    )}
                </div>

                {liveSubmitInsight ? (
                    <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-bold uppercase tracking-wide text-primary">Document Investment Thesis — Start Here</p>
                                <Badge variant="outline" className="text-[10px]">Single-Doc Scope</Badge>
                            </div>
                            {liveSubmitInsight.investmentIsFavorable !== null ? (
                                <Badge variant={liveSubmitInsight.investmentIsFavorable ? 'success' : 'destructive'}>
                                    {liveSubmitInsight.investmentIsFavorable ? 'Favorable indicator' : 'Caution indicator'}
                                </Badge>
                            ) : null}
                        </div>

                        {liveSubmitInsight.investmentBuyReasoning && liveSubmitInsight.investmentBuyReasoning.trim().length > 0 ? (
                            <>
                                <p className="mt-2 text-sm leading-6 text-foreground">{liveSubmitInsight.investmentBuyReasoning}</p>
                                <div className="rounded-md border border-amber-300/40 bg-amber-50/50 p-2.5 dark:border-amber-800/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 mt-2">
                                    <span className="shrink-0 font-bold">⚠️ Single-Doc Scope:</span>
                                    <span>This decision was made purely from this individual document alone. Please wait for <strong>Project Synthesis</strong> for the definitive acquisition decision.</span>
                                </div>
                            </>
                        ) : (
                            <div className="rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2 mt-1">
                                <span className="shrink-0 font-semibold text-foreground">ℹ️ Insufficient Data:</span>
                                <span>There is not enough narrative data in this individual document to produce an investment thesis. Please wait for <strong>Project Synthesis</strong> to run for the definitive investment thesis.</span>
                            </div>
                        )}
                    </div>
                ) : null}

                <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <p className="text-sm font-bold uppercase tracking-wide text-primary truncate max-w-md">
                                Start here — {displayedSubmissionRow?.fileName || 'latest document'}
                            </p>
                            <Badge variant={getSubmissionStatusVariant(displayedSubmitStatus)}>
                                {formatSubmissionStatus(displayedSubmitStatus)}
                            </Badge>
                        </div>

                        {latestBatchRows.length > 1 && (
                            <div className="flex items-center gap-2 bg-background/90 border border-primary/30 px-3 py-1 rounded-xl shadow-xs">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-primary/10 text-foreground"
                                    disabled={safeBatchDocIndex === 0}
                                    onClick={() => {
                                        setUserHasNavigatedBatchDocs?.(true)
                                        setSelectedBatchDocIndex((prev: any) => Math.max(0, (typeof prev === 'number' ? prev : safeBatchDocIndex) - 1))
                                    }}
                                    title="Previous document in batch"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-xs font-bold text-foreground font-mono">
                                    Doc {safeBatchDocIndex + 1} of {latestBatchRows.length}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 hover:bg-primary/10 text-foreground"
                                    disabled={safeBatchDocIndex >= latestBatchRows.length - 1}
                                    onClick={() => {
                                        setUserHasNavigatedBatchDocs?.(true)
                                        setSelectedBatchDocIndex((prev: any) => Math.min(latestBatchRows.length - 1, (typeof prev === 'number' ? prev : safeBatchDocIndex) + 1))
                                    }}
                                    title="Next document in batch"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">Risk signal</p>
                            <p className="mt-1 text-lg font-bold">{trafficLight || riskLevel || 'Still processing'}</p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">AI confidence</p>
                            <p className="mt-1 text-lg font-bold">{formattedConfidence}</p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">Detected document type</p>
                            <p className="mt-1 text-lg font-bold truncate" title={displayedSubmissionRow?.detectedDocumentType || displayedSubmissionRow?.documentType || documentType || 'Pending'}>
                                {displayedSubmissionRow?.detectedDocumentType || displayedSubmissionRow?.documentType || documentType || 'Pending'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">Extraction Cost</p>
                            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatDocumentCostDisplay(displayedSubmissionRow).formatted}
                            </p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">Action needed</p>
                            <p className="mt-1 text-lg font-bold">{liveSubmitInsight?.escalationReasons.length ? 'Review flags' : displayedSubmitStatus.toLowerCase() === 'completed' ? 'Ready to use' : 'Wait for analysis'}</p>
                        </div>
                    </div>

                    <ExpandableText text={aiSummary || (liveSubmitInsight?.escalationReasons.length ? "The document has items that need review before relying on its findings." : "This panel will surface the document’s key result as soon as n8n returns it.")} maxHeight={120} className="mt-4" />
                </div>

                <p className="text-xs text-muted-foreground">
                    {submitResponse
                        ? `${submitResponse.method} to ${submitResponse.target} at ${submitResponse.submittedAt}`
                        : 'Restored from the most recent n8n submission history row.'}
                </p>

                <details className="group rounded-lg border border-border bg-muted/20">
                    <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground">
                        <span>Submission metadata — IDs, timestamps, file</span>
                        <span className="text-xs text-primary group-open:hidden">Show</span>
                        <span className="hidden text-xs text-primary group-open:inline">Hide</span>
                    </summary>
                    <div className="grid gap-2 p-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Request ID</p>
                            <p className="mt-1 break-all font-mono text-foreground">{webhookResponse?.requestID ?? displayedSubmissionRow?.requestID ?? 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project ID</p>
                            <p className="mt-1 break-all font-mono text-foreground">{displayedSubmissionRow?.projectId || projectId || 'Not set'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project Stage</p>
                            <p className="mt-1 text-foreground">{displayedSubmissionRow?.projectStage || projectStage || 'Not set'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Document Type</p>
                            <p className="mt-1 text-foreground">{displayedSubmissionRow?.documentType || documentType || 'Not set'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">n8n Row ID</p>
                            <p className="mt-1 font-mono text-foreground">{displayedSubmitRowId || 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Received At</p>
                            <p className="mt-1 text-foreground">{formatEasternTime(displayedSubmitReceivedAt || '')}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Deal / Project</p>
                            <p className="mt-1 text-foreground">{submitResponse?.payload?.dealName || displayedSubmissionRow?.dealName || 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">File Name</p>
                            <p className="mt-1 break-all text-foreground">{submitResponse?.payload?.fileName ?? displayedSubmissionRow?.fileName ?? 'Pending'}</p>
                        </div>
                    </div>
                </details>

                {displayedSubmissionRow ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-md border border-border bg-card px-3 py-2 xl:col-span-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Live progress</p>
                                {trafficLight ? (
                                    <Badge variant={getSubmissionInsightTone(trafficLight)}>
                                        {trafficLight}
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="mt-1 text-foreground">Processing started: {displayedSubmissionRow.processingStartedAt || 'Pending'}</p>
                            <p className="mt-1 text-foreground">Processed at: {displayedSubmissionRow.processedAt || 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Risk Level</p>
                            <p className="mt-1 text-foreground">{riskLevel || 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Category</p>
                            <p className="mt-1 text-foreground">{displayedSubmitCategory || 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Confidence</p>
                            <p className="mt-1 text-foreground">
                                {formattedConfidence}
                            </p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Variance</p>
                            <p className="mt-1 text-foreground">{displayedSubmitVariance ? `${displayedSubmitVariance}%` : 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">EBITDA Extracted</p>
                            <p className="mt-1 text-foreground">{displayedSubmissionRow.ebitdaExtracted || 'Pending'}</p>
                        </div>
                        {(liveSubmitInsight?.escalationReasons.length || aiSummary) ? (
                            <div className="grid gap-3 xl:col-span-4 xl:grid-cols-2">
                                {liveSubmitInsight?.escalationReasons.length ? (
                                    <div>
                                        <ExpandableInsightGroup
                                            title="Escalation reasons"
                                            items={liveSubmitInsight.escalationReasons.flatMap((reason) => splitReadableText(reason))}
                                            badgeVariant="warning"
                                            className="border-warning/30 bg-warning/10"
                                            itemClassName="border-warning/30"
                                            emptyLabel="No escalation reasons returned."
                                            defaultOpen
                                            onItemClick={(item) => {
                                                if (setActiveEvidence) {
                                                    setActiveEvidence({
                                                        title: 'Escalation reason',
                                                        sourceFile: displayedSubmissionRow?.fileName || 'Uploaded document',
                                                        sourceLocation: 'Escalation analysis',
                                                        excerpt: item,
                                                        status: 'Needs review',
                                                        provenance: 'Document-level escalation',
                                                        documentId: displayedSubmissionRow?.storageFileId,
                                                        documentUrl: displayedSubmissionRow?.storageFileUrl,
                                                    })
                                                }
                                            }}
                                        />
                                    </div>
                                ) : null}
                                {aiSummary ? (
                                    <div>
                                        <ExpandableInsightGroup
                                            title="AI Summary"
                                            items={splitReadableText(aiSummary)}
                                            defaultOpen
                                            className="border-border bg-card"
                                            itemClassName="border-border"
                                            emptyLabel="No AI summary returned."
                                            onItemClick={(item) => {
                                                if (setActiveEvidence) {
                                                    setActiveEvidence({
                                                        title: 'AI Summary finding',
                                                        sourceFile: displayedSubmissionRow?.fileName || 'Uploaded document',
                                                        sourceLocation: 'AI document summary',
                                                        excerpt: item,
                                                        status: 'Synthesized',
                                                        provenance: 'Document-level AI summary',
                                                        documentId: displayedSubmissionRow?.storageFileId,
                                                        documentUrl: displayedSubmissionRow?.storageFileUrl,
                                                    })
                                                }
                                            }}
                                        />
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                        {liveSubmitInsight ? (
                            <div className="grid gap-3 xl:col-span-4 xl:grid-cols-2">
                                {[
                                    {
                                        title: 'Red flags',
                                        flags: liveSubmitInsight.redFlags,
                                        badge: 'destructive' as const,
                                        sectionClass: 'border-destructive/30 bg-destructive/5',
                                        itemClass: 'border-destructive/20',
                                    },
                                    {
                                        title: 'Yellow flags',
                                        flags: liveSubmitInsight.yellowFlags,
                                        badge: 'warning' as const,
                                        sectionClass: 'border-warning/30 bg-warning/5',
                                        itemClass: 'border-warning/20',
                                    },
                                    {
                                        title: 'Green flags',
                                        flags: liveSubmitInsight.greenFlags,
                                        badge: 'success' as const,
                                        sectionClass: 'border-success/30 bg-success/5',
                                        itemClass: 'border-success/20',
                                    },
                                ].map((group) => (
                                    <ExpandableInsightGroup
                                        key={group.title}
                                        title={group.title}
                                        items={group.flags}
                                        badgeVariant={group.badge}
                                        className={group.sectionClass}
                                        itemClassName={group.itemClass}
                                        emptyLabel="None"
                                        defaultOpen
                                        onItemClick={(item) => {
                                            if (setActiveEvidence) {
                                                setActiveEvidence({
                                                    title: `${group.title.replace(' flags', ' flag')}: finding`,
                                                    sourceFile: displayedSubmissionRow?.fileName || 'Uploaded document',
                                                    sourceLocation: group.title,
                                                    excerpt: item,
                                                    status: group.badge === 'destructive' ? 'Risk' : group.badge === 'warning' ? 'Caution' : 'Confirmed',
                                                    provenance: `Document-level ${group.title.toLowerCase()} analysis`,
                                                    documentId: displayedSubmissionRow?.storageFileId,
                                                    documentUrl: displayedSubmissionRow?.storageFileUrl,
                                                })
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        ) : null}
                        {liveSubmitCitations.length ? (
                            <div className="xl:col-span-4 rounded-lg border border-primary/25 bg-primary/5 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-foreground">Document citations</p>
                                    <Badge variant="outline">{liveSubmitCitations.length} locations</Badge>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">Each line identifies the exact section n8n used; click it to view source evidence when available.</p>
                                <div className="mt-3 h-64 space-y-2 overflow-y-auto pr-1">
                                    {liveSubmitCitations.map((citation, index) => (
                                        <button
                                            key={`${citation.sourceFile}-${citation.rowOrCell}-${index}`}
                                            type="button"
                                            onClick={() => {
                                                if (setActiveEvidence) {
                                                    setActiveEvidence({
                                                        title: 'Document analysis citation',
                                                        sourceFile: citation.sourceFile || displayedSubmissionRow?.fileName || 'Uploaded document',
                                                        sourceLocation: citation.rowOrCell || 'Document analysis',
                                                        excerpt: citation.rowOrCell ? `Source location: ${citation.rowOrCell}` : 'No additional excerpt was returned for this citation.',
                                                        status: 'Confirmed',
                                                        provenance: 'Document-level analysis',
                                                        documentId: displayedSubmissionRow?.storageFileId,
                                                        documentUrl: displayedSubmissionRow?.storageFileUrl,
                                                    })
                                                }
                                            }}
                                            className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-primary/20 bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary/50 hover:bg-muted/30"
                                        >
                                            <span>
                                                <span className="font-medium">{citation.sourceFile || displayedSubmissionRow?.fileName || 'Uploaded document'}</span>
                                                <span className="mx-2 text-muted-foreground">·</span>
                                                <span className="text-muted-foreground">{citation.rowOrCell || 'Document analysis'}</span>
                                            </span>
                                            <span className="text-xs font-medium text-primary">View evidence</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {(liveSubmitInsight?.formattedValuationLowerBound && liveSubmitInsight.formattedValuationLowerBound !== '$0') || (liveSubmitInsight?.formattedValuationBaseEstimate && liveSubmitInsight.formattedValuationBaseEstimate !== '$0') || (liveSubmitInsight?.formattedValuationUpperBound && liveSubmitInsight.formattedValuationUpperBound !== '$0') ? (
                            <div className="xl:col-span-4">
                                <div className="mb-2 flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">{displayedSubmissionRow?.aiConfidence ? `${displayedSubmissionRow.aiConfidence}% confidence` : 'AI estimate'}</Badge>
                                    {displayedSubmitValuationCurrency ? <Badge variant="secondary">{displayedSubmitValuationCurrency}</Badge> : null}
                                </div>
                                <div className="grid gap-2 md:grid-cols-3">
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lower Bound</p>
                                        <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.formattedValuationLowerBound || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base Estimate</p>
                                        <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.formattedValuationBaseEstimate || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upper Bound</p>
                                        <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.formattedValuationUpperBound || 'Pending'}</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                        {liveSubmitInsight ? (
                            <div className="rounded-md border border-border bg-card p-3.5 xl:col-span-4 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Document-Level Investment Thesis</p>
                                        <Badge variant="outline" className="text-[10px]">Single-File Intake</Badge>
                                    </div>
                                    {liveSubmitInsight.investmentIsFavorable !== null ? (
                                        <Badge variant={liveSubmitInsight.investmentIsFavorable ? 'success' : 'destructive'}>
                                            {liveSubmitInsight.investmentIsFavorable ? 'Favorable indicator' : 'Not favorable'}
                                        </Badge>
                                    ) : null}
                                </div>

                                {liveSubmitInsight.investmentBuyReasoning && liveSubmitInsight.investmentBuyReasoning.trim().length > 0 ? (
                                    <>
                                        <ExpandableText text={liveSubmitInsight.investmentBuyReasoning} maxHeight={120} className="whitespace-pre-wrap text-sm leading-6 text-foreground" />
                                        <div className="rounded-md border border-amber-300/40 bg-amber-50/50 p-2.5 dark:border-amber-800/40 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 mt-2">
                                            <span className="shrink-0 font-bold">⚠️ Single-Doc Scope:</span>
                                            <span>This preliminary thesis was derived purely from this individual document in isolation. Please await <strong>Project Synthesis</strong> for the final, cross-document acquisition verdict.</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2 mt-1">
                                        <span className="shrink-0 font-semibold text-foreground">ℹ️ Insufficient Data:</span>
                                        <span>There is not enough narrative data in this individual document to produce a standalone investment thesis. Please wait for <strong>Project Synthesis</strong> to consolidate all deal files into a definitive investment thesis.</span>
                                    </div>
                                )}
                            </div>
                        ) : null}
                        {displayedSubmissionRow?.reconciliationJson ? (
                            <div className="xl:col-span-4">
                                <MathChecksSection documents={[displayedSubmissionRow]} onOpenEvidence={setActiveEvidence} compact title="Document math checks" description="Deterministic arithmetic verifications on this document's extracted numbers." />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <Button type="button" variant="default" onClick={() => handleOpenProjectSynthesis(displayedSubmissionRow?.projectId || projectId)} disabled={!(displayedSubmissionRow?.projectId || projectId)}>
                        View this project&apos;s synthesis
                        {activeProjectSynthesis ? <Badge variant="success" className="ml-2">Ready</Badge> : isCurrentProjectAwaitingSynthesis ? <Badge variant="warning" className="ml-2">Running</Badge> : null}
                    </Button>
                    <Button type="button" variant="outline" className="gap-1.5 font-bold" onClick={() => {
                        const targetProj = displayedSubmissionRow?.companyName || displayedSubmissionRow?.dealName || projectId || 'this project'
                        const el = document.getElementById('upload-section')
                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        alert(`📁 Adding files to existing project: "${targetProj}"\nYour newly uploaded document will automatically merge into this project's synthesis deliverable.`)
                    }}>
                        Add more files for this project
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
