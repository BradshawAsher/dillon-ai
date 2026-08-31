import React, { useState } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, FileText, Loader2, RefreshCw, RotateCw, Sparkles, Square } from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../lib/shadcn/card'
import type { SubmissionBatch } from '../../utils/diligenceDashboardUtils'
import { isFailedSubmissionStatus } from '../../utils/submissionHistory'
import { formatElapsedDuration, getDocumentExtractionDurationSec } from '../../utils/diligenceDashboardUtils'
import { formatHours } from '../../utils/impactMetrics'

type BatchProgressCardProps = {
    activeSubmissionBatch: SubmissionBatch
    activeBatchFinishedCount: number
    activeBatchExpectedCount: number
    activeBatchFailedCount: number
    isStoppingBatch: boolean
    isSubmitting?: boolean
    isInterrupted?: boolean
    handleStopBatch: () => void
    activeBatchProcessingCount: number
    activeBatchProcessingPercent: number
    activeBatchProgressPercent: number
    batchElapsedSeconds: number
    activeBatchImpact: any
    activeBatchStuckRows: any[]
    activeBatchErrors: Array<{ fileName: string; errorMessage: string; requestID: string }>
    activeBatchAdvisories: Array<{ fileName: string; message: string }>
    activeBatchCompletedCount: number
    activeProjectId?: string
    retryingRequestId?: string
    handleRetryFailedDocument: (requestID: string) => void
    handleRetryFailedBatchDocs?: () => void
    handleOpenProjectSynthesis: (targetProjectId: string) => void
    batchDocuments?: any[]
    handleRerunLatestBatch?: () => void
    handleRerunAllProjectDocs?: () => void
    isRerunningBatch?: boolean
    handleRunSynthesis?: () => void
    isAwaitingSynthesis?: boolean
}

