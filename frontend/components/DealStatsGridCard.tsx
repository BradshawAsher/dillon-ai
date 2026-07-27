import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type StatItem = {
    label: string
    value: string
    formula: string
    status: 'good' | 'neutral' | 'warning'
}

function money(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
}

export default function DealStatsGridCard({ model, synthesis }: Props) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

    const stats = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const totalAssets = typeof facts.total_assets?.value === 'number' ? facts.total_assets.value : null
        const totalLiabilities = typeof facts.total_liabilities?.value === 'number' ? facts.total_liabilities.value : null
        const employees = typeof facts.employees?.value === 'number' ? facts.employees.value : null
        const items: StatItem[] = []

        if (price && ebitda && ebitda > 0) {
            const ev = price + (totalLiabilities ?? 0)
            items.push({
                label: 'Enterprise Value',
                value: money(ev),
                formula: `Purchase Price + Debt = ${money(price)} + ${money(totalLiabilities ?? 0)}`,
                status: 'neutral',
            })
        }

        if (ebitda && price && price > 0) {
            const annualRoi = (ebitda / price) * 100
            items.push({
                label: 'Annual ROI',
                value: `${annualRoi.toFixed(1)}%`,
                formula: `EBITDA / Purchase Price = ${money(ebitda)} / ${money(price)}`,
                status: annualRoi >= 25 ? 'good' : annualRoi >= 15 ? 'neutral' : 'warning',
            })
        }

        if (ebitda && price && ebitda > 0) {
            const payback = price / ebitda
            items.push({
                label: 'Payback Period',
                value: `${payback.toFixed(1)} yrs`,
                formula: `Purchase Price / EBITDA = ${money(price)} / ${money(ebitda)}`,
                status: payback <= 3.5 ? 'good' : payback <= 5 ? 'neutral' : 'warning',
            })
        }

        if (totalAssets && totalLiabilities != null) {
            const coverage = totalAssets / (totalLiabilities || 1)
            items.push({
                label: 'Asset Coverage',
                value: `${coverage.toFixed(2)}x`,
                formula: `Total Assets / Total Liabilities = ${money(totalAssets)} / ${money(totalLiabilities)}`,
                status: coverage >= 2 ? 'good' : coverage >= 1.2 ? 'neutral' : 'warning',
            })
        }

        if (revenue && employees && employees > 0) {
            const revPerEmp = revenue / employees
            items.push({
                label: 'Revenue / Employee',
                value: money(revPerEmp),
                formula: `Revenue / Employees = ${money(revenue)} / ${employees}`,
                status: revPerEmp >= 200_000 ? 'good' : revPerEmp >= 100_000 ? 'neutral' : 'warning',
            })
        }

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            items.push({
                label: 'EBITDA Margin',
                value: `${margin.toFixed(1)}%`,
                formula: `EBITDA / Revenue = ${money(ebitda)} / ${money(revenue)}`,
                status: margin >= 25 ? 'good' : margin >= 15 ? 'neutral' : 'warning',
            })
        }

        if (totalAssets && totalLiabilities != null) {
            const netWorth = totalAssets - totalLiabilities
            items.push({
                label: 'Net Worth',
                value: money(netWorth),
                formula: `Total Assets - Total Liabilities = ${money(totalAssets)} - ${money(totalLiabilities)}`,
                status: netWorth > 0 ? 'good' : 'warning',
            })
        }

        if (totalAssets && totalLiabilities != null && totalAssets > 0) {
            const debtToAsset = totalLiabilities / totalAssets
            items.push({
                label: 'Debt-to-Asset',
                value: `${(debtToAsset * 100).toFixed(0)}%`,
                formula: `Total Liabilities / Total Assets = ${money(totalLiabilities)} / ${money(totalAssets)}`,
                status: debtToAsset <= 0.4 ? 'good' : debtToAsset <= 0.6 ? 'neutral' : 'warning',
            })
        }

        return items
    }, [model])

    if (stats.length < 2) return null

    const statusBg = (s: StatItem['status']) =>
        s === 'good' ? 'border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10' :
        s === 'warning' ? 'border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10' :
        'border-border bg-background'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Key stats</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Hover for formulas</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <div
                            key={stat.label}
                            className={`relative rounded-lg border p-3 transition-all cursor-default ${statusBg(stat.status)} ${hoveredIndex === i ? 'ring-1 ring-primary/40 shadow-sm' : ''}`}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                            <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
                            {hoveredIndex === i && (
                                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-border bg-popover px-3 py-2 text-[11px] text-muted-foreground shadow-md">
                                    <span className="font-mono">{stat.formula}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
