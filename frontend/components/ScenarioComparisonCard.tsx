import { ChartNoAxesCombined } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'

function facts(model: DealModel) { try { return JSON.parse(model.documentedFactsJson || '{}') as Record<string, { value?: number; status?: string; currency?: string }> } catch { return {} } }
function money(value: number, currency: string) { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) }
function calculateIrr(cashFlows: number[]) {
    if (!cashFlows.some((value) => value < 0) || !cashFlows.some((value) => value > 0)) return null
    let rate = 0.1
    for (let iteration = 0; iteration < 100; iteration += 1) {
        const npv = cashFlows.reduce((sum, cashFlow, year) => sum + cashFlow / (1 + rate) ** year, 0)
        const derivative = cashFlows.slice(1).reduce((sum, cashFlow, year) => sum - ((year + 1) * cashFlow) / (1 + rate) ** (year + 2), 0)
        if (!Number.isFinite(npv) || !Number.isFinite(derivative) || Math.abs(derivative) < 1e-9) return null
        const nextRate = rate - npv / derivative
        if (nextRate <= -0.999 || nextRate > 100) return null
        if (Math.abs(nextRate - rate) < 1e-7) return nextRate
        rate = nextRate
    }
    return null
}

export default function ScenarioComparisonCard({ model }: { model: DealModel }) {
    const documented = facts(model)
    const revenue = documented.revenue?.status === 'confirmed' ? documented.revenue.value ?? null : null
    const ebitda = documented.ebitda_sde?.status === 'confirmed' ? documented.ebitda_sde.value ?? null : null
    const currency = documented.revenue?.currency || documented.ebitda_sde?.currency || 'USD'
    const years = model.holdPeriodYears ?? 5
    const price = model.purchasePrice ?? model.askingPrice
    const initial = price === null ? null : price + (model.transactionFees ?? 0) + (model.workingCapitalRequirement ?? 0)
    const taxRate = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const exitCosts = model.exitCosts ?? 0
    const scenarios = [['Bear', model.bearRevenueGrowth ?? 0, model.bearEbitdaMargin ?? 0.15, model.bearExitMultiple ?? 3], ['Base', model.baseRevenueGrowth ?? 0.05, model.baseEbitdaMargin ?? 0.2, model.baseExitMultiple ?? 4], ['Bull', model.bullRevenueGrowth ?? 0.1, model.bullEbitdaMargin ?? 0.25, model.bullExitMultiple ?? 5]] as const
    const ready = revenue !== null && scenarios.every(([, growth, margin, multiple]) => growth !== null && margin !== null && multiple !== null)
    const allCashReady = initial !== null && initial > 0

    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Bear / base / bull scenarios</CardTitle></div><CardDescription>All-cash five-year projection from documented starting revenue and analyst-entered scenario assumptions.</CardDescription></CardHeader><CardContent className="p-5">{!ready ? <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add documented revenue plus revenue-growth, EBITDA-margin, and exit-multiple assumptions for each scenario.</p> : <div className="grid gap-3 lg:grid-cols-3">{scenarios.map(([name, growth, margin, multiple]) => {
        const yearlyRevenue = Array.from({ length: years }, (_, year) => revenue! * (1 + growth!) ** (year + 1))
        const yearlyOperatingCashFlow = taxRate === null ? null : yearlyRevenue.map((yearRevenue) => yearRevenue * margin! * (1 - taxRate) - capex)
        const exitRevenue = yearlyRevenue[years - 1]
        const exitEbitda = exitRevenue * margin!
        const netExitValue = exitEbitda * multiple! - exitCosts
        const cashFlows = allCashReady && yearlyOperatingCashFlow ? [-initial!, ...yearlyOperatingCashFlow.map((cashFlow, year) => cashFlow + (year === years - 1 ? netExitValue : 0))] : null
        const totalMoic = cashFlows ? cashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / initial! : null
        const irr = cashFlows ? calculateIrr(cashFlows) : null
        const paybackYear = yearlyOperatingCashFlow ? yearlyOperatingCashFlow.reduce<{ cumulative: number; year: number | null }>((state, cashFlow, year) => ({ cumulative: state.cumulative + cashFlow, year: state.year ?? (state.cumulative + cashFlow >= (initial ?? Infinity) ? year + 1 : null) }), { cumulative: 0, year: null }).year : null
        return <div key={name} className="rounded-lg border border-border bg-background p-4"><p className="font-semibold">{name}</p><p className="mt-2 text-sm text-muted-foreground">Year {years} revenue / EBITDA</p><p className="font-medium">{money(exitRevenue, currency)} / {money(exitEbitda, currency)}</p><p className="mt-2 text-sm text-muted-foreground">Net exit value</p><p className="font-medium">{money(netExitValue, currency)}</p>{!allCashReady ? <p className="mt-3 text-sm text-muted-foreground">Add price and tax rate for all-cash cash flow, MOIC, payback, and IRR.</p> : <><p className="mt-2 text-sm text-muted-foreground">All-cash MOIC / IRR</p><p className="font-medium">{totalMoic?.toFixed(2) ?? '—'}x / {irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}</p><p className="mt-2 text-sm text-muted-foreground">Operating payback</p><p className="font-medium">{paybackYear === null ? `Beyond year ${years}` : `Year ${paybackYear}`}</p><p className="mt-3 text-xs text-muted-foreground">Annual operating cash flow: {yearlyOperatingCashFlow!.map((cashFlow, year) => `Y${year + 1} ${money(cashFlow, currency)}`).join(' · ')}</p></>}</div>
    })}</div>}<p className="mt-4 text-xs text-muted-foreground">Revenue growth, margin, and exit multiple are scenario assumptions. Revenue is documented; price, tax, capex, working capital, fees, and exit costs are analyst assumptions unless separately documented. This is an all-cash scenario model; financed bear/base/bull modeling remains separate.</p></CardContent></Card>
}
