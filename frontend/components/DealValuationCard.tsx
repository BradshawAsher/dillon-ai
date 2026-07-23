import { BadgeDollarSign, ChartNoAxesCombined, Scale, TriangleAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { formatCurrencyValue } from '../utils/aiSubmissionData'
import { Input } from '../lib/shadcn/input'
import { MoneyBarChart } from './DealCharts'

type DealValuationCardProps = {
    synthesis?: ProjectSynthesisItem
    askingPrice: string
    model?: DealModel
    onModelChange?: (field: keyof DealModel, value: string) => void
}

function parseMoney(value: string) {
    const normalized = value.replace(/[$,\s]/g, '')
    const multiplier = /m$/i.test(normalized) ? 1_000_000 : /b$/i.test(normalized) ? 1_000_000_000 : /k$/i.test(normalized) ? 1_000 : 1
    const parsed = Number(normalized.replace(/[kmb]$/i, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed * multiplier : null
}

export default function DealValuationCard({ synthesis, askingPrice, model, onModelChange }: DealValuationCardProps) {
    const askingPriceValue = parseMoney(askingPrice) ?? model?.askingPrice ?? null
    const baseValue = synthesis ? parseMoney(synthesis.valuationBaseEstimate) : null
    const premiumPercent = askingPriceValue !== null && baseValue !== null && baseValue > 0
        ? ((askingPriceValue - baseValue) / baseValue) * 100
        : null
    const cases = synthesis ? [
        { label: 'Downside case', value: synthesis.valuationLowerBound, description: 'Current lower supported estimate' },
        { label: 'Base case', value: synthesis.valuationBaseEstimate, description: 'Current supported estimate' },
        { label: 'Upside case', value: synthesis.valuationUpperBound, description: 'Current upper supported estimate' },
    ] : []
    let facts: Record<string, { value?: number; status?: string }> = {}
    try { facts = JSON.parse(model?.documentedFactsJson || '{}') } catch {}
    const confirmed = (key: string) => facts[key]?.status === 'confirmed' ? facts[key]?.value ?? null : null
    const revenue = confirmed('revenue'), ebitda = confirmed('ebitda_sde'), assets = confirmed('total_assets'), liabilities = confirmed('total_liabilities')
    const methods = [
        { label: 'Asset-based', value: assets !== null && liabilities !== null && model?.assetHaircutPercent !== null && model?.assetHaircutPercent !== undefined ? (assets - liabilities) * (1 - model.assetHaircutPercent) : null },
        { label: 'Revenue multiple', value: revenue !== null && model?.revenueMultiple !== null && model?.revenueMultiple !== undefined ? revenue * model.revenueMultiple : null },
        { label: 'EBITDA / SDE multiple', value: ebitda !== null && model?.ebitdaMultiple !== null && model?.ebitdaMultiple !== undefined ? ebitda * model.ebitdaMultiple : null },
    ]
    const available = methods.map(x => x.value).filter((x): x is number => x !== null)
    const methodChartData = methods.filter((method): method is { label: string; value: number } => method.value !== null)
    const blended = available.length ? available.reduce((a,b)=>a+b,0) / available.length : null
    const holdPeriodYears = model?.holdPeriodYears ?? 5
    const baseRevenueGrowth: number | null = model?.baseRevenueGrowth ?? null
    const baseEbitdaMargin: number | null = model?.baseEbitdaMargin ?? (revenue !== null && ebitda !== null && revenue > 0 ? ebitda / revenue : null)
    const baseExitMultiple: number | null = model?.baseExitMultiple ?? model?.exitMultiple ?? model?.ebitdaMultiple ?? null
    const canCalculateSensitivity = revenue !== null && baseRevenueGrowth !== null && baseEbitdaMargin !== null && baseExitMultiple !== null && holdPeriodYears > 0
    const sensitivityGrowthCases: number[] = canCalculateSensitivity
        ? [baseRevenueGrowth as number - 0.02, baseRevenueGrowth as number, baseRevenueGrowth as number + 0.02]
        : []
    const sensitivityMargins = canCalculateSensitivity
        ? [Math.max(0, baseEbitdaMargin as number - 0.03), baseEbitdaMargin as number, baseEbitdaMargin as number + 0.03]
        : []
    const sensitivityMultiples = canCalculateSensitivity
        ? [Math.max(0, baseExitMultiple as number - 1), baseExitMultiple as number, baseExitMultiple as number + 1]
        : []

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Valuation</CardTitle></div>
                        <CardDescription>Evidence-backed range and price position for the current project. Assumptions and methods are shown only when the workflow returns them.</CardDescription>
                    </div>
                    <Badge variant="outline">Source: project synthesis</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4"><p className="text-sm font-semibold">Valuation assumptions</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{([['revenueMultiple','Revenue multiple'],['ebitdaMultiple','EBITDA / SDE multiple'],['assetHaircutPercent','Asset haircut (decimal)']] as Array<[keyof DealModel,string]>).map(([field,label])=><label key={field} className="space-y-1"><span className="text-xs text-muted-foreground">{label}</span><Input inputMode="decimal" value={model?.[field] ?? ''} onChange={e=>onModelChange?.(field,e.target.value)} placeholder="Not set" /></label>)}</div></div>
                <div className="grid gap-3 sm:grid-cols-3">{methods.map(method=><div key={method.label} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{method.label}</p><p className="mt-1 font-semibold">{method.value === null ? 'Not available' : formatCurrencyValue(String(method.value), 'USD')}</p></div>)}</div>
                <MoneyBarChart title="Valuation-method comparison" description="Only methods with confirmed source facts and saved analyst assumptions are plotted." data={methodChartData} />
                {blended !== null ? <div className="rounded-lg border border-success/25 bg-success/5 p-4"><p className="text-sm font-semibold">Blended supported value: {formatCurrencyValue(String(blended), 'USD')}</p>{askingPriceValue !== null ? <p className="mt-1 text-sm text-muted-foreground">Asking price is {(((askingPriceValue - blended) / blended) * 100).toFixed(1)}% {(askingPriceValue - blended) >= 0 ? 'above' : 'below'} this blend.</p> : null}</div> : null}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Exit-value sensitivity</p><p className="mt-1 text-xs text-muted-foreground">Enterprise value at year {holdPeriodYears}, varying revenue growth, EBITDA margin, and exit multiple around the saved base case.</p></div><Badge variant="outline">Scenario assumptions</Badge></div>
                    {!canCalculateSensitivity ? <p className="mt-3 text-sm leading-6 text-muted-foreground">Set confirmed revenue plus base revenue growth, EBITDA margin, and exit multiple in Growth / Deal Model assumptions to calculate the grid. The current EBITDA margin can be derived from confirmed revenue and EBITDA/SDE.</p> : <div className="mt-4 grid gap-4 xl:grid-cols-3">{sensitivityGrowthCases.map((growth) => {
                        const projectedRevenue = revenue * Math.pow(1 + growth, holdPeriodYears)
                        return <div key={growth} className="overflow-hidden rounded-lg border border-border bg-background"><div className="border-b border-border px-3 py-2"><p className="text-xs font-semibold">Revenue growth: {(growth * 100).toFixed(1)}%</p><p className="text-xs text-muted-foreground">Year-{holdPeriodYears} revenue: {formatCurrencyValue(String(projectedRevenue), 'USD')}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[300px] text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="px-3 py-2 text-left font-medium">Margin / multiple</th>{sensitivityMultiples.map((multiple) => <th key={multiple} className="px-2 py-2 text-right font-medium">{multiple.toFixed(1)}x</th>)}</tr></thead><tbody>{sensitivityMargins.map((margin) => <tr key={margin} className="border-b border-border last:border-0"><td className="px-3 py-2 font-medium">{(margin * 100).toFixed(1)}%</td>{sensitivityMultiples.map((multiple) => <td key={multiple} className="px-2 py-2 text-right">{formatCurrencyValue(String(projectedRevenue * margin * multiple), 'USD')}</td>)}</tr>)}</tbody></table></div></div>
                    })}</div>}
                </div>
                {!synthesis ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">A valuation page will populate after project synthesis returns a supported range.</div>
                ) : (
                    <>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
                            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                                <div className="flex items-center gap-2"><BadgeDollarSign className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Supported valuation range</p></div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    {cases.map((item) => <div key={item.label} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-lg font-semibold text-foreground">{formatCurrencyValue(item.value, synthesis.valuationCurrency) || 'Pending'}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div>)}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border bg-background p-4">
                                <div className="flex items-center gap-2"><ChartNoAxesCombined className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold">Asking-price comparison</p></div>
                                {askingPriceValue !== null && baseValue !== null && premiumPercent !== null ? <><p className="mt-4 text-2xl font-semibold text-foreground">{formatCurrencyValue(String(askingPriceValue), synthesis.valuationCurrency || 'USD')}</p><p className={premiumPercent > 0 ? 'mt-1 text-sm text-destructive' : 'mt-1 text-sm text-success'}>{Math.abs(premiumPercent).toFixed(1)}% {premiumPercent > 0 ? 'above' : premiumPercent < 0 ? 'below' : 'equal to'} the supported base valuation.</p></> : <p className="mt-4 text-sm leading-6 text-muted-foreground">Enter an asking price in Project dossier intake to calculate the premium or discount.</p>}
                            </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-2">
                            <div className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex items-center gap-2"><TriangleAlert className="h-4 w-4 text-warning" /><p className="text-sm font-semibold">Value-risk bridge</p></div><p className="mt-2 text-sm leading-6 text-muted-foreground">The workflow has identified the following items as price or terms considerations. Quantified value adjustments require a valuation-method model and analyst-approved assumptions.</p><ul className="mt-3 space-y-2 text-sm">{synthesis.crossDocumentConflicts.length > 0 ? synthesis.crossDocumentConflicts.map((item) => <li key={item} className="rounded-md border border-border bg-background p-3">{item}</li>) : <li className="text-muted-foreground">No cross-document valuation risks recorded.</li>}</ul></div>
                            <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">Method comparison</p><p className="mt-2 text-sm leading-6 text-muted-foreground">The methods above are calculated only from confirmed facts and saved analyst assumptions. The sensitivity grid uses the base-case inputs and shows exit enterprise value, not a probability-weighted valuation or IRR.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">Asset-based</Badge><Badge variant="outline">Revenue multiple</Badge><Badge variant="outline">EBITDA / SDE multiple</Badge><Badge variant="outline">Sensitivity analysis</Badge></div></div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
