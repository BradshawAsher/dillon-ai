import { Grid3X3, AlertTriangle, CheckCircle2 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { calculateIrr } from '../utils/dealMath'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'

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

    // Resolve EBITDA / SDE value & status
    let ebitda: number = 200_000
    let ebitdaIsConfirmed = false
    let ebitdaStatusLabel = 'Illustrative default ($200k)'

    if (facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde.value === 'number' && facts.ebitda_sde.value > 0) {
        ebitda = facts.ebitda_sde.value
        ebitdaIsConfirmed = true
        ebitdaStatusLabel = 'Confirmed documented fact'
    } else if (typeof facts.ebitda_sde?.value === 'number' && facts.ebitda_sde.value > 0) {
        ebitda = facts.ebitda_sde.value
        ebitdaStatusLabel = `Unconfirmed fact (${facts.ebitda_sde.status || 'pending'})`
    } else if (typeof model.ebitda === 'number' && model.ebitda > 0) {
        ebitda = model.ebitda
        ebitdaStatusLabel = 'Model assumption'
    } else if (facts.revenue?.status === 'confirmed' && typeof facts.revenue.value === 'number' && facts.revenue.value > 0) {
        ebitda = facts.revenue.value * (model.baseEbitdaMargin ?? 0.2)
        ebitdaStatusLabel = 'Estimated from confirmed revenue'
    } else if (typeof facts.revenue?.value === 'number' && facts.revenue.value > 0) {
        ebitda = facts.revenue.value * (model.baseEbitdaMargin ?? 0.2)
        ebitdaStatusLabel = 'Estimated from unconfirmed revenue'
    } else if ((model.purchasePrice ?? model.askingPrice) && (model.purchasePrice ?? model.askingPrice)! > 0) {
        const price = (model.purchasePrice ?? model.askingPrice)!
        ebitda = price / (model.ebitdaMultiple ?? model.baseExitMultiple ?? 4.0)
        ebitdaStatusLabel = 'Estimated from asking/purchase price'
    }

    // Resolve Revenue value & status
    let revenue: number = 1_000_000
    let revenueIsConfirmed = false
    let revenueStatusLabel = 'Illustrative default ($1.0M)'

    if (facts.revenue?.status === 'confirmed' && typeof facts.revenue.value === 'number' && facts.revenue.value > 0) {
        revenue = facts.revenue.value
        revenueIsConfirmed = true
        revenueStatusLabel = 'Confirmed documented fact'
    } else if (typeof facts.revenue?.value === 'number' && facts.revenue.value > 0) {
        revenue = facts.revenue.value
        revenueStatusLabel = `Unconfirmed fact (${facts.revenue.status || 'pending'})`
    } else if (ebitda > 0 && model.baseEbitdaMargin && model.baseEbitdaMargin > 0) {
        revenue = ebitda / model.baseEbitdaMargin
        revenueStatusLabel = 'Derived from EBITDA & margin'
    }

    // Resolve Purchase / Entry Price & Multiple
    const currentEntry = model.purchasePrice ?? model.askingPrice ?? (ebitda * (model.ebitdaMultiple ?? 4.0))
    const entryIsConfirmed = model.purchasePrice !== null && model.purchasePrice !== undefined
    const entryStatusLabel = entryIsConfirmed
        ? 'Confirmed purchase price'
        : model.askingPrice ? 'Unconfirmed asking price' : 'Illustrative default'

    const currentEntryMultiple = ebitda > 0 ? currentEntry / ebitda : null

    // Base parameters
    const holdPeriod = model.holdPeriodYears ?? 5
    const taxRate = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const fees = model.transactionFees ?? 0
    const wc = model.workingCapitalRequirement ?? 0
    const exitCosts = model.exitCosts ?? 0
    const baseMargin = model.baseEbitdaMargin ?? (revenue > 0 ? ebitda / revenue : 0.20)
    const baseGrowth = model.baseRevenueGrowth ?? 0.05

    const entryMultiples = [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5]
    const exitMultiples = [3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0]
    const currentExitMultiple = model.exitMultiple ?? model.baseExitMultiple ?? null

    const hasUnconfirmedInputs = !ebitdaIsConfirmed || !revenueIsConfirmed || !entryIsConfirmed

    function computeCell(entryMult: number, exitMult: number): { moic: number | null; irr: number | null } {
        const price = ebitda * entryMult
        const initial = price + fees + wc
        if (initial <= 0) return { moic: null, irr: null }

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
                            <CardInfoPopover cardId="sensitivity-analysis" />
                        </div>
                        <CardDescription className="mt-1">
                            MOIC and IRR across entry/exit multiple combinations ({holdPeriod}-year hold, {(baseGrowth * 100).toFixed(0)}% growth, {(baseMargin * 100).toFixed(0)}% margin)
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={hasUnconfirmedInputs ? 'warning' : 'success'} className="text-xs">
                            {hasUnconfirmedInputs ? '⚠ Illustrative / Unconfirmed inputs' : '✓ Verified inputs'}
                        </Badge>
                        {currentEntryMultiple && (
                            <Badge variant="outline" className="text-xs">
                                Current: {currentEntryMultiple.toFixed(1)}x entry
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                {/* Inputs & Confirmation Status Disclaimer Banner */}
                <div className={`mb-4 rounded-lg border p-3.5 text-xs ${hasUnconfirmedInputs ? 'border-amber-300/60 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20' : 'border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-800/60 dark:bg-emerald-950/20'}`}>
                    <div className="flex items-center justify-between font-semibold mb-1.5">
                        <div className="flex items-center gap-1.5">
                            {hasUnconfirmedInputs ? (
                                <span className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                    Sensitivity Analysis — Data Status Disclaimer
                                </span>
                            ) : (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    Sensitivity Analysis — Confirmed Data
                                </span>
                            )}
                        </div>
                        <span className="text-[11px] text-muted-foreground font-normal">
                            Input status summary
                        </span>
                    </div>

                    <p className="text-muted-foreground leading-relaxed mb-2.5">
                        {hasUnconfirmedInputs
                            ? 'The matrix below calculates projected returns across valuation multiples. Some underlying financial numbers are currently illustrative or unconfirmed — see the breakdown of confirmed vs unconfirmed inputs below:'
                            : 'The matrix below calculates projected returns using fully confirmed financial facts from documented records.'}
                    </p>

                    <div className="grid gap-2 sm:grid-cols-3">
                        <div className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background/80 p-2.5 shadow-2xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">EBITDA / SDE</span>
                            <span className="font-semibold text-foreground text-sm">${ebitda.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                            <Badge variant={ebitdaIsConfirmed ? 'success' : 'warning'} className="w-fit text-[9px] px-1.5 py-0 mt-0.5 font-bold">
                                {ebitdaIsConfirmed ? '✓ Confirmed' : `⚠ ${ebitdaStatusLabel}`}
                            </Badge>
                        </div>

                        <div className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background/80 p-2.5 shadow-2xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Starting Revenue</span>
                            <span className="font-semibold text-foreground text-sm">${revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                            <Badge variant={revenueIsConfirmed ? 'success' : 'warning'} className="w-fit text-[9px] px-1.5 py-0 mt-0.5 font-bold">
                                {revenueIsConfirmed ? '✓ Confirmed' : `⚠ ${revenueStatusLabel}`}
                            </Badge>
                        </div>

                        <div className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background/80 p-2.5 shadow-2xs">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">Entry Price / Multiple</span>
                            <span className="font-semibold text-foreground text-sm">
                                ${currentEntry.toLocaleString('en-US', { maximumFractionDigits: 0 })} ({currentEntryMultiple ? `${currentEntryMultiple.toFixed(1)}x` : '—'})
                            </span>
                            <Badge variant={entryIsConfirmed ? 'success' : 'warning'} className="w-fit text-[9px] px-1.5 py-0 mt-0.5 font-bold">
                                {entryIsConfirmed ? '✓ Confirmed' : `⚠ ${entryStatusLabel}`}
                            </Badge>
                        </div>
                    </div>
                </div>

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

