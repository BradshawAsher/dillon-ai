import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type ValueCreationStep = {
    title: string
    description: string
    valueImpact: number
    timelineMonths: number
    difficulty: 'Low' | 'Medium' | 'High'
}

type ValueCreationAnalysis = {
    steps: ValueCreationStep[]
    totalValueCreation: number
    totalInvestment: number
    roi: number
}

export default function ValueCreationPlanCard({ model }: Props) {
    const analysis = useMemo((): ValueCreationAnalysis | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0 || !revenue || revenue <= 0) return null

        const taxRate = model.taxRate ?? 0.25
        const baseRevenueGrowth = model.baseRevenueGrowth ?? 0.05
        const exitMultiple = model.exitMultiple ?? (price / ebitda)
        const entryMultiple = price / ebitda
        const ebitdaMargin = ebitda / revenue
        const workingCapital = model.workingCapitalRequirement ?? (revenue * 0.10)

        // Calculate annual cash flow for debt paydown step
        const equity = price * normalizeEquityFraction(model.equityContributionPercent)
        const debt = price - equity - (model.sellerNoteAmount ?? 0)
        const rate = model.interestRate ?? 0.07
        const amortYears = model.amortizationYears ?? 10
        const monthlyRate = rate / 12
        const nPayments = amortYears * 12
        const monthlyPayment = debt > 0 && monthlyRate > 0
            ? debt * (monthlyRate * Math.pow(1 + monthlyRate, nPayments)) / (Math.pow(1 + monthlyRate, nPayments) - 1)
            : 0
        const annualDebtService = monthlyPayment * 12
        const afterTaxEbitda = ebitda * (1 - taxRate)
        const capex = model.maintenanceCapex ?? 0
        const annualCashFlow = afterTaxEbitda - annualDebtService - capex

        const steps: ValueCreationStep[] = [
            {
                title: 'Revenue growth',
                description: `Grow top-line at ${(baseRevenueGrowth * 100).toFixed(1)}% annually through sales optimization and market expansion`,
                valueImpact: revenue * baseRevenueGrowth * exitMultiple,
                timelineMonths: 12,
                difficulty: 'Medium',
            },
            {
                title: 'Margin improvement',
                description: 'Add 2% to EBITDA margin through operational efficiency, vendor renegotiation, and process automation',
                valueImpact: revenue * 0.02 * exitMultiple,
                timelineMonths: 18,
                difficulty: 'Medium',
            },
            {
                title: 'Working capital optimization',
                description: 'Reduce working capital by 10% through faster collections, inventory management, and payment term negotiation',
                valueImpact: workingCapital * 0.10,
                timelineMonths: 6,
                difficulty: 'Low',
            },
            {
                title: 'Debt paydown',
                description: 'Apply free cash flow to accelerated debt reduction over 2 years to build equity value',
                valueImpact: annualCashFlow > 0 ? 2 * annualCashFlow : 0,
                timelineMonths: 24,
                difficulty: 'Low',
            },
            {
                title: 'Multiple expansion',
                description: `Expand valuation multiple from ${entryMultiple.toFixed(1)}x to ${exitMultiple.toFixed(1)}x through professionalization and growth trajectory`,
                valueImpact: ebitda * (exitMultiple - entryMultiple),
                timelineMonths: 36,
                difficulty: 'High',
            },
        ]

        const totalValueCreation = steps.reduce((sum, s) => sum + Math.max(0, s.valueImpact), 0)
        const totalInvestment = price + (model.transactionFees ?? 0) + (model.workingCapitalRequirement ?? 0)
        const roi = totalInvestment > 0 ? (totalValueCreation / totalInvestment) * 100 : 0

        return { steps, totalValueCreation, totalInvestment, roi }
    }, [model])

    if (!analysis) return null

    const difficultyColors = {
        Low: 'bg-green-100 text-green-700',
        Medium: 'bg-amber-100 text-amber-700',
        High: 'bg-red-100 text-red-700',
    }

    const formatDollars = (value: number) => {
        if (Math.abs(value) >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(1)}M`
        }
        if (Math.abs(value) >= 1_000) {
            return `$${(value / 1_000).toFixed(0)}K`
        }
        return `$${Math.round(value).toLocaleString()}`
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Value creation plan</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    5-step roadmap to maximize investment returns
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="text-[10px] text-muted-foreground">Total value creation</div>
                        <div className="text-lg font-bold text-primary">
                            {formatDollars(analysis.totalValueCreation)}
                        </div>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="text-[10px] text-muted-foreground">ROI on effort</div>
                        <div className="text-lg font-bold text-primary">
                            {analysis.roi.toFixed(0)}%
                        </div>
                    </div>
                </div>

                {/* Steps */}
                <div className="space-y-2">
                    {analysis.steps.map((step, i) => (
                        <div key={i} className="rounded-lg bg-muted/50 p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                        {i + 1}
                                    </span>
                                    <span className="text-xs font-medium text-foreground">{step.title}</span>
                                </div>
                                <span className="text-xs font-bold text-foreground whitespace-nowrap">
                                    {step.valueImpact > 0 ? '+' : ''}{formatDollars(step.valueImpact)}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 ml-7">
                                {step.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5 ml-7">
                                <span className="text-[9px] text-muted-foreground">
                                    {step.timelineMonths}mo
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${difficultyColors[step.difficulty]}`}>
                                    {step.difficulty}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                        Value impacts are estimated using current financials projected through the hold period.
                        Actual results depend on execution quality, market conditions, and management capability.
                        Steps are not mutually exclusive and some benefits may compound.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
