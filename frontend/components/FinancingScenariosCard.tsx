import { useMemo } from 'react'
import { Landmark } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { resolveLoanTermYears } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
}

type Scenario = {
    label: string
    downPaymentPct: number
    downPayment: number
    loanAmount: number
    annualDebtService: number
    cashFlowAfterDebt: number
    cashOnCashReturn: number
    paybackYears: number
}

function money(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
}

export default function FinancingScenariosCard({ model }: Props) {
    const scenarios = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const price = model.purchasePrice ?? model.askingPrice
        if (!ebitda || !price || ebitda <= 0) return null

        const rate = model.interestRate ?? 0.07
        const term = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
        const annualPaymentFactor = rate > 0 ? (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1) : 1 / term

        const configs = [
            { label: 'All Cash', pct: 1.0 },
            { label: '25% Down', pct: 0.25 },
            { label: '50% Down', pct: 0.50 },
        ]

        return configs.map(c => {
            const down = price * c.pct
            const loan = price - down
            const annualDebt = loan > 0 ? loan * annualPaymentFactor : 0
            const cfAfterDebt = ebitda - annualDebt
            const cocReturn = down > 0 ? (cfAfterDebt / down) * 100 : 0
            const payback = cfAfterDebt > 0 ? down / cfAfterDebt : Infinity
            return {
                label: c.label,
                downPaymentPct: c.pct * 100,
                downPayment: down,
                loanAmount: loan,
                annualDebtService: annualDebt,
                cashFlowAfterDebt: cfAfterDebt,
                cashOnCashReturn: cocReturn,
                paybackYears: payback,
            } as Scenario
        })
    }, [model])

    if (!scenarios) return null

    const maxPayback = Math.max(...scenarios.filter(s => isFinite(s.paybackYears)).map(s => s.paybackYears), 1)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Financing scenarios</CardTitle>
                    </div>
                    <Badge variant="outline">{((model.interestRate ?? 0.07) * 100).toFixed(1)}% rate · {resolveLoanTermYears(model.amortizationYears, model.loanTermYears)}yr term</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    {scenarios.map(s => {
                        const barWidth = isFinite(s.paybackYears) ? Math.min((s.paybackYears / maxPayback) * 100, 100) : 100
                        const cocColor = s.cashOnCashReturn >= 30 ? 'text-green-600' : s.cashOnCashReturn >= 15 ? 'text-foreground' : 'text-red-600'
                        return (
                            <div key={s.label} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-foreground">{s.label}</span>
                                    <Badge variant="secondary" className="text-[10px]">{s.downPaymentPct}%</Badge>
                                </div>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Down payment</span>
                                        <span className="font-medium text-foreground">{money(s.downPayment)}</span>
                                    </div>
                                    {s.loanAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Annual debt service</span>
                                            <span className="font-medium text-foreground">{money(s.annualDebtService)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Cash flow after debt</span>
                                        <span className={`font-medium ${s.cashFlowAfterDebt >= 0 ? 'text-foreground' : 'text-red-600'}`}>{money(s.cashFlowAfterDebt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Cash-on-cash return</span>
                                        <span className={`font-bold ${cocColor}`}>{s.cashOnCashReturn.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-muted-foreground">Payback</span>
                                        <span className="text-[10px] font-medium text-foreground">
                                            {isFinite(s.paybackYears) ? `${s.paybackYears.toFixed(1)} yrs` : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-muted">
                                        <div
                                            className={`h-2 rounded-full transition-all ${s.paybackYears <= 4 ? 'bg-green-500' : s.paybackYears <= 6 ? 'bg-amber-500' : 'bg-red-500'}`}
                                            style={{ width: `${barWidth}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
