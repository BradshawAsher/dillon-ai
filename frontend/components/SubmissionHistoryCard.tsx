import { useMemo, useState } from 'react'
import { CheckCircle2, CircleAlert, Clock3, Loader2, RefreshCw, Search } from 'lucide-react'

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
import {
  formatSubmissionStatus,
  hasAiEnrichment,
  isActiveSubmissionStatus,
  normalizeSubmissionStatus,
  type SubmissionHistoryItem,
} from '../utils/submissionHistory'

function getStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
  const normalized = normalizeSubmissionStatus(status)

  if (normalized === 'completed' || normalized === 'approved') {
    return 'success'
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

  return <Clock3 className="h-4 w-4" />
}

function getRowKey(row: SubmissionHistoryItem) {
  return `${row.id}-${row.requestID || 'missing-request-id'}-${row.receivedAt || row.createdAt || 'no-time'}`
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

function getDigestibleHighlights(text: string) {
  const sentences = text.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [text]
  return sentences.map((sentence) => sentence.trim()).filter(Boolean).slice(0, 4)
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

type SubmissionHistoryCardProps = {
  rows: SubmissionHistoryItem[]
  loading: boolean
  error: string | null
  activeEnvironment: 'production' | 'test'
  onRefreshProduction: () => void
  onRefreshTest: () => void
  isPolling: boolean
}

export default function SubmissionHistoryCard({
  rows,
  loading,
  error,
  activeEnvironment,
  onRefreshProduction,
  onRefreshTest,
  isPolling,
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
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
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
                            </div>
                            <p className="break-all font-mono text-xs text-muted-foreground">
                              {row.requestID || 'No request ID'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium text-foreground">{title}</p>
                            <p className="text-xs text-muted-foreground">{detail}</p>
                            {row.workstream ? (
                              <p className="text-xs text-muted-foreground">Workstream: {row.workstream}</p>
                            ) : null}
                            {row.documentType ? (
                              <p className="text-xs text-muted-foreground">Document type: {row.documentType}</p>
                            ) : null}
                            {row.projectId ? (
                              <p className="font-mono text-xs text-muted-foreground">Project ID: {row.projectId}</p>
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
                            {row.ebitdaExtracted ? (
                              <p className="text-xs text-muted-foreground">EBITDA: {row.ebitdaExtracted}</p>
                            ) : null}
                            {row.submissionNotes ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{row.submissionNotes}</p>
                            ) : null}
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
                    const investmentHighlights = getDigestibleHighlights(aiViewModel.investmentBuyReasoning)

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
                          </div>
                        </div>

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
                            <p className="mt-1 text-sm text-foreground">{selectedRow.ebitdaExtracted || 'Pending'}</p>
                          </div>
                        </div>

                        {(aiViewModel.summary || aiViewModel.intent || aiViewModel.targetValue || aiViewModel.variancePercentage || aiViewModel.confidencePercent !== null) ? (
                          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                            <div className="space-y-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                AI Summary
                              </p>
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
                          <div className="rounded-lg border border-border bg-background p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">Investment thesis</p>
                              {aiViewModel.investmentIsFavorable !== null ? (
                                <Badge variant={aiViewModel.investmentIsFavorable ? 'success' : 'destructive'}>
                                  {aiViewModel.investmentIsFavorable ? 'Favorable indicator' : 'Not favorable'}
                                </Badge>
                              ) : null}
                            </div>
                            {investmentHighlights.length > 0 ? (
                              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                {investmentHighlights.map((highlight, index) => (
                                  <div key={highlight} className="rounded-md border border-border bg-muted/30 p-3">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                      Thesis point {index + 1}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-foreground">{highlight}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-3 text-sm leading-6 text-foreground">No buy-side reasoning returned yet.</p>
                            )}
                            {investmentHighlights.length > 1 ? (
                              <details className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                                <summary className="cursor-pointer font-medium text-foreground">Read full investment thesis</summary>
                                <p className="mt-2 leading-6 text-muted-foreground">{aiViewModel.investmentBuyReasoning}</p>
                              </details>
                            ) : null}
                          </div>
                        ) : null}

                        {(aiViewModel.redFlags.length > 0 || aiViewModel.yellowFlags.length > 0 || aiViewModel.greenFlags.length > 0) ? (
                          <div className="grid gap-3">
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">Red flags</p>
                                <Badge variant="destructive">{aiViewModel.redFlags.length}</Badge>
                              </div>
                              {aiViewModel.redFlags.length > 0 ? (
                                <ul className="mt-3 space-y-2 text-sm text-foreground">
                                  {aiViewModel.redFlags.map((flag) => (
                                    <li key={flag} className="rounded-md bg-background/80 px-3 py-2 leading-6">
                                      {flag}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-3 text-sm text-muted-foreground">No red flags returned.</p>
                              )}
                            </div>

                            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">Yellow flags</p>
                                <Badge variant="warning">{aiViewModel.yellowFlags.length}</Badge>
                              </div>
                              {aiViewModel.yellowFlags.length > 0 ? (
                                <ul className="mt-3 space-y-2 text-sm text-foreground">
                                  {aiViewModel.yellowFlags.map((flag) => (
                                    <li key={flag} className="rounded-md bg-background/80 px-3 py-2 leading-6">
                                      {flag}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-3 text-sm text-muted-foreground">No yellow flags returned.</p>
                              )}
                            </div>

                            <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">Green flags</p>
                                <Badge variant="success">{aiViewModel.greenFlags.length}</Badge>
                              </div>
                              {aiViewModel.greenFlags.length > 0 ? (
                                <ul className="mt-3 space-y-2 text-sm text-foreground">
                                  {aiViewModel.greenFlags.map((flag) => (
                                    <li key={flag} className="rounded-md bg-background/80 px-3 py-2 leading-6">
                                      {flag}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-3 text-sm text-muted-foreground">No green flags returned.</p>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {aiViewModel.escalationReasons.length > 0 ? (
                          <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                            <p className="font-medium">
                              {selectedRow.needsHumanReview ? 'This request is marked for human-in-the-loop review.' : 'Escalation analysis'}
                            </p>
                            <div className="mt-3 space-y-2">
                              <p className="font-medium">Escalation reasons</p>
                              <ul className="space-y-2">
                                {aiViewModel.escalationReasons.map((reason, index) => (
                                  <li key={`${reason}-${index}`} className="rounded-md border border-warning/30 bg-background/80 p-3 leading-6">
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : null}

                        {selectedRow.errorMessage ? (
                          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                            {selectedRow.errorMessage}
                          </div>
                        ) : null}

                        {aiViewModel.citations.length > 0 ? (
                          <div className="rounded-lg border border-border bg-background p-4">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">Citations</p>
                              <Badge variant="outline">{aiViewModel.citations.length}</Badge>
                            </div>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {aiViewModel.citations.map((citation, index) => (
                                <div key={`${citation.sourceFile}-${citation.rowOrCell}-${index}`} className="rounded-lg border border-border bg-muted/30 p-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Source file
                                  </p>
                                  <p className="mt-1 text-sm text-foreground">{citation.sourceFile || 'Unknown source'}</p>
                                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Row or cell
                                  </p>
                                  <p className="mt-1 text-sm text-foreground">{citation.rowOrCell || 'Not provided'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
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
                          <div className="rounded-lg border border-border bg-background p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Extracted JSON
                              </p>
                              {aiViewModel.extractedObject ? <Badge variant="outline">Parsed</Badge> : <Badge variant="secondary">Raw</Badge>}
                            </div>
                            <pre className="mt-2 max-h-[220px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-xs text-foreground">
                              {selectedRow.extractedJson}
                            </pre>
                          </div>
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
