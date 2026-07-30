import { useMemo } from 'react'
import { Scale } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type NegotiationLever = {
    label: string
    description: string
    currentValue: string
    negotiatedValue: string
    savingsDollars: number
    savingsPercent: number
    difficulty: 'easy' | 'medium' | 'hard'
}

export default function NegotiationImpactCard({ model }: Props) {
    const levers = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const result: NegotiationLever[] = []

        const priceReduction = price * 0.10
        result.push({
            label: '10% price reduction',
            description: 'Negotiate asking price down by 10%',
            currentValue: `$${price.toLocaleString()}`,
            negotiatedValue: `$${(price - priceReduction).toLocaleString()}`,
            savingsDollars: priceReduction,
            savingsPercent: 10,
            difficulty: 'hard',
        })

        const sellerNote = model.sellerNoteAmount ?? 0
        if (sellerNote === 0) {
            const proposedNote = price * 0.15
            result.push({
                label: 'Add 15% seller note',
                description: 'Reduce upfront cash with deferred seller financing',
                currentValue: '$0',
                negotiatedValue: `$${Math.round(proposedNote).toLocaleString()}`,
                savingsDollars: proposedNote,
                savingsPercent: (proposedNote / price) * 100,
                difficulty: 'medium',
            })
        }

        const currentEquityPct = normalizeEquityFraction(model.equityContributionPercent) * 100
        if (currentEquityPct > 10) {
            const reducedEquityPct = Math.max(10, currentEquityPct - 10)
            const currentEquity = price * (currentEquityPct / 100)
            const reducedEquity = price * (reducedEquityPct / 100)
            result.push({
                label: `Reduce equity to ${reducedEquityPct}%`,
                description: 'Lower down payment, leverage SBA/bank financing',
                currentValue: `$${Math.round(currentEquity).toLocaleString()} (${currentEquityPct}%)`,
                negotiatedValue: `$${Math.round(reducedEquity).toLocaleString()} (${reducedEquityPct}%)`,
                savingsDollars: currentEquity - reducedEquity,
                savingsPercent: ((currentEquity - reducedEquity) / currentEquity) * 100,
                difficulty: 'medium',
            })
        }

        const workingCapital = model.workingCapitalRequirement ?? 0
        if (workingCapital > 0) {
            result.push({
                label: 'Seller retains working capital',
                description: 'Negotiate for seller to fund transition working capital',
                currentValue: `$${workingCapital.toLocaleString()}`,
                negotiatedValue: '$0',
                savingsDollars: workingCapital,
                savingsPercent: (workingCapital / price) * 100,
                difficulty: 'medium',
            })
        }

        const earnoutAmount = ebitda * 0.5
        result.push({
            label: 'Earnout (50% EBITDA)',
            description: 'Defer 50% of one year\'s EBITDA as performance-based earnout',
            currentValue: 'Full payment at close',
            negotiatedValue: `$${Math.round(earnoutAmount).toLocaleString()} deferred`,
            savingsDollars: earnoutAmount,
            savingsPercent: (earnoutAmount / price) * 100,
            difficulty: 'hard',
        })

        const consultingCredit = ebitda * 0.1
        result.push({
            label: 'Transition consulting credit',
            description: '6-month consulting agreement offset against purchase price',
            currentValue: 'No credit',
            negotiatedValue: `$${Math.round(consultingCredit).toLocaleString()} credit`,
            savingsDollars: consultingCredit,
            savingsPercent: (consultingCredit / price) * 100,
            difficulty: 'easy',
        })

        return result.sort((a, b) => b.savingsDollars - a.savingsDollars)
    }, [model])

    if (!levers || levers.length === 0) return null

    const totalPotentialSavings = levers.reduce((sum, l) => sum + l.savingsDollars, 0)
    const price = model.purchasePrice ?? model.askingPrice ?? 0

    const difficultyColor = (d: string) => {
        switch (d) {
            case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            default: return 'bg-muted text-muted-foreground'
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Negotiation impact calculator</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Potential savings from common negotiation levers
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Total potential savings (if all achieved)</p>
                    <p className="text-lg font-bold text-primary">${Math.round(totalPotentialSavings).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">{((totalPotentialSavings / price) * 100).toFixed(0)}% of purchase price</p>
                </div>

                <div className="space-y-2">
                    {levers.map((lever, i) => (
                        <div key={i} className="rounded-lg border border-border p-3 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-xs font-medium text-foreground">{lever.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{lever.description}</p>
                                </div>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-medium ${difficultyColor(lever.difficulty)}`}>
                                    {lever.difficulty}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1">
                                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary transition-all"
                                            style={{ width: `${Math.min(100, lever.savingsPercent * 2)}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-primary shrink-0">
                                    ${Math.round(lever.savingsDollars).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                                <span>Current: {lever.currentValue}</span>
                                <span>Negotiated: {lever.negotiatedValue}</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        These are illustrative scenarios showing what common negotiation tactics could save.
                        Not all levers may be achievable simultaneously. Difficulty reflects typical seller resistance.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
