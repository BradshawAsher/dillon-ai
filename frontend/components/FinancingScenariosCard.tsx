import { useMemo } from 'react'
import { Landmark } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { computeAmortizingLoan, normalizePercentageFraction, resolveLoanTermYears, DEAL_MATH_DEFAULTS } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'
import DataOriginBadge from './common/DataOriginBadge'

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

        const rate = normalizePercentageFraction(model.interestRate) ?? DEAL_MATH_DEFAULTS.interestRate
        const term = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
        const taxRate = normalizePercentageFraction(model.taxRate) ?? DEAL_MATH_DEFAULTS.taxRate
        const operatingCashFlow = ebitda * (1 - taxRate) - (model.maintenanceCapex ?? DEAL_MATH_DEFAULTS.maintenanceCapex)

        const configs = [
            { label: 'All Cash', pct: 1.0 },
            { label: '25% Down', pct: 0.25 },
            { label: '50% Down', pct: 0.50 },
        ]

        return configs.map(c => {
            const down = price * c.pct
            const loan = price - down
            const annualDebt = computeAmortizingLoan(loan, rate, term)?.annualDebtService ?? 0
            const cfAfterDebt = operatingCashFlow - annualDebt
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
                        <CardInfoPopover cardId="financing-scenarios" />
                    </div>
                    <Badge variant="outline">{((normalizePercentageFraction(model.interestRate) ?? DEAL_MATH_DEFAULTS.interestRate) * 100).toFixed(1)}% rate · {resolveLoanTermYears(model.amortizationYears, model.loanTermYears)}yr term</Badge>
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
                                    <DataOriginBadge
                                        origin="assumption"
                                        label={`${s.downPaymentPct}% Down`}
                                        metricLabel={`${s.label} Scenario`}
                                        metricValue={`${money(s.downPayment)} equity`}
                                        description={`Financing structure with ${s.downPaymentPct}% equity down payment and ${100 - s.downPaymentPct}% amortizing senior debt.`}
                                        compact
                                    />
                                </div>
                                <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Down payment</span>
                                            <DataOriginBadge
                                                origin="calculated"
                                                metricLabel={`Down Payment (${s.label})`}
                                                metricValue={money(s.downPayment)}
                                                formula={`Purchase Price × ${s.downPaymentPct}%`}
                                                description="Cash equity check required from the buyer at closing."
                                                compact
                                            />
                                        </div>
                                        <span className="font-medium text-foreground">{money(s.downPayment)}</span>
                                    </div>
                                    {s.loanAmount > 0 && (
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1">
                                                <span className="text-muted-foreground">Annual debt service</span>
                                                <DataOriginBadge
                                                    origin="calculated"
                                                    metricLabel={`Annual Debt Service (${s.label})`}
                                                    metricValue={money(s.annualDebtService)}
                                                    formula="Amortizing loan P&I payment"
                                                    description="Total annual principal and interest payments owed to senior lenders."
                                                    compact
                                                />
                                            </div>
                                            <span className="font-medium text-foreground">{money(s.annualDebtService)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Cash flow after debt</span>
                                            <DataOriginBadge
                                                origin="calculated"
                                                metricLabel={`Cash Flow After Debt (${s.label})`}
                                                metricValue={money(s.cashFlowAfterDebt)}
                                                formula="Operating Cash Flow − Annual Debt Service"
                                                description="Net annual cash generated after servicing senior debt and paying income taxes."
                                                compact
                                            />
                                        </div>
                                        <span className={`font-medium ${s.cashFlowAfterDebt >= 0 ? 'text-foreground' : 'text-red-600'}`}>{money(s.cashFlowAfterDebt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1">
                                            <span className="text-muted-foreground">Cash-on-cash return</span>
                                            <DataOriginBadge
                                                origin="calculated"
                                                metricLabel={`Cash-on-Cash Return (${s.label})`}
                                                metricValue={`${s.cashOnCashReturn.toFixed(1)}%`}
                                                formula="(Cash Flow After Debt ÷ Down Payment) × 100"
                                                description="Annual pre-tax cash yield earned on initial equity invested."
                                                compact
                                            />
                                        </div>
                                        <span className={`font-bold ${cocColor}`}>{s.cashOnCashReturn.toFixed(1)}%</span>
                                    </div>
                                </div>
                                <div className="pt-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-muted-foreground">Payback</span>
                                            <DataOriginBadge
                                                origin="calculated"
                                                metricLabel={`Payback Period (${s.label})`}
                                                metricValue={isFinite(s.paybackYears) ? `${s.paybackYears.toFixed(1)} yrs` : 'N/A'}
                                                formula="Down Payment ÷ Cash Flow After Debt"
                                                description="Number of operating years required to recoup initial cash equity."
                                                compact
                                            />
                                        </div>
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
