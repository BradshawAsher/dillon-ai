import { useMemo } from 'react'
import { HeartPulse } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import InPlaceEvidencePopover, { EvidenceDetails } from './InPlaceEvidencePopover'

type Props = {
    model: DealModel
}

type Ratio = {
    name: string
    value: string
    status: 'good' | 'warning' | 'bad' | 'neutral'
    benchmark: string
    evidence: EvidenceDetails
}

export default function FinancialHealthCard({ model }: Props) {
    const ratios = useMemo(() => {
        const results: Ratio[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const grossProfit = typeof facts.gross_profit?.value === 'number' ? facts.gross_profit.value : null
        const totalDebt = typeof facts.total_debt?.value === 'number' ? facts.total_debt.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            results.push({
                name: 'EBITDA Margin',
                value: `${margin.toFixed(1)}%`,
                status: margin >= 25 ? 'good' : margin >= 15 ? 'neutral' : 'bad',
                benchmark: 'SMB avg: 15-25%',
                evidence: {
                    metricName: 'EBITDA / SDE Margin',
                    valueFormatted: `${margin.toFixed(1)}% (${(ebitda / 1000).toFixed(0)}k / ${(revenue / 1000).toFixed(0)}k)`,
                    sourceDoc: facts.ebitda_sde?.source_document || facts.revenue?.source_document || 'P&L Statement / Tax Return',
                    pageNumber: facts.ebitda_sde?.page_number ?? facts.revenue?.page_number,
                    quoteSnippet: facts.ebitda_sde?.quote_snippet || facts.revenue?.quote_snippet,
                    confidence: facts.ebitda_sde?.confidence != null ? String(facts.ebitda_sde.confidence) : 'high',
                    status: 'confirmed',
                    notes: `Calculated as EBITDA ($${ebitda.toLocaleString()}) divided by Revenue ($${revenue.toLocaleString()}). Benchmark is 15-25% for healthy SMBs.`,
                },
            })
        }

        if (revenue && grossProfit) {
            const gpMargin = (grossProfit / revenue) * 100
            results.push({
                name: 'Gross Margin',
                value: `${gpMargin.toFixed(1)}%`,
                status: gpMargin >= 50 ? 'good' : gpMargin >= 30 ? 'neutral' : 'bad',
                benchmark: 'Service: 50%+, Product: 30%+',
                evidence: {
                    metricName: 'Gross Profit Margin',
                    valueFormatted: `${gpMargin.toFixed(1)}% (${(grossProfit / 1000).toFixed(0)}k / ${(revenue / 1000).toFixed(0)}k)`,
                    sourceDoc: facts.gross_profit?.source_document || facts.revenue?.source_document || 'Income Statement',
                    pageNumber: facts.gross_profit?.page_number ?? facts.revenue?.page_number,
                    quoteSnippet: facts.gross_profit?.quote_snippet,
                    confidence: facts.gross_profit?.confidence != null ? String(facts.gross_profit.confidence) : 'high',
                    status: 'confirmed',
                    notes: `Gross Profit ($${grossProfit.toLocaleString()}) over Revenue ($${revenue.toLocaleString()}). Highlights unit economics and pricing power.`,
                },
            })
        }

        if (totalDebt && ebitda) {
            const leverage = totalDebt / ebitda
            results.push({
                name: 'Debt/EBITDA',
                value: `${leverage.toFixed(1)}x`,
                status: leverage <= 2 ? 'good' : leverage <= 3.5 ? 'warning' : 'bad',
                benchmark: 'Healthy: <3x',
                evidence: {
                    metricName: 'Leverage Ratio (Debt/EBITDA)',
                    valueFormatted: `${leverage.toFixed(1)}x ($${totalDebt.toLocaleString()} / $${ebitda.toLocaleString()})`,
                    sourceDoc: facts.total_debt?.source_document || 'Balance Sheet',
                    pageNumber: facts.total_debt?.page_number,
                    quoteSnippet: facts.total_debt?.quote_snippet,
                    confidence: 'high',
                    status: 'confirmed',
                    notes: `Total debt of $${totalDebt.toLocaleString()} against EBITDA of $${ebitda.toLocaleString()}. Ratios above 3.5x indicate elevated debt service burden.`,
                },
            })
        }

        if (price && ebitda) {
            const multiple = price / ebitda
            results.push({
                name: 'Entry Multiple',
                value: `${multiple.toFixed(1)}x`,
                status: multiple <= 3.5 ? 'good' : multiple <= 5 ? 'neutral' : 'bad',
                benchmark: 'SMB: 3-5x typical',
                evidence: {
                    metricName: 'Entry EV / EBITDA Multiple',
                    valueFormatted: `${multiple.toFixed(1)}x ($${price.toLocaleString()} / $${ebitda.toLocaleString()})`,
                    sourceDoc: 'Deal Consideration / CIM',
                    confidence: 'high',
                    status: 'confirmed',
                    notes: `Enterprise valuation multiple of asking/purchase price ($${price.toLocaleString()}) relative to verified annual earnings ($${ebitda.toLocaleString()}).`,
                },
            })
        }

        if (price && revenue) {
            const revMult = price / revenue
            results.push({
                name: 'Price/Revenue',
                value: `${revMult.toFixed(2)}x`,
                status: revMult <= 1 ? 'good' : revMult <= 2 ? 'neutral' : 'bad',
                benchmark: 'SMB: 0.5-2x typical',
                evidence: {
                    metricName: 'Price-to-Revenue Ratio',
                    valueFormatted: `${revMult.toFixed(2)}x ($${price.toLocaleString()} / $${revenue.toLocaleString()})`,
                    sourceDoc: 'Deal Consideration / Revenue Records',
                    confidence: 'high',
                    status: 'confirmed',
                    notes: `Valuation relative to top-line annual revenue. Useful for screening against sector averages.`,
                },
            })
        }

        if (ebitda && model.holdPeriodYears) {
            const payback = (price ?? 0) / ebitda
            if (price) {
                results.push({
                    name: 'Payback Period',
                    value: `${payback.toFixed(1)} yrs`,
                    status: payback <= 3 ? 'good' : payback <= 5 ? 'neutral' : 'bad',
                    benchmark: `Target: <${model.holdPeriodYears} yr hold`,
                    evidence: {
                        metricName: 'Unlevered Payback Period',
                        valueFormatted: `${payback.toFixed(1)} years`,
                        sourceDoc: 'Financial Model Projections',
                        confidence: 'medium',
                        status: 'estimated',
                        notes: `Years of unadjusted earnings required to return the initial acquisition price without leverage.`,
                    },
                })
            }
        }

        return results
    }, [model])

    if (ratios.length === 0) return null

    const statusDot = (s: Ratio['status']) => {
        if (s === 'good') return 'bg-green-500'
        if (s === 'warning') return 'bg-amber-500'
        if (s === 'bad') return 'bg-red-500'
        return 'bg-muted-foreground/50'
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HeartPulse className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Financial health</CardTitle>
                        <CardInfoPopover cardId="financial-health" />
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Click any ratio metric to inspect underlying document evidence and exact formulas
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {ratios.map(r => (
                        <InPlaceEvidencePopover key={r.name} evidence={r.evidence}>
                            <div className="rounded-lg border border-border bg-background p-3 text-left transition-all hover:border-primary/50 hover:bg-muted/20">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2 w-2 rounded-full ${statusDot(r.status)}`} />
                                    <p className="text-xs font-medium text-muted-foreground">{r.name}</p>
                                </div>
                                <p className="mt-1 text-lg font-semibold text-foreground">{r.value}</p>
                                <p className="text-[10px] text-muted-foreground">{r.benchmark}</p>
                            </div>
                        </InPlaceEvidencePopover>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

