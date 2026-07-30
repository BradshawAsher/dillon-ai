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

type AssumptionRow = { label: string; value: string; isSet: boolean; isPreview?: boolean }

function parseDocumentedFacts(json: string | undefined | null): Record<string, { value?: number }> {
    if (!json) return {}
    try {
        const parsed = JSON.parse(json) as unknown
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, { value?: number }>
            : {}
    } catch {
        return {}
    }
}

function currentMargin(model: DealModel) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    return revenue && revenue > 0 && ebitda !== null ? ebitda / revenue : null
}

function pickNumber(value: number | null | undefined, preview: number) {
    return { value: value ?? preview, isSet: value !== null && value !== undefined }
}

function getReturnsAssumptions(model: DealModel): AssumptionRow[] {
    const holdPeriod = pickNumber(model.holdPeriodYears, 5)
    const taxRate = pickNumber(model.taxRate, 0.25)
    const exitMultiple = pickNumber(model.exitMultiple, 4)
    const equity = pickNumber(model.equityContributionPercent, 0.3)
    const interest = pickNumber(model.interestRate, 0.1)
    const amortization = pickNumber(model.amortizationYears, 10)
    return [
        { label: 'Hold period', value: `${holdPeriod.value} yrs`, isSet: holdPeriod.isSet, isPreview: !holdPeriod.isSet },
        { label: 'Tax rate', value: fmt(taxRate.value, 'percent'), isSet: taxRate.isSet, isPreview: !taxRate.isSet },
        { label: 'Exit multiple', value: `${exitMultiple.value}x`, isSet: exitMultiple.isSet, isPreview: !exitMultiple.isSet },
        { label: 'Equity %', value: fmt(equity.value, 'percent'), isSet: equity.isSet, isPreview: !equity.isSet },
        { label: 'Interest rate', value: fmt(interest.value, 'percent'), isSet: interest.isSet, isPreview: !interest.isSet },
        { label: 'Amortization', value: `${amortization.value} yrs`, isSet: amortization.isSet, isPreview: !amortization.isSet },
    ]
}

function getGrowthAssumptions(model: DealModel): AssumptionRow[] {
    const impliedMargin = currentMargin(model)
    const bearGrowth = pickNumber(model.bearRevenueGrowth, 0)
    const baseGrowth = pickNumber(model.baseRevenueGrowth, 0.05)
    const bullGrowth = pickNumber(model.bullRevenueGrowth, 0.1)
    const bearMargin = pickNumber(model.bearEbitdaMargin, impliedMargin === null ? 0.15 : Math.max(0, impliedMargin - 0.03))
    const baseMargin = pickNumber(model.baseEbitdaMargin, impliedMargin ?? 0.2)
    const bullMargin = pickNumber(model.bullEbitdaMargin, impliedMargin === null ? 0.25 : impliedMargin + 0.03)
    return [
        { label: 'Bear growth', value: fmt(bearGrowth.value, 'percent'), isSet: bearGrowth.isSet, isPreview: !bearGrowth.isSet },
        { label: 'Base growth', value: fmt(baseGrowth.value, 'percent'), isSet: baseGrowth.isSet, isPreview: !baseGrowth.isSet },
        { label: 'Bull growth', value: fmt(bullGrowth.value, 'percent'), isSet: bullGrowth.isSet, isPreview: !bullGrowth.isSet },
        { label: 'Bear margin', value: fmt(bearMargin.value, 'percent'), isSet: bearMargin.isSet, isPreview: !bearMargin.isSet },
        { label: 'Base margin', value: fmt(baseMargin.value, 'percent'), isSet: baseMargin.isSet, isPreview: !baseMargin.isSet },
        { label: 'Bull margin', value: fmt(bullMargin.value, 'percent'), isSet: bullMargin.isSet, isPreview: !bullMargin.isSet },
    ]
}

function getValuationAssumptions(model: DealModel): AssumptionRow[] {
    const revenueMultiple = pickNumber(model.revenueMultiple, 2.1)
    const ebitdaMultiple = pickNumber(model.ebitdaMultiple, 8)
    const assetHaircut = pickNumber(model.assetHaircutPercent, 0.1)
    return [
        { label: 'Revenue multiple', value: `${revenueMultiple.value}x`, isSet: revenueMultiple.isSet, isPreview: !revenueMultiple.isSet },
        { label: 'EBITDA multiple', value: `${ebitdaMultiple.value}x`, isSet: ebitdaMultiple.isSet, isPreview: !ebitdaMultiple.isSet },
        { label: 'Asset haircut', value: fmt(assetHaircut.value, 'percent'), isSet: assetHaircut.isSet, isPreview: !assetHaircut.isSet },
    ]
}

function getStructureAssumptions(model: DealModel): AssumptionRow[] {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const purchasePrice = pickNumber(model.purchasePrice ?? model.askingPrice, ebitda === null ? 1_000_000 : ebitda * 4)
    const transactionFees = pickNumber(model.transactionFees, purchasePrice.value * 0.01)
    const workingCapital = pickNumber(model.workingCapitalRequirement, purchasePrice.value * 0.02)
    const equity = pickNumber(model.equityContributionPercent, 0.3)
    const sellerNote = pickNumber(model.sellerNoteAmount, 0)
    return [
        { label: 'Purchase price', value: fmt(purchasePrice.value, 'currency'), isSet: purchasePrice.isSet, isPreview: !purchasePrice.isSet },
        { label: 'Transaction fees', value: fmt(transactionFees.value, 'currency'), isSet: transactionFees.isSet, isPreview: !transactionFees.isSet },
        { label: 'Working capital', value: fmt(workingCapital.value, 'currency'), isSet: workingCapital.isSet, isPreview: !workingCapital.isSet },
        { label: 'Equity %', value: fmt(equity.value, 'percent'), isSet: equity.isSet, isPreview: !equity.isSet },
        { label: 'Seller note', value: fmt(sellerNote.value, 'currency'), isSet: sellerNote.isSet, isPreview: !sellerNote.isSet },
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
    const previewCount = rows.filter((r) => r.isPreview).length

    return (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/[0.03] to-transparent">
            <CardContent className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{config.title}</p>
                    <div className="flex items-center gap-2">
                        <Badge variant={setCount === rows.length ? 'success' : setCount > 0 ? 'warning' : 'destructive'}>
                            {setCount}/{rows.length} saved
                        </Badge>
                        {previewCount > 0 ? <Badge variant="outline">{previewCount} preview default{previewCount === 1 ? '' : 's'}</Badge> : null}
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
                <p className="mt-1 text-xs text-muted-foreground">Saved assumptions appear first. When something is still blank, the same preview defaults used by the cards below are shown here so the starting model is visible.</p>
                <p className="mt-1 text-xs text-muted-foreground">Preview defaults are display-only until you save your own model inputs.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {rows.map((row) => (
                        <div key={row.label} className={`rounded-md border px-3 py-2 ${row.isSet ? 'border-border bg-background' : 'border-dashed border-primary/30 bg-primary/[0.04]'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{row.label}</p>
                                {row.isPreview ? <Badge variant="outline" className="h-5 px-1.5 text-[9px]">Preview</Badge> : null}
                            </div>
                            <p className={`mt-0.5 text-sm font-semibold ${row.isSet ? 'text-foreground' : 'text-foreground'}`}>{row.value}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
