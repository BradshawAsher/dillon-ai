import React from 'react'
import { AlertTriangle, Gauge } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { Badge } from '../lib/shadcn/badge'

export type DiagnosticDimension = { key: string; label: string; avgPct: number }

export type DiagnosticContradiction = {
    metric: string
    period: string
    docA: string
    docB: string
    valueA: number
    valueB: number
    deltaPct: number
    severity: string
}

export type DiagnosticConflictResult = {
    projectId: string
    business: string
    expectedCount: number
    matchedCount: number
    detected: DiagnosticContradiction[]
}

type EvalDiagnosticsPanelProps = {
    overallPct: number
    regressionPassed: boolean
    regressionThreshold: number
    dimensions: DiagnosticDimension[]
    weakestKey: string | null
    conflictResults?: DiagnosticConflictResult[]
}

const barColor = (pct: number) => (pct >= 80 ? 'bg-emerald-600' : pct >= 65 ? 'bg-amber-500' : 'bg-red-500')

const severityVariant = (severity: string): React.ComponentProps<typeof Badge>['variant'] => {
    const s = severity.toLowerCase()
    if (s === 'critical') return 'destructive'
    if (s === 'warning') return 'outline'
    return 'secondary'
}

const shortDoc = (name: string) => {
    const base = name.replace(/\.[a-z0-9]+$/i, '')
    return base.length > 26 ? `${base.slice(0, 24)}…` : base
}

const money = (value: number) =>
    Math.abs(value) >= 1000 ? `$${Math.round(value).toLocaleString('en-US')}` : String(value)

/**
 * Compact, always-visible eval diagnostics rail: per-dimension pass/fail, the
 * weakest dimension, the regression gate, and — the point of the whole thing —
 * the concrete cross-document contradictions the run detected. Purely
 * presentational; every value is computed by the parent tab.
 */
export default function EvalDiagnosticsPanel({
    overallPct,
    regressionPassed,
    regressionThreshold,
    dimensions,
    weakestKey,
    conflictResults = [],
}: EvalDiagnosticsPanelProps) {
    const detected = conflictResults.flatMap((c) => c.detected)
    const dealsWithConflicts = conflictResults.filter((c) => c.detected.length > 0).length
    const totalExpected = conflictResults.reduce((n, c) => n + c.expectedCount, 0)
    const totalCaught = conflictResults.reduce((n, c) => n + c.matchedCount, 0)

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Gauge className="h-4 w-4 text-muted-foreground" />
                            Diagnostics
                            <CardInfoPopover cardId="eval-diagnostics" />
                        </CardTitle>
                        <Badge variant={regressionPassed ? 'success' : 'destructive'}>
                            {regressionPassed ? 'PASS' : 'FAIL'}
                        </Badge>
                    </div>
                    <CardDescription>
                        Overall {overallPct}% · regression gate &ge;{regressionThreshold}%
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                    {dimensions.map((dim) => (
                        <div key={dim.key} className="flex items-center gap-2">
                            <span className="w-32 truncate text-xs font-medium text-foreground" title={dim.label}>
                                {dim.label}
                            </span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div
                                    className={`h-full rounded-full transition-all duration-300 ${barColor(dim.avgPct)}`}
                                    style={{ width: `${Math.min(100, dim.avgPct)}%` }}
                                />
                            </div>
                            <span className="w-9 text-right font-mono text-xs font-bold text-foreground">{dim.avgPct}%</span>
                            {dim.key === weakestKey && (
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600" title="Weakest dimension">
                                    ◄
                                </span>
                            )}
                        </div>
                    ))}
                    {weakestKey && (
                        <p className="pt-1 text-[11px] text-muted-foreground">
                            Weakest: <span className="font-medium text-foreground">{dimensions.find((d) => d.key === weakestKey)?.label ?? weakestKey}</span> — focus tuning here.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Cross-document contradictions
                        <CardInfoPopover cardId="cross-document-contradictions" />
                    </CardTitle>
                    <CardDescription>
                        {conflictResults.length === 0
                            ? 'No conflict scoring in this run.'
                            : `${totalCaught}/${totalExpected} expected caught · ${detected.length} detected across ${dealsWithConflicts} deal${dealsWithConflicts === 1 ? '' : 's'}`}
                    </CardDescription>
                </CardHeader>
                {detected.length > 0 && (
                    <CardContent className="space-y-2">
                        {detected.slice(0, 8).map((c, i) => (
                            <div key={`${c.metric}-${i}`} className="rounded-md border border-border/60 p-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-xs font-semibold text-foreground">
                                        {c.metric} · {c.period || 'n/a'}
                                    </span>
                                    <Badge variant={severityVariant(c.severity)} className="text-[10px]">
                                        {Math.round(c.deltaPct * 100)}% {c.severity}
                                    </Badge>
                                </div>
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                    <span title={c.docA}>{shortDoc(c.docA)}</span>{' '}
                                    <span className="font-mono text-foreground">{money(c.valueA)}</span>
                                    {' vs '}
                                    <span title={c.docB}>{shortDoc(c.docB)}</span>{' '}
                                    <span className="font-mono text-foreground">{money(c.valueB)}</span>
                                </div>
                            </div>
                        ))}
                        {detected.length > 8 && (
                            <p className="text-[11px] text-muted-foreground">+{detected.length - 8} more…</p>
                        )}
                    </CardContent>
                )}
            </Card>
        </div>
    )
}
