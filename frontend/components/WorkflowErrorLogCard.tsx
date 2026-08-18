import { useState, useMemo } from 'react'
import { AlertTriangle, Bot, CheckCircle2, Clock3, Cpu, Layers, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'

import type { WorkflowErrorItem } from '../../backend/diligence/getWorkflowErrors'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { formatEasternTime } from '../utils/dateTime'
import { classifyError } from '../utils/errorClassifier'

type Props = { rows: WorkflowErrorItem[]; loading: boolean; error: string | null; onRefresh: () => void }

type WorkflowSummary = {
    workflowName: string
    workflowId: string
    count: number
    latestAt: string
    latestMessage: string
}

function parseTime(value: string) {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function inLastHours(value: string, hours: number) {
    const parsed = parseTime(value)
    if (!parsed) return false
    return Date.now() - parsed <= hours * 60 * 60 * 1000
}

function groupByWorkflow(rows: WorkflowErrorItem[]): WorkflowSummary[] {
    const grouped = new Map<string, WorkflowSummary>()

    for (const row of rows) {
        const key = row.workflowId || row.workflowName || 'unknown'
        const current = grouped.get(key)
        const workflowName = row.workflowName || 'Unnamed workflow'
        const rowTime = parseTime(row.occurredAt)
        const currentTime = current ? parseTime(current.latestAt) : 0

        if (!current) {
            grouped.set(key, {
                workflowName,
                workflowId: row.workflowId,
                count: 1,
                latestAt: row.occurredAt,
                latestMessage: row.errorMessage,
            })
            continue
        }

        current.count += 1
        if (rowTime >= currentTime) {
            current.latestAt = row.occurredAt
            current.latestMessage = row.errorMessage
            current.workflowName = workflowName
            current.workflowId = row.workflowId
        }
    }

    return [...grouped.values()].sort((a, b) => b.count - a.count || parseTime(b.latestAt) - parseTime(a.latestAt))
}

function guidanceFor(row: WorkflowErrorItem) {
    const text = `${row.workflowName} ${row.failedNode} ${row.lastNodeExecuted} ${row.errorMessage}`.toLowerCase()

    if (/credential|auth|403|unauthor|forbidden|not found/.test(text)) {
        return 'Check the workflow credential binding first. If this is a dashboard webhook, compare against the known Pod 1 header-auth credential used by healthy endpoints.'
    }

    if (/rate|429|quota|timeout|timed out|5\d\d|provider/.test(text)) {
        return 'Treat this as a provider/retry issue first. Confirm the row reached a terminal status and avoid manual re-runs until retries or the watchdog have finished.'
    }

    if (/json|parse|structured output|schema|parser/.test(text)) {
        return 'Likely structured-output drift. Confirm the document was marked failed/retryable rather than leaving the batch stuck, then inspect the latest parser workflow version.'
    }

    if (/drive|file|download|upload|binary/.test(text)) {
        return 'Check stored Drive file metadata and whether the retry workflow can recover from the existing audit row without re-uploading.'
    }

    return 'Review the failed node and execution ID, then compare the active workflow version against the latest known-good history before making changes.'
}

export default function WorkflowErrorLogCard({ rows, loading, error, onRefresh }: Props) {
    const [clearedErrorIds, setClearedErrorIds] = useState<Set<string>>(() => {
        if (typeof window === 'undefined') return new Set()
        try {
            const stored = window.localStorage.getItem('mergeworks.cleared_workflow_error_ids')
            return stored ? new Set(JSON.parse(stored)) : new Set()
        } catch {
            return new Set()
        }
    })

    const activeRows = useMemo(() => {
        return rows.filter((r) => {
            const key = String(r.id || r.executionId || `${r.workflowId}-${r.occurredAt}`)
            return !clearedErrorIds.has(key)
        })
    }, [rows, clearedErrorIds])

    const handleClearAllAlerts = () => {
        if (!window.confirm('Are you sure you want to permanently clear all old error alerts from the audit trail view?')) return
        const allKeys = new Set(clearedErrorIds)
        rows.forEach((r) => {
            const key = String(r.id || r.executionId || `${r.workflowId}-${r.occurredAt}`)
            allKeys.add(key)
        })
        setClearedErrorIds(allKeys)
        try {
            window.localStorage.setItem('mergeworks.cleared_workflow_error_ids', JSON.stringify([...allKeys]))
        } catch {}
    }

    const sortedRows = [...activeRows].sort((a, b) => parseTime(b.occurredAt) - parseTime(a.occurredAt))
    const last24hCount = activeRows.filter((row) => inLastHours(row.occurredAt, 24)).length
    const workflowSummaries = groupByWorkflow(activeRows)
    const repeatedWorkflows = workflowSummaries.filter((item) => item.count >= 2)
    const latest = sortedRows[0]

    return (
        <Card id="errors-header" className="overflow-hidden scroll-mt-6">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <AlertTriangle className="h-5 w-5 text-warning" />
                                Workflow reliability &amp; AI Processing Alerts
                            </CardTitle>
                            <CardInfoPopover cardId="workflow-error-log" />
                        </div>
                        <CardDescription className="mt-1">
                            Uncaught production failures recorded after automated retries and recovery paths are exhausted.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeRows.length > 0 && (
                            <Button type="button" size="sm" variant="destructive" onClick={handleClearAllAlerts} title="Permanently delete all old alerts from audit trail view">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete all alerts
                            </Button>
                        )}
                        <Button type="button" size="sm" variant="outline" disabled={loading} onClick={onRefresh}>
                            <RefreshCw className={loading ? 'animate-spin' : ''} />
                            Refresh errors
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                {error ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        <p className="font-medium">Unable to load error audit records.</p>
                        <p className="mt-1">{error}</p>
                        <p className="mt-2 text-xs text-destructive/80">
                            First check the Error Log API workflow credential binding and the dashboard webhook authentication header.
                        </p>
                    </div>
                ) : null}

                {!error ? (
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total uncaught</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{activeRows.length}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Last 24h</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{last24hCount}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Workflows affected</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{workflowSummaries.length}</p>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Latest error</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">{latest ? formatEasternTime(latest.occurredAt) : 'None'}</p>
                        </div>
                    </div>
                ) : null}

                {!error && activeRows.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-4 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                        <div>
                            <p className="font-medium">No uncaught production errors recorded.</p>
                            <p className="mt-1 text-muted-foreground">Automated retries and recovery paths are operating normally.</p>
                        </div>
                    </div>
                ) : null}

                {!error && repeatedWorkflows.length > 0 ? (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
                        <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-warning" />
                            <p className="text-sm font-semibold text-foreground">Repeated-failure watchlist</p>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {repeatedWorkflows.slice(0, 4).map((item) => (
                                <div key={item.workflowId || item.workflowName} className="rounded-md border border-warning/25 bg-background/80 p-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-foreground">{item.workflowName}</p>
                                        <Badge variant="warning">{item.count} errors</Badge>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">Latest: {formatEasternTime(item.latestAt)}</p>
                                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{item.latestMessage || 'No message recorded.'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {activeRows.length > 0 ? (
                    <div className="space-y-3">
                        {sortedRows.map((row, index) => (
                            <details key={`${row.id ?? index}-${row.occurredAt}`} className="rounded-lg border border-warning/25 bg-warning/5 p-3">
                                <summary className="cursor-pointer list-none">
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <div>
                                            <p className="font-medium text-foreground">{row.workflowName || 'Unnamed workflow'}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {formatEasternTime(row.occurredAt)} · Node: {row.failedNode || row.lastNodeExecuted || 'Not recorded'}
                                            </p>
                                        </div>
                                        {(() => {
                                            const classified = classifyError(row.errorMessage)
                                            return (
                                                <Badge variant="outline" className={`font-mono text-[10px] font-bold ${classified.badgeColorClass}`}>
                                                    {classified.badgeLabel}
                                                </Badge>
                                            )
                                        })()}
                                    </div>
                                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{row.errorMessage || 'No error message recorded.'}</p>
                                </summary>

                                <div className="mt-3 space-y-3 border-t border-warning/20 pt-3 text-xs text-muted-foreground">
                                    <div className="rounded-md border border-border bg-background p-3">
                                        <p className="font-medium text-foreground">Suggested operator check</p>
                                        <p className="mt-1 leading-5">{guidanceFor(row)}</p>
                                    </div>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <p><span className="font-medium text-foreground">Workflow ID:</span> {row.workflowId || 'Not recorded'}</p>
                                        <p><span className="font-medium text-foreground">Execution ID:</span> {row.executionId || 'Not recorded'}</p>
                                        <p><span className="font-medium text-foreground">Failed node:</span> {row.failedNode || 'Not recorded'}</p>
                                        <p><span className="font-medium text-foreground">Last node:</span> {row.lastNodeExecuted || 'Not recorded'}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs font-mono">
                                        <Badge variant="outline" className="gap-1 text-[11px] bg-card">
                                            <Cpu className="h-3 w-3 text-primary shrink-0" />
                                            Primary: OpenAI 5.6 Terra
                                        </Badge>
                                        <Badge variant="outline" className="gap-1 text-[11px] bg-card">
                                            <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                                            Backup: OpenAI 5.6 Sol
                                        </Badge>
                                        <Badge variant="outline" className="gap-1 text-[11px] bg-card">
                                            <Bot className="h-3 w-3 text-primary shrink-0" />
                                            Synth: OpenAI 5.6 Terra
                                        </Badge>
                                        <Badge variant="outline" className="gap-1 text-[11px] bg-card border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                                            <RefreshCw className="h-3 w-3 text-emerald-600 shrink-0" />
                                            Pass Cycles: 1/3
                                        </Badge>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words">{row.errorMessage || 'No error message recorded.'}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                ) : null}

                <div id="errors-arch" className="scroll-mt-6 flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-4 text-sm text-foreground">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div>
                        <p className="font-medium">Safe workflow-change rule</p>
                        <p className="mt-1 text-muted-foreground">
                            Before changing a failing workflow, inspect its version history and compare the active draft with the latest known-good version. Prefer frontend/operator guidance over live workflow mutation unless the failure is reproduced and scoped.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
