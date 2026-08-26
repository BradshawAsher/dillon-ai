import React from 'react'
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    DollarSign,
    FileCheck,
    FileSpreadsheet,
    FileText,
    Loader2,
    RefreshCw,
    RotateCw,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
} from 'lucide-react'

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

function getRiskSignalCardStyle(trafficLight: string, riskLevel: string) {
    const raw = (trafficLight || riskLevel || '').trim().toLowerCase()
    if (['red', 'high', 'critical', 'escalate', 'reject'].includes(raw)) {
        return {
            containerClass: 'border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/30 dark:border-rose-800/60 shadow-xs',
            labelClass: 'text-rose-700 dark:text-rose-400 font-bold',
            textClass: 'text-rose-700 dark:text-rose-300 font-black',
            iconBoxClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
            badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/50',
            icon: 'alert-triangle' as const,
            label: 'Risk signal',
        }
    }
    if (['yellow', 'medium', 'warning', 'caution', 'moderate'].includes(raw)) {
        return {
            containerClass: 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 dark:border-amber-800/60 shadow-xs',
            labelClass: 'text-amber-700 dark:text-amber-400 font-bold',
            textClass: 'text-amber-700 dark:text-amber-300 font-black',
            iconBoxClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
            badgeClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/50',
            icon: 'alert-circle' as const,
            label: 'Risk signal',
        }
    }
    if (['green', 'low', 'safe', 'approved', 'pass'].includes(raw)) {
        return {
            containerClass: 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 dark:border-emerald-800/60 shadow-xs',
            labelClass: 'text-emerald-700 dark:text-emerald-400 font-bold',
            textClass: 'text-emerald-700 dark:text-emerald-300 font-black',
            iconBoxClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/50',
            icon: 'check-circle' as const,
            label: 'Risk signal',
        }
    }
    return {
        containerClass: 'border-sky-500/30 bg-sky-500/5 dark:bg-sky-950/20 dark:border-sky-800/40 shadow-xs',
        labelClass: 'text-sky-700 dark:text-sky-400 font-bold',
        textClass: 'text-sky-700 dark:text-sky-300 font-bold',
        iconBoxClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
        badgeClass: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/50',
        icon: 'loader' as const,
        label: 'Risk signal',
    }
}

function getConfidenceCardStyle(confidenceFraction: number | null) {
    if (typeof confidenceFraction === 'number' && Number.isFinite(confidenceFraction)) {
        if (confidenceFraction >= 0.8) {
            return {
                containerClass: 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 dark:border-emerald-800/60 shadow-xs',
                labelClass: 'text-emerald-700 dark:text-emerald-400 font-bold',
                textClass: 'text-emerald-700 dark:text-emerald-300 font-black',
                iconBoxClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                tierBadge: 'High',
                tierClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40',
            }
        }
        if (confidenceFraction >= 0.6) {
            return {
                containerClass: 'border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/30 dark:border-amber-800/60 shadow-xs',
                labelClass: 'text-amber-700 dark:text-amber-400 font-bold',
                textClass: 'text-amber-700 dark:text-amber-300 font-black',
                iconBoxClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
                tierBadge: 'Moderate',
                tierClass: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40',
            }
        }
        return {
            containerClass: 'border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/30 dark:border-rose-800/60 shadow-xs',
            labelClass: 'text-rose-700 dark:text-rose-400 font-bold',
            textClass: 'text-rose-700 dark:text-rose-300 font-black',
            iconBoxClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
            tierBadge: 'Low',
            tierClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/40',
        }
    }
    return {
        containerClass: 'border-primary/25 bg-background/90 text-foreground',
        labelClass: 'text-muted-foreground',
        textClass: 'text-foreground font-bold',
        iconBoxClass: 'bg-muted text-muted-foreground',
        tierBadge: '',
        tierClass: 'bg-muted text-muted-foreground',
    }
}

