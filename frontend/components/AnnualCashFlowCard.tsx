import { useMemo } from 'react'
import { Banknote } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type FlowItem = {
    label: string
    amount: number
    type: 'income' | 'expense' | 'subtotal'
}

export default function AnnualCashFlowCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const taxRate = model.taxRate ?? 0.25
        const capex = model.maintenanceCapex ?? 0

        const equityPct = normalizeEquityFraction(model.equityContributionPercent) * 100
        const debt = price * (1 - equityPct / 100) - (model.sellerNoteAmount ?? 0)
        const rate = model.interestRate ?? 0.07
        const amortYears = model.amortizationYears ?? 10
        const monthlyRate = rate / 12
        const nPayments = amortYears * 12
        const monthlyPayment = debt > 0 && monthlyRate > 0
            ? debt * (monthlyRate * Math.pow(1 + monthlyRate, nPayments)) / (Math.pow(1 + monthlyRate, nPayments) - 1)
            : 0
        const annualDebtService = monthlyPayment * 12

        const taxes = ebitda * taxRate
        const afterTaxIncome = ebitda - taxes
        const afterCapex = afterTaxIncome - capex
        const netCashFlow = afterCapex - annualDebtService

        const items: FlowItem[] = [
            { label: 'EBITDA / SDE', amount: ebitda, type: 'income' },
            { label: `Taxes (${(taxRate * 100).toFixed(0)}%)`, amount: -taxes, type: 'expense' },
            { label: 'After-tax income', amount: afterTaxIncome, type: 'subtotal' },
            { label: 'Maintenance CapEx', amount: -capex, type: 'expense' },
            { label: 'Debt service', amount: -annualDebtService, type: 'expense' },
            { label: 'Net cash flow to owner', amount: netCashFlow, type: 'subtotal' },
        ]

        return { items, netCashFlow, ebitda }
    }, [model])

    if (!data) return null

    const maxAmount = Math.max(...data.items.map(i => Math.abs(i.amount)))

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Annual cash flow breakdown</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Year 1 cash flow waterfall from EBITDA to owner's pocket
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
                {data.items.map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 ${item.type === 'subtotal' ? 'border-t border-border pt-2 mt-1' : ''}`}>
                        <span className={`text-xs w-[140px] shrink-0 ${item.type === 'subtotal' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {item.label}
                        </span>
                        <div className="flex-1 flex items-center gap-2">
                            <div className="flex-1 h-4 relative">
                                <div
                                    className={`absolute top-0 h-full rounded-sm ${item.amount >= 0 ? 'bg-green-400 left-1/2' : 'bg-red-400 right-1/2'}`}
                                    style={{ width: `${(Math.abs(item.amount) / maxAmount) * 50}%` }}
                                />
                            </div>
                        </div>
                        <span className={`text-xs font-medium w-[90px] text-right ${item.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.amount >= 0 ? '+' : ''}${Math.round(Math.abs(item.amount)).toLocaleString()}
                        </span>
                    </div>
                ))}

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 mt-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Owner's annual cash flow</p>
                    <p className={`text-lg font-bold ${data.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.round(Math.abs(data.netCashFlow)).toLocaleString()}{data.netCashFlow < 0 ? ' (negative)' : '/yr'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                        {data.netCashFlow > 0 ? `${((data.netCashFlow / data.ebitda) * 100).toFixed(0)}% of EBITDA reaches the owner after taxes, capex, and debt service` : 'Business does not cash flow under current assumptions'}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
