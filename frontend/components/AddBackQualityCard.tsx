import React, { useEffect, useMemo, useState } from 'react'
import {
    BadgeCheck,
    CheckSquare,
    CircleAlert,
    DollarSign,
    Landmark,
    Scale,
    Square,
    TrendingDown,
} from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { buildDocumentLinkedEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { getOverallAddBackQuality } from '../utils/addBackQuality'
import {
    getTaxonomyBadge,
    recalculateAdjustedEbitdaWithDisallowances,
} from '../utils/addBackTaxonomy'
import { parseAddBackItems } from '../utils/addBackItems'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

const getOverallQuality = getOverallAddBackQuality

export default function AddBackQualityCard({
    model,
    synthesis,
    documents = [],
    onOpenEvidence,
}: {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documents?: SubmissionHistoryItem[]
    onOpenEvidence?: (item: EvidenceItem) => void
}) {
    const facts = useMemo(() => parseDocumentedFacts(model.documentedFactsJson), [model.documentedFactsJson])
    const items = useMemo(() => parseAddBackItems(synthesis, facts), [synthesis, facts])

    // Disallowance toggles (defaults to disallowed for personal perks / unsupported items)
    const [disallowedMap, setDisallowedMap] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {}
        for (const it of items) {
            if (it.category === 'disallowed' || it.category === 'management_deficit' || it.quality === 'unsupported') {
                initial[it.id] = true
            }
        }
        return initial
    })

    useEffect(() => {
        const next: Record<string, boolean> = {}
        for (const item of items) {
            if (item.category === 'disallowed' || item.category === 'management_deficit' || item.quality === 'unsupported') {
                next[item.id] = true
            }
        }
        setDisallowedMap(next)
    }, [items])

    if (items.length === 0) return null

    const toggleDisallowed = (id: string) => {
        setDisallowedMap((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    const overall = getOverallQuality(items)
    const totalAmount = items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
    const reportedTotalAmount = typeof facts.add_backs?.value === 'number' && facts.add_backs.value > 0
        ? facts.add_backs.value
        : null
    const hasAggregateVariance = reportedTotalAmount !== null
        && Math.abs(reportedTotalAmount - totalAmount) > Math.max(1, reportedTotalAmount * 0.02)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const addBackExposure = reportedTotalAmount ?? totalAmount
    const addBacksAsPercentOfRevenue = revenue && addBackExposure > 0 ? addBackExposure / revenue : null

    const reportedEbitda = typeof model.ebitda === 'number' && model.ebitda > 0
        ? model.ebitda
        : (facts.reported_ebitda?.value || facts.ebitda_sde?.value || 0)

    const multiple = model.exitMultiple || 4.5

    const repricing = recalculateAdjustedEbitdaWithDisallowances(
        reportedEbitda,
        items.map((it) => ({
            amount: it.amount || 0,
            isDisallowed: Boolean(disallowedMap[it.id]),
        })),
        multiple
    )

    return (
        <Card className="overflow-hidden border-primary/20 shadow-sm" id="add-back-quality-card">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Add-Back Quality &amp; Banking Disallowance Engine</CardTitle>
                            <CardInfoPopover cardId="add-back-quality" />
                        </div>
                        <CardDescription className="mt-1">
                            SBA 7(a) and commercial lender underwriting rules: Check/uncheck individual add-backs to re-price deal valuation.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={overall.variant}>{overall.label}</Badge>
                        {reportedTotalAmount !== null ? (
                            <Badge variant="outline">{money(reportedTotalAmount)} reported total</Badge>
                        ) : totalAmount > 0 ? (
                            <Badge variant="outline">{money(totalAmount)} itemized add-backs</Badge>
                        ) : null}
                        {hasAggregateVariance && <Badge variant="warning">{money(totalAmount)} itemized</Badge>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {hasAggregateVariance && (
                    <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <p className="text-sm text-foreground">
                            The reported aggregate is <strong>{money(reportedTotalAmount!)}</strong>, while identifiable line items total <strong>{money(totalAmount)}</strong>. The aggregate is shown for reconciliation but is not counted as another supported/partial/unsupported item.
                        </p>
                    </div>
                )}
                {addBacksAsPercentOfRevenue !== null && addBacksAsPercentOfRevenue > 0.15 && (
                    <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <p className="text-sm text-foreground">
                            Add-backs represent <strong>{(addBacksAsPercentOfRevenue * 100).toFixed(1)}%</strong> of revenue — elevated for the category. Each line item should be individually verified with supporting schedules.
                        </p>
                    </div>
                )}

                {/* Interactive Re-Pricing Callout */}
                {repricing.disallowedCount > 0 && (
                    <div className="rounded-xl border border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/20 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                            <Landmark className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold text-rose-950 dark:text-rose-200">
                                    {repricing.disallowedCount} Add-Back{repricing.disallowedCount === 1 ? '' : 's'} Disallowed by Banking Rules ({money(repricing.disallowedAmount)})
                                </p>
                                <p className="text-xs text-rose-900/80 dark:text-rose-300/80 mt-0.5">
                                    Normalized EBITDA reduced to <strong>{money(repricing.adjustedEbitda)}</strong>. Recommended purchase price reduction: <strong>{money(repricing.purchasePriceReduction)}</strong> at {multiple}x.
                                </p>
                            </div>
                        </div>
                        <div className="bg-background/90 px-3 py-1.5 rounded-lg border border-rose-500/30 text-right shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Negotiation Leverage</span>
                            <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">-{money(repricing.purchasePriceReduction)}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {items.map((item) => {
                        const isDisallowed = Boolean(disallowedMap[item.id])
                        const badgeInfo = getTaxonomyBadge(item.category)

                        return (
                            <div
                                key={item.id}
                                className={`flex items-start gap-3 rounded-lg border p-3 transition-all ${
                                    isDisallowed
                                        ? 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10'
                                        : 'border-border bg-card/60 hover:border-primary/40'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => toggleDisallowed(item.id)}
                                    className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer focus-visible:outline-none"
                                    title={isDisallowed ? 'Uncheck to approve add-back' : 'Check to disallow add-back and reduce valuation'}
                                >
                                    {isDisallowed ? (
                                        <CheckSquare className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                    ) : (
                                        <Square className="h-4 w-4 text-muted-foreground/60" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onOpenEvidence?.(buildDocumentLinkedEvidence({
                                        title: 'Add-back quality finding',
                                        sourceFile: item.sourceFile,
                                        fallbackSourceFile: synthesis?.citations?.[0] || 'Project synthesis',
                                        sourceLocation: item.sourceLocation,
                                        fallbackSourceLocation: 'Financial analysis',
                                        excerpt: item.excerpt || item.detail,
                                        confidence: item.confidence ?? undefined,
                                        status: item.status || (item.quality === 'supported' ? 'Confirmed' : item.quality === 'partial' ? 'Needs review' : 'Risk'),
                                        provenance: 'Add-back quality scoring',
                                        documents,
                                    }))}
                                    className="min-w-0 flex-1 text-left cursor-pointer"
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeInfo.bgClass} ${badgeInfo.textClass} ${badgeInfo.borderClass}`} title={badgeInfo.tooltip}>
                                            {badgeInfo.icon} {badgeInfo.label}
                                        </span>

                                        <Badge variant={item.quality === 'supported' ? 'success' : item.quality === 'partial' ? 'warning' : 'destructive'}>
                                            {item.quality === 'supported' ? 'Supported' : item.quality === 'partial' ? 'Partial' : 'Unsupported'}
                                        </Badge>

                                        {item.amount !== null && (
                                            <Badge variant={isDisallowed ? 'destructive' : 'outline'} className={isDisallowed ? 'line-through opacity-85' : ''}>
                                                {money(item.amount)}
                                            </Badge>
                                        )}

                                        {isDisallowed && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                                [Disallowed for Valuation]
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1.5 text-sm leading-6 text-foreground">{item.detail}</p>
                                </button>
                            </div>
                        )
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex flex-wrap gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Evidence supported</p>
                            <p className="text-lg font-semibold text-success">{items.filter((i) => i.quality === 'supported').length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Evidence partial</p>
                            <p className="text-lg font-semibold text-warning">{items.filter((i) => i.quality === 'partial').length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Evidence unsupported</p>
                            <p className="text-lg font-semibold text-destructive">{items.filter((i) => i.quality === 'unsupported').length}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Disallowed by Buyer</p>
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{repricing.disallowedCount} items ({money(repricing.disallowedAmount)})</p>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground">
                    Evidence quality and lender eligibility are separate: a documented personal expense can be evidence-supported while still disallowed by banking rules. Check or uncheck items to simulate buyer/lender exclusions.
                </p>
            </CardContent>
        </Card>
    )
}