function getDocTypeCardStyle(docType: string) {
    const raw = (docType || '').toLowerCase()
    const isSpreadsheet = raw.includes('sheet') || raw.includes('excel') || raw.includes('model') || raw.includes('csv') || raw.includes('xltx') || raw.includes('xlsx')
    const isTaxOrLegal = raw.includes('tax') || raw.includes('legal') || raw.includes('contract') || raw.includes('loi') || raw.includes('agreement')
    const isPending = !docType || raw === 'pending' || raw === 'not set' || raw === 'auto-detect'

    if (isPending) {
        return {
            containerClass: 'border-primary/25 bg-background/90 text-foreground',
            labelClass: 'text-muted-foreground',
            textClass: 'text-foreground font-bold',
            iconBoxClass: 'bg-muted text-muted-foreground',
            icon: 'file-text' as const,
        }
    }
    return {
        containerClass: 'border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-950/30 dark:border-indigo-800/60 shadow-xs hover:border-indigo-500/60 transition-all',
        labelClass: 'text-indigo-700 dark:text-indigo-400 font-bold',
        textClass: 'text-indigo-900 dark:text-indigo-200 font-black',
        iconBoxClass: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
        icon: isSpreadsheet ? ('file-spreadsheet' as const) : isTaxOrLegal ? ('file-check' as const) : ('file-text' as const),
    }
}

