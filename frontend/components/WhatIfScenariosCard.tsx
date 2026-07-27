import { useMemo } from 'react'
import { GitBranch } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type Scenario = {
    label: string
    description: string
    moic: number
    irr: number
    verdict: 'great' | 'good' | 'ok' | 'bad'
}

export default function WhatIfScenariosCard({ model }: Props) {
    const scenarios = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const holdYears = model.holdPeriodYears ?? 5
        const baseGrowth = model.baseRevenueGrowth ?? 0.05
        const baseMargin = revenue && revenue > 0 ? ebitda / revenue : (model.baseEbitdaMargin ?? 0.20)
        const exitMult = model.exitMultiple ?? 4.0
        const equity = model.equityAmount ?? (price - (model.seniorDebtAmount ?? 0) - (model.sellerNoteAmount ?? 0))

        const calcMoic = (growth: number, margin: number, mult: number) => {
            const futureRev = (revenue ?? ebitda / baseMargin) * Math.pow(1 + growth, holdYears)
            const futureEbitda = futureRev * margin
            const exitValue = futureEbitda * mult
            return equity > 0 ? exitValue / equity : 0
        }

        const calcIrr = (moic: number) => {
            return holdYears > 0 ? (Math.pow(moic, 1 / holdYears) - 1) * 100 : 0
        }

        const verdict = (moic: number): 'great' | 'good' | 'ok' | 'bad' => {
            if (moic >= 3) return 'great'
            if (moic >= 2) return 'good'
            if (moic >= 1.2) return 'ok'
            return 'bad'
        }

        const results: Scenario[] = []

        const bestMoic = calcMoic(baseGrowth + 0.03, baseMargin + 0.03, exitMult + 1)
        results.push({
            label: 'Everything goes right',
            description: `+3% growth, +3% margin, +1x exit multiple`,
            moic: bestMoic,
            irr: calcIrr(bestMoic),
            verdict: verdict(bestMoic),
        })

        const baseMoic = calcMoic(baseGrowth, baseMargin, exitMult)
        results.push({
            label: 'Base case (as modeled)',
            description: `${(baseGrowth * 100).toFixed(0)}% growth, ${(baseMargin * 100).toFixed(0)}% margin, ${exitMult.toFixed(1)}x exit`,
            moic: baseMoic,
            irr: calcIrr(baseMoic),
            verdict: verdict(baseMoic),
        })

        const flatMoic = calcMoic(0, baseMargin, exitMult - 0.5)
        results.push({
            label: 'Revenue stalls completely',
            description: `0% growth, margins hold, exit at ${(exitMult - 0.5).toFixed(1)}x`,
            moic: flatMoic,
            irr: calcIrr(flatMoic),
            verdict: verdict(flatMoic),
        })

        const lossCustMoic = calcMoic(-0.05, baseMargin - 0.03, exitMult - 1)
        results.push({
            label: 'Lose key customer',
            description: `-5% revenue, -3% margin compression, -1x exit multiple`,
            moic: lossCustMoic,
            irr: calcIrr(lossCustMoic),
            verdict: verdict(lossCustMoic),
        })

        const recessionMoic = calcMoic(-0.10, baseMargin - 0.05, exitMult - 1.5)
        results.push({
            label: 'Recession hits hard',
            description: `-10% revenue, -5% margin, -1.5x exit multiple`,
            moic: recessionMoic,
            irr: calcIrr(recessionMoic),
            verdict: verdict(recessionMoic),
        })

        return results
    }, [model])

    if (!scenarios) return null

    const verdictColor = (v: string) => {
        switch (v) {
            case 'great': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'good': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
            case 'ok': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            default: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
    }

    const verdictLabel = (v: string) => {
        switch (v) {
            case 'great': return 'Excellent'
            case 'good': return 'Good'
            case 'ok': return 'Marginal'
            default: return 'Loss risk'
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">What-if scenarios</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    How does the deal perform under different real-world conditions?
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2.5">
                    {scenarios.map((s, i) => (
                        <div key={i} className={`rounded-lg border border-border p-2.5 ${i === 1 ? 'ring-1 ring-primary/30' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-foreground">{s.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                                </div>
                                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${verdictColor(s.verdict)}`}>
                                    {verdictLabel(s.verdict)}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-1.5">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">MOIC:</span>
                                    <span className={`text-xs font-bold ${s.moic >= 2 ? 'text-green-600' : s.moic >= 1 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {s.moic.toFixed(1)}x
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground">IRR:</span>
                                    <span className={`text-xs font-bold ${s.irr >= 20 ? 'text-green-600' : s.irr >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {s.irr.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${s.moic >= 2 ? 'bg-green-500' : s.moic >= 1 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(100, (s.moic / 4) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
