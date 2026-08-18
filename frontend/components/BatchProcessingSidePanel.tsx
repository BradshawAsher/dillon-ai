import { useEffect } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, StopCircle, X, ArrowRight, FolderPlus, Play, Sparkles } from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Progress } from '../lib/shadcn/progress'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { formatSubmissionStatus, isActiveSubmissionStatus } from '../utils/submissionHistory'
import type { WalkthroughResumeState } from './walkthrough/walkthroughTypes'

interface BatchProcessingSidePanelProps {
    isOpen: boolean
    onClose: () => void
    inFlightBatch: { projectId: string; dealName?: string; projectStage?: string; expectedDocumentCount?: number } | null
    activeBatchRows: SubmissionHistoryItem[]
    batchProgressPercent: number
    batchProcessingCount: number
    batchExpectedCount: number
    batchFinishedCount: number
    batchFailedCount: number
    batchElapsedSeconds: number
    batchSubmissionMessage: string
    isStoppingBatch: boolean
    onStopBatch: () => void
    onRetryDocument: (requestID: string) => void
    onRequeueNewProject?: (requestID?: string) => void
    retryingRequestId: string | null
    submissionHistory: SubmissionHistoryItem[]
    resumeState?: WalkthroughResumeState | null
    onResumeTour?: () => void
}

