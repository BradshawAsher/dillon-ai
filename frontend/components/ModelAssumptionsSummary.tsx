import { Settings2 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'

type Props = {
    model: DealModel
    area: 'returns' | 'growth' | 'valuation' | 'structure'
}

function fmt(value: number | null | undefined, style: 'number' | 'percent' | 'currency' = 'number'): string {
    if (value === null || value === undefined) return '—'
    if (style === 'percent') return `${(value * 100).toFixed(1)}%`
    if (style === 'currency') {
        if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
        if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
        return `$${value.toFixed(0)}`
    }
    return String(value)
}

type AssumptionRow = { label: string; value: string; isSet: boolean }

function getReturnsAssumptions(model: DealModel): AssumptionRow[] {
    return [
        { label: 'Hold period', value: model.holdPeriodYears ? `${model.holdPeriodYears} yrs` : '—', isSet: model.holdPeriodYears !== null },
        { label: 'Tax rate', value: fmt(model.taxRate, 'percent'), isSet: model.taxRate !== null },
        { label: 'Exit multiple', value: model.exitMultiple ? `${model.exitMultiple}x` : '—', isSet: model.exitMultiple !== null },
        { label: 'Equity %', value: fmt(model.equityContributionPercent, 'percent'), isSet: model.equityContributionPercent !== null },
        { label: 'Interest rate', value: fmt(model.interestRate, 'percent'), isSet: model.interestRate !== null },
        { label: 'Amortization', value: model.amortizationYears ? `${model.amortizationYears} yrs` : '—', isSet: model.amortizationYears !== null },
    ]
}

function getGrowthAssumptions(model: DealModel): AssumptionRow[] {
    return [
        { label: 'Bear growth', value: fmt(model.bearRevenueGrowth, 'percent'), isSet: model.bearRevenueGrowth !== null },
        { label: 'Base growth', value: fmt(model.baseRevenueGrowth, 'percent'), isSet: model.baseRevenueGrowth !== null },
        { label: 'Bull growth', value: fmt(model.bullRevenueGrowth, 'percent'), isSet: model.bullRevenueGrowth !== null },
        { label: 'Bear margin', value: fmt(model.bearEbitdaMargin, 'percent'), isSet: model.bearEbitdaMargin !== null },
        { label: 'Base margin', value: fmt(model.baseEbitdaMargin, 'percent'), isSet: model.baseEbitdaMargin !== null },
        { label: 'Bull margin', value: fmt(model.bullEbitdaMargin, 'percent'), isSet: model.bullEbitdaMargin !== null },
    ]
}

function getValuationAssumptions(model: DealModel): AssumptionRow[] {
    return [
        { label: 'Revenue multiple', value: model.revenueMultiple ? `${model.revenueMultiple}x` : '—', isSet: model.revenueMultiple !== null && model.revenueMultiple !== undefined },
        { label: 'EBITDA multiple', value: model.ebitdaMultiple ? `${model.ebitdaMultiple}x` : '—', isSet: model.ebitdaMultiple !== null && model.ebitdaMultiple !== undefined },
        { label: 'Asset haircut', value: fmt(model.assetHaircutPercent, 'percent'), isSet: model.assetHaircutPercent !== null && model.assetHaircutPercent !== undefined },
    ]
}

function getStructureAssumptions(model: DealModel): AssumptionRow[] {
    return [
        { label: 'Purchase price', value: fmt(model.purchasePrice, 'currency'), isSet: model.purchasePrice !== null },
        { label: 'Transaction fees', value: fmt(model.transactionFees, 'currency'), isSet: model.transactionFees !== null },
        { label: 'Working capital', value: fmt(model.workingCapitalRequirement, 'currency'), isSet: model.workingCapitalRequirement !== null },
        { label: 'Equity %', value: fmt(model.equityContributionPercent, 'percent'), isSet: model.equityContributionPercent !== null },
        { label: 'Seller note', value: fmt(model.sellerNoteAmount, 'currency'), isSet: model.sellerNoteAmount !== null },
    ]
}

const areaConfig = {
    returns: { title: 'Returns assumptions', getter: getReturnsAssumptions },
    growth: { title: 'Growth assumptions', getter: getGrowthAssumptions },
    valuation: { title: 'Valuation assumptions', getter: getValuationAssumptions },
    structure: { title: 'Structure assumptions', getter: getStructureAssumptions },
} as const

export default function ModelAssumptionsSummary({ model, area }: Props) {
    const config = areaConfig[area]
    const rows = config.getter(model)
    const setCount = rows.filter((r) => r.isSet).length

    return (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/[0.03] to-transparent">
            <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{config.title}</p>
                    <div className="flex items-center gap-2">
                        <Badge variant={setCount === rows.length ? 'success' : setCount > 0 ? 'warning' : 'destructive'}>
                            {setCount}/{rows.length} configured
                        </Badge>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 gap-1.5 text-xs"
                            onClick={() => {
                                const el = document.querySelector('[data-deal-model-pending]')
                                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                        >
                            <Settings2 className="h-3 w-3" />
                            Edit
                        </Button>
                    </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Current saved values driving the calculations below.</p>
                <p className="mt-1 text-xs text-muted-foreground">If a card can still render without a saved value, it may be using a clearly labeled preview or fallback assumption until you configure the saved model inputs.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {rows.map((row) => (
                        <div key={row.label} className={`rounded-md border px-3 py-2 ${row.isSet ? 'border-border bg-background' : 'border-dashed border-muted-foreground/30 bg-muted/30'}`}>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{row.label}</p>
                            <p className={`mt-0.5 text-sm font-semibold ${row.isSet ? 'text-foreground' : 'text-muted-foreground'}`}>{row.value}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
