import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { resolveLoanTermYears } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

export default function WeeklyProjectionCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const margin = revenue && revenue > 0 ? ebitda / revenue : (model.baseEbitdaMargin ?? 0.20)
        const annualRevenue = revenue ?? ebitda / margin
        const monthlyRevenue = annualRevenue / 12
        const monthlyEbitda = ebitda / 12
        const taxRate = model.taxRate ?? 0.25
        // maintenanceCapex is an absolute annual dollar amount; only the fallback
        // is expressed as 2% of revenue.
        const annualCapex = model.maintenanceCapex ?? (annualRevenue * 0.02)
        const monthlyCapex = annualCapex / 12

        const debt = model.seniorDebtAmount ?? 0
        const rate = model.interestRate ?? 0.07
        const term = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
        const monthlyDebt = debt > 0 ? (debt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -term * 12)) : 0

        const months = []
        let cumulative = -(model.equityAmount ?? price - debt - (model.sellerNoteAmount ?? 0))

        for (let m = 1; m <= 12; m++) {
            const rev = monthlyRevenue
            const ebitdaM = monthlyEbitda
            const tax = ebitdaM * taxRate
            const afterTax = ebitdaM - tax
            const netCash = afterTax - monthlyCapex - monthlyDebt
            cumulative += netCash

            months.push({
                month: m,
                revenue: Math.round(rev),
                ebitda: Math.round(ebitdaM),
                netCash: Math.round(netCash),
                cumulative: Math.round(cumulative),
            })
        }

        const year1NetCash = months.reduce((s, m) => s + m.netCash, 0)
        const monthlyAvg = year1NetCash / 12

        return { months, year1NetCash, monthlyAvg, monthlyDebt: Math.round(monthlyDebt) }
    }, [model])

    if (!data) return null

    const maxAbs = Math.max(...data.months.map(m => Math.abs(m.cumulative)))

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Year 1 monthly projection</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Monthly net cash flow and cumulative position for the first year post-acquisition.
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="rounded-lg bg-muted/50 p-2 min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">Year 1 net cash</p>
                        <p className={`text-sm font-bold tabular-nums ${data.year1NetCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(data.year1NetCash).toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">Monthly avg</p>
                        <p className={`text-sm font-bold tabular-nums ${data.monthlyAvg >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${Math.abs(Math.round(data.monthlyAvg)).toLocaleString()}
                        </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2 min-w-0">
                        <p className="text-[10px] text-muted-foreground truncate">Debt service/mo</p>
                        <p className="text-sm font-bold tabular-nums text-foreground">
                            ${data.monthlyDebt.toLocaleString()}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto -mx-4 px-4">
                    <div className="space-y-1 min-w-[320px]">
                        {data.months.map(m => {
                            const pct = maxAbs > 0 ? (m.cumulative / maxAbs) * 50 : 0
                            return (
                                <div key={m.month} className="flex items-center gap-2">
                                    <span className="text-[10px] font-mono text-muted-foreground w-6 shrink-0 text-right">M{m.month}</span>
                                    <div className="flex-1 h-4 relative bg-muted/30 rounded overflow-hidden">
                                        <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                                        {m.cumulative >= 0 ? (
                                            <div
                                                className="absolute inset-y-0 left-1/2 bg-green-500/70 rounded-r"
                                                style={{ width: `${Math.abs(pct)}%` }}
                                            />
                                        ) : (
                                            <div
                                                className="absolute inset-y-0 bg-red-500/70 rounded-l"
                                                style={{ width: `${Math.abs(pct)}%`, right: '50%' }}
                                            />
                                        )}
                                    </div>
                                    <span className={`text-[10px] font-mono w-24 shrink-0 text-right tabular-nums ${m.cumulative >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {m.cumulative >= 0 ? '+' : '-'}${Math.abs(m.cumulative).toLocaleString()}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                    Cumulative cash position relative to equity invested. Center line = breakeven on cash deployed.
                </p>
            </CardContent>
        </Card>
    )
}
