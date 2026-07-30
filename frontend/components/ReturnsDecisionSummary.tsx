import { CircleDollarSign, Landmark, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { computeAllCashReturns } from '../utils/dealMath'
import { parseDocumentedFacts } from '../utils/evidence'

function money(value: number | null, currency = 'USD') {
    if (value === null || !Number.isFinite(value)) return 'Needs input'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export default function ReturnsDecisionSummary({ model }: { model: DealModel }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitdaFact = facts.ebitda_sde
    const ebitda = (ebitdaFact?.status === 'confirmed' || ebitdaFact?.status === 'illustrative') && typeof ebitdaFact.value === 'number'
        ? ebitdaFact.value
        : null
    const currency = ebitdaFact?.currency || 'USD'
    const results = computeAllCashReturns({
        ebitda,
        purchasePrice: model.purchasePrice ?? model.askingPrice,
        transactionFees: model.transactionFees,
        workingCapital: model.workingCapitalRequirement,
        taxRate: model.taxRate,
        maintenanceCapex: model.maintenanceCapex,
        holdPeriodYears: model.holdPeriodYears,
        exitMultiple: model.exitMultiple,
        exitCosts: model.exitCosts,
    })
    const price = model.purchasePrice ?? model.askingPrice
    const uses = price === null ? null : price + (model.transactionFees ?? 0) + (model.workingCapitalRequirement ?? 0)
    const equityPercent = model.equityContributionPercent ?? 0.3
    const equity = uses === null ? null : uses * equityPercent
    const debt = uses === null || equity === null ? null : Math.max(0, uses - equity - (model.sellerNoteAmount ?? 0))
    const interestRate = model.interestRate ?? 0.1
    const amortization = model.amortizationYears ?? 10
    const annualDebtService = debt === null ? null : interestRate === 0 ? debt / amortization : debt * ((interestRate * (1 + interestRate) ** amortization) / ((1 + interestRate) ** amortization - 1))
    const operatingCashFlow = ebitda === null ? null : ebitda * (1 - (model.taxRate ?? 0.25)) - (model.maintenanceCapex ?? 0)
    const dscr = annualDebtService && operatingCashFlow !== null ? operatingCashFlow / annualDebtService : null
    const returnsReady = results.ready

    return <Card className="overflow-hidden border-2 border-primary shadow-md">
        <CardContent className="bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2 text-primary"><TrendingUp className="h-5 w-5" /><p className="text-sm font-bold uppercase tracking-wide">Start here — returns at a glance</p></div><p className="mt-1 text-sm leading-6 text-foreground">A plain-English first view of what the acquisition puts in, produces, and returns. Detailed all-cash and financing models are below.</p></div><span className="w-fit rounded-full border border-primary/30 bg-background/80 px-3 py-1 text-xs font-semibold text-primary">{returnsReady ? 'Model results available' : 'Inputs still needed'}</span></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Kpi icon={<CircleDollarSign className="h-4 w-4" />} label="Cash needed at close" value={money(results.initialInvestment, currency)} detail="Purchase price, fees, and working capital" /><Kpi icon={<TrendingUp className="h-4 w-4" />} label="Annual cash generated" value={money(results.annualCashFlow, currency)} detail="After tax and maintenance capex" /><Kpi icon={<TrendingUp className="h-4 w-4" />} label="Time to make money back" value={results.paybackYears === null ? 'Needs input' : `${results.paybackYears.toFixed(1)} years`} detail="All-cash operating payback" /><Kpi icon={<CircleDollarSign className="h-4 w-4" />} label="Total return with sale" value={results.exitReady ? `${results.totalMoic?.toFixed(2) ?? '—'}x / ${results.irr === null ? '—' : `${(results.irr * 100).toFixed(1)}%`}` : 'Add exit inputs'} detail="MOIC / annualized IRR" /></div>
            <div className="mt-4 rounded-lg border border-primary/25 bg-background/80 p-3 text-sm leading-6 text-foreground"><div className="flex items-center gap-2 font-semibold"><Landmark className="h-4 w-4 text-primary" />Financing health</div><p className="mt-1 text-muted-foreground">{equity === null ? 'Add a purchase price to estimate the buyer equity contribution and debt load.' : <>At the default financing mix, the buyer puts in {money(equity, currency)} of equity. {dscr === null ? 'Add EBITDA/SDE to test whether operating cash flow covers the planned debt payments.' : `Operating cash flow covers annual debt service ${dscr.toFixed(2)}x${dscr < 1.25 ? ', which is below the 1.25x screening threshold and deserves attention.' : ', which clears the 1.25x screening threshold.'}`}</>}</p><p className="mt-2 text-xs text-muted-foreground"><strong>MOIC</strong> means total money back divided by money invested. <strong>IRR</strong> means the annualized return over the hold period.</p></div>
        </CardContent>
    </Card>
}

function Kpi({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
    return <div className="rounded-lg border border-primary/25 bg-background/90 p-3 shadow-sm"><div className="flex items-center gap-2 text-primary">{icon}<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p></div><p className="mt-2 text-xl font-bold text-foreground">{value}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div>
}
