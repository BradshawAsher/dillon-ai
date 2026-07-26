import { useMemo } from 'react'
import { Lightbulb } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type Insight = {
    text: string
    sentiment: 'positive' | 'negative' | 'neutral'
}

export default function DealQuickInsights({ model, synthesis }: Props) {
    const insights = useMemo(() => {
        const items: Insight[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (price && ebitda) {
            const multiple = price / ebitda
            if (multiple <= 3) items.push({ text: `Entry multiple of ${multiple.toFixed(1)}x — below typical 3-5x range`, sentiment: 'positive' })
            else if (multiple <= 5) items.push({ text: `Entry multiple of ${multiple.toFixed(1)}x — within normal 3-5x range`, sentiment: 'neutral' })
            else items.push({ text: `Entry multiple of ${multiple.toFixed(1)}x — above typical range, needs strong growth thesis`, sentiment: 'negative' })
        }

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            if (margin >= 30) items.push({ text: `${margin.toFixed(0)}% EBITDA margin — strong profitability`, sentiment: 'positive' })
            else if (margin >= 15) items.push({ text: `${margin.toFixed(0)}% EBITDA margin — typical for SMBs`, sentiment: 'neutral' })
            else items.push({ text: `${margin.toFixed(0)}% EBITDA margin — below 15% signals operational issues`, sentiment: 'negative' })
        }

        if (price && ebitda && model.holdPeriodYears) {
            const payback = price / ebitda
            if (payback <= model.holdPeriodYears) {
                items.push({ text: `Payback in ~${payback.toFixed(1)} years — within ${model.holdPeriodYears}-year hold`, sentiment: 'positive' })
            } else {
                items.push({ text: `Payback in ~${payback.toFixed(1)} years — exceeds ${model.holdPeriodYears}-year hold`, sentiment: 'negative' })
            }
        }

        if (synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0' && price) {
            const baseVal = parseFloat(synthesis.valuationBaseEstimate.replace(/[$,]/g, ''))
            if (baseVal > 0) {
                const diff = ((baseVal - price) / price) * 100
                if (diff > 10) items.push({ text: `Price is ${diff.toFixed(0)}% below AI valuation midpoint`, sentiment: 'positive' })
                else if (diff < -10) items.push({ text: `Price is ${Math.abs(diff).toFixed(0)}% above AI valuation midpoint`, sentiment: 'negative' })
                else items.push({ text: `Price is within 10% of AI valuation midpoint`, sentiment: 'neutral' })
            }
        }

        if (synthesis?.redFlags) {
            const count = synthesis.redFlags.length
            if (count === 0) items.push({ text: 'No red flags identified — rare for an SMB deal', sentiment: 'positive' })
            else if (count <= 2) items.push({ text: `${count} red flag${count > 1 ? 's' : ''} — manageable with diligence`, sentiment: 'neutral' })
            else items.push({ text: `${count} red flags — significant risk requires deeper investigation`, sentiment: 'negative' })
        }

        if (model.exitMultiple && ebitda && model.baseRevenueGrowth) {
            const futureEbitda = ebitda * Math.pow(1 + model.baseRevenueGrowth, model.holdPeriodYears ?? 5)
            const exitValue = futureEbitda * model.exitMultiple
            if (price && exitValue > 0) {
                const moic = exitValue / price
                if (moic >= 3) items.push({ text: `Projected ${moic.toFixed(1)}x MOIC at exit — strong return potential`, sentiment: 'positive' })
                else if (moic >= 2) items.push({ text: `Projected ${moic.toFixed(1)}x MOIC at exit — acceptable return`, sentiment: 'neutral' })
                else items.push({ text: `Projected ${moic.toFixed(1)}x MOIC at exit — below 2x target`, sentiment: 'negative' })
            }
        }

        return items.slice(0, 5)
    }, [model, synthesis])

    if (insights.length === 0) return null

    const sentimentIcon = (s: Insight['sentiment']) =>
        s === 'positive' ? '✓' : s === 'negative' ? '!' : '—'
    const sentimentColor = (s: Insight['sentiment']) =>
        s === 'positive' ? 'text-green-600 dark:text-green-400' :
        s === 'negative' ? 'text-red-600 dark:text-red-400' :
        'text-amber-600 dark:text-amber-400'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Quick insights</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2">
                    {insights.map((insight, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${sentimentColor(insight.sentiment)} bg-current/10`}>
                                {sentimentIcon(insight.sentiment)}
                            </span>
                            <span className="text-sm text-foreground">{insight.text}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