function getActionNeededCardStyle(hasEscalations: boolean, status: string) {
    const norm = (status || '').trim().toLowerCase()
    if (hasEscalations || ['error', 'failed', 'rejected', 'human review', 'needs review'].includes(norm)) {
        return {
            actionText: hasEscalations ? 'Review flags' : norm === 'failed' || norm === 'error' ? 'Retry document' : 'Review required',
            containerClass: 'border-rose-500/40 bg-rose-500/10 dark:bg-rose-950/30 dark:border-rose-800/60 shadow-xs',
            labelClass: 'text-rose-700 dark:text-rose-400 font-bold',
            textClass: 'text-rose-700 dark:text-rose-300 font-black',
            iconBoxClass: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
            badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-400/40',
            icon: 'shield-alert' as const,
        }
    }
    if (norm === 'completed' || norm === 'approved') {
        return {
            actionText: 'Ready to use',
            containerClass: 'border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 dark:border-emerald-800/60 shadow-xs',
            labelClass: 'text-emerald-700 dark:text-emerald-400 font-bold',
            textClass: 'text-emerald-700 dark:text-emerald-300 font-black',
            iconBoxClass: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            badgeClass: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-400/40',
            icon: 'shield-check' as const,
        }
    }
    return {
        actionText: 'Wait for analysis',
        containerClass: 'border-sky-500/40 bg-sky-500/10 dark:bg-sky-950/30 dark:border-sky-800/60 shadow-xs',
        labelClass: 'text-sky-700 dark:text-sky-400 font-bold',
        textClass: 'text-sky-700 dark:text-sky-300 font-black',
        iconBoxClass: 'bg-sky-500/20 text-sky-600 dark:text-sky-400',
        badgeClass: 'bg-sky-500/20 text-sky-700 dark:text-sky-300 border-sky-400/40',
        icon: 'loader' as const,
    }
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
    handleRerunLatestBatch?: () => void
    handleRerunAllProjectDocs?: () => void
    handleRunSynthesis?: () => void
    isRerunningBatch?: boolean
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
    handleRerunLatestBatch,
    handleRerunAllProjectDocs,
    handleRunSynthesis,
    isRerunningBatch = false,
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

    const docConfidenceFraction = typeof liveSubmitInsight?.confidencePercent === 'number' && Number.isFinite(liveSubmitInsight.confidencePercent)
        ? liveSubmitInsight.confidencePercent / 100
        : (() => {
            if (!confidence) return null
            const clean = String(confidence).trim().replace('%', '')
            const parsed = Number(clean)
            if (!Number.isFinite(parsed)) return null
            return parsed > 1 ? parsed / 100 : parsed
        })()

    const summaryItems = React.useMemo(() => splitReadableText(aiSummary), [aiSummary])
    const summaryFindings = React.useMemo(() => summaryItems.map((text) => ({
        text,
        confidence: docConfidenceFraction,
        severity: 'info',
        impact: 'Informational',
        status: 'Synthesized',
    })), [summaryItems, docConfidenceFraction])

    const escalationItems = React.useMemo(
        () => (liveSubmitInsight?.escalationReasons || []).flatMap((reason) => splitReadableText(reason)),
        [liveSubmitInsight?.escalationReasons],
    )
    const escalationFindings = React.useMemo(() => escalationItems.map((text) => ({
        text,
        confidence: docConfidenceFraction,
        severity: 'warning',
        impact: 'Requires Review',
        status: 'Needs review',
    })), [escalationItems, docConfidenceFraction])

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
                        {displayedSubmissionRow?.requestID && handleRetryFailedDocument ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs font-semibold"
                                disabled={retryingRequestId === displayedSubmissionRow.requestID}
                                onClick={() => handleRetryFailedDocument(displayedSubmissionRow.requestID)}
                            >
                                {retryingRequestId === displayedSubmissionRow.requestID ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        <span>Re-running doc…</span>
                                    </>
                                ) : (
                                    <>
                                        <RotateCw className="h-3.5 w-3.5" />
                                        <span>Re-run this document</span>
                                    </>
                                )}
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
                        <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/30">
                            {displayedSubmissionRow?.modelUsed || 'OpenAI 5.6 Terra'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs hover:shadow-md transition-all cursor-pointer border border-emerald-500/30"
                        onClick={() => handleOpenProjectSynthesis(displayedSubmissionRow?.projectId || projectId)}
                        disabled={!(displayedSubmissionRow?.projectId || projectId)}
                    >
                        <Sparkles className="h-4 w-4" />
                        <span>View this project&apos;s synthesis</span>
                    </Button>
                    {handleRunSynthesis ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 font-bold"
                            onClick={handleRunSynthesis}
                            disabled={isCurrentProjectAwaitingSynthesis}
                        >
                            {isCurrentProjectAwaitingSynthesis ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    <span>Synthesizing project…</span>
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 text-primary" />
                                    <span>Re-run synthesis</span>
                                </>
                            )}
                        </Button>
                    ) : null}
                    {handleRerunLatestBatch && latestBatchRows.length > 0 ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 font-bold"
                            onClick={handleRerunLatestBatch}
                            disabled={isRerunningBatch}
                        >
                            {isRerunningBatch ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Re-running batch…</span>
                                </>
                            ) : (
                                <>
                                    <RotateCw className="h-4 w-4" />
                                    <span>Re-run latest batch ({latestBatchRows.length})</span>
                                </>
                            )}
                        </Button>
                    ) : null}
                    {handleRerunAllProjectDocs && (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 font-bold"
                            onClick={handleRerunAllProjectDocs}
                        >
                            <RefreshCw className="h-4 w-4" />
                            <span>Re-run all docs in project</span>
                        </Button>
                    )}
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

                    {(() => {
                        const riskCardStyle = getRiskSignalCardStyle(trafficLight, riskLevel)
                        const confCardStyle = getConfidenceCardStyle(docConfidenceFraction)
                        const detectedDocType = displayedSubmissionRow?.detectedDocumentType || displayedSubmissionRow?.documentType || documentType || 'Pending'
                        const docTypeCardStyle = getDocTypeCardStyle(detectedDocType)
                        const hasEscalations = Boolean(liveSubmitInsight?.escalationReasons && liveSubmitInsight.escalationReasons.length > 0)
                        const actionCardStyle = getActionNeededCardStyle(hasEscalations, displayedSubmitStatus)

                        return (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                {/* 1. Risk Signal */}
                                <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${riskCardStyle.containerClass}`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className={`text-xs ${riskCardStyle.labelClass}`}>{riskCardStyle.label}</span>
                                        <div className={`rounded-lg p-1.5 ${riskCardStyle.iconBoxClass}`}>
                                            {riskCardStyle.icon === 'alert-triangle' ? (
                                                <AlertTriangle className="h-4 w-4" />
                                            ) : riskCardStyle.icon === 'alert-circle' ? (
                                                <AlertCircle className="h-4 w-4" />
                                            ) : riskCardStyle.icon === 'check-circle' ? (
                                                <CheckCircle2 className="h-4 w-4" />
                                            ) : (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                        </div>
                                    </div>
                                    <p className={`mt-2 text-lg leading-tight tracking-tight ${riskCardStyle.textClass}`}>
                                        {trafficLight || riskLevel || 'Still processing'}
                                    </p>
                                </div>

                                {/* 2. AI Confidence */}
                                <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${confCardStyle.containerClass}`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className={`text-xs ${confCardStyle.labelClass}`}>AI confidence</span>
                                        <div className="flex items-center gap-1.5">
                                            {confCardStyle.tierBadge ? (
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${confCardStyle.tierClass}`}>
                                                    {confCardStyle.tierBadge}
                                                </span>
                                            ) : null}
                                            <div className={`rounded-lg p-1.5 ${confCardStyle.iconBoxClass}`}>
                                                <Sparkles className="h-4 w-4" />
                                            </div>
                                        </div>
                                    </div>
                                    <p className={`mt-2 text-lg leading-tight tracking-tight ${confCardStyle.textClass}`}>
                                        {formattedConfidence}
                                    </p>
                                </div>

                                {/* 3. Detected Document Type */}
                                <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${docTypeCardStyle.containerClass}`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className={`text-xs ${docTypeCardStyle.labelClass}`}>Detected document type</span>
                                        <div className={`rounded-lg p-1.5 ${docTypeCardStyle.iconBoxClass}`}>
                                            {docTypeCardStyle.icon === 'file-spreadsheet' ? (
                                                <FileSpreadsheet className="h-4 w-4" />
                                            ) : docTypeCardStyle.icon === 'file-check' ? (
                                                <FileCheck className="h-4 w-4" />
                                            ) : (
                                                <FileText className="h-4 w-4" />
                                            )}
                                        </div>
                                    </div>
                                    <p className={`mt-2 text-sm sm:text-base font-bold leading-snug break-words ${docTypeCardStyle.textClass}`} title={detectedDocType}>
                                        {detectedDocType}
                                    </p>
                                </div>

                                {/* 4. Extraction Cost */}
                                <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 dark:border-emerald-800/60 p-3 shadow-xs flex flex-col justify-between transition-all duration-200">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">Extraction Cost</span>
                                        <div className="rounded-lg p-1.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                            <DollarSign className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-lg font-bold text-emerald-700 dark:text-emerald-300 font-mono leading-tight">
                                        {formatDocumentCostDisplay(displayedSubmissionRow).formatted}
                                    </p>
                                </div>

                                {/* 5. Action Needed */}
                                <div className={`rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${actionCardStyle.containerClass}`}>
                                    <div className="flex items-center justify-between gap-1.5">
                                        <span className={`text-xs ${actionCardStyle.labelClass}`}>Action needed</span>
                                        <div className={`rounded-lg p-1.5 ${actionCardStyle.iconBoxClass}`}>
                                            {actionCardStyle.icon === 'shield-alert' ? (
                                                <ShieldAlert className="h-4 w-4" />
                                            ) : actionCardStyle.icon === 'shield-check' ? (
                                                <ShieldCheck className="h-4 w-4" />
                                            ) : (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                        </div>
                                    </div>
                                    <p className={`mt-2 text-lg leading-tight tracking-tight ${actionCardStyle.textClass}`}>
                                        {actionCardStyle.actionText}
                                    </p>
                                </div>
                            </div>
                        )
                    })()}

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
                            <div className="mt-1">
                                {riskLevel ? (
                                    <Badge variant={getSubmissionInsightTone(trafficLight || riskLevel)}>
                                        {riskLevel}
                                    </Badge>
                                ) : (
                                    <span className="text-muted-foreground">Pending</span>
                                )}
                            </div>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Category</p>
                            <p className="mt-1 font-semibold text-indigo-700 dark:text-indigo-300">{displayedSubmitCategory || 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Confidence</p>
                            <p className="mt-1 font-bold text-foreground">
                                {formattedConfidence}
                            </p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Variance</p>
                            <p className="mt-1 text-foreground">{displayedSubmitVariance ? `${displayedSubmitVariance}%` : 'Pending'}</p>
                        </div>
                        <div className="rounded-md border border-border bg-card px-3 py-2">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">EBITDA Extracted</p>
                            <p className="mt-1 font-mono font-semibold text-foreground">{displayedSubmissionRow.ebitdaExtracted || 'Pending'}</p>
                        </div>
                        {(escalationItems.length > 0 || summaryItems.length > 0) ? (
                            <div className="grid gap-3 xl:col-span-4 xl:grid-cols-2">
                                {escalationItems.length > 0 ? (
                                    <div>
                                        <ExpandableInsightGroup
                                            title="Escalation reasons"
                                            items={escalationItems}
                                            findings={escalationFindings}
                                            badgeVariant="warning"
                                            className="border-warning/30 bg-warning/10"
                                            itemClassName="border-warning/30"
                                            emptyLabel="No escalation reasons returned."
                                            defaultOpen
                                            onItemClick={(item, index) => {
                                                if (setActiveEvidence) {
                                                    const finding = escalationFindings[index]
                                                    setActiveEvidence({
                                                        title: 'Escalation reason',
                                                        sourceFile: displayedSubmissionRow?.fileName || 'Uploaded document',
                                                        sourceLocation: 'Escalation analysis',
                                                        excerpt: item,
                                                        confidence: finding?.confidence ?? docConfidenceFraction ?? undefined,
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
                                {summaryItems.length > 0 ? (
                                    <div id="latest-doc-ai-summary" className="scroll-mt-6">
                                        <ExpandableInsightGroup
                                            title="AI Summary"
                                            items={summaryItems}
                                            findings={summaryFindings}
                                            defaultOpen
                                            className="border-border bg-card"
                                            itemClassName="border-border"
                                            emptyLabel="No AI summary returned."
                                            onItemClick={(item, index) => {
                                                if (setActiveEvidence) {
                                                    const finding = summaryFindings[index]
                                                    setActiveEvidence({
                                                        title: 'AI Summary finding',
                                                        sourceFile: displayedSubmissionRow?.fileName || 'Uploaded document',
                                                        sourceLocation: 'AI document summary',
                                                        excerpt: item,
                                                        confidence: finding?.confidence ?? docConfidenceFraction ?? undefined,
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
                            <div id="diligence-document-flags" data-document-flags="true" className="scroll-mt-6 grid gap-3 xl:col-span-4 xl:grid-cols-2">
                                {[
                                    {
                                        title: 'Red flags',
                                        flags: liveSubmitInsight.redFlags,
                                        findings: liveSubmitInsight.structuredFindings?.redFlags,
                                        badge: 'destructive' as const,
                                        sectionClass: 'border-destructive/30 bg-destructive/5',
                                        itemClass: 'border-destructive/20',
                                        id: 'diligence-red-flags',
                                    },
                                    {
                                        title: 'Yellow flags',
                                        flags: liveSubmitInsight.yellowFlags,
                                        findings: liveSubmitInsight.structuredFindings?.yellowFlags,
                                        badge: 'warning' as const,
                                        sectionClass: 'border-warning/30 bg-warning/5',
                                        itemClass: 'border-warning/20',
                                        id: 'diligence-yellow-flags',
                                    },
                                    {
                                        title: 'Green flags',
                                        flags: liveSubmitInsight.greenFlags,
                                        findings: liveSubmitInsight.structuredFindings?.greenFlags,
                                        badge: 'success' as const,
                                        sectionClass: 'border-success/30 bg-success/5',
                                        itemClass: 'border-success/20',
                                        id: 'diligence-green-flags',
                                    },
                                ].map((group) => (
                                    <div key={group.title} id={group.id} className="scroll-mt-6">
                                        <ExpandableInsightGroup
                                            title={group.title}
                                            items={group.flags}
                                            findings={group.findings}
                                            badgeVariant={group.badge}
                                            className={group.sectionClass}
                                            itemClassName={group.itemClass}
                                            emptyLabel="None"
                                            defaultOpen
                                            onItemClick={(item, index) => {
                                                if (setActiveEvidence) {
                                                    const finding = group.findings?.[index]
                                                    const firstCitation = finding?.citations?.[0]
                                                    setActiveEvidence({
                                                        title: `${group.title.replace(' flags', ' flag')}: finding`,
                                                        sourceFile: firstCitation?.sourceFile || displayedSubmissionRow?.fileName || 'Uploaded document',
                                                        sourceLocation: firstCitation?.rowOrCell || group.title,
                                                        excerpt: item,
                                                        confidence: finding?.confidence ?? undefined,
                                                        status: group.badge === 'destructive' ? 'Risk' : group.badge === 'warning' ? 'Caution' : 'Confirmed',
                                                        provenance: `Document-level ${group.title.toLowerCase()} analysis`,
                                                        documentId: displayedSubmissionRow?.storageFileId,
                                                        documentUrl: displayedSubmissionRow?.storageFileUrl,
                                                    })
                                                }
                                            }}
                                        />
                                    </div>
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
                    <Button
                        type="button"
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs hover:shadow-md transition-all cursor-pointer border border-emerald-500/30"
                        onClick={() => handleOpenProjectSynthesis(displayedSubmissionRow?.projectId || projectId)}
                        disabled={!(displayedSubmissionRow?.projectId || projectId)}
                    >
                        <Sparkles className="h-4 w-4" />
                        <span>View this project&apos;s synthesis</span>
                        {activeProjectSynthesis ? (
                            <Badge variant="secondary" className="ml-1.5 bg-white/20 text-white hover:bg-white/30 border-white/30 text-[10px]">
                                Ready
                            </Badge>
                        ) : isCurrentProjectAwaitingSynthesis ? (
                            <Badge variant="warning" className="ml-1.5 text-[10px]">
                                Running
                            </Badge>
                        ) : null}
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