export function BatchProgressCard({
    activeSubmissionBatch,
    activeBatchFinishedCount,
    activeBatchExpectedCount,
    activeBatchFailedCount,
    isStoppingBatch,
    isSubmitting = false,
    isInterrupted = false,
    handleStopBatch,
    activeBatchProcessingCount,
    activeBatchProcessingPercent,
    activeBatchProgressPercent,
    batchElapsedSeconds,
    activeBatchImpact,
    activeBatchStuckRows,
    activeBatchErrors = [],
    activeBatchAdvisories = [],
    activeBatchCompletedCount = 0,
    activeProjectId,
    retryingRequestId,
    handleRetryFailedDocument,
    handleRetryFailedBatchDocs,
    handleOpenProjectSynthesis,
    batchDocuments = [],
    handleRerunLatestBatch,
    handleRerunAllProjectDocs,
    isRerunningBatch = false,
    handleRunSynthesis,
    isAwaitingSynthesis = false,
}: BatchProgressCardProps) {
    const [isDocsExpanded, setIsDocsExpanded] = useState(true)
    const isFinished = !isSubmitting && !isInterrupted && !activeSubmissionBatch.stopError && activeBatchExpectedCount > 0 && activeBatchFinishedCount >= activeBatchExpectedCount
    const isStopped = Boolean(activeSubmissionBatch.stoppedAt)

    const totalBatchDocSec = (batchDocuments || []).reduce((sum, doc) => sum + (getDocumentExtractionDurationSec(doc) || 0), 0)
    const completedBatchDocs = (batchDocuments || []).filter(d => ['completed', 'approved'].includes((d?.status || '').toLowerCase()) || getDocumentExtractionDurationSec(d) !== null)
    const avgBatchDocSec = completedBatchDocs.length > 0 ? Math.round(totalBatchDocSec / completedBatchDocs.length) : 18

    return (
        <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>Batch processing</span>
                            <Badge variant={isStopped || isInterrupted || (isFinished && activeBatchFailedCount > 0) ? 'destructive' : isFinished ? 'success' : 'outline'}>
                                {isStoppingBatch ? 'Stopping' : isStopped ? 'Stopped' : activeSubmissionBatch.stopError ? 'Stop not confirmed' : isInterrupted ? 'Incomplete' : isFinished ? (activeBatchFailedCount > 0 ? 'Finished with errors' : 'Complete') : 'Processing'}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Batch ID: <span className="font-mono">{activeSubmissionBatch.id}</span> ({activeSubmissionBatch.environment})
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {handleRerunLatestBatch ? (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRerunLatestBatch}
                                disabled={isRerunningBatch || (!isFinished && !isStopped && !isInterrupted)}
                                className="gap-1.5 text-xs font-semibold"
                            >
                                {isRerunningBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
                                Re-run latest batch
                            </Button>
                        ) : null}
                        {!isFinished && !isStopped && !isInterrupted ? (
                            <Button variant="outline" size="sm" onClick={handleStopBatch} disabled={isStoppingBatch} className="text-destructive hover:bg-destructive/10 border-destructive/30">
                                {isStoppingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Square className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                                {isStoppingBatch ? 'Stopping...' : activeSubmissionBatch.stopError ? 'Retry stop' : 'Stop batch'}
                            </Button>
                        ) : null}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-muted/20 p-3 rounded-lg border border-border/50">
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Batch Progress</p>
                        <p className="text-base font-bold mt-0.5">{activeBatchFinishedCount} / {activeBatchExpectedCount} finished</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Processing Active</p>
                        <p className="text-base font-bold mt-0.5 text-primary">{activeBatchProcessingCount} running</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Failed / Errors</p>
                        <p className={`text-base font-bold mt-0.5 ${activeBatchFailedCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{activeBatchFailedCount}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">Elapsed Duration</p>
                        <p className="text-base font-bold mt-0.5 flex items-center gap-1 font-mono">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatElapsedDuration(batchElapsedSeconds)}
                        </p>
                    </div>
                </div>

                {(() => {
                    const reachedProcessingCount = activeBatchFinishedCount + activeBatchProcessingCount
                    const reachedProcessingPercent = Math.min(100, Math.round((reachedProcessingCount / (activeBatchExpectedCount || 1)) * 100))
                    const finishedPercent = Math.min(100, Math.round((activeBatchFinishedCount / (activeBatchExpectedCount || 1)) * 100))

                    return (
                        <div className="space-y-3 pt-1">
                            {/* Bar 1: Reached Processing */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                                        Reached Processing
                                    </span>
                                    <span className="font-semibold text-foreground">
                                        {reachedProcessingCount} / {activeBatchExpectedCount} ({reachedProcessingPercent}%)
                                    </span>
                                </div>
                                <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary transition-all duration-500 h-full rounded-full"
                                        style={{ width: `${reachedProcessingPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Bar 2: Reached Finished */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs font-medium">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                                        Reached Finished
                                    </span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                        {activeBatchFinishedCount} / {activeBatchExpectedCount} ({finishedPercent}%)
                                    </span>
                                </div>
                                <div className="h-2.5 w-full bg-muted/60 rounded-full overflow-hidden">
                                    <div
                                        className="bg-emerald-500 transition-all duration-500 h-full rounded-full"
                                        style={{ width: `${finishedPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })()}

                {activeBatchImpact?.timeSavedHours ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        ~{formatHours(activeBatchImpact.timeSavedHours)} saved across {activeBatchImpact.completedDocuments} completed document{activeBatchImpact.completedDocuments === 1 ? '' : 's'} (40m manual-review baseline per document).
                    </p>
                ) : null}

                {batchDocuments && batchDocuments.length > 0 ? (
                    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsDocsExpanded(!isDocsExpanded)}
                            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                <span>Documents in this batch ({batchDocuments.length})</span>
                                {totalBatchDocSec > 0 ? (
                                    <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                                        ~{formatElapsedDuration(totalBatchDocSec)} total extraction · ~{avgBatchDocSec}s/doc
                                    </span>
                                ) : null}
                            </span>
                            {isDocsExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </button>
                        {isDocsExpanded && (
                            <div className="p-3 pt-0 space-y-2 divide-y divide-border/40">
                                {batchDocuments.map((doc: any) => {
                                    const reqId = doc.requestID || String(doc.id || '')
                                    const st = (doc.status || 'unknown').trim().toLowerCase()
                                    const docDur = getDocumentExtractionDurationSec(doc)
                                    return (
                                        <div key={reqId || doc.fileName} className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                                            <div className="min-w-0 max-w-sm">
                                                <p className="font-medium text-foreground truncate">{doc.fileName || 'Untitled document'}</p>
                                                <p className="text-muted-foreground text-[11px]">{doc.documentType || 'Document'} · {doc.status || 'pending'}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {docDur !== null ? (
                                                    <Badge variant="outline" className="font-mono text-[10px] font-bold border-primary/40 bg-primary/10 text-primary gap-1">
                                                        <Clock className="h-3 w-3 text-primary shrink-0" />
                                                        {formatElapsedDuration(docDur)}
                                                    </Badge>
                                                ) : ['processing', 'running'].includes(st) ? (
                                                    <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/30 bg-primary/5 gap-1">
                                                        <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                                                        Processing...
                                                    </Badge>
                                                ) : null}
                                                <Badge variant={st === 'completed' ? 'success' : isFailedSubmissionStatus(st) ? 'destructive' : 'outline'} className="text-[10px]">
                                                    {doc.status || 'pending'}
                                                </Badge>
                                                {reqId && isFailedSubmissionStatus(st) ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 text-xs gap-1 hover:bg-primary/10"
                                                        onClick={() => handleRetryFailedDocument(reqId)}
                                                        disabled={retryingRequestId === reqId}
                                                    >
                                                        {retryingRequestId === reqId ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
                                                        Re-run doc
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : null}

                {activeBatchErrors.length > 0 ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs space-y-2">
                        <p className="font-semibold text-destructive flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            {activeBatchErrors.length} document error{activeBatchErrors.length === 1 ? '' : 's'} in this batch
                        </p>
                        <div className="space-y-1">
                            {activeBatchErrors.map((err, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 text-foreground bg-background/50 p-2 rounded border border-destructive/20">
                                    <span className="font-medium break-words min-w-0">{err.fileName}: <span className="text-muted-foreground font-normal">{err.errorMessage}</span></span>
                                    {err.requestID ? <Button size="sm" variant="outline" onClick={() => handleRetryFailedDocument(err.requestID)} disabled={retryingRequestId === err.requestID}>
                                        {retryingRequestId === err.requestID ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Retry'}
                                    </Button> : <span className="shrink-0 text-muted-foreground">Re-upload this file</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {activeBatchAdvisories.length > 0 ? (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs space-y-1 text-foreground">
                        <p className="font-semibold text-warning flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            Batch advisories
                        </p>
                        {activeBatchAdvisories.map((adv: { fileName: string; message: string }, idx: number) => (
                            <p key={idx} className="text-muted-foreground">{adv.fileName}: {adv.message}</p>
                        ))}
                    </div>
                ) : null}

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                        {isFinished ? (
                            <p className="text-xs text-success font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                                {activeBatchFailedCount > 0 ? `${activeBatchCompletedCount} succeeded; ${activeBatchFailedCount} failed. Review errors before relying on synthesis.` : 'All batch documents completed successfully.'}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {handleRetryFailedBatchDocs && activeBatchFailedCount > 0 && batchDocuments.some(doc => doc.requestID && isFailedSubmissionStatus(doc.status)) ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1.5 border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-semibold"
                                onClick={handleRetryFailedBatchDocs}
                                disabled={isRerunningBatch}
                            >
                                <RotateCw className="h-3.5 w-3.5" />
                                Retry registered failures ({batchDocuments.filter(doc => doc.requestID && isFailedSubmissionStatus(doc.status)).length})
                            </Button>
                        ) : null}
                        {handleRerunAllProjectDocs && activeProjectId ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1.5"
                                onClick={handleRerunAllProjectDocs}
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Re-run all docs in project
                            </Button>
                        ) : null}
                        {handleRunSynthesis && activeBatchCompletedCount > 0 ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
                                onClick={handleRunSynthesis}
                                disabled={isAwaitingSynthesis}
                            >
                                {isAwaitingSynthesis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                Re-run synthesis
                            </Button>
                        ) : null}
                        {activeBatchCompletedCount > 0 && activeProjectId ? (
                            <Button
                                size="sm"
                                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                                onClick={() => handleOpenProjectSynthesis(activeProjectId)}
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                <span>View project synthesis</span>
                            </Button>
                        ) : null}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