export function BatchProcessingSidePanel({
    isOpen,
    onClose,
    inFlightBatch,
    activeBatchRows,
    batchProgressPercent,
    batchProcessingCount,
    batchExpectedCount,
    batchFinishedCount,
    batchFailedCount,
    batchElapsedSeconds,
    batchSubmissionMessage,
    isStoppingBatch,
    onStopBatch,
    onRetryDocument,
    onRequeueNewProject,
    retryingRequestId,
    submissionHistory,
    resumeState,
    onResumeTour,
}: BatchProcessingSidePanelProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`
    }

    const activeProcessingRows = submissionHistory.filter((row) => isActiveSubmissionStatus(row.status))
    
    // Group by filename/requestID so files that succeeded on a subsequent retry are not counted as failed
    const latestRowByFile = new Map<string, SubmissionHistoryItem>()
    submissionHistory.forEach((row) => {
        const key = (row.fileName || row.requestID || String(row.id)).trim().toLowerCase()
        if (!latestRowByFile.has(key)) {
            latestRowByFile.set(key, row)
        }
    })

    const failedRows = [...latestRowByFile.values()].filter((row) =>
        ['failed', 'error', 'rejected'].includes((row.status || '').trim().toLowerCase())
    )

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Right Slide-over Drawer Panel */}
            <aside
                className="fixed right-0 top-0 bottom-0 z-50 flex w-full sm:w-[320px] max-w-[88vw] flex-col border-l border-border bg-card/98 shadow-2xl backdrop-blur-xl transition-transform duration-300 ease-in-out"
                role="dialog"
                aria-modal="true"
                aria-label="Batch processing drawer"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/80 p-3.5 bg-muted/40">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Activity className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Batch Processing Activity</h2>
                            <p className="text-xs text-muted-foreground">
                                Real-time AI extraction & queue status
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                        aria-label="Close batch activity panel"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5">
                    {/* Paused Guided Tour Resume Card */}
                    {resumeState && onResumeTour && (
                        <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/15 via-emerald-500/10 to-primary/5 p-4 space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" />
                                    Paused Guided Tour
                                </span>
                                <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
                                    Step {resumeState.stepIndex + 1} of {resumeState.totalSteps}
                                </Badge>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-foreground">
                                    {resumeState.playlistTitle}
                                </p>
                                <p className="text-[11px] text-muted-foreground truncate">
                                    {resumeState.stepTitle}
                                </p>
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                className="w-full h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                onClick={() => {
                                    onClose()
                                    onResumeTour()
                                }}
                            >
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Resume Guided Walkthrough
                            </Button>
                        </div>
                    )}

                    {/* Active In-Flight Batch Banner */}
                    {(inFlightBatch || activeProcessingRows.length > 0) ? (() => {
                        const isFinished = batchExpectedCount > 0 && batchFinishedCount >= batchExpectedCount && activeProcessingRows.length === 0
                        return (
                            <div className={`rounded-xl border p-4 space-y-3 ${isFinished ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-primary/30 bg-primary/5'}`}>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-foreground flex items-center gap-2">
                                        {isFinished ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        ) : (
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        )}
                                        {isFinished ? 'Batch Completed' : 'Active Processing Batch'}
                                    </span>
                                    <Badge variant={isFinished ? 'success' : 'secondary'} className="gap-1 font-mono text-xs">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(batchElapsedSeconds)}
                                    </Badge>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span>Progress: {batchFinishedCount} / {batchExpectedCount || activeProcessingRows.length} documents</span>
                                        <span>{batchProgressPercent}%</span>
                                    </div>
                                    <Progress value={batchProgressPercent} className="h-2" />
                                </div>

                                {batchSubmissionMessage && (
                                    <p className="text-xs text-muted-foreground bg-background/60 rounded p-2 border border-border/40">
                                        {batchSubmissionMessage}
                                    </p>
                                )}

                                {!isFinished && (
                                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                                        <p className="font-semibold">⚠️ 4-Minute Timeout Rules:</p>
                                        <p className="opacity-90">
                                            Documents are monitored individually. If a file takes longer than <strong>4 minutes per document</strong> without a response from n8n, it is automatically marked as failed so you can retry or switch keys.
                                        </p>
                                    </div>
                                )}

                                {!isFinished && (
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={onStopBatch}
                                            disabled={isStoppingBatch}
                                            className="gap-1.5"
                                        >
                                            <StopCircle className="h-3.5 w-3.5" />
                                            {isStoppingBatch ? 'Stopping…' : 'Stop Batch'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )
                    })() : (
                        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-5 text-center space-y-1">
                            <CheckCircle2 className="h-6 w-6 text-success mx-auto" />
                            <p className="text-sm font-semibold text-foreground">No active batches running</p>
                            <p className="text-xs text-muted-foreground">
                                All submitted documents have finished processing.
                            </p>
                        </div>
                    )}

                    {/* Active Document Items */}
                    {activeBatchRows.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Current Batch Files ({activeBatchRows.length})
                            </h3>
                            <div className="space-y-2">
                                {activeBatchRows.map((doc) => {
                                    const statusNorm = (doc.status || '').trim().toLowerCase()
                                    const isDone = statusNorm === 'completed'
                                    const isFailed = ['failed', 'error', 'rejected'].includes(statusNorm)
                                    return (
                                        <div
                                            key={`${doc.requestID}-${doc.fileName}`}
                                            className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-xs"
                                        >
                                            <div className="space-y-0.5 min-w-0 flex-1 pr-2">
                                                <p className="font-semibold text-foreground truncate">{doc.fileName}</p>
                                                <p className="text-[11px] text-muted-foreground">{doc.documentType || 'Document'} · {doc.dealName || 'Project'}</p>
                                            </div>
                                            <Badge variant={isDone ? 'success' : isFailed ? 'destructive' : 'secondary'} className="shrink-0 text-[10px]">
                                                {formatSubmissionStatus(doc.status)}
                                            </Badge>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Failed Files / Quick Actions */}
                    {failedRows.length > 0 && (
                        <div className="space-y-2 border-t border-border pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Failed Files ({failedRows.length})
                                </h3>
                            </div>
                            <div className="space-y-2">
                                {failedRows.map((doc) => (
                                    <div
                                        key={`${doc.requestID}-${doc.fileName}`}
                                        className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-bold text-foreground">{doc.fileName}</p>
                                                <p className="text-[11px] text-muted-foreground">{doc.dealName} · {doc.errorMessage || 'Processing stalled or failed'}</p>
                                            </div>
                                            <Badge variant="destructive" className="shrink-0 text-[10px]">Failed</Badge>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 text-[11px]"
                                                disabled={retryingRequestId === doc.requestID}
                                                onClick={() => onRetryDocument(doc.requestID)}
                                            >
                                                <RefreshCw className={`mr-1 h-3 w-3 ${retryingRequestId === doc.requestID ? 'animate-spin' : ''}`} />
                                                Retry
                                            </Button>
                                            {onRequeueNewProject && (
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    className="h-7 text-[11px]"
                                                    onClick={() => {
                                                        onRequeueNewProject(doc.requestID)
                                                        onClose()
                                                    }}
                                                >
                                                    <FolderPlus className="mr-1 h-3 w-3" />
                                                    Try in new project
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div className="border-t border-border p-3 text-center bg-muted/10 text-xs text-muted-foreground">
                    Tip: Press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Ctrl</kbd> + <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Shift</kbd> + <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">B</kbd> to open this drawer anytime.
                </div>
            </aside>
        </>
    )
}
