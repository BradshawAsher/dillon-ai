import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

export default function CashOnCashCalculatorCard({ model }: Props) {
    const facts = useMemo(() => parseDocumentedFacts(model.documentedFactsJson), [model])
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const price = model.purchasePrice ?? model.askingPrice

    const defaultDown = Math.round(normalizeEquityFraction(model.equityContributionPercent) * 100)
    const defaultRate = model.interestRate ? model.interestRate * 100 : 7.0
    const defaultTerm = model.amortizationYears ?? 10

    const [downPaymentPct, setDownPaymentPct] = useState(defaultDown)
    const [interestRate, setInterestRate] = useState(defaultRate)
    const [loanTerm, setLoanTerm] = useState(defaultTerm)

    const results = useMemo(() => {
        if (!price || !ebitda) return null

        const downPayment = price * (downPaymentPct / 100)
        const loanAmount = price - downPayment
        const monthlyRate = interestRate / 100 / 12
        const numPayments = loanTerm * 12

        let annualDebtService = 0
        if (loanAmount > 0 && monthlyRate > 0) {
            const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
            annualDebtService = monthlyPayment * 12
        } else if (loanAmount > 0) {
            annualDebtService = loanAmount / loanTerm
        }

        const cashFlowAfterDebt = ebitda - annualDebtService
        const cashOnCashReturn = downPayment > 0 ? (cashFlowAfterDebt / downPayment) * 100 : 0
        const dscr = annualDebtService > 0 ? ebitda / annualDebtService : Infinity

        return {
            downPayment,
            loanAmount,
            annualDebtService,
            cashFlowAfterDebt,
            cashOnCashReturn,
            dscr,
        }
    }, [price, ebitda, downPaymentPct, interestRate, loanTerm])

    if (!price || !ebitda) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Cash-on-cash return calculator</CardTitle>
                        <CardInfoPopover cardId="cash-on-cash" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="space-y-3">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-foreground">Down Payment</label>
                            <span className="text-xs font-semibold text-primary">{downPaymentPct}%</span>
                        </div>
                        <input
                            type="range"
                            min={10}
                            max={100}
                            step={5}
                            value={downPaymentPct}
                            onChange={e => setDownPaymentPct(Number(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary"
                            aria-label="Down payment percentage"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>10%</span>
                            <span>100%</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-foreground">Interest Rate</label>
                            <span className="text-xs font-semibold text-primary">{interestRate.toFixed(1)}%</span>
                        </div>
                        <input
                            type="range"
                            min={3}
                            max={15}
                            step={0.5}
                            value={interestRate}
                            onChange={e => setInterestRate(Number(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary"
                            aria-label="Interest rate"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>3%</span>
                            <span>15%</span>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-foreground">Loan Term</label>
                            <span className="text-xs font-semibold text-primary">{loanTerm} years</span>
                        </div>
                        <input
                            type="range"
                            min={3}
                            max={25}
                            step={1}
                            value={loanTerm}
                            onChange={e => setLoanTerm(Number(e.target.value))}
                            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted accent-primary"
                            aria-label="Loan term in years"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>3 yr</span>
                            <span>25 yr</span>
                        </div>
                    </div>
                </div>

                {results && (
                    <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
                        <div className="rounded-lg border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Loan Amount</p>
                            <p className="text-sm font-bold text-foreground">${results.loanAmount.toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Annual Debt Service</p>
                            <p className="text-sm font-bold text-foreground">${Math.round(results.annualDebtService).toLocaleString()}</p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Cash Flow After Debt</p>
                            <p className={`text-sm font-bold ${results.cashFlowAfterDebt >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${Math.round(results.cashFlowAfterDebt).toLocaleString()}
                            </p>
                        </div>
                        <div className="rounded-lg border border-border p-3 text-center">
                            <p className="text-[10px] text-muted-foreground">Cash-on-Cash Return</p>
                            <p className={`text-sm font-bold ${results.cashOnCashReturn >= 15 ? 'text-green-600' : results.cashOnCashReturn >= 8 ? 'text-amber-600' : 'text-red-600'}`}>
                                {results.cashOnCashReturn.toFixed(1)}%
                            </p>
                        </div>
                        <div className="col-span-2 rounded-lg bg-muted/50 p-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">DSCR (Debt Service Coverage)</span>
                                <span className={`text-sm font-bold ${results.dscr >= 1.5 ? 'text-green-600' : results.dscr >= 1.2 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {results.dscr === Infinity ? 'N/A (no debt)' : `${results.dscr.toFixed(2)}x`}
                                </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {results.dscr >= 1.5 ? 'Healthy coverage — comfortable debt capacity' :
                                 results.dscr >= 1.2 ? 'Adequate but tight — limited margin for error' :
                                 results.dscr < 1.0 ? 'Insufficient — cash flow cannot cover debt payments' :
                                 'Below lender minimums — renegotiate terms or increase equity'}
                            </p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
