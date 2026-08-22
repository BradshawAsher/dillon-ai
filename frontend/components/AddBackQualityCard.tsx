import { useMemo } from 'react'
import { BadgeCheck, CircleAlert, Scale } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { buildDocumentLinkedEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'

type AddBackItem = {
    label: string
    amount: number | null
    quality: 'supported' | 'partial' | 'unsupported'
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

function parseAddBacksFromSynthesis(synthesis: ProjectSynthesisItem | undefined, facts: Record<string, { value?: number; status?: string; provenance?: string }>): AddBackItem[] {
    const items: AddBackItem[] = []

    const totalAddBacks = facts.add_backs
    if (totalAddBacks && typeof totalAddBacks.value === 'number' && totalAddBacks.value > 0) {
        items.push({
            label: 'Total reported add-backs',
            amount: totalAddBacks.value,
            quality: totalAddBacks.status === 'confirmed' ? 'supported' : 'partial',
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

        items.push({
            label: finding.text.length > 80 ? finding.text.slice(0, 77) + '…' : finding.text,
            amount,
            quality: isUnsupported ? 'unsupported' : isPartial ? 'partial' : 'supported',
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

            items.push({
                label: text.length > 80 ? text.slice(0, 77) + '…' : text,
                amount,
                quality: isUnsupported ? 'unsupported' : isPartial ? 'partial' : 'supported',
                detail: text,
            })
        }
    }

    return items
}

function getOverallQuality(items: AddBackItem[]): { label: string; variant: 'success' | 'warning' | 'destructive' } {
    if (items.length === 0) return { label: 'No add-backs found', variant: 'success' }
    const unsupported = items.filter((i) => i.quality === 'unsupported').length
    const partial = items.filter((i) => i.quality === 'partial').length
    if (unsupported > 0) return { label: 'Add-backs need verification', variant: 'destructive' }
    if (partial > 0) return { label: 'Partially supported', variant: 'warning' }
    return { label: 'Well-supported', variant: 'success' }
}

export default function AddBackQualityCard({ model, synthesis, documents = [], onOpenEvidence }: { model: DealModel; synthesis?: ProjectSynthesisItem; documents?: SubmissionHistoryItem[]; onOpenEvidence?: (item: EvidenceItem) => void }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const items = useMemo(() => parseAddBacksFromSynthesis(synthesis, facts), [synthesis, facts])

    if (items.length === 0) return null

    const overall = getOverallQuality(items)
    const totalAmount = items.reduce((sum, item) => sum + (item.amount ?? 0), 0)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const addBacksAsPercentOfRevenue = revenue && totalAmount > 0 ? totalAmount / revenue : null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Add-back quality</CardTitle>
                            <CardInfoPopover cardId="add-back-quality" />
                        </div>
                        <CardDescription className="mt-1">
                            Are claimed EBITDA add-backs independently substantiated by uploaded documents?
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={overall.variant}>{overall.label}</Badge>
                        {totalAmount > 0 && <Badge variant="outline">{money(totalAmount)} total</Badge>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
                {addBacksAsPercentOfRevenue !== null && addBacksAsPercentOfRevenue > 0.15 && (
                    <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <p className="text-sm text-foreground">
                            Add-backs represent <strong>{(addBacksAsPercentOfRevenue * 100).toFixed(1)}%</strong> of revenue — elevated for the category. Each line item should be individually verified with supporting schedules.
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    {items.map((item, index) => {
                        return (
                            <button
                                key={index}
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
                                className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40"
                            >
                                {item.quality === 'supported' ? (
                                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                                ) : item.quality === 'partial' ? (
                                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                                ) : (
                                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant={item.quality === 'supported' ? 'success' : item.quality === 'partial' ? 'warning' : 'destructive'}>
                                            {item.quality === 'supported' ? 'Supported' : item.quality === 'partial' ? 'Partial' : 'Unsupported'}
                                        </Badge>
                                        {item.amount !== null && <Badge variant="outline">{money(item.amount)}</Badge>}
                                    </div>
                                    <p className="mt-1.5 text-sm leading-6 text-foreground">{item.detail}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>

                <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/20 p-3">
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
                    {addBacksAsPercentOfRevenue !== null && (
                        <div className="ml-auto">
                            <p className="text-xs text-muted-foreground">% of Revenue</p>
                            <p className="text-lg font-semibold text-foreground">{(addBacksAsPercentOfRevenue * 100).toFixed(1)}%</p>
                        </div>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">
                    Quality scores are based on whether supporting documentation exists in uploaded files. Click any item for source evidence.
                </p>
            </CardContent>
        </Card>
    )
}
