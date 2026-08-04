import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react'

import ExpandableText from '../ExpandableText'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../lib/shadcn/card'
import {
    getAiSubmissionViewModel,
} from '../../utils/aiSubmissionData'
import {
    formatSubmissionStatus,
    type SubmissionHistoryItem,
} from '../../utils/submissionHistory'

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
    safeBatchDocIndex: number
    setSelectedBatchDocIndex: React.Dispatch<React.SetStateAction<number>>
    retryingRequestId?: string
    handleRetryFailedDocument?: (requestId: string) => void
    handleOpenProjectSynthesis: (projectId: string) => void
    projectId: string
    documentType?: string
}

export default function LatestSubmissionSection({
    displayedSubmissionRow,
    displayedSubmitStatus,
    submitEnvironment,
    liveSubmittedRow,
    latestBatchRows,
    safeBatchDocIndex,
    setSelectedBatchDocIndex,
    retryingRequestId,
    handleRetryFailedDocument,
    handleOpenProjectSynthesis,
    projectId,
    documentType,
}: LatestSubmissionSectionProps) {
    const liveSubmitInsight = displayedSubmissionRow ? getAiSubmissionViewModel(displayedSubmissionRow) : null
    const displayedSubmitTrafficLight = displayedSubmissionRow?.trafficLight ?? ''
    const displayedSubmitRiskLevel = displayedSubmissionRow?.riskLevel ?? ''
    const displayedSubmitConfidence = displayedSubmissionRow?.aiConfidence ?? ''
    const displayedSubmitAiSummary = displayedSubmissionRow?.aiSummary ?? ''

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Latest project document submission</CardTitle>
                        <CardDescription>
                            The most recent document was accepted quickly, then the UI switched to polling for the live n8n row and extracted outputs.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
                    <Button type="button" variant="outline" onClick={() => { const el = document.getElementById('upload-section'); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                        Upload more files for this project
                    </Button>
                    {displayedSubmitStatus && !['completed', 'failed', 'error'].includes(displayedSubmitStatus.trim().toLowerCase()) && (
                        <Badge variant="secondary" className="gap-1.5">
                            <Clock3 className="h-3 w-3" />
                            Est. ~1 min remaining
                        </Badge>
                    )}
                </div>

                {liveSubmitInsight && (liveSubmitInsight.investmentBuyReasoning || liveSubmitInsight.investmentIsFavorable !== null) ? (
                    <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-bold uppercase tracking-wide text-primary">Investment thesis — start here</p>
                            {liveSubmitInsight.investmentIsFavorable !== null ? (
                                <Badge variant={liveSubmitInsight.investmentIsFavorable ? 'success' : 'destructive'}>
                                    {liveSubmitInsight.investmentIsFavorable ? 'Favorable indicator' : 'Caution indicator'}
                                </Badge>
                            ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground">{liveSubmitInsight.investmentBuyReasoning || 'No investment thesis returned yet.'}</p>
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
                                    onClick={() => setSelectedBatchDocIndex((prev) => Math.max(0, prev - 1))}
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
                                    onClick={() => setSelectedBatchDocIndex((prev) => Math.min(latestBatchRows.length - 1, prev + 1))}
                                    title="Next document in batch"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">Risk signal</p>
                            <p className="mt-1 text-lg font-bold">{displayedSubmitTrafficLight || displayedSubmitRiskLevel || 'Still processing'}</p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">AI confidence</p>
                            <p className="mt-1 text-lg font-bold">{liveSubmitInsight?.confidencePercent != null ? `${liveSubmitInsight.confidencePercent}%` : displayedSubmitConfidence || 'Pending'}</p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">Detected document type</p>
                            <p className="mt-1 text-lg font-bold">{displayedSubmissionRow?.detectedDocumentType || displayedSubmissionRow?.documentType || documentType || 'Pending'}</p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <p className="text-xs text-muted-foreground">Action needed</p>
                            <p className="mt-1 text-lg font-bold">{liveSubmitInsight?.escalationReasons.length ? 'Review flags' : displayedSubmitStatus.toLowerCase() === 'completed' ? 'Ready to use' : 'Wait for analysis'}</p>
                        </div>
                    </div>

                    <ExpandableText text={displayedSubmitAiSummary || (liveSubmitInsight?.escalationReasons.length ? "The document has items that need review before relying on its findings." : "This panel will surface the document’s key result as soon as n8n returns it.")} maxHeight={120} className="mt-4" />
                </div>
            </CardContent>
        </Card>
    )
}
