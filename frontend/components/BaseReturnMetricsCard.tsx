import { useMemo } from 'react'
import { DollarSign } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

export default function BaseReturnMetricsCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const capex = model.maintenanceCapex ?? 0
        const annualCashFlow = ebitda - capex
        const simpleROI = (annualCashFlow / price) * 100
        const paybackYears = annualCashFlow > 0 ? price / annualCashFlow : Infinity
        const fiveYearReturn = annualCashFlow * 5
        const tenYearReturn = annualCashFlow * 10

        return {
            annualCashFlow,
            simpleROI,
            paybackYears,
            fiveYearReturn,
            tenYearReturn,
            price,
        }
    }, [model])

    if (!data) return null

    const metrics = [
        {
            label: 'Simple ROI',
            value: `${data.simpleROI.toFixed(1)}%`,
            sublabel: 'annual cash return on investment',
            good: data.simpleROI >= 20,
            warn: data.simpleROI >= 10 && data.simpleROI < 20,
        },
        {
            label: 'Payback Period',
            value: data.paybackYears === Infinity ? 'N/A' : `${data.paybackYears.toFixed(1)} years`,
            sublabel: 'time to recover full investment',
            good: data.paybackYears <= 4,
            warn: data.paybackYears <= 6,
        },
        {
            label: 'Annual Return',
            value: `$${Math.round(data.annualCashFlow).toLocaleString()}`,
            sublabel: 'EBITDA less maintenance capex',
            good: data.annualCashFlow > 0,
            warn: false,
        },
        {
            label: '5-Year Return',
            value: `$${Math.round(data.fiveYearReturn).toLocaleString()}`,
            sublabel: `${((data.fiveYearReturn / data.price) * 100).toFixed(0)}% of purchase price`,
            good: data.fiveYearReturn >= data.price,
            warn: data.fiveYearReturn >= data.price * 0.5 && data.fiveYearReturn < data.price,
        },
    ]

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Base return metrics (all cash)</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-3">
                    {metrics.map((m, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                            <p className={`text-lg font-bold mt-0.5 ${m.good ? 'text-green-600' : m.warn ? 'text-amber-600' : 'text-red-600'}`}>
                                {m.value}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">{m.sublabel}</p>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                    All-cash scenario — no leverage. Assumes flat EBITDA (no growth). See Returns tab for detailed projections.
                </p>
            </CardContent>
        </Card>
    )
}
