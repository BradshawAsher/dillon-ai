import { BarChart3 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { calculateIrr } from '../utils/dealMath'
import { CashFlowChart } from './DealCharts'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function IllustrativeReturnsPreviewCard() {
    // Display-only orientation values. They never write to a project or enter
    // the evidence chain; live numbers take over as soon as facts arrive.
    const purchasePrice = 1_000_000
    const fees = 10_000
    const workingCapital = 20_000
    const ebitda = 200_000
    const annualCashFlow = ebitda * 0.75 - 10_000
    const exitProceeds = ebitda * 4 * 0.98
    const initialInvestment = purchasePrice + fees + workingCapital
    const cashFlows = [-initialInvestment, annualCashFlow, annualCashFlow, annualCashFlow, annualCashFlow, annualCashFlow + exitProceeds]
    const moic = cashFlows.slice(1).reduce((sum, value) => sum + value, 0) / initialInvestment
    const irr = calculateIrr(cashFlows)
    const chartData = cashFlows.map((cashFlow, index) => ({ label: index === 0 ? 'Close' : `Year ${index}`, cashFlow }))

    return <Card className="overflow-hidden border-dashed border-primary/40 bg-primary/[0.025]">
        <CardHeader className="border-b border-primary/15 bg-primary/5"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Illustrative returns preview</CardTitle></div><CardDescription>Orientation only while this project is waiting for documented EBITDA/SDE and a price. These sample values are not saved to the project.</CardDescription></CardHeader>
        <CardContent className="space-y-4 p-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative annual cash flow</p><p className="mt-1 text-lg font-semibold">{money(annualCashFlow)}</p></div><div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative MOIC / IRR</p><p className="mt-1 text-lg font-semibold">{moic.toFixed(2)}x / {irr === null ? '—' : `${(irr * 100).toFixed(1)}%`}</p></div><div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative five-year exit</p><p className="mt-1 text-lg font-semibold">{money(exitProceeds)}</p></div></div><CashFlowChart title="Illustrative all-cash cash-flow timeline" data={chartData} /><p className="text-xs leading-5 text-muted-foreground">Preview assumptions: {money(purchasePrice)} purchase price, {money(ebitda)} EBITDA/SDE, 25% tax, {money(fees)} fees, {money(workingCapital)} working capital, 4.0x exit multiple, and a five-year hold.</p></CardContent>
    </Card>
}
