import { useMemo } from 'react'
import { Receipt } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

type TaxStrategy = {
    label: string
    annualSavings: number
    description: string
}

type TaxAnalysis = {
    currentTaxImpact: number
    strategies: TaxStrategy[]
    totalAnnualSavings: number
    fiveYearCumulative: number
}

export default function TaxImpactCard({ model }: Props) {
    const analysis = useMemo((): TaxAnalysis | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : model.ebitda
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const taxRate = model.taxRate ?? 0.25
        const interestRate = model.interestRate ?? 0.07
        const seniorDebt = model.seniorDebtAmount ?? 0
        const sellerNote = model.sellerNoteAmount ?? 0
        const totalDebt = seniorDebt + sellerNote
        const holdPeriod = model.holdPeriodYears ?? 5

        // Current tax rate impact on annual cash flow
        const currentTaxImpact = ebitda * taxRate

        const strategies: TaxStrategy[] = []

        // Asset step-up: additional depreciation deductions
        const stepUpDeduction = (price * 0.15) / 15
        const stepUpSavings = stepUpDeduction * taxRate
        strategies.push({
            label: 'Asset step-up depreciation',
            annualSavings: stepUpSavings,
            description: `${((price * 0.15) / 1000).toFixed(0)}k basis over 15 years`,
        })

        // Section 179 deduction (one-time, amortized over hold period for annual view)
        const section179Cap = 1160000
        const equipmentEstimate = price * 0.10
        const section179Deduction = Math.min(equipmentEstimate, section179Cap)
        const section179AnnualBenefit = (section179Deduction * taxRate) / holdPeriod
        strategies.push({
            label: 'Section 179 deduction',
            annualSavings: section179AnnualBenefit,
            description: `$${(section179Deduction / 1000).toFixed(0)}k one-time, amortized over ${holdPeriod} years`,
        })

        // Interest deduction
        const annualInterest = totalDebt * interestRate
        const interestTaxSavings = annualInterest * taxRate
        strategies.push({
            label: 'Interest deduction',
            annualSavings: interestTaxSavings,
            description: `$${(annualInterest / 1000).toFixed(0)}k annual interest at ${(taxRate * 100).toFixed(0)}% rate`,
        })

        // Pass-through entity election (saves ~3% vs C-corp)
        const passThroughSavings = ebitda * 0.03
        strategies.push({
            label: 'Pass-through entity election',
            annualSavings: passThroughSavings,
            description: '~3% savings vs C-corp structure on EBITDA',
        })

        const totalAnnualSavings = strategies.reduce((sum, s) => sum + s.annualSavings, 0)
        const fiveYearCumulative = totalAnnualSavings * holdPeriod

        return {
            currentTaxImpact,
            strategies,
            totalAnnualSavings,
            fiveYearCumulative,
        }
    }, [model])

    if (!analysis) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Tax planning impact on returns</CardTitle>
                    <CardInfoPopover cardId="tax-impact" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Impact of different tax strategies on cash flow and returns
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Current tax impact */}
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="text-[10px] text-muted-foreground">Current annual tax burden</div>
                    <div className="text-xl font-bold text-foreground mt-0.5">
                        ${Math.round(analysis.currentTaxImpact).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                        At effective rate on operating earnings
                    </div>
                </div>

                {/* Tax strategies */}
                <div className="space-y-2">
                    <span className="text-xs font-medium text-foreground">Tax optimization strategies</span>
                    {analysis.strategies.map((strategy) => (
                        <div key={strategy.label} className="flex items-center justify-between rounded-lg bg-muted/50 p-2.5">
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-foreground truncate">{strategy.label}</div>
                                <div className="text-[10px] text-muted-foreground">{strategy.description}</div>
                            </div>
                            <div className="text-sm font-semibold text-green-600 ml-3 whitespace-nowrap">
                                +${Math.round(strategy.annualSavings).toLocaleString()}/yr
                            </div>
                        </div>
                    ))}
                </div>

                {/* Totals */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="text-[10px] text-green-700">Total annual tax savings</div>
                        <div className="text-lg font-bold text-green-700 mt-0.5">
                            ${Math.round(analysis.totalAnnualSavings).toLocaleString()}
                        </div>
                    </div>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                        <div className="text-[10px] text-green-700">5-year cumulative savings</div>
                        <div className="text-lg font-bold text-green-700 mt-0.5">
                            ${Math.round(analysis.fiveYearCumulative).toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        Estimates based on current tax law. Actual savings depend on entity structure,
                        asset allocation, and qualification requirements. Consult a tax advisor for
                        deal-specific planning.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
