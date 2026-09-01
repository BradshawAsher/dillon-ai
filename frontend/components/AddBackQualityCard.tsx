import React, { useMemo, useState } from 'react'
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
    classifyAddBackCategory,
    getTaxonomyBadge,
    recalculateAdjustedEbitdaWithDisallowances,
    type AddBackTaxonomyCategory,
} from '../utils/addBackTaxonomy'

type AddBackItem = {
    id: string
    label: string
    amount: number | null
    quality: 'supported' | 'partial' | 'unsupported'
    category: AddBackTaxonomyCategory
    detail: string
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    confidence?: number | null
    status?: string
}

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function parseAddBacksFromSynthesis(
    synthesis: ProjectSynthesisItem | undefined,
    facts: Record<string, { value?: number; status?: string; provenance?: string }>
): AddBackItem[] {
    const items: AddBackItem[] = []

    const totalAddBacks = facts.add_backs
    if (totalAddBacks && typeof totalAddBacks.value === 'number' && totalAddBacks.value > 0) {
        items.push({
            id: 'item-total-addbacks',
            label: 'Total reported add-backs',
            amount: totalAddBacks.value,
            quality: totalAddBacks.status === 'confirmed' ? 'supported' : 'partial',
            category: 'aggressive',
            detail: totalAddBacks.status === 'confirmed'
                ? 'Total add-back figure is confirmed in uploaded documents.'
                : 'Total reported but individual line items not independently verified.',
            status: totalAddBacks.status,
        })
    }

    if (!synthesis) return items

    const addBackPattern = /add.?back|adjustment|owner.?(?:salary|comp|benefit|perquisite|perk)|personal|non.?recurring|one.?time/i
    const structuredGroups = [
        ...(synthesis.structuredFindings?.redFlags ?? []),
        ...(synthesis.structuredFindings?.yellowFlags ?? []),
        ...(synthesis.structuredFindings?.crossDocumentConflicts ?? []),
        ...(synthesis.structuredFindings?.openQuestions ?? []),
        ...(synthesis.structuredFindings?.negotiationLevers ?? []),
        ...(synthesis.structuredFindings?.keyTakeaways ?? []),
    ]

    let idx = 0
    for (const finding of structuredGroups) {
        if (!finding || !finding.text) continue
        if (!addBackPattern.test(finding.text)) continue
        const amountMatch = finding.text.match(/\$[\d,]+(?:\.\d+)?[KkMm]?|\d+(?:,\d{3})+/)
        let amount: number | null = null
        if (amountMatch) {
            const raw = amountMatch[0].replace(/[$,]/g, '')
            amount = parseFloat(raw)
            if (/[Kk]$/.test(amountMatch[0])) amount *= 1000
            if (/[Mm]$/.test(amountMatch[0])) amount *= 1_000_000
        }

        const isUnsupported = /unsupported|unsubstantiated|cannot.+verif|no.+documentation|question/i.test(finding.text)
        const isPartial = /partial|some|limited|unclear|inconsisten/i.test(finding.text)
        const primaryCitation = finding.citations?.[0]
        const category = classifyAddBackCategory(finding.text)

        items.push({
            id: `item-${idx++}`,
            label: finding.text.length > 80 ? finding.text.slice(0, 77) + '…' : finding.text,
            amount,
            quality: isUnsupported ? 'unsupported' : isPartial ? 'partial' : 'supported',
            category,
            detail: finding.text,
            sourceFile: primaryCitation?.sourceFile,
            sourceLocation: primaryCitation?.sourceLocation,
            excerpt: primaryCitation?.excerpt,
            confidence: finding?.confidence ?? undefined,
            status: finding?.status ?? undefined,
        })
    }

    if (items.length === 0) {
        const allText = [
            ...synthesis.redFlags,
            ...synthesis.yellowFlags,
            ...synthesis.crossDocumentConflicts,
            ...synthesis.openQuestions,
            ...synthesis.negotiationLevers,
            ...synthesis.keyTakeaways,
        ]

        for (const text of allText) {
            if (!addBackPattern.test(text)) continue
            const amountMatch = text.match(/\$[\d,]+(?:\.\d+)?[KkMm]?|\d+(?:,\d{3})+/)
            let amount: number | null = null
            if (amountMatch) {
                const raw = amountMatch[0].replace(/[$,]/g, '')
                amount = parseFloat(raw)
                if (/[Kk]$/.test(amountMatch[0])) amount *= 1000
                if (/[Mm]$/.test(amountMatch[0])) amount *= 1_000_000
            }

            const isUnsupported = /unsupported|unsubstantiated|cannot.+verif|no.+documentation|question/i.test(text)
            const isPartial = /partial|some|limited|unclear|inconsisten/i.test(text)
            const category = classifyAddBackCategory(text)

            items.push({
                id: `item-fallback-${idx++}`,
                label: text.length > 80 ? text.slice(0, 77) + '…' : text,
                amount,
                quality: isUnsupported ? 'unsupported' : isPartial ? 'partial' : 'supported',
                category,
                detail: text,
            })
        }
    }

    return items
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
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const items = useMemo(() => parseAddBacksFromSynthesis(synthesis, facts), [synthesis, facts])

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

    if (items.length === 0) return null

    const toggleDisallowed = (id: string) => {
        setDisallowedMap((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    const overall = getOverallQuality(items)
    const totalAmount = items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const addBacksAsPercentOfRevenue = revenue && totalAmount > 0 ? totalAmount / revenue : null

    const reportedEbitda = typeof model.ebitda === 'number' && model.ebitda > 0
        ? model.ebitda
        : (facts.reported_ebitda?.value || 1250000)

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
                        {totalAmount > 0 && <Badge variant="outline">{money(totalAmount)} total add-backs</Badge>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
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
                            <p className="text-xs text-muted-foreground">Supported</p>
                            <p className="text-lg font-semibold text-success">{items.filter((i) => i.quality === 'supported').length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Partial</p>
                            <p className="text-lg font-semibold text-warning">{items.filter((i) => i.quality === 'partial').length}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Unsupported</p>
                            <p className="text-lg font-semibold text-destructive">{items.filter((i) => i.quality === 'unsupported').length}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Disallowed by Buyer</p>
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{repricing.disallowedCount} items ({money(repricing.disallowedAmount)})</p>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground">
                    Check or uncheck boxes to simulate SBA lender add-back exclusions. Quality scores reflect documentary evidence in uploaded files.
                </p>
            </CardContent>
        </Card>
    )
}
