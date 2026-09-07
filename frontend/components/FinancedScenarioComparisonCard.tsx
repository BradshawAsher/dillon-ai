import { ChartNoAxesCombined } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { GrowthLineChart, type ChartDatum } from './DealCharts'
import { calculateIrr, computeAmortizingLoan, normalizeEquityFraction, normalizePercentageFraction, resolveLoanTermYears, DEAL_MATH_DEFAULTS } from '../utils/dealMath'
import InfoTip, { FINANCIAL_TERMS } from './InfoTip'
import CardInfoPopover from './common/CardInfoPopover'
import DataOriginBadge from './common/DataOriginBadge'

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
    const fees = model.transactionFees ?? DEAL_MATH_DEFAULTS.transactionFees
    const workingCapital = model.workingCapitalRequirement ?? DEAL_MATH_DEFAULTS.workingCapital
    const equityPercent = normalizeEquityFraction(model.equityContributionPercent)
    const sellerNote = model.sellerNoteAmount ?? 0
    const rate = normalizePercentageFraction(model.interestRate) ?? DEAL_MATH_DEFAULTS.interestRate
    const amortizationYears = resolveLoanTermYears(model.amortizationYears, model.loanTermYears)
    const holdPeriod = Math.max(1, Math.floor(model.holdPeriodYears ?? 5))
    const tax = normalizePercentageFraction(model.taxRate) ?? DEAL_MATH_DEFAULTS.taxRate
    const capex = model.maintenanceCapex ?? DEAL_MATH_DEFAULTS.maintenanceCapex
    const exitCosts = model.exitCosts ?? 0
    const uses = price === null ? null : price + fees + workingCapital
    const debt = uses === null ? null : Math.max(0, uses * (1 - equityPercent) - sellerNote)
    const equity = uses === null || debt === null ? null : uses - debt - sellerNote
    const loan = debt === null ? null : computeAmortizingLoan(debt, rate, amortizationYears, holdPeriod)
    const annualDebtService = loan?.annualDebtService ?? null
    const debtAtExit = loan?.remainingBalance ?? null
    const scenarios: Scenario[] = [
        { name: 'Bear', growth: normalizePercentageFraction(model.bearRevenueGrowth) ?? 0, margin: normalizePercentageFraction(model.bearEbitdaMargin) ?? 0.15, exitMultiple: model.bearExitMultiple ?? 3 },
        { name: 'Base', growth: normalizePercentageFraction(model.baseRevenueGrowth) ?? 0.05, margin: normalizePercentageFraction(model.baseEbitdaMargin) ?? 0.2, exitMultiple: model.baseExitMultiple ?? 4 },
        { name: 'Bull', growth: normalizePercentageFraction(model.bullRevenueGrowth) ?? 0.1, margin: normalizePercentageFraction(model.bullEbitdaMargin) ?? 0.25, exitMultiple: model.bullExitMultiple ?? 5 },
    ]
    const ready = revenue !== null && equity !== null && annualDebtService !== null && debtAtExit !== null

    const scenarioCashFlowChartData: ChartDatum[] = ready ? (() => {
        const data: ChartDatum[] = [{ label: 'Close', Bear: -equity!, Base: -equity!, Bull: -equity! }]
        for (let year = 1; year <= holdPeriod; year++) {
            const point: ChartDatum = { label: `Year ${year}` }
            for (const scenario of scenarios) {
                const yearRevenue = revenue! * (1 + scenario.growth) ** year
                let cf = yearRevenue * scenario.margin * (1 - tax) - capex - annualDebtService!
                if (year === holdPeriod) {
                    const exitEbitda = yearRevenue * scenario.margin
                    cf += exitEbitda * scenario.exitMultiple - exitCosts - debtAtExit! - sellerNote
                }
                point[scenario.name] = Math.round(cf)
            }
            data.push(point)
        }
        return data
    })() : []

    return <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-card/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex items-center gap-2"><ChartNoAxesCombined className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Financed bear / base / bull returns</CardTitle><CardInfoPopover cardId="financed-scenario-comparison" /></div><CardDescription className="mt-1">Levered outcomes combining documented starting revenue, saved growth cases, and the current financing structure.</CardDescription></div>
                <Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Scenario inputs available' : 'Inputs needed'}</Badge>
            </div>
        </CardHeader>
        <CardContent className="p-5">
            {!ready ? <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add confirmed starting revenue plus a purchase price and financing inputs to calculate financed scenarios.</p> : <div className="space-y-5"><div className="grid gap-3 lg:grid-cols-3">
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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <p className="font-semibold text-foreground">{scenario.name}</p>
                                <DataOriginBadge
                                    origin="assumption"
                                    label={`${scenario.name} Case`}
                                    metricLabel={`${scenario.name} Financed Scenario`}
                                    metricValue={`${(scenario.growth * 100).toFixed(1)}% growth · ${(scenario.margin * 100).toFixed(1)}% margin`}
                                    description={`Financed underwriting outcome under ${scenario.name.toLowerCase()} growth (${(scenario.growth * 100).toFixed(1)}%), margin (${(scenario.margin * 100).toFixed(1)}%), and ${scenario.exitMultiple}x exit multiple.`}
                                    compact
                                />
                            </div>
                            <Badge variant="outline">{(scenario.growth * 100).toFixed(1)}% growth</Badge>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Levered MOIC / IRR</span>
                            <DataOriginBadge
                                origin="calculated"
                                metricLabel={`Levered MOIC / IRR (${scenario.name})`}
                                metricValue={`${moic.toFixed(2)}x / ${irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}`}
                                formula="IRR(levered cash flows), MOIC(total inflows ÷ equity)"
                                description="Comprehensive internal rate of return and multiple on invested equity under debt amortization."
                                compact
                            />
                        </div>
                        <p className="mt-1 text-xl font-semibold text-foreground">{moic.toFixed(2)}x / {irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}</p>
                        <div className="mt-4 space-y-2 text-sm">
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Year-{holdPeriod} revenue</span>
                                    <DataOriginBadge
                                        origin="calculated"
                                        metricLabel={`Year-${holdPeriod} Revenue (${scenario.name})`}
                                        metricValue={money(yearlyRevenue[yearlyRevenue.length - 1])}
                                        formula={`Starting Revenue × (1 + ${(scenario.growth * 100).toFixed(1)}%)^${holdPeriod}`}
                                        description="Projected terminal year top-line revenue under this scenario."
                                        compact
                                    />
                                </div>
                                <span className="font-medium">{money(yearlyRevenue[yearlyRevenue.length - 1])}</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Exit EBITDA</span>
                                    <DataOriginBadge
                                        origin="calculated"
                                        metricLabel={`Exit EBITDA (${scenario.name})`}
                                        metricValue={money(exitEbitda)}
                                        formula={`Year-${holdPeriod} Revenue × ${(scenario.margin * 100).toFixed(1)}%`}
                                        description="Projected terminal year EBITDA operating earnings."
                                        compact
                                    />
                                </div>
                                <span className="font-medium">{money(exitEbitda)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Exit equity proceeds</span>
                                    <DataOriginBadge
                                        origin="calculated"
                                        metricLabel={`Exit Equity Proceeds (${scenario.name})`}
                                        metricValue={money(exitProceeds)}
                                        formula="Exit EBITDA × Exit Multiple − Exit Costs − Debt at Exit − Seller Note"
                                        description="Net equity proceeds distributed to buyer after senior loan payoff and transaction fees."
                                        compact
                                    />
                                </div>
                                <span className="font-medium">{money(exitProceeds)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Year-one DSCR</span>
                                    <DataOriginBadge
                                        origin="calculated"
                                        metricLabel={`Year-One DSCR (${scenario.name})`}
                                        metricValue={yearOneDscr === null ? 'Not available' : `${yearOneDscr.toFixed(2)}x`}
                                        formula="Year 1 After-Tax Operating Cash Flow ÷ Annual Debt Service"
                                        description="Initial debt service coverage ratio under Year 1 operating cash flow."
                                        compact
                                    />
                                </div>
                                <span className="font-medium">{yearOneDscr === null ? 'Not available' : `${yearOneDscr.toFixed(2)}x`}</span>
                            </div>
                        </div>
                        <p className="mt-4 text-xs leading-5 text-muted-foreground">Growth, EBITDA margin, and exit multiple are saved model assumptions for each scenario. Financing terms are also shared saved model assumptions, not ad-hoc analyst overrides.</p>
                    </div>
                })}
            </div>
                <div className="rounded-lg border border-border bg-muted/10 p-4">
                    <p className="text-sm font-semibold text-foreground">Levered cash-flow paths by scenario</p>
                    <p className="mt-1 text-xs text-muted-foreground">Annual levered free cash flow after debt service, with exit proceeds in the final year. Bear (red), Base (blue), Bull (green).</p>
                    <GrowthLineChart data={scenarioCashFlowChartData} />
                </div>
            </div>}
        </CardContent>
    </Card>
}
