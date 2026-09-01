import { useState, useMemo } from 'react'
import { ShieldAlert, TrendingDown, Layers } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { resolveLoanTermYears } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

type Scenario = {
    label: string
    ebitdaDecline: number
    newEbitda: number
    dscr: number
    debtToEbitda: number
    breached: boolean
}

export default function LeverageSafetyCard({ model }: Props) {
    const [viewMode, setViewMode] = useState<'matrix' | 'linear'>('matrix')

    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const rawEbitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const ebitda = rawEbitda && rawEbitda > 0 ? rawEbitda : 2_400_000

        const rawDebt = model.seniorDebtAmount ?? 0
        const rawSellerNote = model.sellerNoteAmount ?? 0
        const debt = rawDebt > 0 ? rawDebt : (rawDebt + rawSellerNote > 0 ? rawDebt : 2_500_000)
        const sellerNote = rawSellerNote > 0 ? rawSellerNote : (rawDebt + rawSellerNote > 0 ? 0 : 750_000)
        const totalDebt = debt + sellerNote

        const baseRate = model.interestRate ?? 0.08
        const term = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
        const calcDebtService = (rate: number) => {
            if (debt <= 0) return 0
            return (debt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -term * 12)) * 12
        }

        const sellerNoteRate = 0.05
        const sellerNoteService = sellerNote * sellerNoteRate + (sellerNote / (model.holdPeriodYears ?? 5))
        const totalDebtServiceBase = calcDebtService(baseRate) + sellerNoteService

        const taxRate = model.taxRate ?? 0.25
        const afterTaxEbitda = ebitda * (1 - taxRate)

        const currentDscr = totalDebtServiceBase > 0 ? afterTaxEbitda / totalDebtServiceBase : Infinity
        const currentLeverage = ebitda > 0 ? totalDebt / ebitda : 0

        const scenarios: Scenario[] = [0, 10, 20, 30, 40, 50].map(decline => {
            const newEbitda = ebitda * (1 - decline / 100)
            const newAfterTax = newEbitda * (1 - taxRate)
            const dscr = totalDebtServiceBase > 0 ? newAfterTax / totalDebtServiceBase : Infinity
            const debtToEbitda = newEbitda > 0 ? totalDebt / newEbitda : Infinity
            return {
                label: decline === 0 ? 'Current' : `-${decline}%`,
                ebitdaDecline: decline,
                newEbitda,
                dscr: isFinite(dscr) ? dscr : 0,
                debtToEbitda: isFinite(debtToEbitda) ? debtToEbitda : 99,
                breached: dscr < 1.15 || debtToEbitda > 6,
            }
        })

        // 2D Matrix: Rate Shocks (0, +100bps, +200bps, +300bps) x EBITDA Drops (0%, -10%, -20%, -30%, -40%)
        const rateShocks = [
            { label: 'Base Rate', deltaBps: 0, rate: baseRate },
            { label: '+100 bps', deltaBps: 100, rate: baseRate + 0.01 },
            { label: '+200 bps', deltaBps: 200, rate: baseRate + 0.02 },
            { label: '+300 bps', deltaBps: 300, rate: baseRate + 0.03 },
        ]

        const ebitdaDrops = [0, 10, 20, 30, 40]
        const matrix = ebitdaDrops.map(drop => {
            const rowEbitda = ebitda * (1 - drop / 100)
            const rowAfterTax = rowEbitda * (1 - taxRate)
            const cols = rateShocks.map(shock => {
                const totalService = calcDebtService(shock.rate) + sellerNoteService
                const dscr = totalService > 0 ? rowAfterTax / totalService : Infinity
                return {
                    dscr: isFinite(dscr) ? dscr : 0,
                    isBreach: dscr < 1.15,
                    isCaution: dscr >= 1.15 && dscr < 1.35,
                }
            })
            return {
                dropPct: drop,
                label: drop === 0 ? 'Base EBITDA' : `-${drop}% Drop`,
                ebitda: rowEbitda,
                cols,
            }
        })

        const breakpointPct = totalDebtServiceBase > 0
            ? Math.max(0, Math.round((1 - totalDebtServiceBase / afterTaxEbitda) * 100))
            : 100

        return { scenarios, currentDscr, currentLeverage, totalDebt, breakpointPct, ebitda, baseRate, rateShocks, matrix }
    }, [model])

    if (!data) return null

    const dscrColor = (dscr: number) =>
        dscr >= 1.35 ? 'text-green-600' : dscr >= 1.15 ? 'text-amber-600' : 'text-red-600 font-bold'

    return (
        <Card id="structure-dscr" className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">SBA 7(a) & Bank Debt Service Sensitivity</CardTitle>
                        <CardInfoPopover cardId="leverage-safety" />
                    </div>
                    <div className="flex items-center gap-1 rounded-md border border-border p-0.5 bg-muted/40 text-xs">
                        <button
                            type="button"
                            onClick={() => setViewMode('matrix')}
                            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                                viewMode === 'matrix' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Layers className="h-3 w-3" />
                            2D Rate Shock
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('linear')}
                            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                                viewMode === 'linear' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <TrendingDown className="h-3 w-3" />
                            EBITDA Curve
                        </button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Multi-variable sensitivity modeling DSCR covenant default risk under interest rate shocks and cash flow contractions.
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">Current DSCR</p>
                        <p className={`text-sm font-bold ${dscrColor(data.currentDscr)}`}>
                            {data.currentDscr.toFixed(2)}x
                        </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">Debt/EBITDA</p>
                        <p className={`text-sm font-bold ${data.currentLeverage <= 3 ? 'text-green-600' : data.currentLeverage <= 4.5 ? 'text-amber-600' : 'text-red-600'}`}>
                            {data.currentLeverage.toFixed(1)}x
                        </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">SBA Default Cushion</p>
                        <p className={`text-sm font-bold ${data.breakpointPct >= 30 ? 'text-green-600' : data.breakpointPct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                            {data.breakpointPct}%
                        </p>
                    </div>
                </div>

                {/* View Mode: 2D Matrix vs Linear */}
                {viewMode === 'matrix' ? (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                            <span>2D Matrix: EBITDA Decline vs. Variable Rate Shock</span>
                            <span className="text-[10px] text-muted-foreground font-normal">SBA SOP 50 10 Covenant: 1.15x</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-border">
                            <table className="w-full text-center text-xs">
                                <thead>
                                    <tr className="bg-muted/70 text-muted-foreground border-b border-border text-[10px]">
                                        <th className="p-2 text-left font-semibold">EBITDA Decline</th>
                                        {data.rateShocks.map((s) => (
                                            <th key={s.label} className="p-2 font-semibold">
                                                {s.label} ({(s.rate * 100).toFixed(1)}%)
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {data.matrix.map((row) => (
                                        <tr key={row.label} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-2 text-left font-mono font-medium text-foreground text-[11px]">
                                                {row.label}
                                            </td>
                                            {row.cols.map((col, idx) => (
                                                <td key={idx} className="p-2">
                                                    <span
                                                        className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] font-bold ${
                                                            col.isBreach
                                                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                                                : col.isCaution
                                                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                                        }`}
                                                    >
                                                        {col.dscr.toFixed(2)}x
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                            <span className="w-12">Decline</span>
                            <span className="flex-1">DSCR</span>
                            <span className="w-16 text-right">Debt/EBITDA</span>
                            <span className="w-10 text-right">Status</span>
                        </div>
                        {data.scenarios.map((s) => (
                            <div key={s.label} className={`flex items-center gap-2 rounded px-1.5 py-1 ${s.breached ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                                <span className="text-[10px] font-mono text-muted-foreground w-12">{s.label}</span>
                                <div className="flex-1 flex items-center gap-1">
                                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${s.dscr >= 1.35 ? 'bg-green-500' : s.dscr >= 1.15 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${Math.min(100, (s.dscr / 2.5) * 100)}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-mono w-8 ${dscrColor(s.dscr)}`}>{s.dscr.toFixed(1)}x</span>
                                </div>
                                <span className="text-[10px] font-mono w-16 text-right text-muted-foreground">{s.debtToEbitda.toFixed(1)}x</span>
                                <span className={`text-[10px] w-10 text-right ${s.breached ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                                    {s.breached ? 'DEFAULT' : 'OK'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="rounded-lg bg-muted/50 p-2.5 text-[10px] text-muted-foreground">
                    EBITDA can decline <span className="font-bold text-foreground">{data.breakpointPct}%</span> before
                    after-tax cash flow breaches bank debt service covenants (DSCR &lt; 1.15x).
                    {data.breakpointPct < 20 && (
                        <span className="text-red-600 font-medium"> This is a thin margin — consider negotiating a higher seller note or reducing senior debt.</span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
