import { useMemo } from 'react'
import { Umbrella } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type Protection = {
    label: string
    status: 'active' | 'partial' | 'none'
    detail: string
}

export default function DownsideProtectionCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const protections: Protection[] = []

        const entryMult = price / ebitda
        protections.push({
            label: 'Conservative entry multiple',
            status: entryMult <= 3.5 ? 'active' : entryMult <= 5 ? 'partial' : 'none',
            detail: entryMult <= 3.5 ? `${entryMult.toFixed(1)}x — strong downside buffer` : entryMult <= 5 ? `${entryMult.toFixed(1)}x — moderate protection` : `${entryMult.toFixed(1)}x — limited margin of safety`,
        })

        const sellerNote = model.sellerNoteAmount ?? 0
        protections.push({
            label: 'Seller financing alignment',
            status: sellerNote > price * 0.15 ? 'active' : sellerNote > 0 ? 'partial' : 'none',
            detail: sellerNote > price * 0.15 ? `${Math.round((sellerNote / price) * 100)}% seller-financed — seller has skin in the game` : sellerNote > 0 ? `${Math.round((sellerNote / price) * 100)}% seller-financed — some alignment` : 'No seller note — seller walks clean at close',
        })

        const debt = model.seniorDebtAmount ?? 0
        const totalDebt = debt + sellerNote
        const leverage = totalDebt / ebitda
        protections.push({
            label: 'Manageable leverage',
            status: leverage <= 2.5 ? 'active' : leverage <= 4 ? 'partial' : 'none',
            detail: leverage <= 2.5 ? `${leverage.toFixed(1)}x Debt/EBITDA — conservative` : leverage <= 4 ? `${leverage.toFixed(1)}x Debt/EBITDA — standard` : `${leverage.toFixed(1)}x Debt/EBITDA — aggressive`,
        })

        const margin = revenue && revenue > 0 ? ebitda / revenue : (model.baseEbitdaMargin ?? 0.20)
        protections.push({
            label: 'Margin of safety in operations',
            status: margin >= 0.25 ? 'active' : margin >= 0.15 ? 'partial' : 'none',
            detail: margin >= 0.25 ? `${(margin * 100).toFixed(0)}% margin — room to absorb revenue dips` : margin >= 0.15 ? `${(margin * 100).toFixed(0)}% margin — limited buffer` : `${(margin * 100).toFixed(0)}% margin — vulnerable to any revenue decline`,
        })

        const wc = model.workingCapitalRequirement ?? 0
        protections.push({
            label: 'Working capital cushion',
            status: wc > 0 ? 'active' : 'none',
            detail: wc > 0 ? `$${wc.toLocaleString()} working capital included` : 'No explicit working capital — may need injection post-close',
        })

        const equity = model.equityAmount ?? (price - totalDebt)
        const equityPct = equity / price
        protections.push({
            label: 'Adequate equity stake',
            status: equityPct >= 0.30 ? 'active' : equityPct >= 0.15 ? 'partial' : 'none',
            detail: equityPct >= 0.30 ? `${Math.round(equityPct * 100)}% equity — strong commitment, lenders reassured` : equityPct >= 0.15 ? `${Math.round(equityPct * 100)}% equity — minimum for most lenders` : `${Math.round(equityPct * 100)}% equity — highly leveraged`,
        })

        const activeCount = protections.filter(p => p.status === 'active').length
        const partialCount = protections.filter(p => p.status === 'partial').length
        const score = activeCount * 2 + partialCount

        return { protections, activeCount, score, maxScore: protections.length * 2 }
    }, [model])

    if (!data) return null

    const scorePct = (data.score / data.maxScore) * 100
    const level = scorePct >= 70 ? 'Well Protected' : scorePct >= 40 ? 'Moderately Protected' : 'Exposed'
    const levelColor = scorePct >= 70 ? 'text-green-600' : scorePct >= 40 ? 'text-amber-600' : 'text-red-600'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Umbrella className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Downside protection</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Structural safeguards against adverse scenarios.
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${levelColor}`}>{level}</span>
                    <span className="text-xs font-mono text-muted-foreground">{data.activeCount}/{data.protections.length} active</span>
                </div>

                <div className="space-y-2">
                    {data.protections.map((p, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className={`mt-0.5 text-sm ${p.status === 'active' ? 'text-green-600' : p.status === 'partial' ? 'text-amber-600' : 'text-red-600/50'}`}>
                                {p.status === 'active' ? '●' : p.status === 'partial' ? '◐' : '○'}
                            </span>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-foreground">{p.label}</p>
                                <p className="text-[10px] text-muted-foreground">{p.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
