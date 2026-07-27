import { useMemo } from 'react'
import { ShieldAlert } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

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
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        if (!ebitda || ebitda <= 0) return null

        const debt = model.seniorDebtAmount ?? 0
        const sellerNote = model.sellerNoteAmount ?? 0
        const totalDebt = debt + sellerNote
        if (totalDebt <= 0) return null

        const rate = model.interestRate ?? 0.07
        const term = model.loanTermYears ?? 10
        const annualDebtService = debt > 0
            ? (debt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -term * 12)) * 12
            : 0
        const sellerNoteRate = 0.05
        const sellerNoteService = sellerNote * sellerNoteRate + (sellerNote / (model.holdPeriodYears ?? 5))
        const totalDebtService = annualDebtService + sellerNoteService

        const taxRate = model.taxRate ?? 0.25
        const afterTaxEbitda = ebitda * (1 - taxRate)

        const currentDscr = totalDebtService > 0 ? afterTaxEbitda / totalDebtService : Infinity
        const currentLeverage = ebitda > 0 ? totalDebt / ebitda : 0

        const scenarios: Scenario[] = [0, 10, 20, 30, 40, 50].map(decline => {
            const newEbitda = ebitda * (1 - decline / 100)
            const newAfterTax = newEbitda * (1 - taxRate)
            const dscr = totalDebtService > 0 ? newAfterTax / totalDebtService : Infinity
            const debtToEbitda = newEbitda > 0 ? totalDebt / newEbitda : Infinity
            return {
                label: decline === 0 ? 'Current' : `-${decline}%`,
                ebitdaDecline: decline,
                newEbitda,
                dscr: isFinite(dscr) ? dscr : 0,
                debtToEbitda: isFinite(debtToEbitda) ? debtToEbitda : 99,
                breached: dscr < 1.0 || debtToEbitda > 6,
            }
        })

        const breakpointPct = totalDebtService > 0
            ? Math.max(0, Math.round((1 - totalDebtService / afterTaxEbitda) * 100))
            : 100

        return { scenarios, currentDscr, currentLeverage, totalDebt, breakpointPct, ebitda }
    }, [model])

    if (!data) return null

    const dscrColor = (dscr: number) =>
        dscr >= 1.5 ? 'text-green-600' : dscr >= 1.25 ? 'text-blue-600' : dscr >= 1.0 ? 'text-amber-600' : 'text-red-600'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Leverage safety margin</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    How much can EBITDA decline before debt covenants are breached?
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
                        <p className="text-[10px] text-muted-foreground">Safety cushion</p>
                        <p className={`text-sm font-bold ${data.breakpointPct >= 30 ? 'text-green-600' : data.breakpointPct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                            {data.breakpointPct}%
                        </p>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                        <span className="w-12">Decline</span>
                        <span className="flex-1">DSCR</span>
                        <span className="w-16 text-right">Debt/EBITDA</span>
                        <span className="w-10 text-right">Status</span>
                    </div>
                    {data.scenarios.map(s => (
                        <div key={s.label} className={`flex items-center gap-2 rounded px-1.5 py-1 ${s.breached ? 'bg-red-50 dark:bg-red-950/20' : ''}`}>
                            <span className="text-[10px] font-mono text-muted-foreground w-12">{s.label}</span>
                            <div className="flex-1 flex items-center gap-1">
                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${s.dscr >= 1.5 ? 'bg-green-500' : s.dscr >= 1.0 ? 'bg-amber-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(100, (s.dscr / 2.5) * 100)}%` }}
                                    />
                                </div>
                                <span className={`text-[10px] font-mono w-8 ${dscrColor(s.dscr)}`}>{s.dscr.toFixed(1)}x</span>
                            </div>
                            <span className="text-[10px] font-mono w-16 text-right text-muted-foreground">{s.debtToEbitda.toFixed(1)}x</span>
                            <span className={`text-[10px] w-10 text-right ${s.breached ? 'text-red-600 font-bold' : 'text-green-600'}`}>
                                {s.breached ? 'BREACH' : 'OK'}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 text-[10px] text-muted-foreground">
                    EBITDA can decline <span className="font-bold text-foreground">{data.breakpointPct}%</span> before
                    after-tax cash flow fails to cover debt service (DSCR &lt; 1.0x).
                    {data.breakpointPct < 20 && (
                        <span className="text-red-600 font-medium"> This is a thin margin — consider reducing leverage or negotiating seller financing.</span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
