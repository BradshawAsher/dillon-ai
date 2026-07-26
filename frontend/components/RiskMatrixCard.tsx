import { useMemo } from 'react'
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
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Critical — Act now</p>
                        <p className="text-[9px] text-muted-foreground mb-1.5">High impact + high likelihood</p>
                        {quadrants.highHigh.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">None</p>
                        ) : quadrants.highHigh.map((r, i) => (
                            <p key={i} className="text-xs text-foreground truncate" title={r.text}>• {r.text}</p>
                        ))}
                    </div>
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Monitor — High impact</p>
                        <p className="text-[9px] text-muted-foreground mb-1.5">High impact + lower likelihood</p>
                        {quadrants.highMed.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">None</p>
                        ) : quadrants.highMed.map((r, i) => (
                            <p key={i} className="text-xs text-foreground truncate" title={r.text}>• {r.text}</p>
                        ))}
                    </div>
                    <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-3 dark:border-orange-900 dark:bg-orange-950/30">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-400">Investigate — Likely</p>
                        <p className="text-[9px] text-muted-foreground mb-1.5">Medium impact + high likelihood</p>
                        {quadrants.medHigh.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">None</p>
                        ) : quadrants.medHigh.map((r, i) => (
                            <p key={i} className="text-xs text-foreground truncate" title={r.text}>• {r.text}</p>
                        ))}
                    </div>
                    <div className="rounded-lg border-2 border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-400">Accept — Low priority</p>
                        <p className="text-[9px] text-muted-foreground mb-1.5">Low impact or low likelihood</p>
                        {quadrants.low.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">None</p>
                        ) : quadrants.low.slice(0, 4).map((r, i) => (
                            <p key={i} className="text-xs text-foreground truncate" title={r.text}>• {r.text}</p>
                        ))}
                        {quadrants.low.length > 4 && (
                            <p className="text-[10px] text-muted-foreground mt-1">+{quadrants.low.length - 4} more</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
