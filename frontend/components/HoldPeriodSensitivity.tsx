import { Timer } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { calculateIrr } from '../utils/dealMath'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
}

export default function HoldPeriodSensitivity({ model }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'illustrative') && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = (facts.revenue?.status === 'confirmed' || facts.revenue?.status === 'illustrative') && typeof facts.revenue.value === 'number' ? facts.revenue.value : null

    if (!ebitda || ebitda <= 0) return null

    const price = model.purchasePrice ?? model.askingPrice
    if (!price || price <= 0) return null

    const taxRate = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const fees = model.transactionFees ?? 0
    const wc = model.workingCapitalRequirement ?? 0
    const exitCosts = model.exitCosts ?? 0
    const exitMult = model.exitMultiple ?? 4
    const baseGrowth = model.baseRevenueGrowth ?? 0.05
    const baseMargin = model.baseEbitdaMargin ?? (revenue ? ebitda / revenue : 0.2)
    const initial = price + fees + wc

    const holdPeriods = [3, 4, 5, 6, 7, 8, 10]
    const growthRates = [0, 0.03, 0.05, 0.08, 0.10, 0.15]

    const currentHold = model.holdPeriodYears ?? 5

    function compute(hold: number, growth: number): { irr: number | null; moic: number | null } {
        const startRev = revenue ?? ebitda / baseMargin
        const yearlyRev = Array.from({ length: hold }, (_, y) => startRev * (1 + growth) ** (y + 1))
        const yearlyOcf = yearlyRev.map(r => r * baseMargin * (1 - taxRate) - capex)
        const exitEbitda = yearlyRev[hold - 1] * baseMargin
        const netExit = exitEbitda * exitMult - exitCosts
        const flows = [-initial, ...yearlyOcf.map((ocf, i) => ocf + (i === hold - 1 ? netExit : 0))]
        const totalReturn = flows.slice(1).reduce((s, v) => s + v, 0)
        return { irr: calculateIrr(flows), moic: totalReturn / initial }
    }

    const irrColor = (irr: number | null) => {
        if (irr === null) return ''
        if (irr >= 0.30) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        if (irr >= 0.20) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
        if (irr >= 0.12) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        if (irr >= 0) return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Timer className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Hold period sensitivity</CardTitle>
                        </div>
                        <CardDescription className="mt-1">IRR at different hold periods and revenue growth rates ({exitMult.toFixed(1)}x exit, {(baseMargin * 100).toFixed(0)}% margin)</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">Current: {currentHold}yr / {(baseGrowth * 100).toFixed(0)}%</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                <th className="border border-border bg-muted/50 p-2 text-left font-medium text-muted-foreground">
                                    Hold ↓ / Growth →
                                </th>
                                {growthRates.map(g => (
                                    <th key={g} className={`border border-border bg-muted/50 p-2 text-center font-medium ${Math.abs(g - baseGrowth) < 0.01 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                        {(g * 100).toFixed(0)}%
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {holdPeriods.map(hold => (
                                <tr key={hold}>
                                    <td className={`border border-border bg-muted/50 p-2 font-medium ${hold === currentHold ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                        {hold} yrs
                                    </td>
                                    {growthRates.map(growth => {
                                        const { irr } = compute(hold, growth)
                                        const isCurrent = hold === currentHold && Math.abs(growth - baseGrowth) < 0.01
                                        return (
                                            <td
                                                key={growth}
                                                className={`border border-border p-2 text-center ${irrColor(irr)} ${isCurrent ? 'ring-2 ring-primary ring-inset font-bold' : ''}`}
                                            >
                                                {irr !== null ? `${(irr * 100).toFixed(0)}%` : '—'}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-200 dark:bg-green-800" /> ≥30%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-800" /> 20–30%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-100 dark:bg-amber-800" /> 12–20%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-100 dark:bg-orange-800" /> 0–12%</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100 dark:bg-red-800" /> &lt;0%</span>
                </div>
            </CardContent>
        </Card>
    )
}
