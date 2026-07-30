import { useMemo, useState } from 'react'
import { Grid3x3 } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    synthesis?: ProjectSynthesisItem
}

type RiskItem = {
    text: string
    likelihood: 'high' | 'medium' | 'low'
    impact: 'high' | 'medium' | 'low'
}

const HIGH_IMPACT_KEYWORDS = ['revenue', 'customer', 'concentration', 'decline', 'loss', 'fraud', 'legal', 'lawsuit', 'regulatory', 'debt', 'covenant', 'default', 'insolvency']
const HIGH_LIKELIHOOD_KEYWORDS = ['confirmed', 'documented', 'observed', 'current', 'ongoing', 'existing', 'already', 'recurring', 'pattern', 'trend']
const LOW_IMPACT_KEYWORDS = ['minor', 'small', 'cosmetic', 'formatting', 'documentation', 'administrative', 'clerical']

function classifyRisk(text: string): { likelihood: RiskItem['likelihood']; impact: RiskItem['impact'] } {
    const lower = text.toLowerCase()
    const isHighImpact = HIGH_IMPACT_KEYWORDS.some(k => lower.includes(k))
    const isHighLikelihood = HIGH_LIKELIHOOD_KEYWORDS.some(k => lower.includes(k))
    const isLowImpact = LOW_IMPACT_KEYWORDS.some(k => lower.includes(k))

    const impact = isHighImpact ? 'high' : isLowImpact ? 'low' : 'medium'
    const likelihood = isHighLikelihood ? 'high' : 'medium'

    return { likelihood, impact }
}

function QuadrantList({ items }: { items: RiskItem[] }) {
    const [expanded, setExpanded] = useState(false)
    if (items.length === 0) return <p className="text-xs text-muted-foreground italic">None</p>

    const visibleItems = expanded ? items : items.slice(0, 3)

    return (
        <div className="space-y-1">
            {visibleItems.map((r, i) => (
                <div key={i} className="border-b border-border/10 pb-1.5 mb-1.5 last:border-0 last:mb-0">
                    <p className="text-xs sm:text-sm font-semibold leading-relaxed text-foreground whitespace-normal">
                        • {r.text}
                    </p>
                </div>
            ))}
            {items.length > 3 && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] font-black text-primary hover:underline focus:outline-none block mt-1"
                >
                    {expanded ? 'Show less' : `+${items.length - 3} more`}
                </button>
            )}
        </div>
    )
}

export default function RiskMatrixCard({ synthesis }: Props) {
    const risks = useMemo(() => {
        if (!synthesis?.redFlags?.length && !synthesis?.yellowFlags?.length) return []
        const items: RiskItem[] = []
        for (const flag of synthesis?.redFlags ?? []) {
            const { likelihood, impact } = classifyRisk(flag)
            items.push({ text: flag, likelihood, impact })
        }
        for (const flag of synthesis?.yellowFlags ?? []) {
            const { likelihood, impact } = classifyRisk(flag)
            if (impact === 'high') {
                items.push({ text: flag, likelihood, impact: 'medium' })
            } else {
                items.push({ text: flag, likelihood, impact: 'low' })
            }
        }
        return items
    }, [synthesis])

    if (risks.length === 0) return null

    const quadrants = {
        highHigh: risks.filter(r => r.impact === 'high' && r.likelihood === 'high'),
        highMed: risks.filter(r => r.impact === 'high' && (r.likelihood === 'medium' || r.likelihood === 'low')),
        medHigh: risks.filter(r => r.impact === 'medium' && r.likelihood === 'high'),
        low: risks.filter(r => r.impact === 'low' || (r.impact === 'medium' && r.likelihood !== 'high')),
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Grid3x3 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Risk matrix</CardTitle>
                    </div>
                    <Badge variant="outline">{risks.length} risks mapped</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3.5 dark:border-red-900 dark:bg-red-950/30">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400">Critical — Act now</p>
                        <p className="text-[10px] text-muted-foreground mb-2">High impact + high likelihood</p>
                        <QuadrantList items={quadrants.highHigh} />
                    </div>
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900 dark:bg-amber-950/30">
                        <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Monitor — High impact</p>
                        <p className="text-[10px] text-muted-foreground mb-2">High impact + lower likelihood</p>
                        <QuadrantList items={quadrants.highMed} />
                    </div>
                    <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-3.5 dark:border-orange-900 dark:bg-orange-950/30">
                        <p className="text-xs font-bold uppercase tracking-wide text-orange-700 dark:text-orange-400">Investigate — Likely</p>
                        <p className="text-[10px] text-muted-foreground mb-2">Medium impact + high likelihood</p>
                        <QuadrantList items={quadrants.medHigh} />
                    </div>
                    <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-900/30">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-400">Accept — Low priority</p>
                        <p className="text-[10px] text-muted-foreground mb-2">Low impact or low likelihood</p>
                        <QuadrantList items={quadrants.low} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
