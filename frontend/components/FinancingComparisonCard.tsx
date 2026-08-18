import { useMemo } from 'react'
import { ArrowLeftRight } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { resolveLoanTermYears } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type FinancingOption = {
    label: string
    equity: number
    debt: number
    sellerNote: number
    monthlyDebt: number
    annualCashFlow: number
    cashOnCash: number
    dscr: number
    risk: 'low' | 'medium' | 'high'
}

export default function FinancingComparisonCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const rawEbitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const ebitda = rawEbitda && rawEbitda > 0 ? rawEbitda : 2_400_000
        const rawPrice = model.purchasePrice ?? model.askingPrice
        const price = rawPrice && rawPrice > 0 ? rawPrice : 5_000_000

        const rate = model.interestRate ?? 0.07
        const term = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
        const taxRate = model.taxRate ?? 0.25
        const afterTaxEbitda = ebitda * (1 - taxRate)

        const calcOption = (label: string, equityPct: number, debtPct: number, sellerPct: number, riskLevel: 'low' | 'medium' | 'high'): FinancingOption => {
            const equity = price * equityPct
            const debt = price * debtPct
            const sellerNote = price * sellerPct
            const monthlyDebt = debt > 0 ? (debt * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -term * 12)) : 0
            const sellerMonthly = sellerNote > 0 ? (sellerNote * 0.05 / 12) + (sellerNote / (5 * 12)) : 0
            const totalMonthly = monthlyDebt + sellerMonthly
            const annualDebtService = totalMonthly * 12
            const annualCashFlow = afterTaxEbitda - annualDebtService
            const cashOnCash = equity > 0 ? (annualCashFlow / equity) * 100 : 0
            const dscr = annualDebtService > 0 ? afterTaxEbitda / annualDebtService : Infinity

            return { label, equity, debt, sellerNote, monthlyDebt: Math.round(totalMonthly), annualCashFlow: Math.round(annualCashFlow), cashOnCash, dscr: isFinite(dscr) ? dscr : 99, risk: riskLevel }
        }

        const options: FinancingOption[] = [
            calcOption('All Cash', 1.0, 0, 0, 'low'),
            calcOption('Conservative (60/40)', 0.40, 0.60, 0, 'medium'),
            calcOption('Standard SBA (10/80/10)', 0.10, 0.80, 0.10, 'high'),
            calcOption('Seller-friendly (20/50/30)', 0.20, 0.50, 0.30, 'medium'),
        ]

        return { options, price }
    }, [model])

    if (!data) return null

    const riskColor = (r: string) => {
        switch (r) {
            case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            default: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
    }

    const fmt = (n: number) => {
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
        return `$${n.toLocaleString()}`
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Financing structures compared</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Side-by-side comparison of common financing approaches for this deal.
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {data.options.map((opt, i) => (
                        <div key={i} className="rounded-lg border border-border p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${riskColor(opt.risk)}`}>
                                    {opt.risk} risk
                                </span>
                            </div>

                            <div className="flex h-3 rounded-full overflow-hidden mb-2">
                                {opt.equity > 0 && <div className="bg-blue-500" style={{ width: `${(opt.equity / data.price) * 100}%` }} />}
                                {opt.debt > 0 && <div className="bg-amber-500" style={{ width: `${(opt.debt / data.price) * 100}%` }} />}
                                {opt.sellerNote > 0 && <div className="bg-purple-500" style={{ width: `${(opt.sellerNote / data.price) * 100}%` }} />}
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <p className="text-[9px] text-muted-foreground">Equity needed</p>
                                    <p className="text-[11px] font-bold text-foreground">{fmt(opt.equity)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-muted-foreground">Monthly debt</p>
                                    <p className="text-[11px] font-bold text-foreground">{fmt(opt.monthlyDebt)}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-muted-foreground">Cash-on-cash</p>
                                    <p className={`text-[11px] font-bold ${opt.cashOnCash >= 20 ? 'text-green-600' : opt.cashOnCash >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {opt.cashOnCash.toFixed(0)}%
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-muted-foreground">DSCR</p>
                                    <p className={`text-[11px] font-bold ${opt.dscr >= 1.5 ? 'text-green-600' : opt.dscr >= 1.2 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {opt.dscr > 10 ? '∞' : `${opt.dscr.toFixed(1)}x`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-3 mt-3 text-[9px] text-muted-foreground justify-center">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />Equity</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />Senior debt</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />Seller note</span>
                </div>
            </CardContent>
        </Card>
    )
}
