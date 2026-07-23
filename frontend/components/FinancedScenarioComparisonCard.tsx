import { ChartNoAxesCombined } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { calculateIrr } from '../utils/dealMath'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function documentedRevenue(model: DealModel) {
    try {
        const fact = JSON.parse(model.documentedFactsJson || '{}').revenue
        return (fact?.status === 'confirmed' || fact?.status === 'illustrative') && typeof fact.value === 'number' ? fact.value : null
    } catch {
        return null
    }
}

type Scenario = { name: 'Bear' | 'Base' | 'Bull'; growth: number; margin: number; exitMultiple: number }

export default function FinancedScenarioComparisonCard({ model }: { model: DealModel }) {
    const revenue = documentedRevenue(model)
    const price = model.purchasePrice ?? model.askingPrice
    const fees = model.transactionFees ?? 0
    const workingCapital = model.workingCapitalRequirement ?? 0
    const equityPercent = model.equityContributionPercent ?? 0.3
    const sellerNote = model.sellerNoteAmount ?? 0
    const rate = model.interestRate ?? 0.1
    const amortizationYears = model.amortizationYears ?? 10
    const holdPeriod = model.holdPeriodYears ?? 5
    const tax = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const exitCosts = model.exitCosts ?? 0
    const uses = price === null ? null : price + fees + workingCapital
    const debt = uses === null ? null : Math.max(0, uses * (1 - equityPercent) - sellerNote)
    const equity = uses === null || debt === null ? null : uses - debt - sellerNote
    const annualDebtService = debt === null || amortizationYears <= 0 ? null : rate === 0 ? debt / amortizationYears : debt * ((rate * (1 + rate) ** amortizationYears) / (((1 + rate) ** amortizationYears) - 1))
    const debtAtExit = debt === null || annualDebtService === null ? null : Math.max(0, rate === 0 ? debt - annualDebtService * Math.min(holdPeriod, amortizationYears) : debt * (1 + rate) ** Math.min(holdPeriod, amortizationYears) - annualDebtService * (((1 + rate) ** Math.min(holdPeriod, amortizationYears) - 1) / rate))
    const scenarios: Scenario[] = [
        { name: 'Bear', growth: model.bearRevenueGrowth ?? 0, margin: model.bearEbitdaMargin ?? 0.15, exitMultiple: model.bearExitMultiple ?? 3 },
        { name: 'Base', growth: model.baseRevenueGrowth ?? 0.05, margin: model.baseEbitdaMargin ?? 0.2, exitMultiple: model.baseExitMultiple ?? 4 },
        { name: 'Bull', growth: model.bullRevenueGrowth ?? 0.1, margin: model.bullEbitdaMargin ?? 0.25, exitMultiple: model.bullExitMultiple ?? 5 },
    ]
    const ready = revenue !== null && equity !== null && annualDebtService !== null && debtAtExit !== null

    return <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-card/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Financed bear / base / bull returns</CardTitle></div><CardDescription className="mt-1">Levered outcomes combining documented starting revenue, saved growth cases, and the current financing structure.</CardDescription></div>
                <Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Scenario inputs available' : 'Inputs needed'}</Badge>
            </div>
        </CardHeader>
        <CardContent className="p-5">
            {!ready ? <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add confirmed starting revenue plus a purchase price and financing inputs to calculate financed scenarios.</p> : <div className="grid gap-3 lg:grid-cols-3">
                {scenarios.map((scenario) => {
                    const yearlyRevenue = Array.from({ length: holdPeriod }, (_, year) => revenue! * (1 + scenario.growth) ** (year + 1))
                    const yearlyCashFlows = yearlyRevenue.map((yearRevenue) => yearRevenue * scenario.margin * (1 - tax) - capex - annualDebtService!)
                    const exitEbitda = yearlyRevenue[yearlyRevenue.length - 1] * scenario.margin
                    const exitProceeds = exitEbitda * scenario.exitMultiple - exitCosts - debtAtExit! - sellerNote
                    const cashFlows = [-equity!, ...yearlyCashFlows.map((cashFlow, index) => cashFlow + (index === yearlyCashFlows.length - 1 ? exitProceeds : 0))]
                    const moic = cashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / equity!
                    const irr = calculateIrr(cashFlows)
                    const yearOneDscr = annualDebtService! > 0 ? (yearlyRevenue[0] * scenario.margin * (1 - tax) - capex) / annualDebtService! : null
                    const tone = scenario.name === 'Bear' ? 'border-warning/30 bg-warning/5' : scenario.name === 'Bull' ? 'border-success/30 bg-success/5' : 'border-primary/30 bg-primary/5'
                    return <div key={scenario.name} className={`rounded-xl border p-4 ${tone}`}>
                        <div className="flex items-center justify-between"><p className="font-semibold text-foreground">{scenario.name}</p><Badge variant="outline">{(scenario.growth * 100).toFixed(1)}% growth</Badge></div>
                        <p className="mt-3 text-xs text-muted-foreground">Levered MOIC / IRR</p><p className="mt-1 text-xl font-semibold text-foreground">{moic.toFixed(2)}x / {irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}</p>
                        <div className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><span className="text-muted-foreground">Year-{holdPeriod} revenue</span><span className="font-medium">{money(yearlyRevenue[yearlyRevenue.length - 1])}</span></div><div className="flex justify-between gap-3"><span className="text-muted-foreground">Exit EBITDA</span><span className="font-medium">{money(exitEbitda)}</span></div><div className="flex justify-between gap-3"><span className="text-muted-foreground">Exit equity proceeds</span><span className="font-medium">{money(exitProceeds)}</span></div><div className="flex justify-between gap-3"><span className="text-muted-foreground">Year-one DSCR</span><span className="font-medium">{yearOneDscr === null ? 'Not available' : `${yearOneDscr.toFixed(2)}x`}</span></div></div>
                        <p className="mt-4 text-xs leading-5 text-muted-foreground">Growth, EBITDA margin, and exit multiple are scenario assumptions. Financing terms are shared saved assumptions.</p>
                    </div>
                })}
            </div>}
        </CardContent>
    </Card>
}
