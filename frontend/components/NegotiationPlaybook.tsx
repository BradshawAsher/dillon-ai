import { useState, useMemo } from 'react'
import { Handshake, ChevronDown, ChevronUp, DollarSign, Target, Sparkles, Check, ArrowRight, Undo2 } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { parseDocumentedFacts } from '../utils/evidence'
import { extractDollarFromText } from '../utils/valuationBridge'

type Props = {
    synthesis?: ProjectSynthesisItem
    model: DealModel
    onUpdateDealModel?: (updates: Partial<DealModel>) => void
}

type PlaybookItem = {
    id: string
    tactic: string
    source: string
    priority: 'high' | 'medium' | 'low'
    estimatedImpact: string
    action?: {
        label: string
        updates: Partial<DealModel>
    }
}

function buildPlaybook(synthesis: ProjectSynthesisItem, model: DealModel): PlaybookItem[] {
    const items: PlaybookItem[] = []
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const normalizedEbitda = typeof facts.ebitda_sde?.value === 'number' && facts.ebitda_sde.value > 0
        ? facts.ebitda_sde.value
        : 0
    const reportedEbitda = typeof facts.reported_ebitda?.value === 'number' && facts.reported_ebitda.value >= normalizedEbitda
        ? facts.reported_ebitda.value
        : facts.ebitda_sde?.isOverridden && typeof facts.ebitda_sde.originalAiValue === 'number'
            ? facts.ebitda_sde.originalAiValue
            : normalizedEbitda

    const price = model.purchasePrice ?? model.askingPrice ?? 0
    const entryMultiple = price > 0 && normalizedEbitda > 0
        ? price / normalizedEbitda
        : (model.ebitdaMultiple ?? 4.5)

    const disallowedAddbacks = Math.max(0, reportedEbitda - normalizedEbitda)

    let idx = 0
    for (const lever of (synthesis.negotiationLevers || [])) {
        const lower = lever.toLowerCase()
        const id = `lever-${idx++}`
        let priority: 'high' | 'medium' | 'low' = 'medium'
        let impact = 'TBD'
        let action: PlaybookItem['action'] | undefined = undefined

        const extractedDollar = extractDollarFromText(lever)

        if (lower.includes('seller note') || lower.includes('note') || lower.includes('holdback')) {
            priority = 'high'
            const targetDollar = extractedDollar || (price > 0 ? Math.round(price * 0.15) : null)
            impact = targetDollar
                ? `$${targetDollar.toLocaleString()} Seller Note / Escrow Holdback`
                : 'Structure 15% Seller Note holdback'
            if (targetDollar) {
                action = {
                    label: `Apply $${(targetDollar / 1000).toFixed(0)}K to Seller Note`,
                    updates: { sellerNoteAmount: targetDollar },
                }
            }
        } else if (lower.includes('add-back') || lower.includes('addback') || lower.includes('perk') || lower.includes('disallow')) {
            priority = 'high'
            if (disallowedAddbacks > 0) {
                const totalDeduction = Math.round(disallowedAddbacks * entryMultiple)
                impact = `Deduct $${totalDeduction.toLocaleString()} ($${disallowedAddbacks.toLocaleString()} add-backs @ ${entryMultiple.toFixed(1)}x)`
                action = {
                    label: `Reduce Price by $${(totalDeduction / 1000).toFixed(0)}K`,
                    updates: { purchasePrice: Math.max(0, price - totalDeduction) },
                }
            } else if (extractedDollar) {
                impact = `Reduce price by $${extractedDollar.toLocaleString()} for unproven perks`
                action = {
                    label: `Reduce Price by $${(extractedDollar / 1000).toFixed(0)}K`,
                    updates: { purchasePrice: Math.max(0, price - extractedDollar) },
                }
            } else {
                const estDeduction = price > 0 ? Math.round(price * 0.05) : 0
                impact = estDeduction > 0 ? `$${estDeduction.toLocaleString()} estimated price haircut (5%)` : '5% price reduction'
                if (estDeduction > 0) {
                    action = {
                        label: `Deduct 5% ($${(estDeduction / 1000).toFixed(0)}K) from Price`,
                        updates: { purchasePrice: Math.max(0, price - estDeduction) },
                    }
                }
            }
        } else if (lower.includes('working capital') || lower.includes('inventory') || lower.includes('peg')) {
            priority = 'medium'
            const targetDollar = extractedDollar || (price > 0 ? Math.round(price * 0.03) : null)
            impact = targetDollar
                ? `$${targetDollar.toLocaleString()} Working Capital Peg Adjustment`
                : '3% Working Capital Peg adjustment'
            if (targetDollar) {
                action = {
                    label: `Set Working Capital Peg to $${(targetDollar / 1000).toFixed(0)}K`,
                    updates: { workingCapitalRequirement: targetDollar },
                }
            }
        } else if (lower.includes('customer') || lower.includes('concentration') || lower.includes('churn')) {
            priority = 'high'
            const targetEscrow = extractedDollar || (normalizedEbitda > 0 ? Math.round(normalizedEbitda * 0.5) : (price > 0 ? Math.round(price * 0.10) : null))
            impact = targetEscrow
                ? `$${targetEscrow.toLocaleString()} Special Escrow Indemnity`
                : '0.5x EBITDA / 10% Special Escrow Holdback'
            if (targetEscrow) {
                action = {
                    label: `Hold $${(targetEscrow / 1000).toFixed(0)}K in Special Escrow`,
                    updates: { sellerNoteAmount: targetEscrow },
                }
            }
        } else if (lower.includes('earnout') || lower.includes('earn-out') || lower.includes('deferred') || lower.includes('contingent')) {
            priority = 'medium'
            const targetEarnout = extractedDollar || (price > 0 ? Math.round(price * 0.15) : null)
            impact = targetEarnout
                ? `$${targetEarnout.toLocaleString()} deferred to performance earnout`
                : '15% deferred to performance earnout'
        } else if (lower.includes('key person') || lower.includes('management') || lower.includes('transition') || lower.includes('non-compete')) {
            priority = 'medium'
            impact = '12–24 Month Consulting & Non-Compete Agreement'
        } else if (extractedDollar) {
            impact = `$${extractedDollar.toLocaleString()} negotiated adjustment`
            action = {
                label: `Adjust Price by $${(extractedDollar / 1000).toFixed(0)}K`,
                updates: { purchasePrice: Math.max(0, price - extractedDollar) },
            }
        }

        items.push({ id, tactic: lever, source: 'Synthesis Lever', priority, estimatedImpact: impact, action })
    }

    // Include actionable red flags if relevant
    for (const flag of (synthesis.redFlags || []).slice(0, 3)) {
        const lower = flag.toLowerCase()
        const id = `flag-${idx++}`
        if (lower.includes('declin') || lower.includes('drop') || lower.includes('loss') || lower.includes('discrepancy') || lower.includes('liability')) {
            const extractedDollar = extractDollarFromText(flag)
            const targetCut = extractedDollar || (normalizedEbitda > 0 ? Math.round(normalizedEbitda * 0.3) : null)
            const impactStr = targetCut
                ? `-$${targetCut.toLocaleString()} Valuation Haircut`
                : '0.3x Multiple Reduction'
            const action = targetCut && price > 0 ? {
                label: `Apply -$${(targetCut / 1000).toFixed(0)}K Reduction`,
                updates: { purchasePrice: Math.max(0, price - targetCut) },
            } : undefined

            items.push({
                id,
                tactic: `Price / Escrow protection for: ${flag}`,
                source: 'Discovered Red Flag',
                priority: 'high',
                estimatedImpact: impactStr,
                action,
            })
        }
    }

    return items.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.priority] - order[b.priority]
    })
}

