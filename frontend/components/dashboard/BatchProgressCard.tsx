import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Loader2, Square } from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../lib/shadcn/card'
import type { SubmissionBatch } from '../../utils/diligenceDashboardUtils'
import { formatElapsedDuration } from '../../utils/diligenceDashboardUtils'
import { formatHours } from '../../utils/impactMetrics'

type BatchProgressCardProps = {
    activeSubmissionBatch: SubmissionBatch
    activeBatchFinishedCount: number
    activeBatchExpectedCount: number
    activeBatchFailedCount: number
    isStoppingBatch: boolean
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
    handleOpenProjectSynthesis: (targetProjectId: string) => void
}

export function BatchProgressCard({
    activeSubmissionBatch,
    activeBatchFinishedCount,
    activeBatchExpectedCount,
    activeBatchFailedCount,
    isStoppingBatch,
    handleStopBatch,
    activeBatchProcessingCount,
    activeBatchProcessingPercent,
    activeBatchProgressPercent,
    batchElapsedSeconds,
    activeBatchImpact,
    activeBatchStuckRows,
    activeBatchErrors,
    activeBatchAdvisories,
    activeBatchCompletedCount,
    activeProjectId,
    retryingRequestId,
    handleRetryFailedDocument,
    handleOpenProjectSynthesis,
}: BatchProgressCardProps) {
    const isFinished = activeBatchFinishedCount >= activeBatchExpectedCount
    const isStopped = Boolean(activeSubmissionBatch.stoppedAt)

    return (
        <Card className="border border-border shadow-sm">
            <CardHeader className="p-4 sm:p-6 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <span>Batch processing run in progress</span>
                            <Badge variant={isFinished ? 'success' : isStopped ? 'destructive' : 'outline'}>
                                {isFinished ? 'Complete' : isStopped ? 'Stopped' : 'Processing'}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Batch ID: <span className="font-mono">{activeSubmissionBatch.id}</span> ({activeSubmissionBatch.environment})
                        </CardDescription>
                    </div>
                    {!isFinished && !isStopped ? (
                        <Button variant="outline" size="sm" onClick={handleStopBatch} disabled={isStoppingBatch} className="text-destructive hover:bg-destructive/10 border-destructive/30">
                            {isStoppingBatch ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Square className="h-3.5 w-3.5 mr-1.5 fill-current" />}
                            Stop batch
                        </Button>
                    ) : null}
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

                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <span>Overall completion ({activeBatchProgressPercent}%)</span>
                        <span>{activeBatchProcessingPercent}% queued/processing</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                        <div className="bg-success transition-all duration-300 h-full" style={{ width: `${activeBatchProgressPercent}%` }} />
                        <div className="bg-primary/50 animate-pulse transition-all duration-300 h-full" style={{ width: `${Math.max(0, activeBatchProcessingPercent - activeBatchProgressPercent)}%` }} />
                    </div>
                </div>

                {activeBatchImpact?.timeSavedHours ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                        ~{formatHours(activeBatchImpact.timeSavedHours)} saved across {activeBatchImpact.completedDocuments} completed document{activeBatchImpact.completedDocuments === 1 ? '' : 's'} (40m manual-review baseline per document).
                    </p>
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
                                    <span className="font-medium truncate">{err.fileName}: <span className="text-muted-foreground font-normal">{err.errorMessage}</span></span>
                                    <Button size="sm" variant="outline" onClick={() => handleRetryFailedDocument(err.requestID)} disabled={retryingRequestId === err.requestID}>
                                        {retryingRequestId === err.requestID ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Retry'}
                                    </Button>
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
                        {activeBatchAdvisories.map((adv, idx) => (
                            <p key={idx} className="text-muted-foreground">{adv.fileName}: {adv.message}</p>
                        ))}
                    </div>
                ) : null}

                {isFinished && activeBatchCompletedCount > 0 ? (
                    <div className="pt-2 flex items-center justify-between">
                        <p className="text-xs text-success font-medium">All batch documents have reached terminal status.</p>
                        <Button size="sm" onClick={() => { if (activeProjectId) handleOpenProjectSynthesis(activeProjectId) }}>
                            View project synthesis
                        </Button>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}
