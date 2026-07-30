import { useMemo } from 'react'
import { Layers } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type StackLayer = {
    label: string
    value: number
    percent: number
    color: string
    sublabel?: string
}

export default function DealStackCard({ model }: Props) {
    const layers = useMemo(() => {
        const price = model.purchasePrice ?? model.askingPrice
        if (!price) return null

        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null

        const equityPct = normalizeEquityFraction(model.equityContributionPercent) * 100
        const equity = price * (equityPct / 100)
        const sellerNote = model.sellerNoteAmount ?? 0
        const seniorDebt = price - equity - sellerNote

        const result: StackLayer[] = []

        if (equity > 0) {
            result.push({
                label: 'Buyer Equity',
                value: equity,
                percent: (equity / price) * 100,
                color: 'bg-blue-500',
                sublabel: `${equityPct}% down payment`,
            })
        }

        if (seniorDebt > 0) {
            const rate = model.interestRate ? `${(model.interestRate * 100).toFixed(1)}%` : '7.0%'
            const term = model.amortizationYears ?? 10
            result.push({
                label: 'Senior Debt (SBA/Bank)',
                value: seniorDebt,
                percent: (seniorDebt / price) * 100,
                color: 'bg-emerald-500',
                sublabel: `${rate} over ${term}yr`,
            })
        }

        if (sellerNote > 0) {
            result.push({
                label: 'Seller Note',
                value: sellerNote,
                percent: (sellerNote / price) * 100,
                color: 'bg-amber-500',
                sublabel: 'Deferred payment to seller',
            })
        }

        const transactionFees = model.transactionFees ?? 0
        const workingCapital = model.workingCapitalRequirement ?? 0
        const closingCosts = model.closingCosts ?? 0
        const additionalCash = transactionFees + workingCapital + closingCosts

        return { layers: result, price, additionalCash, ebitda, equity }
    }, [model])

    if (!layers || layers.layers.length === 0) return null

    const totalCapital = layers.price + layers.additionalCash

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Deal stack</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">How the acquisition is funded</p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex gap-4">
                    <div className="flex flex-col-reverse w-16 rounded-lg overflow-hidden border border-border" style={{ height: '200px' }}>
                        {layers.layers.map((layer, i) => (
                            <div
                                key={i}
                                className={`${layer.color} flex items-center justify-center transition-all`}
                                style={{ height: `${layer.percent}%` }}
                                title={`${layer.label}: $${layer.value.toLocaleString()} (${layer.percent.toFixed(0)}%)`}
                            >
                                <span className="text-[9px] font-bold text-white">{layer.percent.toFixed(0)}%</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 space-y-2">
                        {layers.layers.map((layer, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${layer.color}`} />
                                <div>
                                    <p className="text-xs font-medium text-foreground">{layer.label}</p>
                                    <p className="text-sm font-bold text-foreground">${layer.value.toLocaleString()}</p>
                                    {layer.sublabel && <p className="text-[10px] text-muted-foreground">{layer.sublabel}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">Purchase Price</span>
                        <span className="text-sm font-bold text-foreground">${layers.price.toLocaleString()}</span>
                    </div>
                    {layers.additionalCash > 0 && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">+ Transaction/Working Capital</span>
                            <span className="text-xs font-medium text-foreground">${layers.additionalCash.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border pt-2">
                        <span className="text-xs font-semibold text-foreground">Total Capital Required</span>
                        <span className="text-sm font-bold text-primary">${totalCapital.toLocaleString()}</span>
                    </div>
                    {layers.ebitda && (
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Leverage (Debt/EBITDA)</span>
                            <span className={`text-xs font-bold ${(layers.price - layers.equity) / layers.ebitda <= 3.5 ? 'text-green-600' : (layers.price - layers.equity) / layers.ebitda <= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                                {((layers.price - layers.equity) / layers.ebitda).toFixed(1)}x
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
