import { ChartNoAxesCombined } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { calculateIrr } from '../utils/dealMath'
import { buildDerivedEvidence, buildFactEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import { safeFormatCurrency } from '../utils/diligenceDashboardUtils'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { GrowthLineChart } from './DealCharts'

function facts(model: DealModel) { try { return JSON.parse(model.documentedFactsJson || '{}') as Record<string, { value?: number; status?: string; currency?: string }> } catch { return {} } }
function money(value: number, currency: string) { return safeFormatCurrency(value, currency) }

type ScenarioComparisonCardProps = {
    model: DealModel
    documents?: SubmissionHistoryItem[]
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

export default function ScenarioComparisonCard({ model, documents = [], onOpenEvidence }: ScenarioComparisonCardProps) {
    const documented = facts(model)
    const revenue = (documented.revenue?.status === 'confirmed' || documented.revenue?.status === 'illustrative') ? documented.revenue.value ?? null : null
    const ebitda = (documented.ebitda_sde?.status === 'confirmed' || documented.ebitda_sde?.status === 'illustrative') ? documented.ebitda_sde.value ?? null : null
    const currency = documented.revenue?.currency || documented.ebitda_sde?.currency || 'USD'
    const parsedFacts = parseDocumentedFacts(model.documentedFactsJson)
    const revenueEvidence = buildFactEvidence({ field: 'revenue', title: 'Starting revenue', facts: parsedFacts, documents })
    const years = model.holdPeriodYears ?? 5
    const price = model.purchasePrice ?? model.askingPrice
    const initial = price === null ? null : price + (model.transactionFees ?? 0) + (model.workingCapitalRequirement ?? 0)
    const taxRate = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const exitCosts = model.exitCosts ?? 0
    const scenarios = [['Bear', model.bearRevenueGrowth ?? 0, model.bearEbitdaMargin ?? 0.15, model.bearExitMultiple ?? 3], ['Base', model.baseRevenueGrowth ?? 0.05, model.baseEbitdaMargin ?? 0.2, model.baseExitMultiple ?? 4], ['Bull', model.bullRevenueGrowth ?? 0.1, model.bullEbitdaMargin ?? 0.25, model.bullExitMultiple ?? 5]] as const
    const ready = revenue !== null && scenarios.every(([, growth, margin, multiple]) => growth !== null && margin !== null && multiple !== null)
    const allCashReady = initial !== null && initial > 0
    const growthChartData = revenue === null ? [] : Array.from({ length: years + 1 }, (_, year) => ({
        label: year === 0 ? 'Today' : `Year ${year}`,
        Bear: revenue * (1 + (model.bearRevenueGrowth ?? 0)) ** year,
        Base: revenue * (1 + (model.baseRevenueGrowth ?? 0.05)) ** year,
        Bull: revenue * (1 + (model.bullRevenueGrowth ?? 0.1)) ** year,
    }))

    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Bear / base / bull scenarios</CardTitle></div><CardDescription>All-cash five-year projection from documented starting revenue and analyst-entered scenario assumptions.</CardDescription></CardHeader><CardContent className="p-5">{!ready ? <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add documented revenue plus revenue-growth, EBITDA-margin, and exit-multiple assumptions for each scenario.</p> : <><GrowthLineChart data={growthChartData} /><div className="mt-5 grid gap-3 lg:grid-cols-3">{scenarios.map(([name, growth, margin, multiple]) => {
        const yearlyRevenue = Array.from({ length: years }, (_, year) => revenue! * (1 + growth!) ** (year + 1))
        const yearlyOperatingCashFlow = taxRate === null ? null : yearlyRevenue.map((yearRevenue) => yearRevenue * margin! * (1 - taxRate) - capex)
        const exitRevenue = yearlyRevenue[years - 1]
        const exitEbitda = exitRevenue * margin!
        const netExitValue = exitEbitda * multiple! - exitCosts
        const cashFlows = allCashReady && yearlyOperatingCashFlow ? [-initial!, ...yearlyOperatingCashFlow.map((cashFlow, year) => cashFlow + (year === years - 1 ? netExitValue : 0))] : null
        const totalMoic = cashFlows ? cashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / initial! : null
        const irr = cashFlows ? calculateIrr(cashFlows) : null
        const paybackYear = yearlyOperatingCashFlow ? yearlyOperatingCashFlow.reduce<{ cumulative: number; year: number | null }>((state, cashFlow, year) => ({ cumulative: state.cumulative + cashFlow, year: state.year ?? (state.cumulative + cashFlow >= (initial ?? Infinity) ? year + 1 : null) }), { cumulative: 0, year: null }).year : null
        const scenarioEvidence = buildDerivedEvidence({
            title: `${name} scenario`,
            formula: 'grow revenue at the growth rate; EBITDA = revenue × margin; net exit = year-N EBITDA × exit multiple − exit costs; MOIC/IRR over the all-cash cash flows',
            documentedInputs: [{ label: 'Starting revenue', value: revenue === null ? 'Not documented' : money(revenue, currency) }],
            analystInputs: [
                { label: 'Revenue growth', value: `${((growth ?? 0) * 100).toFixed(1)}%` },
                { label: 'EBITDA margin', value: `${((margin ?? 0) * 100).toFixed(1)}%` },
                { label: 'Exit multiple', value: `${multiple}x` },
                { label: 'Hold period', value: `${years} years` },
            ],
            primaryFact: revenueEvidence,
        })
        return <div key={name} className="rounded-lg border border-border bg-background p-4"><div className="flex items-center justify-between gap-2"><p className="font-semibold">{name}</p>{onOpenEvidence ? <button type="button" onClick={() => onOpenEvidence(scenarioEvidence)} aria-label={`Show how the ${name} scenario was calculated`} className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How this was calculated</button> : null}</div><p className="mt-2 text-sm text-muted-foreground">Year {years} revenue / EBITDA</p><p className="font-medium">{money(exitRevenue, currency)} / {money(exitEbitda, currency)}</p><p className="mt-2 text-sm text-muted-foreground">Net exit value</p><p className="font-medium">{money(netExitValue, currency)}</p>{!allCashReady ? <p className="mt-3 text-sm text-muted-foreground">Add price and tax rate for all-cash cash flow, MOIC, payback, and IRR.</p> : <><p className="mt-2 text-sm text-muted-foreground">All-cash MOIC / IRR</p><p className="font-medium">{totalMoic?.toFixed(2) ?? '—'}x / {irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}</p><p className="mt-2 text-sm text-muted-foreground">Operating payback</p><p className="font-medium">{paybackYear === null ? `Beyond year ${years}` : `Year ${paybackYear}`}</p><p className="mt-3 text-xs text-muted-foreground">Annual operating cash flow: {yearlyOperatingCashFlow!.map((cashFlow, year) => `Y${year + 1} ${money(cashFlow, currency)}`).join(' · ')}</p></>}</div>
    })}</div></>}<p className="mt-4 text-xs text-muted-foreground">Revenue growth, margin, and exit multiple are scenario assumptions. Revenue is documented; price, tax, capex, working capital, fees, and exit costs are analyst assumptions unless separately documented. This is an all-cash scenario model; financed bear/base/bull modeling remains separate.</p></CardContent></Card>
}
