import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts, getEvidenceStatusPresentation } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import InfoTip from './InfoTip'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type StatItem = {
    label: string
    value: string
    formula: string
    status: 'good' | 'neutral' | 'warning'
    /** Plain-language explanation of what the metric means. */
    tip: string
}

function money(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
}

/** Full-precision, comma-separated dollar amount for hover/screen-reader detail. */
function moneyExact(val: number): string {
    return `$${Math.round(val).toLocaleString()}`
}

export default function DealStatsGridCard({ model }: Props) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null)

    // The whole grid is derived from the same handful of documented facts, so a
    // single status badge (Confirmed / Estimated / Illustrative) tells the
    // viewer how much authority these numbers carry before they read them.
    const factStatus = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const primary = [facts.revenue, facts.ebitda_sde, facts.total_assets, facts.total_liabilities]
            .find((fact) => fact && typeof fact.value === 'number')
        if (!primary) return null
        const presentation = getEvidenceStatusPresentation(primary.status, primary.provenance)
        const confidence = typeof primary.confidence === 'number'
            ? `${Math.round(primary.confidence <= 1 ? primary.confidence * 100 : primary.confidence)}%`
            : null
        return { ...presentation, confidence }
    }, [model.documentedFactsJson])

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
                formula: `Purchase Price + Debt = ${moneyExact(price)} + ${moneyExact(totalLiabilities ?? 0)} = ${moneyExact(ev)}`,
                status: 'neutral',
                tip: 'The total cost to acquire the business including assumed debt — what a buyer effectively pays for the whole enterprise, not just its equity.',
            })
        }

        if (ebitda && price && price > 0) {
            const annualRoi = (ebitda / price) * 100
            items.push({
                label: 'Annual ROI',
                value: `${annualRoi.toFixed(1)}%`,
                formula: `EBITDA / Purchase Price = ${moneyExact(ebitda)} / ${moneyExact(price)}`,
                status: annualRoi >= 25 ? 'good' : annualRoi >= 15 ? 'neutral' : 'warning',
                tip: "The unlevered yearly return if you paid all cash — annual earnings as a percentage of the price. Higher is better; 25%+ is strong.",
            })
        }

        if (ebitda && price && ebitda > 0) {
            const payback = price / ebitda
            items.push({
                label: 'Payback Period',
                value: `${payback.toFixed(1)} yrs`,
                formula: `Purchase Price / EBITDA = ${moneyExact(price)} / ${moneyExact(ebitda)}`,
                status: payback <= 3.5 ? 'good' : payback <= 5 ? 'neutral' : 'warning',
                tip: 'How many years of current earnings it takes to recoup the purchase price. Shorter is better; under 3.5 years is attractive.',
            })
        }

        if (totalAssets && totalLiabilities != null) {
            const coverage = totalAssets / (totalLiabilities || 1)
            items.push({
                label: 'Asset Coverage',
                value: `${coverage.toFixed(2)}x`,
                formula: `Total Assets / Total Liabilities = ${moneyExact(totalAssets)} / ${moneyExact(totalLiabilities)}`,
                status: coverage >= 2 ? 'good' : coverage >= 1.2 ? 'neutral' : 'warning',
                tip: 'How many dollars of assets back each dollar of liabilities. Above 2x is healthy; below 1x means liabilities exceed assets.',
            })
        }

        if (revenue && employees && employees > 0) {
            const revPerEmp = revenue / employees
            items.push({
                label: 'Revenue / Employee',
                value: money(revPerEmp),
                formula: `Revenue / Employees = ${moneyExact(revenue)} / ${employees.toLocaleString()}`,
                status: revPerEmp >= 200_000 ? 'good' : revPerEmp >= 100_000 ? 'neutral' : 'warning',
                tip: 'A productivity gauge — revenue generated per head. Higher values suggest an efficient, less labor-intensive operation.',
            })
        }

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            items.push({
                label: 'EBITDA Margin',
                value: `${margin.toFixed(1)}%`,
                formula: `EBITDA / Revenue = ${moneyExact(ebitda)} / ${moneyExact(revenue)}`,
                status: margin >= 25 ? 'good' : margin >= 15 ? 'neutral' : 'warning',
                tip: 'The share of revenue left as operating profit before interest, tax, and depreciation. Higher margins mean a more profitable business.',
            })
        }

        if (totalAssets && totalLiabilities != null) {
            const netWorth = totalAssets - totalLiabilities
            items.push({
                label: 'Net Worth',
                value: money(netWorth),
                formula: `Total Assets - Total Liabilities = ${moneyExact(totalAssets)} - ${moneyExact(totalLiabilities)} = ${moneyExact(netWorth)}`,
                status: netWorth > 0 ? 'good' : 'warning',
                tip: 'Book equity — what would be left for owners if all assets were sold and all liabilities paid. Negative net worth is a red flag.',
            })
        }

        if (totalAssets && totalLiabilities != null && totalAssets > 0) {
            const debtToAsset = totalLiabilities / totalAssets
            items.push({
                label: 'Debt-to-Asset',
                value: `${(debtToAsset * 100).toFixed(0)}%`,
                formula: `Total Liabilities / Total Assets = ${moneyExact(totalLiabilities)} / ${moneyExact(totalAssets)}`,
                status: debtToAsset <= 0.4 ? 'good' : debtToAsset <= 0.6 ? 'neutral' : 'warning',
                tip: 'The portion of assets financed by debt rather than equity. Lower is safer; above 60% signals a heavily leveraged balance sheet.',
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
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Key stats</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {factStatus && (
                            <Badge variant={factStatus.variant} className="text-[10px]">
                                {factStatus.label}{factStatus.confidence ? ` · ${factStatus.confidence}` : ''}
                            </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">Hover a stat for its formula</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <div
                            key={stat.label}
                            tabIndex={0}
                            role="group"
                            aria-label={`${stat.label}: ${stat.value}. ${stat.formula}. ${stat.tip}`}
                            title={stat.formula}
                            className={`rounded-lg border p-3 transition-all outline-none ${statusBg(stat.status)} ${activeIndex === i ? 'ring-1 ring-primary/40 shadow-sm' : ''} focus-visible:ring-2 focus-visible:ring-primary/50`}
                            onMouseEnter={() => setActiveIndex(i)}
                            onMouseLeave={() => setActiveIndex(null)}
                            onFocus={() => setActiveIndex(i)}
                            onBlur={() => setActiveIndex(null)}
                        >
                            <div className="flex items-center gap-1">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                                <InfoTip term={stat.label} definition={stat.tip} />
                            </div>
                            <p className="mt-1 text-xl font-bold text-foreground">{stat.value}</p>
                            {activeIndex === i && (
                                <p className="mt-1.5 border-t border-border/60 pt-1.5 text-[11px] leading-snug text-muted-foreground">
                                    <span className="font-mono">{stat.formula}</span>
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
