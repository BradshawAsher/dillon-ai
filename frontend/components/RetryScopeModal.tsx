import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'
import {
    AlertTriangle,
    CheckCircle2,
    FileText,
    Files,
    Layers,
    Loader2,
    RefreshCw,
    RotateCw,
    Sparkles,
    X,
} from 'lucide-react'

export type RetryTargetDoc = {
    requestID: string
    fileName: string
    status?: string
    errorMessage?: string
    projectId?: string
    submissionBatchId?: string
}

export interface RetryScopeModalProps {
    isOpen: boolean
    onClose: () => void
    targetDoc?: RetryTargetDoc | null
    scopeType?: 'batch' | 'project'
    scopeName?: string
    totalFailedCount?: number
    failedDocNames?: string[]
    onRetrySingle: (requestID: string) => void
    onRetryAll: (scope: 'batch' | 'project') => void
    isRetrying?: boolean
}

export function getRetryModalScopeDetails(scopeType: 'batch' | 'project', totalFailedCount: number, scopeName?: string) {
    const isMultiple = totalFailedCount > 1
    const scopeLabel = scopeType === 'batch' ? 'batch' : 'project'
    const title = scopeType === 'batch' ? 'Batch Processing' : 'Project Scope'
    const promptText = isMultiple
        ? `There are ${totalFailedCount} failed documents in this ${scopeLabel}${scopeName ? ` (${scopeName})` : ''}. Would you like to retry all failed documents together, or only this specific document?`
        : 'Re-running document AI analysis will re-extract all financial statements, metrics, and risk factors. Once finished, project synthesis will automatically refresh.'
    const retryAllButtonLabel = `Yes — Retry All ${totalFailedCount} Failed Docs in this ${scopeType === 'batch' ? 'Batch' : 'Project'}`
    const retrySingleButtonLabel = 'No — Just Retry This Document'

    return { isMultiple, scopeLabel, title, promptText, retryAllButtonLabel, retrySingleButtonLabel }
}

export function RetryScopeModal({
    isOpen,
    onClose,
    targetDoc,
    scopeType = 'batch',
    scopeName,
    totalFailedCount = 1,
    failedDocNames = [],
    onRetrySingle,
    onRetryAll,
    isRetrying = false,
}: RetryScopeModalProps) {
    if (!isOpen) return null

    const hasMultipleFailed = totalFailedCount > 1
    const scopeLabel = scopeType === 'batch' ? 'batch' : 'project'
    const scopeTitle = scopeType === 'batch' ? 'Batch Processing' : 'Project Scope'

    const handleRetryAllClick = () => {
        onRetryAll(scopeType)
        onClose()
    }

    const handleRetrySingleClick = () => {
        if (targetDoc?.requestID) {
            onRetrySingle(targetDoc.requestID)
        }
        onClose()
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="retry-modal-title"
        >
            <div
                className="fixed inset-0"
                onClick={onClose}
                aria-hidden="true"
            />
            <Card className="relative z-10 w-full max-w-lg shadow-2xl border-primary/30 bg-card/95 backdrop-blur-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header with gradient badge */}
                <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                                <RefreshCw className="h-5 w-5 animate-spin-reverse-slow" />
                            </div>
                            <div>
                                <CardTitle id="retry-modal-title" className="text-base font-bold text-foreground">
                                    Retry Document Processing
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    {scopeTitle} · Choose retry scope and synthesis behavior
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="pt-4 pb-2 space-y-4">
                    {/* Targeted Document Box */}
                    {targetDoc ? (
                        <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="h-4 w-4 text-primary shrink-0" />
                                    <p className="text-xs font-bold text-foreground truncate" title={targetDoc.fileName}>
                                        {targetDoc.fileName}
                                    </p>
                                </div>
                                <Badge variant="destructive" className="text-[10px] uppercase shrink-0">
                                    {targetDoc.status || 'Failed'}
                                </Badge>
                            </div>
                            {targetDoc.errorMessage ? (
                                <p className="text-[11px] text-destructive bg-destructive/5 rounded p-2 border border-destructive/15 leading-relaxed">
                                    {targetDoc.errorMessage}
                                </p>
                            ) : null}
                        </div>
                    ) : null}

                    {/* Scope Selection Prompt */}
                    {hasMultipleFailed ? (
                        <div className="space-y-3">
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-foreground space-y-1">
                                <p className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                    Multiple failed documents detected ({totalFailedCount} total)
                                </p>
                                <p className="text-muted-foreground text-[11px] leading-relaxed">
                                    There are <strong className="text-foreground">{totalFailedCount} failed documents</strong> in this {scopeLabel}
                                    {scopeName ? ` (${scopeName})` : ''}. Would you like to retry all failed documents together, or only this specific document?
                                </p>
                                {failedDocNames.length > 0 ? (
                                    <ul className="mt-2 list-disc list-inside space-y-0.5 text-[11px] text-muted-foreground pt-1 border-t border-amber-500/20 max-h-24 overflow-y-auto">
                                        {failedDocNames.map((name, i) => (
                                            <li key={i} className="truncate">{name}</li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>

                            <div className="grid gap-2 pt-1">
                                {/* Option 1: Retry all failed in batch / project */}
                                <Button
                                    type="button"
                                    size="default"
                                    className="w-full justify-start h-auto py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs transition-all"
                                    onClick={handleRetryAllClick}
                                    disabled={isRetrying}
                                >
                                    <div className="flex items-start gap-3 text-left">
                                        <div className="p-1 rounded-md bg-white/20 text-white shrink-0 mt-0.5">
                                            <RotateCw className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold leading-tight">
                                                Yes — Retry All {totalFailedCount} Failed Docs in this {scopeType === 'batch' ? 'Batch' : 'Project'}
                                            </p>
                                            <p className="text-[10px] text-primary-foreground/80 font-normal mt-0.5">
                                                Re-processes all failed files simultaneously and automatically consolidates into project synthesis.
                                            </p>
                                        </div>
                                    </div>
                                </Button>

                                {/* Option 2: Just retry targeted document */}
                                {targetDoc ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="default"
                                        className="w-full justify-start h-auto py-2.5 px-4 font-semibold border-border hover:bg-accent transition-all text-left"
                                        onClick={handleRetrySingleClick}
                                        disabled={isRetrying}
                                    >
                                        <div className="flex items-start gap-3 text-left">
                                            <div className="p-1 rounded-md bg-muted text-muted-foreground shrink-0 mt-0.5">
                                                <FileText className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-foreground leading-tight">
                                                    No — Just Retry This Document
                                                </p>
                                                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                                                    Re-processes only "{targetDoc.fileName}".
                                                </p>
                                            </div>
                                        </div>
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Re-running document AI analysis will re-extract all financial statements, metrics, and risk factors. Once finished, project synthesis will automatically refresh.
                            </p>
                            <Button
                                type="button"
                                className="w-full gap-2 font-bold text-xs"
                                onClick={handleRetrySingleClick}
                                disabled={isRetrying}
                            >
                                {isRetrying ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>Retrying document…</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="h-4 w-4" />
                                        <span>Retry Document Now</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="pt-2 pb-3 px-6 border-t border-border/50 bg-muted/10 flex justify-end">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default RetryScopeModal
