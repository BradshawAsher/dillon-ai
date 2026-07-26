import { Calculator, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import type { EvidenceItem } from './EvidenceDrawer'

type Props = {
    documents: SubmissionHistoryItem[]
    onOpenEvidence?: (evidence: EvidenceItem) => void
    compact?: boolean
    title?: string
    description?: string
}

type ReconciliationMetric = {
    value?: number
    actual?: number
    withinTolerance?: boolean
    formula?: string
}

type ReconciliationView = {
    status?: string
    warnings?: string[]
    metrics?: Record<string, ReconciliationMetric>
}

function parseReconciliation(raw: string | undefined): ReconciliationView | null {
    if (!raw?.trim()) return null
    try {
        const parsed = JSON.parse(raw) as ReconciliationView
        return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
        return null
    }
}

function formatLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

type AggregatedCheck = {
    key: string
    metric: ReconciliationMetric
    sourceFile: string
    sourceFileId?: string
    sourceFileUrl?: string
}

export default function MathChecksSection({ documents, onOpenEvidence, compact, title, description }: Props) {
    const completedDocs = documents.filter(d => d.status === 'completed' && d.reconciliationJson)
    const allChecks: AggregatedCheck[] = []
    let passCount = 0
    let warnCount = 0
    let totalChecks = 0

    completedDocs.forEach(doc => {
        const recon = parseReconciliation(doc.reconciliationJson)
        if (!recon?.metrics) return
        Object.entries(recon.metrics).forEach(([key, metric]) => {
            totalChecks++
            if (metric.withinTolerance === true) passCount++
            if (metric.withinTolerance === false) warnCount++
            allChecks.push({
                key,
                metric,
                sourceFile: doc.fileName || 'Document',
                sourceFileId: doc.storageFileId,
                sourceFileUrl: doc.storageFileUrl,
            })
        })
    })

    if (allChecks.length === 0) {
        if (compact) return null
        return (
            <Card className="overflow-hidden">
                <CardHeader className="border-b border-border bg-card/80 pb-3">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{title || 'Deterministic math checks'}</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-5">
                    <p className="text-sm text-muted-foreground">
                        No deterministic checks available yet. These run automatically when documents contain at least two related confirmed financial numbers.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const overallStatus = warnCount > 0 ? 'warning' : passCount === totalChecks ? 'passed' : 'partial'

    if (compact) {
        return (
            <div className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold">{title || 'Math checks'}</span>
                    </div>
                    <Badge variant={overallStatus === 'warning' ? 'destructive' : overallStatus === 'passed' ? 'success' : 'secondary'} className="text-[10px]">
                        {passCount}/{totalChecks} passed
                    </Badge>
                </div>
                {description && <p className="text-xs text-muted-foreground mb-2">{description}</p>}
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                    {allChecks.slice(0, 6).map((check, i) => (
                        <button
                            key={`${check.key}-${i}`}
                            type="button"
                            onClick={() => onOpenEvidence?.({
                                title: `Math check: ${formatLabel(check.key)}`,
                                sourceFile: check.sourceFile,
                                sourceLocation: 'Deterministic reconciliation',
                                excerpt: check.metric.formula
                                    ? `${formatLabel(check.key)}: ${typeof check.metric.value === 'number' ? check.metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}\nFormula: ${check.metric.formula}${typeof check.metric.actual === 'number' ? `\nActual: ${check.metric.actual.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}`
                                    : `${formatLabel(check.key)}: ${typeof check.metric.value === 'number' ? check.metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}`,
                                status: check.metric.withinTolerance === false ? 'Contradicted' : check.metric.withinTolerance ? 'Confirmed' : 'Calculated',
                                provenance: 'Deterministic math check',
                                documentId: check.sourceFileId,
                                documentUrl: check.sourceFileUrl,
                            })}
                            className="rounded-md border border-border p-2 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                        >
                            <div className="flex items-center gap-1">
                                {check.metric.withinTolerance === true && <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />}
                                {check.metric.withinTolerance === false && <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />}
                                {check.metric.withinTolerance === undefined && <AlertTriangle className="h-3 w-3 text-muted-foreground" />}
                                <span className="text-[10px] font-medium text-muted-foreground truncate">{formatLabel(check.key)}</span>
                            </div>
                            <p className="mt-0.5 text-xs font-semibold tabular-nums">
                                {typeof check.metric.value === 'number' ? check.metric.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                            </p>
                            {check.metric.formula && (
                                <p className="mt-0.5 text-[9px] text-muted-foreground truncate" title={check.metric.formula}>{check.metric.formula}</p>
                            )}
                            {typeof check.metric.actual === 'number' && check.metric.withinTolerance === false && (
                                <p className="mt-0.5 text-[9px] text-destructive">Actual: {check.metric.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                            )}
                        </button>
                    ))}
                </div>
                {allChecks.length > 6 && (
                    <p className="mt-2 text-[10px] text-muted-foreground">+{allChecks.length - 6} more checks across {completedDocs.length} documents</p>
                )}
            </div>
        )
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">{title || 'Deterministic math checks'}</CardTitle>
                        </div>
                        {description && <CardDescription className="mt-1">{description}</CardDescription>}
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={overallStatus === 'warning' ? 'destructive' : overallStatus === 'passed' ? 'success' : 'secondary'}>
                            {passCount}/{totalChecks} passed
                        </Badge>
                        {warnCount > 0 && <Badge variant="destructive">{warnCount} outside tolerance</Badge>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="space-y-4">
                    {completedDocs.map(doc => {
                        const recon = parseReconciliation(doc.reconciliationJson)
                        if (!recon?.metrics || Object.keys(recon.metrics).length === 0) return null
                        return (
                            <div key={doc.id} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground truncate max-w-[250px]">{doc.fileName || 'Document'}</span>
                                    <Badge variant={recon.status === 'warning' ? 'destructive' : recon.status === 'passed' ? 'success' : 'outline'} className="text-[10px]">
                                        {recon.status === 'passed' ? 'Passed' : recon.status === 'warning' ? 'Needs review' : 'Partial'}
                                    </Badge>
                                </div>
                                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                                    {Object.entries(recon.metrics).map(([key, metric]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => onOpenEvidence?.({
                                                title: `Math check: ${formatLabel(key)}`,
                                                sourceFile: doc.fileName || 'Document',
                                                sourceLocation: 'Deterministic reconciliation',
                                                excerpt: metric.formula
                                                    ? `${formatLabel(key)}: ${typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}\nFormula: ${metric.formula}${typeof metric.actual === 'number' ? `\nActual from document: ${metric.actual.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ''}\nResult: ${metric.withinTolerance === true ? 'VERIFIED ✓' : metric.withinTolerance === false ? 'MISMATCH ✗' : 'Calculated'}`
                                                    : `${formatLabel(key)}: ${typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A'}`,
                                                status: metric.withinTolerance === false ? 'Contradicted' : metric.withinTolerance ? 'Confirmed' : 'Calculated',
                                                provenance: 'Deterministic math check',
                                                documentId: doc.storageFileId,
                                                documentUrl: doc.storageFileUrl,
                                            })}
                                            className="rounded-lg border border-border p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"
                                        >
                                            <div className="flex items-center gap-1.5">
                                                {metric.withinTolerance === true && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
                                                {metric.withinTolerance === false && <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                                                {metric.withinTolerance === undefined && <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
                                                <span className="text-[11px] font-medium text-muted-foreground">{formatLabel(key)}</span>
                                            </div>
                                            <p className="mt-1 text-sm font-bold tabular-nums">
                                                {typeof metric.value === 'number' ? metric.value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}
                                            </p>
                                            {metric.formula && (
                                                <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">{metric.formula}</p>
                                            )}
                                            {typeof metric.actual === 'number' && metric.withinTolerance !== undefined && (
                                                <p className={`mt-0.5 text-[10px] ${metric.withinTolerance ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                                    {metric.withinTolerance ? '✓ ' : '✗ '}
                                                    Actual: {metric.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                    {metric.withinTolerance === false && typeof metric.value === 'number' ? ` (${((Math.abs(metric.actual - metric.value) / metric.value) * 100).toFixed(1)}% off)` : ''}
                                                </p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {recon.warnings?.length ? (
                                    <p className="text-xs text-destructive">{recon.warnings.map(formatLabel).join(' · ')}</p>
                                ) : null}
                            </div>
                        )
                    })}
                </div>
                <p className="mt-4 text-[10px] text-muted-foreground">
                    Checks run without AI — pure arithmetic verifications (Rev−COGS=GP, Rev−OpEx≈EBITDA, Assets−Liabilities=Equity). 2% tolerance.
                </p>
            </CardContent>
        </Card>
    )
}
