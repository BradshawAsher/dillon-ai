import { CircleDollarSign, Landmark, TrendingUp, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { ReactNode } from 'react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import { computeAllCashReturns } from '../utils/dealMath'
import { parseDocumentedFacts } from '../utils/evidence'

import { safeFormatCurrency } from '../utils/diligenceDashboardUtils'

function money(value: number | null, currency = 'USD') {
    if (value === null || !Number.isFinite(value)) return 'Needs input'
    return safeFormatCurrency(value, currency)
}

export default function ReturnsDecisionSummary({ model }: { model: DealModel }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)

    // 1. EBITDA / SDE status resolution
    const ebitdaFact = facts.ebitda_sde
    let ebitda: number = 200_000
    let ebitdaIsConfirmed = false
    let ebitdaStatusLabel = 'Illustrative preview ($200k)'

    if (ebitdaFact?.status === 'confirmed' && typeof ebitdaFact.value === 'number' && ebitdaFact.value > 0) {
        ebitda = ebitdaFact.value
        ebitdaIsConfirmed = true
        ebitdaStatusLabel = 'Confirmed documented fact'
    } else if (typeof ebitdaFact?.value === 'number' && ebitdaFact.value > 0) {
        ebitda = ebitdaFact.value
        ebitdaStatusLabel = `Unconfirmed fact (${ebitdaFact.status || 'pending'})`
    } else if (typeof model.ebitda === 'number' && model.ebitda > 0) {
        ebitda = model.ebitda
        ebitdaStatusLabel = 'Saved model assumption'
    }

    // 2. Revenue status resolution
    const revenueFact = facts.revenue
    let revenue: number = 1_000_000
    let revenueIsConfirmed = false
    let revenueStatusLabel = 'Illustrative preview ($1.0M)'

    if (revenueFact?.status === 'confirmed' && typeof revenueFact.value === 'number' && revenueFact.value > 0) {
        revenue = revenueFact.value
        revenueIsConfirmed = true
        revenueStatusLabel = 'Confirmed documented fact'
    } else if (typeof revenueFact?.value === 'number' && revenueFact.value > 0) {
        revenue = revenueFact.value
        revenueStatusLabel = `Unconfirmed fact (${revenueFact.status || 'pending'})`
    } else if (ebitda > 0 && model.baseEbitdaMargin) {
        revenue = ebitda / model.baseEbitdaMargin
        revenueStatusLabel = 'Derived from EBITDA & margin'
    }

    // 3. Purchase Price status resolution
    const price = model.purchasePrice ?? model.askingPrice ?? 1_000_000
    const priceIsConfirmed = model.purchasePrice !== null && model.purchasePrice !== undefined
    const priceStatusLabel = priceIsConfirmed
        ? 'Confirmed purchase price'
        : model.askingPrice ? 'Unconfirmed asking price' : 'Illustrative default ($1.0M)'

    const currency = ebitdaFact?.currency || revenueFact?.currency || 'USD'

    const results = computeAllCashReturns({
        ebitda,
        purchasePrice: price,
        transactionFees: model.transactionFees ?? 10_000,
        workingCapital: model.workingCapitalRequirement ?? 20_000,
        taxRate: model.taxRate ?? 0.25,
        maintenanceCapex: model.maintenanceCapex ?? 10_000,
        holdPeriodYears: model.holdPeriodYears ?? 5,
        exitMultiple: model.exitMultiple ?? 4,
        exitCosts: model.exitCosts ?? 16_000,
    })

    const uses = price + (model.transactionFees ?? 10_000) + (model.workingCapitalRequirement ?? 20_000)
    const equityPercent = model.equityContributionPercent ?? 0.3
    const equity = uses * equityPercent
    const debt = Math.max(0, uses - equity - (model.sellerNoteAmount ?? 0))
    const interestRate = model.interestRate ?? 0.1
    const amortization = model.amortizationYears ?? 10
    const annualDebtService = interestRate === 0 ? debt / amortization : debt * ((interestRate * (1 + interestRate) ** amortization) / ((1 + interestRate) ** amortization - 1))
    const operatingCashFlow = ebitda * (1 - (model.taxRate ?? 0.25)) - (model.maintenanceCapex ?? 10_000)
    const dscr = annualDebtService > 0 ? operatingCashFlow / annualDebtService : null

    const hasIllustrativeOrUnconfirmed = !ebitdaIsConfirmed || !revenueIsConfirmed || !priceIsConfirmed

    return (
        <Card className="overflow-hidden border-2 border-primary shadow-md">
            <CardContent className="bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-primary">
                            <TrendingUp className="h-5 w-5" />
                            <p className="text-sm font-bold uppercase tracking-wide">Start here — returns at a glance</p>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-foreground">
                            A plain-English first view of what the acquisition puts in, produces, and returns.
                        </p>
                    </div>
                    <Badge variant={hasIllustrativeOrUnconfirmed ? 'warning' : 'success'} className="w-fit text-xs px-3 py-1 font-bold">
                        {hasIllustrativeOrUnconfirmed ? '⚠ Illustrative / Unconfirmed inputs' : '✓ Fully Verified Model'}
                    </Badge>
                </div>

                {/* KPI Cards Grid */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Kpi
                        icon={<CircleDollarSign className="h-4 w-4" />}
                        label="Cash needed at close"
                        value={money(results.initialInvestment, currency)}
                        detail="Purchase price, fees, and working capital"
                        statusBadge={priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Confirmed Price</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ {priceStatusLabel}</Badge>}
                    />
                    <Kpi
                        icon={<TrendingUp className="h-4 w-4" />}
                        label="Annual cash generated"
                        value={money(results.annualCashFlow, currency)}
                        detail="After tax and maintenance capex"
                        statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified EBITDA</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ {ebitdaStatusLabel}</Badge>}
                    />
                    <Kpi
                        icon={<TrendingUp className="h-4 w-4" />}
                        label="Time to make money back"
                        value={results.paybackYears === null ? 'Needs input' : `${results.paybackYears.toFixed(1)} years`}
                        detail="All-cash operating payback"
                        statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified Payback</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Payback</Badge>}
                    />
                    <Kpi
                        icon={<CircleDollarSign className="h-4 w-4" />}
                        label="Total return with sale"
                        value={results.exitReady ? `${results.totalMoic?.toFixed(2) ?? '—'}x / ${results.irr === null ? '—' : `${(results.irr * 100).toFixed(1)}%`}` : 'Add exit inputs'}
                        detail="MOIC / annualized IRR"
                        statusBadge={ebitdaIsConfirmed && priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified Exit</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Preview</Badge>}
                    />
                </div>

                {/* Detailed Data Status Breakdown Panel */}
                <div className="mt-4 rounded-xl border border-primary/30 bg-background/90 p-4 shadow-2xs">
                    <div className="flex items-center justify-between font-bold text-xs uppercase tracking-wide text-primary mb-2.5">
                        <span className="flex items-center gap-1.5">
                            <Info className="h-4 w-4 text-primary" />
                            Input Data Verification Breakdown
                        </span>
                        <span className="text-[11px] font-normal text-muted-foreground lowercase">
                            (Shows source document facts vs. assumptions vs. illustrative fallbacks)
                        </span>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-3 mb-3">
                        <div className="flex flex-col gap-1 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Documented EBITDA / SDE</span>
                            <span className="text-base font-extrabold text-foreground">{money(ebitda, currency)}</span>
                            <Badge variant={ebitdaIsConfirmed ? 'success' : 'warning'} className="w-fit text-[10px] font-bold px-2 py-0.5">
                                {ebitdaIsConfirmed ? '✓ Confirmed Fact' : `⚠ ${ebitdaStatusLabel}`}
                            </Badge>
                        </div>

                        <div className="flex flex-col gap-1 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Documented Revenue</span>
                            <span className="text-base font-extrabold text-foreground">{money(revenue, currency)}</span>
                            <Badge variant={revenueIsConfirmed ? 'success' : 'warning'} className="w-fit text-[10px] font-bold px-2 py-0.5">
                                {revenueIsConfirmed ? '✓ Confirmed Fact' : `⚠ ${revenueStatusLabel}`}
                            </Badge>
                        </div>

                        <div className="flex flex-col gap-1 rounded-lg border border-border/80 bg-muted/20 p-2.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Purchase / Entry Price</span>
                            <span className="text-base font-extrabold text-foreground">{money(price, currency)}</span>
                            <Badge variant={priceIsConfirmed ? 'success' : 'warning'} className="w-fit text-[10px] font-bold px-2 py-0.5">
                                {priceIsConfirmed ? '✓ Confirmed Price' : `⚠ ${priceStatusLabel}`}
                            </Badge>
                        </div>
                    </div>

                    <p className="text-xs leading-relaxed text-muted-foreground">
                        <strong>Assumptions in use:</strong> {(equityPercent * 100).toFixed(0)}% buyer equity ({money(equity, currency)}), {(interestRate * 100).toFixed(0)}% debt interest, {model.holdPeriodYears ?? 5}-year hold period, {model.exitMultiple ?? 4}.0x exit multiple, and {((model.taxRate ?? 0.25) * 100).toFixed(0)}% tax rate.
                    </p>
                </div>

                {/* Financing Health Box */}
                <div className="mt-3 rounded-lg border border-primary/25 bg-background/80 p-3 text-sm leading-6 text-foreground">
                    <div className="flex items-center gap-2 font-semibold">
                        <Landmark className="h-4 w-4 text-primary" />
                        Financing Health & Debt Service Coverage
                    </div>
                    <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                        At the default financing mix, the buyer puts in {money(equity, currency)} of equity and borrows {money(debt, currency)}.
                        {dscr === null
                            ? ' Add EBITDA/SDE to test whether operating cash flow covers debt payments.'
                            : ` Operating cash flow covers annual debt service ${dscr.toFixed(2)}x${dscr < 1.25 ? ', which is below the 1.25x screening threshold and deserves attention.' : ', which clears the 1.25x screening threshold.'}`}
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

function Kpi({
    icon,
    label,
    value,
    detail,
    statusBadge,
}: {
    icon: ReactNode
    label: string
    value: string
    detail: string
    statusBadge: ReactNode
}) {
    return (
        <div className="rounded-xl border border-primary/25 bg-background/90 p-3.5 shadow-xs flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between text-primary mb-1">
                    <div className="flex items-center gap-1.5">
                        {icon}
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
                    </div>
                </div>
                <p className="mt-1 text-2xl font-extrabold text-foreground tracking-tight">{value}</p>
                <p className="mt-1 text-xs leading-4 text-muted-foreground">{detail}</p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40">
                {statusBadge}
            </div>
        </div>
    )
}

