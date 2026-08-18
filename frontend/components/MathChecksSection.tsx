import { Calculator, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
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
            <div className="rounded-xl border border-border bg-card/80 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        <span className="text-base font-bold text-foreground">{title || 'Math checks'}</span>
                    </div>
                    <Badge variant={overallStatus === 'warning' ? 'destructive' : overallStatus === 'passed' ? 'success' : 'secondary'} className="text-xs px-2.5 py-0.5 font-bold">
                        {passCount}/{totalChecks} passed
                    </Badge>
                </div>
                {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
                <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                            className="rounded-xl border border-border/80 bg-background/90 p-4 text-left transition-all hover:border-primary/60 hover:bg-muted/30 hover:shadow-xs flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    {check.metric.withinTolerance === true && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                    {check.metric.withinTolerance === false && <XCircle className="h-4.5 w-4.5 text-destructive shrink-0" />}
                                    {check.metric.withinTolerance === undefined && <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />}
                                    <span className="text-sm font-bold text-foreground truncate">{formatLabel(check.key)}</span>
                                </div>
                                <p className="mt-1 text-xl sm:text-2xl font-extrabold tabular-nums text-foreground">
                                    {typeof check.metric.value === 'number' ? `$${check.metric.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                                </p>
                                {check.metric.formula && (
                                    <p className="mt-1 text-xs text-muted-foreground font-mono truncate" title={check.metric.formula}>{check.metric.formula}</p>
                                )}
                            </div>
                            <div className="mt-3 pt-2.5 border-t border-border/40">
                                {check.metric.withinTolerance === true && (
                                    <Badge variant="success" className="text-xs font-bold px-2.5 py-0.5">
                                        ✓ Verified Match
                                    </Badge>
                                )}
                                {check.metric.withinTolerance === false && (
                                    <Badge variant="destructive" className="text-xs font-bold px-2.5 py-0.5">
                                        ✗ Mismatch{typeof check.metric.actual === 'number' ? `: $${check.metric.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : ''}
                                    </Badge>
                                )}
                                {check.metric.withinTolerance === undefined && (
                                    <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 bg-muted/40 text-muted-foreground border-border">
                                        ℹ Calculated Fact
                                    </Badge>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
                {allChecks.length > 6 && (
                    <p className="mt-3 text-xs text-muted-foreground font-medium">+{allChecks.length - 6} more checks across {completedDocs.length} documents</p>
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
                            <CardInfoPopover cardId="math-checks" />
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
                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                                            className="rounded-2xl border-2 border-border p-6 sm:p-7 text-left transition-all hover:border-primary/60 hover:bg-muted/40 hover:shadow-lg"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {metric.withinTolerance === true && <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />}
                                                {metric.withinTolerance === false && <XCircle className="h-6 w-6 text-destructive shrink-0" />}
                                                {metric.withinTolerance === undefined && <AlertTriangle className="h-6 w-6 text-primary shrink-0" />}
                                                <span className="text-base font-black text-foreground truncate">{formatLabel(key)}</span>
                                            </div>
                                            <p className="mt-3 text-3xl sm:text-4xl font-black tabular-nums tracking-tight text-foreground">
                                                {typeof metric.value === 'number' ? `$${metric.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
                                            </p>
                                            {metric.formula && (
                                                <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground font-mono font-bold truncate" title={metric.formula}>{metric.formula}</p>
                                            )}
                                            {metric.withinTolerance === true && (
                                                <Badge variant="success" className="mt-3.5 text-sm font-extrabold px-3 py-1 sm:text-base">
                                                    ✓ VERIFIED MATCH
                                                </Badge>
                                            )}
                                            {metric.withinTolerance === false && (
                                                <Badge variant="destructive" className="mt-3.5 text-sm font-extrabold px-3 py-1 sm:text-base">
                                                    ✗ MISMATCH {typeof metric.actual === 'number' ? `(Reported: $${metric.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })})` : ''}
                                                </Badge>
                                            )}
                                            {metric.withinTolerance === undefined && (
                                                <Badge variant="secondary" className="mt-3.5 text-sm font-extrabold px-3 py-1 sm:text-base">
                                                    ℹ CALCULATED FACT (No Stated Target)
                                                </Badge>
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