export default function NegotiationPlaybook({ synthesis, model, onUpdateDealModel }: Props) {
    const [expanded, setExpanded] = useState(false)
    const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())
    const [previousValues, setPreviousValues] = useState<Record<string, Partial<DealModel>>>({})

    const playbook = useMemo(() => {
        if (!synthesis || !(synthesis.negotiationLevers?.length || synthesis.redFlags?.length)) return []
        return buildPlaybook(synthesis, model)
    }, [synthesis, model])

    if (playbook.length === 0) return null

    const visible = expanded ? playbook : playbook.slice(0, 4)
    const priorityColors = { high: 'text-destructive', medium: 'text-amber-600 dark:text-amber-400', low: 'text-muted-foreground' }

    const handleApplyTactic = (item: PlaybookItem) => {
        if (!item.action || !onUpdateDealModel) return
        const prevUpdates: Partial<DealModel> = {}
        for (const key of Object.keys(item.action.updates) as Array<keyof DealModel>) {
            prevUpdates[key] = (model[key] ?? null) as any
        }
        setPreviousValues((prev) => ({ ...prev, [item.id]: prevUpdates }))
        onUpdateDealModel(item.action.updates)
        setAppliedIds((prev) => new Set([...prev, item.id]))
    }

    const handleUnapplyTactic = (item: PlaybookItem) => {
        if (!onUpdateDealModel) return
        const prior = previousValues[item.id]
        if (prior) {
            onUpdateDealModel(prior)
        }
        setAppliedIds((prev) => {
            const next = new Set(prev)
            next.delete(item.id)
            return next
        })
    }

    return (
        <Card className="overflow-hidden border-border/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border bg-card/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Handshake className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base font-bold text-foreground">Negotiation playbook &amp; deal levers</CardTitle>
                        <CardInfoPopover cardId="negotiation-playbook" />
                        <Badge variant="secondary" className="text-[10px]">{playbook.length} tactics</Badge>
                    </div>
                    <button
                        type="button"
                        onClick={() => document.getElementById('negotiation-valuation-bridge')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline cursor-pointer"
                    >
                        Jump to contract clauses
                        <ArrowRight className="h-3 w-3" />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="space-y-2.5">
                    {visible.map((item) => {
                        const isApplied = appliedIds.has(item.id)
                        return (
                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-background p-3.5 transition-colors hover:border-primary/40">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                    <Target className={`mt-0.5 h-4 w-4 shrink-0 ${priorityColors[item.priority]}`} />
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <p className="text-sm font-semibold leading-snug text-foreground">{item.tactic}</p>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span className="flex items-center gap-0.5 font-medium text-muted-foreground">
                                                <DollarSign className="h-3.5 w-3.5 text-primary" />
                                                <strong className="text-foreground">{item.estimatedImpact}</strong>
                                            </span>
                                            <span className="text-muted-foreground/40">•</span>
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                                {item.priority} priority
                                            </Badge>
                                            <span className="text-[11px] text-muted-foreground">({item.source})</span>
                                        </div>
                                    </div>
                                </div>

                                {item.action && onUpdateDealModel ? (
                                    <div className="shrink-0 self-end sm:self-center">
                                        {isApplied ? (
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <Check className="h-3.5 w-3.5" />
                                                    Applied
                                                </span>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleUnapplyTactic(item)}
                                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                                                    title="Revert this tactic and restore prior model values"
                                                >
                                                    <Undo2 className="h-3 w-3 mr-1" />
                                                    Unapply
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleApplyTactic(item)}
                                                className="h-8 gap-1.5 text-xs font-semibold border-primary/30 hover:bg-primary/10 hover:border-primary cursor-pointer"
                                                title="Inject this deduction or escrow holdback directly into your Deal Model capital stack"
                                            >
                                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                                {item.action.label}
                                            </Button>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                </div>

                {playbook.length > 4 && (
                    <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="mt-1 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                        {expanded ? <><ChevronUp className="h-3.5 w-3.5" /> Show less</> : <><ChevronDown className="h-3.5 w-3.5" /> Show all {playbook.length} tactics</>}
                    </button>
                )}
            </CardContent>
        </Card>
    )
}
