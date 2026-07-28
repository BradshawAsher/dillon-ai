import { useMemo } from 'react'
import { Gem } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type Criterion = {
    label: string
    yourValue: string
    benchmark: string
    score: number
    maxScore: number
}

function ScoreBar({ score, max }: { score: number; max: number }) {
    const pct = max > 0 ? (score / max) * 100 : 0
    const color = pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 rounded-full bg-muted">
                <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 text-right text-[10px] font-medium text-muted-foreground">{score}/{max}</span>
        </div>
    )
}

export default function OpportunityScoreCard({ model, synthesis }: Props) {
    const { criteria, overall, maxOverall } = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const items: Criterion[] = []

        if (price && ebitda && ebitda > 0) {
            const mult = price / ebitda
            const score = mult <= 3.0 ? 5 : mult <= 4.0 ? 4 : mult <= 5.0 ? 3 : mult <= 6.0 ? 2 : 1
            items.push({ label: 'EBITDA Multiple', yourValue: `${mult.toFixed(1)}x`, benchmark: '3.0–4.0x industry', score, maxScore: 5 })
        }

        if (price && revenue && revenue > 0) {
            const revMult = price / revenue
            const score = revMult <= 0.7 ? 5 : revMult <= 1.0 ? 4 : revMult <= 1.5 ? 3 : revMult <= 2.0 ? 2 : 1
            items.push({ label: 'Revenue Multiple', yourValue: `${revMult.toFixed(2)}x`, benchmark: '0.8–1.2x industry', score, maxScore: 5 })
        }

        if (revenue && revenue > 0 && ebitda) {
            const margin = (ebitda / revenue) * 100
            const score = margin >= 30 ? 5 : margin >= 25 ? 4 : margin >= 20 ? 3 : margin >= 15 ? 2 : 1
            items.push({ label: 'EBITDA Margin', yourValue: `${margin.toFixed(0)}%`, benchmark: '20–30% industry', score, maxScore: 5 })
        }

        if (price && ebitda && ebitda > 0) {
            const payback = price / ebitda
            const score = payback <= 3 ? 5 : payback <= 4 ? 4 : payback <= 5 ? 3 : payback <= 6 ? 2 : 1
            items.push({ label: 'Payback Period', yourValue: `${payback.toFixed(1)} yrs`, benchmark: '3–4 yrs standard', score, maxScore: 5 })
        }

        if (synthesis) {
            const redCount = synthesis.redFlags?.length ?? 0
            const score = redCount === 0 ? 5 : redCount <= 1 ? 4 : redCount <= 3 ? 3 : redCount <= 5 ? 2 : 1
            items.push({ label: 'Risk Profile', yourValue: `${redCount} red flags`, benchmark: '0–2 typical', score, maxScore: 5 })
        }

        const total = items.reduce((s, c) => s + c.score, 0)
        const max = items.reduce((s, c) => s + c.maxScore, 0)
        return { criteria: items, overall: total, maxOverall: max }
    }, [model, synthesis])

    if (criteria.length < 2) return null

    const overallPct = maxOverall > 0 ? Math.round((overall / maxOverall) * 100) : 0
    const overallColor = overallPct >= 75 ? 'text-green-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Gem className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Opportunity score</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black ${overallColor}`}>{overallPct}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {criteria.map(c => (
                        <div key={c.label}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-foreground">{c.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-foreground">{c.yourValue}</span>
                                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">{c.benchmark}</Badge>
                                </div>
                            </div>
                            <ScoreBar score={c.score} max={c.maxScore} />
                        </div>
                    ))}
                </div>
                <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Overall opportunity</span>
                        <span className={`text-sm font-bold ${overallColor}`}>
                            {overallPct >= 75 ? 'Strong opportunity' : overallPct >= 50 ? 'Moderate opportunity' : 'Weak opportunity'}
                        </span>
                    </div>
                    <div className="mt-2 h-3 rounded-full bg-muted">
                        <div
                            className={`h-3 rounded-full transition-all ${overallPct >= 75 ? 'bg-green-500' : overallPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${overallPct}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
