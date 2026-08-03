import { useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, Clock3, Download, Loader2, RefreshCw, Search } from 'lucide-react'

import ExpandableInsightGroup from './ExpandableInsightGroup'
import ExpandableText from './ExpandableText'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Progress } from '../lib/shadcn/progress'
import { Switch } from '../lib/shadcn/switch'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../lib/shadcn/table'
import { cn } from '../lib/shadcn/utils'
import {
    getAiSubmissionViewModel,
    getSubmissionInsightTone,
} from '../utils/aiSubmissionData'
import { formatEasternTime } from '../utils/dateTime'
import { downloadTextFile, fileSafeName } from '../utils/downloadFile'
import { computeImpactMetrics, formatHours, HUMAN_MINUTES_PER_DOCUMENT } from '../utils/impactMetrics'
import {
    formatSubmissionStatus,
    hasAiEnrichment,
    isActiveSubmissionStatus,
    isStoppedSubmissionStatus,
    normalizeSubmissionStatus,
    type SubmissionHistoryItem,
} from '../utils/submissionHistory'

function getStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
    const normalized = normalizeSubmissionStatus(status)

    if (normalized === 'completed' || normalized === 'approved') {
        return 'success'
    }

    if (isStoppedSubmissionStatus(status)) {
        return 'secondary'
    }

    if (
        normalized === 'accepted'
        || normalized === 'queued'
        || normalized === 'processing'
        || normalized === 'submitted'
        || normalized === 'human review'
        || normalized === 'human_review'
        || normalized === 'needs review'
    ) {
        return 'warning'
    }

    if (normalized === 'error' || normalized === 'failed' || normalized === 'rejected') {
        return 'destructive'
    }

    return 'secondary'
}

function StatusIcon({ status }: { status: string }) {
    const normalized = normalizeSubmissionStatus(status)

    if (normalized === 'completed' || normalized === 'approved') {
        return <CheckCircle2 className="h-4 w-4" />
    }

    if (isActiveSubmissionStatus(status)) {
        return <Loader2 className="h-4 w-4 animate-spin" />
    }

    if (normalized === 'error' || normalized === 'failed' || normalized === 'rejected') {
        return <CircleAlert className="h-4 w-4" />
    }

    if (isStoppedSubmissionStatus(status)) {
        return <Clock3 className="h-4 w-4" />
    }

    return <Clock3 className="h-4 w-4" />
}

function getRowKey(row: SubmissionHistoryItem) {
    return `${row.id}-${row.requestID || 'missing-request-id'}-${row.receivedAt || row.createdAt || 'no-time'}`
}

type ReconciliationView = {
    status?: string
    warnings?: string[]
    metrics?: Record<string, { value?: number; actual?: number; withinTolerance?: boolean; formula?: string }>
}

