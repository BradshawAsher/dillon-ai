import { useMemo } from 'react'
import { Medal } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
}

type Percentile = {
    label: string
    value: string
    percentile: number
    direction: 'higher-better' | 'lower-better'
}

function pctLabel(pct: number): string {
    if (pct >= 90) return 'Top 10%'
    if (pct >= 75) return 'Top 25%'
    if (pct >= 50) return 'Above median'
    if (pct >= 25) return 'Below median'
    return 'Bottom 25%'
}

function pctColor(pct: number): string {
    if (pct >= 75) return 'bg-green-500'
    if (pct >= 50) return 'bg-emerald-400'
    if (pct >= 25) return 'bg-amber-400'
    return 'bg-red-500'
}

export default function IndustryPercentileCard({ model }: Props) {
    const rankings = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const employees = typeof facts.employees?.value === 'number' ? facts.employees.value : null
        const items: Percentile[] = []

        if (price && ebitda && ebitda > 0) {
            const mult = price / ebitda
            // SMB range 2-7x, lower is better for buyer
            const pct = mult <= 2.5 ? 95 : mult <= 3.0 ? 85 : mult <= 3.5 ? 72 : mult <= 4.0 ? 58 : mult <= 5.0 ? 40 : mult <= 6.0 ? 22 : 8
            items.push({ label: 'Entry Multiple', value: `${mult.toFixed(1)}x`, percentile: pct, direction: 'lower-better' })
        }

        if (price && revenue && revenue > 0) {
            const revMult = price / revenue
            const pct = revMult <= 0.5 ? 92 : revMult <= 0.8 ? 78 : revMult <= 1.0 ? 62 : revMult <= 1.5 ? 45 : revMult <= 2.0 ? 28 : 12
            items.push({ label: 'Revenue Multiple', value: `${revMult.toFixed(2)}x`, percentile: pct, direction: 'lower-better' })
        }

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            const pct = margin >= 35 ? 95 : margin >= 28 ? 82 : margin >= 22 ? 65 : margin >= 15 ? 45 : margin >= 10 ? 28 : 12
            items.push({ label: 'EBITDA Margin', value: `${margin.toFixed(0)}%`, percentile: pct, direction: 'higher-better' })
        }

        if (revenue && employees && employees > 0) {
            const revPerEmp = revenue / employees
            const pct = revPerEmp >= 300_000 ? 92 : revPerEmp >= 200_000 ? 75 : revPerEmp >= 150_000 ? 58 : revPerEmp >= 100_000 ? 38 : 18
            items.push({ label: 'Revenue/Employee', value: revPerEmp >= 1000 ? `$${(revPerEmp / 1000).toFixed(0)}K` : `$${revPerEmp.toFixed(0)}`, percentile: pct, direction: 'higher-better' })
        }

        return items
    }, [model])

    if (rankings.length < 2) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Medal className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Industry percentile</CardTitle>
                    </div>
                    <Badge variant="outline">SMB $1-10M</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-4">
                    {rankings.map(r => (
                        <div key={r.label}>
                            <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-foreground">{r.label}</span>
                                    <span className="text-xs font-bold text-foreground">{r.value}</span>
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground">{pctLabel(r.percentile)}</span>
                            </div>
                            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-3 rounded-full transition-all ${pctColor(r.percentile)}`}
                                    style={{ width: `${r.percentile}%` }}
                                />
                                <div
                                    className="absolute top-0 h-3 w-0.5 bg-foreground/60"
                                    style={{ left: '50%' }}
                                    title="Median"
                                />
                            </div>
                            <div className="flex justify-between mt-0.5">
                                <span className="text-[9px] text-muted-foreground">0th</span>
                                <span className="text-[9px] text-muted-foreground">50th</span>
                                <span className="text-[9px] text-muted-foreground">100th</span>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">
                    Percentiles estimated from typical SMB acquisition transactions ($1-10M revenue). Higher percentile = more favorable for buyer.
                </p>
            </CardContent>
        </Card>
    )
}
