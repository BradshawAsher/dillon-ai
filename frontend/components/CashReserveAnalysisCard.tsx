import { useMemo } from 'react'
import { Vault } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type ReserveItem = {
    label: string
    amount: number
    months: number
    priority: 'critical' | 'recommended' | 'optional'
}

export default function CashReserveAnalysisCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const monthlyRevenue = (revenue ?? ebitda / (model.baseEbitdaMargin ?? 0.20)) / 12
        const monthlyOpex = monthlyRevenue - (ebitda / 12)
        const debt = model.seniorDebtAmount ?? 0
        const rate = model.interestRate ?? 0.07
        const term = model.loanTermYears ?? 10
        const monthlyDebt = debt > 0 ? (debt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -term * 12)) : 0

        const reserves: ReserveItem[] = []

        const opReserve = monthlyOpex * 3
        reserves.push({
            label: '3 months operating expenses',
            amount: Math.round(opReserve),
            months: 3,
            priority: 'critical',
        })

        const debtReserve = monthlyDebt * 6
        if (monthlyDebt > 0) {
            reserves.push({
                label: '6 months debt service reserve',
                amount: Math.round(debtReserve),
                months: 6,
                priority: 'critical',
            })
        }

        const wc = model.workingCapitalRequirement ?? Math.round(monthlyRevenue * 1.5)
        reserves.push({
            label: 'Working capital buffer',
            amount: Math.round(wc),
            months: 0,
            priority: 'recommended',
        })

        const capexReserve = (revenue ?? ebitda / (model.baseEbitdaMargin ?? 0.20)) * (model.maintenanceCapex ?? 0.02)
        reserves.push({
            label: 'Annual maintenance capex fund',
            amount: Math.round(capexReserve),
            months: 12,
            priority: 'recommended',
        })

        const emergencyFund = monthlyRevenue * 2
        reserves.push({
            label: 'Emergency/opportunity fund',
            amount: Math.round(emergencyFund),
            months: 2,
            priority: 'optional',
        })

        const totalRequired = reserves.filter(r => r.priority === 'critical').reduce((s, r) => s + r.amount, 0)
        const totalRecommended = reserves.reduce((s, r) => s + r.amount, 0)
        const asPercentOfPrice = Math.round((totalRecommended / price) * 100)

        return { reserves, totalRequired, totalRecommended, asPercentOfPrice, monthlyDebt: Math.round(monthlyDebt) }
    }, [model])

    if (!data) return null

    const priorityColor = (p: string) => {
        switch (p) {
            case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            case 'recommended': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Vault className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Cash reserve analysis</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Recommended cash reserves to hold post-acquisition for safety.
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/20 p-2">
                        <p className="text-[10px] text-muted-foreground">Minimum (critical)</p>
                        <p className="text-sm font-bold text-red-600">${data.totalRequired.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">Recommended (all)</p>
                        <p className="text-sm font-bold text-foreground">${data.totalRecommended.toLocaleString()}</p>
                    </div>
                </div>

                <p className="text-[10px] text-center text-muted-foreground">
                    Total recommended reserves = {data.asPercentOfPrice}% of purchase price
                </p>

                <div className="space-y-2">
                    {data.reserves.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-medium uppercase ${priorityColor(r.priority)}`}>
                                {r.priority}
                            </span>
                            <span className="flex-1 text-xs text-foreground">{r.label}</span>
                            <span className="text-xs font-mono font-medium text-foreground">${r.amount.toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-2.5 text-[10px] text-muted-foreground">
                    These reserves should be in addition to the equity invested. Insufficient reserves are the #1 reason acquisitions fail in year 1.
                </div>
            </CardContent>
        </Card>
    )
}