function getReconciliationView(raw: string | undefined): ReconciliationView | null {
    if (!raw?.trim()) return null

    try {
        const parsed = JSON.parse(raw) as ReconciliationView
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

function formatReconciliationLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function getDisplayTimestamp(row: SubmissionHistoryItem) {
    return row.processedAt || row.processingStartedAt || row.receivedAt || row.updatedAt || row.createdAt || row.triggerTimestamp || 'Pending'
}

function getTimestampValue(value: string) {
    if (value.length === 0) {
        return 0
    }

    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
}

function getRowSortValue(row: SubmissionHistoryItem) {
    return getTimestampValue(getDisplayTimestamp(row))
}

function downloadDocumentAnalysis(row: SubmissionHistoryItem) {
    const insight = getAiSubmissionViewModel(row)
    const section = (title: string, items: string[]) => [
        '## ' + title,
        ...(items.length > 0 ? items.map((item) => '- ' + item) : ['- None recorded.']),
        '',
    ]
    const report = [
        '# ' + (row.dealName || row.companyName || row.fileName || 'Document analysis'),
        '',
        'Document: ' + (row.fileName || 'Not recorded'),
        'Project ID: ' + (row.projectId || 'Not recorded'),
        'Status: ' + formatSubmissionStatus(row.status),
        'Risk level: ' + (row.riskLevel || 'Pending'),
        'Generated: ' + new Date().toLocaleString(),
        '',
        '## AI summary',
        row.aiSummary || 'No AI summary recorded.',
        '',
        ...section('Red flags', insight.redFlags),
        ...section('Yellow flags', insight.yellowFlags),
        ...section('Green flags', insight.greenFlags),
        '## Valuation',
        'Lower: ' + (insight.formattedValuationLowerBound || 'Pending'),
        'Base: ' + (insight.formattedValuationBaseEstimate || 'Pending'),
        'Upper: ' + (insight.formattedValuationUpperBound || 'Pending'),
        '',
        '## Investment thesis',
        row.investmentBuyReasoning || 'No investment thesis recorded.',
    ].join('\n')

    downloadTextFile(fileSafeName(row.fileName || row.dealName || 'document') + '-analysis.md', report, 'text/markdown;charset=utf-8')
}

function getRowCompletenessScore(row: SubmissionHistoryItem) {
    const values = [
        row.requestID,
        row.dealName,
        row.companyName,
        row.workstream,
        row.submissionNotes,
        row.analystName,
        row.analystEmail,
        row.projectId,
        row.projectStage,
        row.documentType,
        row.fileName,
        row.fileType,
        row.triggerTimestamp,
        row.status,
        row.environment,
        row.receivedAt,
        row.processingStartedAt,
        row.processedAt,
        row.errorMessage,
        row.riskLevel,
        row.category,
        row.trafficLight,
        row.ebitdaExtracted,
        row.extractedJson,
        row.storageFileId,
        row.storageFileUrl,
        row.aiSummary,
        row.aiTargetValue,
        row.aiVariance,
        row.aiEscalationReason,
        row.aiIntent,
        row.aiCitations,
        row.aiRedFlags,
        row.aiYellowFlags,
        row.aiGreenFlags,
        row.aiConfidence,
        row.valuationLowerBound,
        row.valuationBaseEstimate,
        row.valuationUpperBound,
        row.valuationCurrency,
        row.investmentBuyReasoning,
        row.createdAt,
        row.updatedAt,
    ]

    const populatedFieldCount = values.filter((value) => value.trim().length > 0).length
    const fileSizeScore = row.fileSize > 0 ? 1 : 0
    const idScore = row.id > 0 ? 1 : 0
    const reviewScore = row.needsHumanReview ? 1 : 0

    return populatedFieldCount + fileSizeScore + idScore + reviewScore
}

function choosePreferredRow(current: SubmissionHistoryItem, candidate: SubmissionHistoryItem) {
    const currentScore = getRowCompletenessScore(current)
    const candidateScore = getRowCompletenessScore(candidate)

    if (candidateScore !== currentScore) {
        return candidateScore > currentScore ? candidate : current
    }

    return getRowSortValue(candidate) >= getRowSortValue(current) ? candidate : current
}

type EvidenceItem = {
    title: string
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    period?: string
    currency?: string
    confidence?: string | number
    status?: string
    provenance?: string
    documentUrl?: string
    documentId?: string
    formula?: string
}

type SubmissionHistoryCardProps = {
    rows: SubmissionHistoryItem[]
    loading: boolean
    error: string | null
    activeEnvironment: 'production' | 'test'
    onRefreshProduction: () => void
    onRefreshTest: () => void
    isPolling: boolean
    onRetryFailedDocument: (requestID: string) => void
    retryingRequestId: string | null
    onOpenProject?: (projectId: string) => void
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

export default function SubmissionHistoryCard({
    rows,
    loading,
    error,
    activeEnvironment,
    onRefreshProduction,
    onRefreshTest,
    isPolling,
    onRetryFailedDocument,
    retryingRequestId,
    onOpenProject,
    onOpenEvidence,
}: SubmissionHistoryCardProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStatus, setSelectedStatus] = useState('all')
    const [hideDuplicates, setHideDuplicates] = useState(true)
    const [selectedRowKey, setSelectedRowKey] = useState('')

    const sortedRows = useMemo(() => {
        return [...rows].sort((left, right) => getRowSortValue(right) - getRowSortValue(left))
    }, [rows])

    const duplicateCountsByRequestId = useMemo(() => {
        const counts = new Map<string, number>()

        sortedRows.forEach((row) => {
            const requestId = row.requestID.trim()

            if (requestId.length === 0) {
                return
            }

            counts.set(requestId, (counts.get(requestId) ?? 0) + 1)
        })

        return counts
    }, [sortedRows])

    const dedupedRows = useMemo(() => {
        const rowsByRequestId = new Map<string, SubmissionHistoryItem>()
        const rowsWithoutRequestId: SubmissionHistoryItem[] = []

        sortedRows.forEach((row) => {
            const requestId = row.requestID.trim()

            if (requestId.length === 0) {
                rowsWithoutRequestId.push(row)
                return
            }

            const existingRow = rowsByRequestId.get(requestId)

            if (!existingRow) {
                rowsByRequestId.set(requestId, row)
                return
            }

            rowsByRequestId.set(requestId, choosePreferredRow(existingRow, row))
        })

        const uniqueRows = [...rowsByRequestId.values(), ...rowsWithoutRequestId]
        return uniqueRows.sort((left, right) => getRowSortValue(right) - getRowSortValue(left))
    }, [sortedRows])

    const statusOptions = useMemo(() => {
        const nextStatuses = new Set<string>()

        sortedRows.forEach((row) => {
            const status = row.status.trim()

            if (status.length > 0) {
                nextStatuses.add(status)
            }
        })

        return ['all', ...[...nextStatuses].sort((left, right) => left.localeCompare(right))]
    }, [sortedRows])

    const baseRows = hideDuplicates ? dedupedRows : sortedRows
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const visibleRows = useMemo(() => {
        return baseRows.filter((row) => {
            const matchesStatus = selectedStatus === 'all' || row.status === selectedStatus

            if (!matchesStatus) {
                return false
            }

            if (normalizedQuery.length === 0) {
                return true
            }

            const searchableText = [
                row.requestID,
                row.dealName,
                row.companyName,
                row.workstream,
                row.fileName,
                row.analystName,
                row.analystEmail,
                row.projectId,
                row.projectStage,
                row.documentType,
                row.submissionNotes,
                row.riskLevel,
                row.category,
                row.trafficLight,
                row.ebitdaExtracted,
                row.aiSummary,
                row.aiEscalationReason,
                row.aiIntent,
                row.valuationLowerBound,
                row.valuationBaseEstimate,
                row.valuationUpperBound,
                row.valuationCurrency,
                row.investmentBuyReasoning,
            ]
                .join(' ')
                .toLowerCase()

            return searchableText.includes(normalizedQuery)
        })
    }, [baseRows, normalizedQuery, selectedStatus])

    const selectedRow = visibleRows.find((row) => getRowKey(row) === selectedRowKey) ?? visibleRows[0]
    const totalDuplicateRowsHidden = sortedRows.length - dedupedRows.length
    const activeRowCount = dedupedRows.filter((row) => isActiveSubmissionStatus(row.status)).length
    const completedRowCount = dedupedRows.filter((row) => normalizeSubmissionStatus(row.status) === 'completed').length
    const failedRowCount = dedupedRows.filter((row) => {
        const normalized = normalizeSubmissionStatus(row.status)
        return normalized === 'failed' || normalized === 'error'
    }).length

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Submission History</CardTitle>
                        <CardDescription>
                            Track asynchronous intake, AI processing, and review outcomes returned by the n8n history endpoint.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">Rows: {sortedRows.length}</Badge>
                        <Badge variant="outline">Unique requests: {dedupedRows.length}</Badge>
                        <Badge variant={activeEnvironment === 'test' ? 'warning' : 'secondary'}>
                            Viewing: {activeEnvironment}
                        </Badge>
                        {activeRowCount > 0 ? <Badge variant="warning">Active: {activeRowCount}</Badge> : null}
                        {completedRowCount > 0 ? <Badge variant="success">Completed: {completedRowCount}</Badge> : null}
                        {failedRowCount > 0 ? <Badge variant="destructive">Failed: {failedRowCount}</Badge> : null}
                        {totalDuplicateRowsHidden > 0 ? (
                            <Badge variant="warning">Potential duplicates: {totalDuplicateRowsHidden}</Badge>
                        ) : null}
                        <Button
                            type="button"
                            variant={activeEnvironment === 'production' ? 'default' : 'outline'}
                            size="sm"
                            onClick={onRefreshProduction}
                            disabled={loading}
                        >
                            {loading && activeEnvironment === 'production' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Refresh production
                        </Button>
                        <Button
                            type="button"
                            variant={activeEnvironment === 'test' ? 'default' : 'outline'}
                            size="sm"
                            onClick={onRefreshTest}
                            disabled={loading}
                        >
                            {loading && activeEnvironment === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            Refresh test
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                {error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Unable to load submission history: {error}
                    </div>
                ) : null}

                {/* Anthropic API Credit Balance & Document Failure Alert */}
                {visibleRows.some((row) => ['failed', 'error', 'rejected'].includes((row.status || '').trim().toLowerCase()) || (row.errorMessage || row.aiEscalationReason || '').toLowerCase().includes('credit') || (row.errorMessage || row.aiEscalationReason || '').toLowerCase().includes('balance')) ? (
                    <div role="alert" className="rounded-xl border-2 border-destructive/60 bg-destructive/15 p-4 text-sm text-foreground shadow-sm">
                        <div className="flex items-start gap-3">
                            <CircleAlert className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                            <div className="space-y-1.5">
                                <p className="font-bold text-destructive text-base">
                                    🔴 AI Processing Alert — Failed Document in History ({visibleRows.filter((row) => ['failed', 'error', 'rejected'].includes((row.status || '').trim().toLowerCase())).map((r) => r.fileName).filter(Boolean).join(', ') || '1 file'})
                                </p>
                                <p className="text-sm text-foreground leading-relaxed">
                                    One or more previous documents in history failed during n8n processing. Common root causes include <strong className="text-destructive font-semibold">Anthropic API credit balance exhausted</strong> (<span className="font-mono text-xs bg-destructive/20 px-1 py-0.5 rounded text-destructive border border-destructive/30">&quot;Your credit balance is too low&quot;</span>) or format issues.
                                </p>
                                <div className="text-xs text-muted-foreground mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                                    <span>👉 Recharge credits at <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noreferrer" className="underline font-semibold text-primary">console.anthropic.com/settings/billing</a></span>
                                    <span>👉 Click <strong className="text-foreground">&quot;Retry&quot;</strong> on the failed row below, or filter by status</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {isPolling ? (
                    <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-warning" />
                        Polling active submissions while n8n continues processing in the background.
                    </div>
                ) : null}

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search by request ID, company, workstream, file, status, or AI result"
                            className="pl-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium text-foreground">Hide duplicates</p>
                            <p className="text-xs text-muted-foreground">Keep the most complete row per request ID</p>
                        </div>
                        <Switch checked={hideDuplicates} onCheckedChange={setHideDuplicates} aria-label="Hide duplicate rows" />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => {
                        const isActive = selectedStatus === status
                        const label = status === 'all' ? 'All statuses' : formatSubmissionStatus(status)

                        return (
                            <Button
                                key={status}
                                type="button"
                                size="sm"
                                variant={isActive ? 'default' : 'outline'}
                                onClick={() => setSelectedStatus(status)}
                            >
                                {label}
                            </Button>
                        )
                    })}
                </div>

                {visibleRows.length === 0 && !loading ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        {sortedRows.length === 0 ? 'No submission history returned yet.' : 'No rows match the current filters.'}
                    </div>
                ) : (
                    <div className="grid gap-4 2xl:grid-cols-[minmax(0,0.9fr)_minmax(560px,1.1fr)]">
                        <div className="max-h-[1800px] overflow-auto rounded-lg border border-border">
                            <Table className="min-w-[720px]">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[180px]">Status</TableHead>
                                        <TableHead>Deal</TableHead>
                                        <TableHead>File</TableHead>
                                        <TableHead className="w-[240px]">Latest Activity</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRows.map((row) => {
                                        const title = row.dealName || row.companyName || 'Untitled submission'
                                        const detail = row.companyName || row.workstream || 'No company or workstream yet'
                                        const rowKey = getRowKey(row)
                                        const isSelected = selectedRow ? getRowKey(selectedRow) === rowKey : false
                                        const duplicateCount = duplicateCountsByRequestId.get(row.requestID) ?? 0
                                        const showDuplicateBadge = duplicateCount > 1 && row.requestID.trim().length > 0

                                        return (
                                            <TableRow
                                                key={rowKey}
                                                role="button"
                                                tabIndex={0}
                                                aria-selected={isSelected}
                                                className={cn(
                                                    'cursor-pointer border-b border-border/80 align-top',
                                                    isSelected && 'bg-accent/60 hover:bg-accent/60'
                                                )}
                                                onClick={() => setSelectedRowKey(rowKey)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        setSelectedRowKey(rowKey)
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    <div className="space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Badge variant={getStatusVariant(row.status)} className="gap-1">
                                                                <StatusIcon status={row.status} />
                                                                {formatSubmissionStatus(row.status)}
                                                            </Badge>
                                                            {showDuplicateBadge ? <Badge variant="outline">Duplicate candidate</Badge> : null}
                                                            {row.needsHumanReview ? <Badge variant="warning">Human review</Badge> : null}
                                                            {row.tableStructureStatus === 'needs_review' ? <Badge variant="warning">Table structure review</Badge> : null}
                                                        </div>
                                                        <p className="break-all font-mono text-xs text-muted-foreground">
                                                            {row.requestID || 'No request ID'}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        {row.projectId && onOpenProject ? (
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    onOpenProject(row.projectId)
                                                                }}
                                                                className="text-left font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                aria-label={`Open project ${title} in Projects`}
                                                            >
                                                                {title}
                                                            </button>
                                                        ) : <p className="font-medium text-foreground">{title}</p>}
                                                        <p className="text-xs text-muted-foreground">{detail}</p>
                                                        {row.workstream ? (
                                                            <p className="text-xs text-muted-foreground">Workstream: {row.workstream}</p>
                                                        ) : null}
                                                        {row.documentType ? (
                                                            <p className="text-xs text-muted-foreground">Document type: {row.documentType}</p>
                                                        ) : null}
                                                        {row.detectedDocumentType ? (
                                                            <p className="text-xs text-muted-foreground">AI detected: {row.detectedDocumentType}</p>
                                                        ) : null}
                                                        {row.projectId ? (
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation()
                                                                    onOpenProject?.(row.projectId)
                                                                }}
                                                                className="font-mono text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                            >
                                                                Project ID: {row.projectId}
                                                            </button>
                                                        ) : null}
                                                        {hasAiEnrichment(row) ? (
                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                {row.trafficLight ? <Badge variant="outline">{row.trafficLight}</Badge> : null}
                                                                {row.riskLevel ? <Badge variant="outline">Risk: {row.riskLevel}</Badge> : null}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1">
                                                        <p className="font-medium text-foreground">{row.fileName || 'No file name'}</p>
                                                        <p className="text-xs text-muted-foreground">{row.fileType || 'Unknown file type'}</p>
                                                        {['failed', 'error', 'rejected'].includes((row.status || '').trim().toLowerCase()) || row.errorMessage ? (
                                                            <div className="mt-1.5 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                                                                <p className="font-semibold flex items-start gap-1">
                                                                    <CircleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5 text-destructive" />
                                                                    <span>{row.errorMessage || 'Processing stalled or failed (Anthropic credit limit or format issue).'}</span>
                                                                </p>
                                                            </div>
                                                        ) : null}
                                                        {row.ebitdaExtracted ? (
                                                            <p className="text-xs text-muted-foreground">EBITDA: {row.ebitdaExtracted}</p>
                                                        ) : null}
                                                        {row.submissionNotes ? (
                                                            <ExpandableText text={row.submissionNotes} maxHeight={40} className="text-xs text-muted-foreground" />
                                                        ) : null}
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            variant="outline"
                                                            className="mt-2"
                                                            onClick={(event) => {
                                                                event.stopPropagation()
                                                                downloadDocumentAnalysis(row)
                                                            }}
                                                        >
                                                            <Download />
                                                            Download analysis
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1 text-sm text-foreground">
                                                        <p>{formatEasternTime(getDisplayTimestamp(row))}</p>
                                                        <p className="text-xs text-muted-foreground">n8n row ID: {row.id || 'Pending'}</p>
                                                        {row.environment ? (
                                                            <p className="text-xs text-muted-foreground">Environment: {row.environment}</p>
                                                        ) : null}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="rounded-lg border border-border bg-muted/20 p-4">
                            {selectedRow ? (
                                <div className="space-y-4">
                                    {(() => {
                                        const aiViewModel = getAiSubmissionViewModel(selectedRow)
                                        const reconciliation = getReconciliationView(selectedRow.reconciliationJson)
                                        const documentImpact = computeImpactMetrics([selectedRow])
                                        const isCompleted = normalizeSubmissionStatus(selectedRow.status) === 'completed'
                                        return (
                                            <>
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium text-muted-foreground">Selected request</p>
                                                        <h3 className="text-lg font-semibold text-foreground">
                                                            {selectedRow.dealName || selectedRow.companyName || 'Untitled submission'}
                                                        </h3>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {selectedRow.requestID.startsWith('mock-') ? <Badge variant="secondary">Example document output</Badge> : null}
                                                        <Button type="button" size="sm" onClick={() => downloadDocumentAnalysis(selectedRow)}>
                                                            <Download />
                                                            Download document analysis
                                                        </Button>
                                                        {['failed', 'error', 'rejected', 'needs_review', 'needs review'].includes(selectedRow.status.trim().toLowerCase()) && selectedRow.requestID ? (
                                                            <Button type="button" size="sm" variant="outline" disabled={retryingRequestId === selectedRow.requestID} onClick={() => onRetryFailedDocument(selectedRow.requestID)}>
                                                                {retryingRequestId === selectedRow.requestID ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                                Retry document
                                                            </Button>
                                                        ) : null}
                                                        <Badge variant={getStatusVariant(selectedRow.status)} className="gap-1">
                                                            <StatusIcon status={selectedRow.status} />
                                                            {formatSubmissionStatus(selectedRow.status)}
                                                        </Badge>
                                                        {selectedRow.trafficLight ? (
                                                            <Badge variant={getSubmissionInsightTone(selectedRow.trafficLight)}>
                                                                {selectedRow.trafficLight}
                                                            </Badge>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 sm:col-span-2">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Document review impact</p>
                                                        <p className="mt-1 text-sm font-semibold text-foreground">
                                                            {isCompleted ? `~${formatHours(documentImpact.timeSavedHours)} analyst time saved` : `~${HUMAN_MINUTES_PER_DOCUMENT}m estimated manual review`}
                                                        </p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {isCompleted
                                                                ? `Estimated manual review: ${HUMAN_MINUTES_PER_DOCUMENT}m · Agent runtime: ${documentImpact.agentMinutes >= 1 ? `${Math.round(documentImpact.agentMinutes)}m` : '<1m'}`
                                                                : 'This becomes a saved-time estimate after the document finishes processing.'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Request ID
                                                        </p>
                                                        <p className="mt-1 break-all font-mono text-sm text-foreground">
                                                            {selectedRow.requestID || 'Missing'}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            n8n Row ID
                                                        </p>
                                                        <p className="mt-1 font-mono text-sm text-foreground">{selectedRow.id || 'Pending'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Company
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.companyName || 'Not provided'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Project ID
                                                        </p>
                                                        <p className="mt-1 break-all font-mono text-sm text-foreground">{selectedRow.projectId || 'Not provided'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Project Stage
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.projectStage || 'Not provided'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Workstream
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.workstream || 'Not provided'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Analyst
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.analystName || 'Not provided'}</p>
                                                        {selectedRow.analystEmail ? (
                                                            <p className="mt-1 break-all text-xs text-muted-foreground">{selectedRow.analystEmail}</p>
                                                        ) : null}
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            File
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.fileName || 'Not provided'}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {selectedRow.fileType || 'Unknown type'}
                                                            {selectedRow.fileSize > 0 ? ` • ${selectedRow.fileSize.toLocaleString()} bytes` : ''}
                                                        </p>
                                                        {selectedRow.documentType ? (
                                                            <p className="mt-1 text-xs text-muted-foreground">Document type: {selectedRow.documentType}</p>
                                                        ) : null}
                                                        {selectedRow.detectedDocumentType ? (
                                                            <p className="mt-1 text-xs text-muted-foreground">AI detected: {selectedRow.detectedDocumentType}</p>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {selectedRow.tableStructureStatus === 'needs_review' ? (
                                                    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
                                                        <p className="font-medium">Table structure needs review</p>
                                                        <p className="mt-1 text-muted-foreground">{selectedRow.tableStructureIssues || 'The uploaded table could not be mapped confidently. Review the source before relying on extracted values.'}</p>
                                                    </div>
                                                ) : null}

                                                <div className="rounded-lg border border-border bg-background p-3">
                                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                        Submission Notes
                                                    </p>
                                                    <p className="mt-2 text-sm leading-6 text-foreground">
                                                        {selectedRow.submissionNotes || 'No notes captured yet.'}
                                                    </p>
                                                </div>

                                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Risk Level
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.riskLevel || 'Pending'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Category
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.category || 'Pending'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Traffic Light
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.trafficLight || 'Pending'}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            EBITDA Extracted
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{selectedRow.ebitdaExtracted ? Number(String(selectedRow.ebitdaExtracted).replace(/[$,]/g, '')).toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Pending'}</p>
                                                    </div>
                                                </div>

                                                {reconciliation ? (
                                                    <ExpandableInsightGroup
                                                        title="Deterministic math checks"
                                                        items={[]}
                                                        itemCount={Object.keys(reconciliation.metrics ?? {}).length}
                                                        className="border-border bg-background"
                                                        emptyLabel="No comparable evidence-backed facts were available for a calculation."
                                                        defaultOpen
                                                    >
                                                        <div className="space-y-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant={reconciliation.status === 'warning' ? 'destructive' : reconciliation.status === 'passed' ? 'success' : 'secondary'}>
                                                                    {reconciliation.status === 'passed' ? 'Checks passed' : reconciliation.status === 'warning' ? 'Needs review' : 'Not available'}
                                                                </Badge>
                                                                <p className="text-xs text-muted-foreground">Calculated from confirmed, period- and currency-matched document facts. Reconciliation tolerance: 2%.</p>
                                                            </div>
                                                            {Object.entries(reconciliation.metrics ?? {}).length > 0 ? (
                                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                                    {Object.entries(reconciliation.metrics ?? {}).map(([key, metric]) => (
                                                                        <button
                                                                            key={key}
                                                                            type="button"
                                                                            onClick={() => onOpenEvidence?.({
                                                                                title: `Math check: ${formatReconciliationLabel(key)}`,
                                                                                sourceFile: selectedRow.fileName || 'Uploaded document',
                                                                                sourceLocation: 'Deterministic reconciliation',
                                                                                excerpt: metric.formula ? `${formatReconciliationLabel(key)}: ${typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'} (${metric.formula})` : `${formatReconciliationLabel(key)}: ${typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}`,
                                                                                status: metric.withinTolerance === false ? 'Contradicted' : metric.withinTolerance ? 'Confirmed' : 'Calculated',
                                                                                provenance: 'Deterministic math check',
                                                                                documentId: selectedRow.storageFileId,
                                                                                documentUrl: selectedRow.storageFileUrl,
                                                                            })}
                                                                            className="rounded-lg border border-border bg-muted/30 p-3 text-left transition-colors hover:border-primary/40"
                                                                        >
                                                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{formatReconciliationLabel(key)}</p>
                                                                            <p className="mt-1 text-sm font-medium text-foreground">{typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Not available'}</p>
                                                                            {metric.formula ? <p className="mt-1 text-xs text-muted-foreground">{metric.formula}</p> : null}
                                                                            {typeof metric.withinTolerance === 'boolean' ? <p className={metric.withinTolerance ? 'mt-1 text-xs text-success' : 'mt-1 text-xs text-destructive'}>{metric.withinTolerance ? 'Within tolerance' : 'Outside tolerance'}</p> : null}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                            {reconciliation.warnings?.length ? <p className="text-sm text-destructive">{reconciliation.warnings.map(formatReconciliationLabel).join(' · ')}</p> : null}
                                                            <details className="group rounded-md border border-border bg-muted/20">
                                                                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">What are deterministic math checks?</summary>
                                                                <div className="px-3 pb-3 text-xs leading-5 text-muted-foreground space-y-2">
                                                                    <p>These checks run <strong>without AI</strong> — they are pure arithmetic verifications on the numbers the LLM extracted from your document.</p>
                                                                    <p><strong>What they check:</strong> Revenue − COGS = Gross Profit, Revenue − Operating Expenses ≈ EBITDA, Assets − Liabilities = Equity, and similar accounting identities. Each formula is checked to within a 2% tolerance.</p>
                                                                    <p><strong>Why they matter:</strong> If the LLM hallucinated or misread a number, these checks catch it immediately. A "Contradicted" result means the extracted numbers don&apos;t add up — go back to the source document and verify.</p>
                                                                    <p><strong>Limitations:</strong> Checks can only run when the document contains at least two related confirmed numbers in the same period and currency. Single-number documents or qualitative-only documents won&apos;t produce any checks.</p>
                                                                </div>
                                                            </details>
                                                        </div>
                                                    </ExpandableInsightGroup>
                                                ) : null}

                                                {(aiViewModel.summary || aiViewModel.intent || aiViewModel.targetValue || aiViewModel.variancePercentage || aiViewModel.confidencePercent !== null) ? (
                                                    <ExpandableInsightGroup
                                                        title="AI Summary"
                                                        items={[]}
                                                        itemCount={1}
                                                        className="border-border bg-background"
                                                        emptyLabel="No AI summary returned."
                                                        defaultOpen
                                                    >
                                                        <div className="space-y-3">
                                                            <div className="space-y-1">
                                                                {aiViewModel.intent ? (
                                                                    <p className="text-sm text-muted-foreground">{aiViewModel.intent}</p>
                                                                ) : null}
                                                            </div>

                                                            {aiViewModel.summary ? (
                                                                <p className="text-sm leading-6 text-foreground">{aiViewModel.summary}</p>
                                                            ) : null}

                                                            <div className="grid gap-3 sm:grid-cols-3">
                                                                <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                                        Target Value
                                                                    </p>
                                                                    <p className="mt-1 text-sm font-medium text-foreground">{aiViewModel.targetValue || 'Pending'}</p>
                                                                </div>
                                                                <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                                        Variance
                                                                    </p>
                                                                    <p className="mt-1 text-sm font-medium text-foreground">
                                                                        {aiViewModel.variancePercentage ? `${aiViewModel.variancePercentage}%` : 'Pending'}
                                                                    </p>
                                                                </div>
                                                                <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                                        Confidence
                                                                    </p>
                                                                    <p className="mt-1 text-sm font-medium text-foreground">
                                                                        {aiViewModel.confidencePercent !== null ? `${aiViewModel.confidencePercent}%` : 'Pending'}
                                                                    </p>
                                                                    {aiViewModel.confidencePercent !== null ? (
                                                                        <Progress value={aiViewModel.confidencePercent} className="mt-2 h-2" />
                                                                    ) : null}
                                                                </div>
                                                            </div>

                                                            {aiViewModel.displayMetrics.length > 0 ? (
                                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                                    {aiViewModel.displayMetrics.map((metric) => (
                                                                        <div key={metric.label} className="rounded-lg border border-border bg-muted/30 p-3">
                                                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                                                {metric.label}
                                                                            </p>
                                                                            <p className="mt-1 text-sm text-foreground">{metric.value}</p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </ExpandableInsightGroup>
                                                ) : null}

                                                {(aiViewModel.formattedValuationLowerBound || aiViewModel.formattedValuationBaseEstimate || aiViewModel.formattedValuationUpperBound) ? (
                                                    <div className="rounded-lg border border-border bg-background p-4">
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            <p className="text-sm font-semibold text-foreground">Valuation range</p>
                                                            {aiViewModel.valuationCurrency ? <Badge variant="outline">{aiViewModel.valuationCurrency}</Badge> : null}
                                                        </div>
                                                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lower bound</p>
                                                                <p className="mt-1 text-sm font-medium text-foreground">{aiViewModel.formattedValuationLowerBound || 'Pending'}</p>
                                                            </div>
                                                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base estimate</p>
                                                                <p className="mt-1 text-sm font-medium text-foreground">{aiViewModel.formattedValuationBaseEstimate || 'Pending'}</p>
                                                            </div>
                                                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upper bound</p>
                                                                <p className="mt-1 text-sm font-medium text-foreground">{aiViewModel.formattedValuationUpperBound || 'Pending'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {(aiViewModel.investmentBuyReasoning || aiViewModel.investmentIsFavorable !== null) ? (
                                                    <ExpandableInsightGroup
                                                        title="Investment thesis"
                                                        items={[]}
                                                        itemCount={1}
                                                        className="border-border bg-background"
                                                        emptyLabel="No investment thesis returned."
                                                        defaultOpen
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            {aiViewModel.investmentIsFavorable !== null ? (
                                                                <Badge variant={aiViewModel.investmentIsFavorable ? 'success' : 'destructive'}>
                                                                    {aiViewModel.investmentIsFavorable ? 'Favorable indicator' : 'Not favorable'}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                        <ExpandableText text={aiViewModel.investmentBuyReasoning || 'No buy-side reasoning returned yet.'} maxHeight={120} className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground" />
                                                    </ExpandableInsightGroup>
                                                ) : null}

                                                {aiViewModel ? (
                                                    <div className="grid gap-3">
                                                        {[
                                                            {
                                                                title: 'Red flags',
                                                                flags: aiViewModel.redFlags,
                                                                badge: 'destructive' as const,
                                                                sectionClass: 'border-destructive/30 bg-destructive/5',
                                                                itemClass: 'border-destructive/20',
                                                                status: 'Risk',
                                                            },
                                                            {
                                                                title: 'Yellow flags',
                                                                flags: aiViewModel.yellowFlags,
                                                                badge: 'warning' as const,
                                                                sectionClass: 'border-warning/30 bg-warning/5',
                                                                itemClass: 'border-warning/20',
                                                                status: 'Caution',
                                                            },
                                                            {
                                                                title: 'Green flags',
                                                                flags: aiViewModel.greenFlags,
                                                                badge: 'success' as const,
                                                                sectionClass: 'border-success/30 bg-success/5',
                                                                itemClass: 'border-success/20',
                                                                status: 'Confirmed',
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
                                                                defaultOpen={group.title === 'Red flags'}
                                                                onItemClick={onOpenEvidence ? (item) => onOpenEvidence({
                                                                    title: `${group.title.replace(' flags', ' flag')}: finding`,
                                                                    sourceFile: selectedRow.fileName || 'Uploaded document',
                                                                    sourceLocation: group.title,
                                                                    excerpt: item,
                                                                    status: group.status,
                                                                    provenance: `Document-level ${group.title.toLowerCase()} analysis`,
                                                                    documentId: selectedRow.storageFileId,
                                                                    documentUrl: selectedRow.storageFileUrl,
                                                                }) : undefined}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : null}

                                                {aiViewModel.escalationReasons.length > 0 ? (
                                                    <ExpandableInsightGroup
                                                        title={selectedRow.needsHumanReview ? 'Escalation reasons — human review required' : 'Escalation reasons'}
                                                        items={aiViewModel.escalationReasons}
                                                        badgeVariant="warning"
                                                        className="border-warning/30 bg-warning/10"
                                                        itemClassName="border-warning/30"
                                                        emptyLabel="No escalation reasons returned."
                                                        defaultOpen
                                                        onItemClick={onOpenEvidence ? (item) => onOpenEvidence({
                                                            title: 'Escalation reason',
                                                            sourceFile: selectedRow.fileName || 'Uploaded document',
                                                            sourceLocation: 'Escalation analysis',
                                                            excerpt: item,
                                                            status: 'Needs review',
                                                            provenance: 'Document-level escalation',
                                                            documentId: selectedRow.storageFileId,
                                                            documentUrl: selectedRow.storageFileUrl,
                                                        }) : undefined}
                                                    />
                                                ) : null}

                                                {selectedRow.errorMessage ? (
                                                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                                                        {selectedRow.errorMessage}
                                                    </div>
                                                ) : null}

                                                {aiViewModel.citations.length > 0 ? (
                                                    <ExpandableInsightGroup
                                                        title="Citations"
                                                        items={[]}
                                                        itemCount={aiViewModel.citations.length}
                                                        className="border-border bg-background"
                                                        emptyLabel="No citations returned."
                                                        defaultOpen
                                                    >
                                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                                            {aiViewModel.citations.map((citation, index) => (
                                                                <button
                                                                    key={`${citation.sourceFile}-${citation.rowOrCell}-${index}`}
                                                                    type="button"
                                                                    onClick={() => onOpenEvidence?.({
                                                                        title: 'Document citation',
                                                                        sourceFile: citation.sourceFile || selectedRow.fileName || 'Uploaded document',
                                                                        sourceLocation: citation.rowOrCell || 'Document analysis',
                                                                        excerpt: citation.rowOrCell ? `Source: ${citation.sourceFile || selectedRow.fileName} · ${citation.rowOrCell}` : undefined,
                                                                        status: 'Confirmed',
                                                                        provenance: 'Document-level citation',
                                                                        documentId: selectedRow.storageFileId,
                                                                        documentUrl: selectedRow.storageFileUrl,
                                                                    })}
                                                                    className="rounded-lg border border-border bg-muted/30 p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
                                                                >
                                                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                                        Source file
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-foreground">{citation.sourceFile || 'Unknown source'}</p>
                                                                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                                        Row or cell
                                                                    </p>
                                                                    <p className="mt-1 text-sm text-foreground">{citation.rowOrCell || 'Not provided'}</p>
                                                                    <p className="mt-2 text-xs font-medium text-primary">View evidence</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </ExpandableInsightGroup>
                                                ) : null}

                                                {(selectedRow.storageFileId || selectedRow.storageFileUrl) ? (
                                                    <div className="grid gap-3 sm:grid-cols-2">
                                                        <div className="rounded-lg border border-border bg-background p-3">
                                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                                Storage File ID
                                                            </p>
                                                            <p className="mt-1 break-all font-mono text-sm text-foreground">
                                                                {selectedRow.storageFileId || 'Pending'}
                                                            </p>
                                                        </div>
                                                        <div className="rounded-lg border border-border bg-background p-3">
                                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                                Storage URL
                                                            </p>
                                                            <p className="mt-1 break-all text-sm text-foreground">
                                                                {selectedRow.storageFileUrl || 'Pending'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                {selectedRow.extractedJson ? (
                                                    <ExpandableInsightGroup
                                                        title="Extracted JSON"
                                                        items={[]}
                                                        itemCount={1}
                                                        className="border-border bg-background"
                                                        emptyLabel="No extracted JSON returned."
                                                    >
                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                            {aiViewModel.extractedObject ? <Badge variant="outline">Parsed</Badge> : <Badge variant="secondary">Raw</Badge>}
                                                        </div>
                                                        <pre className="mt-2 max-h-[220px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-xs text-foreground">
                                                            {selectedRow.extractedJson}
                                                        </pre>
                                                    </ExpandableInsightGroup>
                                                ) : null}

                                                <div className="grid gap-3 sm:grid-cols-3">
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Received At
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{formatEasternTime(selectedRow.receivedAt)}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Processing Started
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{formatEasternTime(selectedRow.processingStartedAt)}</p>
                                                    </div>
                                                    <div className="rounded-lg border border-border bg-background p-3">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            Processed At
                                                        </p>
                                                        <p className="mt-1 text-sm text-foreground">{formatEasternTime(selectedRow.processedAt)}</p>
                                                    </div>
                                                </div>
                                            </>
                                        )
                                    })()}
                                </div>
                            ) : (
                                <div className="flex h-full min-h-[220px] items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 text-center text-sm text-muted-foreground">
                                    Select a history row to inspect its async status and extracted results.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
