import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardExplainerPopover from './CardExplainerPopover'
import InPlaceEvidencePopover, { EvidenceDetails } from './InPlaceEvidencePopover'

type Props = {
    model: DealModel
}

function money(val: number): string {
    if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
    if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
}

function computeIRR(cashFlows: number[]): number | null {
    let rate = 0.1
    for (let iter = 0; iter < 100; iter++) {
        let npv = 0
        let dnpv = 0
        for (let t = 0; t < cashFlows.length; t++) {
            const factor = Math.pow(1 + rate, t)
            npv += cashFlows[t] / factor
            if (t > 0) dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1)
        }
        if (Math.abs(npv) < 0.01) return rate
        if (dnpv === 0) break
        rate -= npv / dnpv
        if (rate < -0.99 || rate > 10) break
    }
    return null
}

type MetricItem = {
    label: string
    value: string
    sublabel: string
    status: 'positive' | 'negative' | 'neutral'
    evidence: EvidenceDetails
}

export default function InvestmentMetricsCard({ model }: Props) {
    const metrics = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const price = model.purchasePrice ?? model.askingPrice
        if (!ebitda || !price || ebitda <= 0) return null

        const holdYears = model.holdPeriodYears ?? 5
        const exitMult = model.exitMultiple ?? (price / ebitda)
        const growthRate = model.baseRevenueGrowth ?? 0.05
        const taxRate = model.taxRate ?? 0.25

        const annualCash = ebitda * (1 - taxRate)
        const totalCashFlow = annualCash * holdYears
        const exitEbitda = ebitda * Math.pow(1 + growthRate, holdYears)
        const terminalValue = exitEbitda * exitMult
        const totalReturn = totalCashFlow + terminalValue - price

        const cashFlows = [-price]
        for (let y = 1; y <= holdYears; y++) {
            const yearEbitda = ebitda * Math.pow(1 + growthRate, y)
            const yearCash = yearEbitda * (1 - taxRate)
            if (y === holdYears) {
                cashFlows.push(yearCash + exitEbitda * exitMult)
            } else {
                cashFlows.push(yearCash)
            }
        }

        const irr = computeIRR(cashFlows)
        const totalROI = ((totalReturn) / price) * 100
        const cashFlowMult = (totalCashFlow + terminalValue) / price

        const items: MetricItem[] = []

        items.push({
            label: 'IRR',
            value: irr != null ? `${(irr * 100).toFixed(1)}%` : 'N/A',
            sublabel: `${holdYears}-year hold · ${exitMult.toFixed(1)}x exit`,
            status: irr != null && irr >= 0.15 ? 'positive' : irr != null && irr >= 0 ? 'neutral' : 'negative',
            evidence: {
                metricName: 'Internal Rate of Return (IRR)',
                valueFormatted: irr != null ? `${(irr * 100).toFixed(1)}%` : 'N/A',
                sourceDoc: facts.ebitda_sde?.source_document || 'Financial Model DCF Engine',
                pageNumber: facts.ebitda_sde?.page_number,
                confidence: 'high',
                status: 'confirmed',
                notes: `Annualized rate of return based on initial outflow (-$${price.toLocaleString()}), ${holdYears} annual cashflows, and terminal exit value of $${terminalValue.toLocaleString()}.`,
            },
        })

        items.push({
            label: `Total ${holdYears}-Year Cash Flow`,
            value: money(totalCashFlow),
            sublabel: 'Before terminal value',
            status: totalCashFlow > 0 ? 'positive' : 'negative',
            evidence: {
                metricName: `${holdYears}-Year Cumulative Cash Flow`,
                valueFormatted: money(totalCashFlow),
                sourceDoc: 'Tax & Pro Forma Schedule',
                confidence: 'high',
                status: 'confirmed',
                notes: `Sum of unlevered after-tax cash flows of approx $${(annualCash).toFixed(0)}/yr across the ${holdYears}-year investment horizon.`,
            },
        })

        items.push({
            label: `${holdYears}-Year Total ROI`,
            value: `${totalROI.toFixed(0)}%`,
            sublabel: 'On initial investment',
            status: totalROI >= 50 ? 'positive' : totalROI >= 0 ? 'neutral' : 'negative',
            evidence: {
                metricName: 'Total Return on Investment (ROI)',
                valueFormatted: `${totalROI.toFixed(0)}%`,
                sourceDoc: 'Deal Consideration Analysis',
                confidence: 'high',
                status: 'confirmed',
                notes: `Net profit ($${totalReturn.toLocaleString()}) divided by initial purchase price ($${price.toLocaleString()}).`,
            },
        })

        items.push({
            label: 'Cash Flow Multiple',
            value: `${cashFlowMult.toFixed(2)}x`,
            sublabel: 'Return on invested capital',
            status: cashFlowMult >= 2 ? 'positive' : cashFlowMult >= 1 ? 'neutral' : 'negative',
            evidence: {
                metricName: 'Multiple on Invested Capital (MOIC)',
                valueFormatted: `${cashFlowMult.toFixed(2)}x`,
                sourceDoc: 'LBO / Return Model',
                confidence: 'high',
                status: 'confirmed',
                notes: `Total proceeds ($${(totalCashFlow + terminalValue).toLocaleString()}) divided by entry purchase price.`,
            },
        })

        return items
    }, [model])

    if (!metrics) return null

    const statusColor = (s: MetricItem['status']) =>
        s === 'positive' ? 'text-green-600 dark:text-green-400' :
            s === 'negative' ? 'text-red-600 dark:text-red-400' : 'text-foreground'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Investment metrics</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline">
                            {model.holdPeriodYears ?? 5}yr · {((model.exitMultiple ?? 4).toFixed(1))}x exit
                        </Badge>
                        <CardExplainerPopover
                            title="Underwriting Investment Return Metrics"
                            whatIsIt="Calculates the financial return profile (IRR, MOIC, Total ROI, and Cumulative Cash Flows) from the deal parameters."
                            howItWorks="Projects annual after-tax earnings over the holding period and discounts cash flows against the entry purchase price and terminal exit multiple."
                            whyItMatters="Enables institutional and self-funded buyers to compare prospective acquisitions against their minimum hurdle rate (typically 20-25% IRR)."
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                    <p><strong>IRR</strong> is the annualized return implied by the full cash-flow stream.</p>
                    <p><strong>Cash Flow Multiple / MOIC-style multiple</strong> is total cash back divided by cash invested.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {metrics.map(m => (
                        <InPlaceEvidencePopover key={m.label} evidence={m.evidence}>
                            <div className="rounded-lg border border-border bg-muted/20 p-3 text-center transition-all hover:border-primary/50 hover:bg-muted/40 cursor-pointer">
                                <p className={`text-xl font-bold ${statusColor(m.status)}`}>{m.value}</p>
                                <p className="mt-1 text-[11px] font-medium text-foreground">{m.label}</p>
                                <p className="mt-0.5 text-[9px] text-muted-foreground">{m.sublabel}</p>
                            </div>
                        </InPlaceEvidencePopover>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
