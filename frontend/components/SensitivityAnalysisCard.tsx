import { Grid3X3 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { calculateIrr } from '../utils/dealMath'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
}

function pct(v: number | null) {
    if (v === null) return '—'
    return `${(v * 100).toFixed(0)}%`
}

function moicLabel(v: number | null) {
    if (v === null) return '—'
    return `${v.toFixed(1)}x`
}

export default function SensitivityAnalysisCard({ model }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'illustrative') && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null

    if (ebitda === null || ebitda <= 0) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="border-b border-border bg-card/80">
                    <div className="flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Sensitivity analysis</CardTitle>
                    </div>
                    <CardDescription>Shows how returns change across entry and exit multiple combinations.</CardDescription>
                </CardHeader>
                <CardContent className="p-5">
                    <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Requires documented EBITDA/SDE to compute the sensitivity table.
                    </p>
                </CardContent>
            </Card>
        )
    }

    const holdPeriod = model.holdPeriodYears ?? 5
    const taxRate = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const fees = model.transactionFees ?? 0
    const wc = model.workingCapitalRequirement ?? 0
    const exitCosts = model.exitCosts ?? 0
    const baseMargin = model.baseEbitdaMargin ?? (ebitda / (facts.revenue?.value && typeof facts.revenue.value === 'number' ? facts.revenue.value : ebitda / 0.2))
    const baseGrowth = model.baseRevenueGrowth ?? 0.05

    const entryMultiples = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5]
    const exitMultiples = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]

    const currentEntry = model.purchasePrice ?? model.askingPrice
    const currentEntryMultiple = currentEntry && ebitda ? currentEntry / ebitda : null
    const currentExitMultiple = model.exitMultiple ?? null

    function computeCell(entryMult: number, exitMult: number): { moic: number | null; irr: number | null } {
        const price = ebitda! * entryMult
        const initial = price + fees + wc
        const revenue = facts.revenue?.value && typeof facts.revenue.value === 'number' ? facts.revenue.value : ebitda! / baseMargin
        const yearlyRevenue = Array.from({ length: holdPeriod }, (_, y) => revenue * (1 + baseGrowth) ** (y + 1))
        const yearlyOcf = yearlyRevenue.map(r => r * baseMargin * (1 - taxRate) - capex)
        const exitEbitda = yearlyRevenue[holdPeriod - 1] * baseMargin
        const netExit = exitEbitda * exitMult - exitCosts
        const flows = [-initial, ...yearlyOcf.map((ocf, i) => ocf + (i === holdPeriod - 1 ? netExit : 0))]
        const totalReturn = flows.slice(1).reduce((s, v) => s + v, 0)
        const moic = totalReturn / initial
        const irr = calculateIrr(flows)
        return { moic, irr }
    }

    const cellColor = (moic: number | null) => {
        if (moic === null) return ''
        if (moic >= 3.0) return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
        if (moic >= 2.0) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
        if (moic >= 1.5) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
        if (moic >= 1.0) return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    }

    const isCurrentCell = (entry: number, exit: number) => {
        if (!currentEntryMultiple || !currentExitMultiple) return false
        return Math.abs(entry - currentEntryMultiple) < 0.25 && Math.abs(exit - currentExitMultiple) < 0.25
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Grid3X3 className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Sensitivity analysis</CardTitle>
                        </div>
                        <CardDescription className="mt-1">MOIC and IRR across entry/exit multiple combinations ({holdPeriod}-year hold, {(baseGrowth * 100).toFixed(0)}% growth, {(baseMargin * 100).toFixed(0)}% margin)</CardDescription>
                    </div>
                    {currentEntryMultiple && (
                        <Badge variant="outline" className="text-xs">
                            Current: {currentEntryMultiple.toFixed(1)}x entry
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr>
                                <th className="border border-border bg-muted/50 p-2 text-left font-medium text-muted-foreground">
                                    Entry ↓ / Exit →
                                </th>
                                {exitMultiples.map(em => (
                                    <th key={em} className={`border border-border bg-muted/50 p-2 text-center font-medium ${currentExitMultiple && Math.abs(em - currentExitMultiple) < 0.25 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                        {em.toFixed(1)}x
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {entryMultiples.map(entry => (
                                <tr key={entry}>
                                    <td className={`border border-border bg-muted/50 p-2 font-medium ${currentEntryMultiple && Math.abs(entry - currentEntryMultiple) < 0.25 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                        {entry.toFixed(1)}x
                                    </td>
                                    {exitMultiples.map(exit => {
                                        const { moic, irr } = computeCell(entry, exit)
                                        const highlight = isCurrentCell(entry, exit)
                                        return (
                                            <td
                                                key={exit}
                                                className={`border border-border p-2 text-center ${cellColor(moic)} ${highlight ? 'ring-2 ring-primary ring-inset font-bold' : ''}`}
                                            >
                                                <div className="font-semibold">{moicLabel(moic)}</div>
                                                <div className="text-[10px] opacity-70">{pct(irr)}</div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-green-200 dark:bg-green-800" /> ≥3.0x</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100 dark:bg-emerald-800" /> 2.0–3.0x</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-100 dark:bg-amber-800" /> 1.5–2.0x</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-orange-100 dark:bg-orange-800" /> 1.0–1.5x</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100 dark:bg-red-800" /> &lt;1.0x</span>
                </div>
            </CardContent>
        </Card>
    )
}
