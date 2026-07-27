import { useMemo } from 'react'
import { Focus } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type AssumptionImpact = {
    label: string
    baseMoic: number
    lowMoic: number
    highMoic: number
    swing: number
}

function computeMoic(
    ebitda: number,
    revenue: number,
    purchasePrice: number,
    growthRate: number,
    ebitdaMargin: number,
    exitMultiple: number,
    holdPeriod: number,
    interestRate: number,
    taxRate: number,
    maintenanceCapex: number,
    transactionFees: number,
): number {
    const initial = purchasePrice + transactionFees
    if (initial <= 0) return 0

    const yearlyRevenue = Array.from({ length: holdPeriod }, (_, y) => revenue * (1 + growthRate) ** (y + 1))
    const yearlyOcf = yearlyRevenue.map(r => r * ebitdaMargin * (1 - taxRate) - maintenanceCapex * r)

    // Simple debt service cost deduction (approximate annual interest cost on purchase price * leverage)
    const annualInterestCost = purchasePrice * 0.7 * interestRate
    const yearlyNetCf = yearlyOcf.map(ocf => ocf - annualInterestCost)

    const exitEbitda = yearlyRevenue[holdPeriod - 1] * ebitdaMargin
    const exitProceeds = exitEbitda * exitMultiple

    const totalCashFlows = yearlyNetCf.reduce((sum, cf) => sum + cf, 0) + exitProceeds
    return totalCashFlows / initial
}

export default function SensitivityRankingCard({ model }: Props) {
    const impacts = useMemo((): AssumptionImpact[] | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!ebitda || ebitda <= 0 || !price || price <= 0) return null

        const rev = revenue ?? ebitda / (model.baseEbitdaMargin ?? 0.20)
        const growthRate = model.baseRevenueGrowth ?? 0.05
        const ebitdaMargin = model.baseEbitdaMargin ?? 0.20
        const exitMult = model.exitMultiple ?? 4.0
        const holdPeriod = model.holdPeriodYears ?? 5
        const intRate = model.interestRate ?? 0.07
        const taxRate = model.taxRate ?? 0.25
        const capex = model.maintenanceCapex ?? 0.02
        const fees = model.transactionFees ?? 0

        const baseMoic = computeMoic(ebitda, rev, price, growthRate, ebitdaMargin, exitMult, holdPeriod, intRate, taxRate, capex, fees)

        const assumptions: { label: string; compute: (direction: number) => number }[] = [
            {
                label: 'Revenue growth',
                compute: (d) => computeMoic(ebitda, rev, price, growthRate * (1 + d * 0.1), ebitdaMargin, exitMult, holdPeriod, intRate, taxRate, capex, fees),
            },
            {
                label: 'EBITDA margin',
                compute: (d) => computeMoic(ebitda, rev, price, growthRate, ebitdaMargin * (1 + d * 0.1), exitMult, holdPeriod, intRate, taxRate, capex, fees),
            },
            {
                label: 'Exit multiple',
                compute: (d) => computeMoic(ebitda, rev, price, growthRate, ebitdaMargin, exitMult * (1 + d * 0.1), holdPeriod, intRate, taxRate, capex, fees),
            },
            {
                label: 'Hold period',
                compute: (d) => computeMoic(ebitda, rev, price, growthRate, ebitdaMargin, exitMult, Math.max(1, Math.round(holdPeriod * (1 + d * 0.1))), intRate, taxRate, capex, fees),
            },
            {
                label: 'Interest rate',
                compute: (d) => computeMoic(ebitda, rev, price, growthRate, ebitdaMargin, exitMult, holdPeriod, intRate * (1 + d * 0.1), taxRate, capex, fees),
            },
            {
                label: 'Purchase price',
                compute: (d) => computeMoic(ebitda, rev, price * (1 + d * 0.1), growthRate, ebitdaMargin, exitMult, holdPeriod, intRate, taxRate, capex, fees),
            },
        ]

        const results: AssumptionImpact[] = assumptions.map(a => {
            const lowMoic = a.compute(-1)
            const highMoic = a.compute(1)
            return {
                label: a.label,
                baseMoic,
                lowMoic,
                highMoic,
                swing: Math.abs(highMoic - lowMoic),
            }
        })

        results.sort((a, b) => b.swing - a.swing)
        return results
    }, [model])

    if (!impacts) return null

    const maxSwing = Math.max(...impacts.map(i => i.swing), 0.01)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Focus className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Which assumptions matter most?</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Impact of +/-10% change in each assumption on exit MOIC
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {/* Tornado bars */}
                <div className="space-y-2">
                    {impacts.map((item, idx) => {
                        const midpoint = 50
                        const lowPct = ((item.lowMoic - item.baseMoic) / maxSwing) * 50
                        const highPct = ((item.highMoic - item.baseMoic) / maxSwing) * 50

                        const barLeft = midpoint + Math.min(lowPct, 0)
                        const barRight = midpoint + Math.max(highPct, 0)
                        const barWidth = barRight - barLeft

                        return (
                            <div key={item.label} className="space-y-0.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className={`font-medium ${idx < 2 ? 'text-primary' : 'text-foreground'}`}>
                                        {item.label}
                                    </span>
                                    <span className="text-muted-foreground font-mono text-[10px]">
                                        {item.lowMoic.toFixed(2)}x - {item.highMoic.toFixed(2)}x
                                    </span>
                                </div>
                                <div className="relative h-5 w-full rounded bg-muted/50">
                                    {/* Center line */}
                                    <div
                                        className="absolute top-0 bottom-0 w-px bg-border"
                                        style={{ left: '50%' }}
                                    />
                                    {/* Bar */}
                                    <div
                                        className={`absolute top-0.5 bottom-0.5 rounded ${idx < 2 ? 'bg-primary/70' : 'bg-muted-foreground/40'}`}
                                        style={{
                                            left: `${barLeft}%`,
                                            width: `${Math.max(barWidth, 1)}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Focus callout */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mt-3">
                    <div className="flex items-start gap-2">
                        <Focus className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-primary">Focus your diligence here</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                <span className="font-semibold">{impacts[0].label}</span> and{' '}
                                <span className="font-semibold">{impacts[1].label}</span> have the largest
                                impact on returns. Validate these assumptions with extra scrutiny.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Base MOIC label */}
                <p className="text-[9px] text-muted-foreground text-center">
                    Base MOIC: {impacts[0].baseMoic.toFixed(2)}x | Center line = base case
                </p>
            </CardContent>
        </Card>
    )
}
