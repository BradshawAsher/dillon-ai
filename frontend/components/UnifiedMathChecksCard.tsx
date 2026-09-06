import { useMemo, useState } from 'react'
import { ArrowRight, Calculator, CheckCircle2, Scale, ShieldCheck, XCircle } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { buildUnifiedMathChecks, type MathCheckCategory, type UnifiedMathCheck } from '../utils/unifiedMathChecks'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import type { EvidenceItem } from './EvidenceDrawer'
import CardInfoPopover from './common/CardInfoPopover'

export type UnifiedCheckCategory = 'all' | MathCheckCategory

function displayValue(value: number | string | null) {
    if (value === null || value === '') return 'Not recorded'
    return typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value
}

type Props = {
    documents: SubmissionHistoryItem[]
    model?: DealModel
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

export default function UnifiedMathChecksCard({ documents, model, onOpenEvidence }: Props) {
    const [selectedCategory, setSelectedCategory] = useState<UnifiedCheckCategory>('all')
    const checks = useMemo(() => buildUnifiedMathChecks(documents, model), [documents, model])

    const counts = useMemo(() => ({
        total: checks.length,
        passed: checks.filter((check) => check.status === 'passed').length,
        mismatch: checks.filter((check) => check.status === 'mismatch').length,
        calculated: checks.filter((check) => check.status === 'calculated').length,
        pnl: checks.filter((check) => check.category === 'pnl').length,
        balance_sheet: checks.filter((check) => check.category === 'balance_sheet').length,
        cross_doc: checks.filter((check) => check.category === 'cross_doc').length,
        underwriting: checks.filter((check) => check.category === 'underwriting').length,
    }), [checks])

    const filteredChecks = useMemo(
        () => selectedCategory === 'all' ? checks : checks.filter((check) => check.category === selectedCategory),
        [checks, selectedCategory],
    )

    const openEvidence = (check: UnifiedMathCheck) => {
        if (!onOpenEvidence) return
        const status = check.status === 'mismatch'
            ? 'Contradicted'
            : check.status === 'passed'
                ? 'Confirmed & Reconciled'
                : 'Calculated'

        onOpenEvidence({
            title: `${check.kind === 'calculation' ? 'Math calculation' : 'Math check'}: ${check.title}`,
            sourceFile: check.sourceFile,
            sourceLocation: check.sourceLocation,
            excerpt: check.excerpt || `${check.formula}\n${check.deltaFormatted || ''}\n${check.notes || ''}`.trim(),
            status,
            provenance: check.kind === 'cross_document'
                ? 'Independent cross-document comparison'
                : check.kind === 'identity'
                    ? 'Deterministic arithmetic reconciliation'
                    : 'Calculated from extracted facts and deal-model inputs',
            formula: check.formula,
            documentId: check.documentId,
            documentUrl: check.documentUrl,
        })
    }

    const categories = [
        ['all', 'All Checks', counts.total],
        ['pnl', 'P&L Integrity', counts.pnl],
        ['balance_sheet', 'Balance Sheet', counts.balance_sheet],
        ['cross_doc', 'Cross-Doc Ties', counts.cross_doc],
        ['underwriting', 'Underwriting Math', counts.underwriting],
    ] as const

    return (
        <Card id="diligence-master-math-checks" className="overflow-visible relative z-20 border border-border shadow-sm">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                                <Calculator className="h-5 w-5" />
                            </div>
                            <CardTitle className="text-lg">Master Deterministic Math &amp; Reconciliation Ledger</CardTitle>
                            <CardInfoPopover cardId="math-checks" />
                        </div>
                        <CardDescription className="text-xs mt-1 text-muted-foreground max-w-4xl">
                            Arithmetic runs in code after document extraction. Verified ties require an independently stated comparator; ratios and underwriting outputs remain labeled as calculations. Extracted source values can still require human review.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <Badge variant="success" className="gap-1 font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {counts.passed} Verified Ties
                        </Badge>
                        {counts.mismatch > 0 && (
                            <Badge variant="destructive" className="gap-1 font-bold">
                                <XCircle className="h-3.5 w-3.5" />
                                {counts.mismatch} Mismatches
                            </Badge>
                        )}
                        <Badge variant="secondary" className="gap-1 font-mono text-xs">
                            <Scale className="h-3.5 w-3.5" />
                            {counts.calculated} Calculated
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">{counts.total} Total</Badge>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/40 overflow-x-auto">
                    {categories.map(([category, label, count]) => (
                        <button
                            key={category}
                            type="button"
                            onClick={() => setSelectedCategory(category)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer shrink-0 ${
                                selectedCategory === category
                                    ? 'bg-primary text-primary-foreground shadow-2xs'
                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            {label} ({count})
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {filteredChecks.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">
                        No supported checks are available in this category. Checks appear only when the required extracted facts, periods, and deal-model inputs are present.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredChecks.map((check) => {
                            const passed = check.status === 'passed'
                            const mismatch = check.status === 'mismatch'
                            return (
                                <button
                                    key={check.id}
                                    type="button"
                                    onClick={() => openEvidence(check)}
                                    className={`rounded-xl border p-3.5 transition-all text-left flex flex-col justify-between cursor-pointer hover:shadow-sm ${
                                        passed
                                            ? 'border-emerald-500/30 bg-emerald-500/[0.02] hover:border-emerald-500/60'
                                            : mismatch
                                                ? 'border-red-500/30 bg-red-500/[0.02] hover:border-red-500/60'
                                                : 'border-border bg-card hover:border-primary/40'
                                    }`}
                                >
                                    <span>
                                        <span className="flex items-start justify-between gap-2">
                                            <span className="flex items-center gap-1.5">
                                                {passed ? (
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                ) : mismatch ? (
                                                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                                                ) : (
                                                    <Scale className="h-4 w-4 text-primary shrink-0" />
                                                )}
                                                <span className="text-xs font-bold text-foreground leading-tight">{check.title}</span>
                                            </span>
                                            <Badge variant="outline" className="text-[9px] font-mono shrink-0 uppercase">
                                                {check.categoryLabel}
                                            </Badge>
                                        </span>
                                        <span className="mt-2 block text-xs font-mono text-muted-foreground bg-muted/30 p-1.5 rounded border border-border/50 break-words">
                                            {check.formula}
                                        </span>
                                        <span className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                            <span className="rounded border border-border/50 bg-background/60 p-1.5 min-w-0">
                                                <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">Result</span>
                                                <span className="block font-mono font-semibold break-words">{displayValue(check.computedValue)}</span>
                                            </span>
                                            <span className="rounded border border-border/50 bg-background/60 p-1.5 min-w-0">
                                                <span className="block text-[9px] uppercase tracking-wide text-muted-foreground">Comparator</span>
                                                <span className="block font-mono font-semibold break-words">{displayValue(check.expectedOrStatedValue)}</span>
                                            </span>
                                        </span>
                                        {check.deltaFormatted && (
                                            <span className={`mt-2 block text-xs font-semibold break-words ${mismatch ? 'text-destructive font-bold' : 'text-foreground/90'}`}>
                                                {check.deltaFormatted}
                                            </span>
                                        )}
                                        <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            {passed ? 'Verified tie' : mismatch ? 'Mismatch' : 'Calculated only'}
                                        </span>
                                    </span>
                                    <span className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground min-w-0">
                                        <span className="truncate max-w-[70%]" title={check.sourceFile}>📄 {check.sourceFile}</span>
                                        <span className="text-primary hover:underline font-medium inline-flex items-center gap-0.5 shrink-0">
                                            Evidence <ArrowRight className="h-2.5 w-2.5" />
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
