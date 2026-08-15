import { Settings2, HelpCircle } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import InPlaceEvidencePopover, { EvidenceDetails } from './InPlaceEvidencePopover'

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

type AssumptionRow = {
    label: string
    value: string
    isSet: boolean
    isPreview?: boolean
    evidence: EvidenceDetails
}

const VOCAB_GUIDE: Record<string, { definition: string; defaultReason: string; typicalRange: string }> = {
    'Hold period': {
        definition: 'Investment duration from acquisition closing until company sale or recapitalization.',
        defaultReason: '5 years is the institutional industry standard hold period for PE and Search Funds.',
        typicalRange: '3 to 7 Years',
    },
    'Tax rate': {
        definition: 'Blended effective corporate income tax rate on pre-tax earnings.',
        defaultReason: '25% reflects US Federal corporate tax (21%) plus typical state/local tax (4%).',
        typicalRange: '21% - 28%',
    },
    'Exit multiple': {
        definition: 'Projected enterprise valuation multiple applied to final year EBITDA at exit.',
        defaultReason: '4.0x assumes conservative valuation parity without relying on unearned multiple expansion.',
        typicalRange: '3.5x - 6.0x',
    },
    'Equity %': {
        definition: 'Share of total acquisition purchase price financed through cash equity.',
        defaultReason: '30% satisfies standard bank debt covenants requiring 70% max loan-to-value (LTV).',
        typicalRange: '10% - 35%',
    },
    'Interest rate': {
        definition: 'Annual interest percentage charged on senior bank debt or SBA financing.',
        defaultReason: '10.0% reflects prevailing WSJ Prime + 1.5% senior borrowing benchmarks.',
        typicalRange: '8.0% - 11.5%',
    },
    'Amortization': {
        definition: 'Term schedule over which senior principal debt must be fully repaid.',
        defaultReason: '10 years matches standard SBA 7(a) and commercial bank term amortizations.',
        typicalRange: '7 - 10 Years',
    },
    'Bear growth': {
        definition: 'Conservative downside annual revenue growth rate under market headwinds.',
        defaultReason: '0.0% flat revenue models severe macro stagnation to test debt service coverage (DSCR).',
        typicalRange: '-5.0% - +2.0%',
    },
    'Base growth': {
        definition: 'Expected annual organic revenue growth under normal operating conditions.',
        defaultReason: '5.0% reflects steady GDP-plus organic business expansion.',
        typicalRange: '3.0% - 8.0%',
    },
    'Bull growth': {
        definition: 'Optimistic annual revenue growth rate if growth initiatives accelerate.',
        defaultReason: '10.0% models high-performance cross-selling and territory expansion.',
        typicalRange: '8.0% - 15.0%',
    },
    'Bear margin': {
        definition: 'Downside operating EBITDA margin under cost inflation or labor pressure.',
        defaultReason: 'Assumes -300 bps margin contraction from baseline.',
        typicalRange: '10% - 20%',
    },
    'Base margin': {
        definition: 'Expected steady-state operating EBITDA margin based on historic performance.',
        defaultReason: 'Anchored directly to historical documented financial reports.',
        typicalRange: '15% - 30%',
    },
    'Bull margin': {
        definition: 'Upside EBITDA margin assuming operational automation and scale efficiencies.',
        defaultReason: 'Assumes +300 bps operational efficiency improvement.',
        typicalRange: '20% - 35%',
    },
    'Revenue multiple': {
        definition: 'Valuation metric comparing Enterprise Value directly to annual top-line revenue.',
        defaultReason: '2.1x median lower-middle-market multiple for tech and service companies.',
        typicalRange: '1.5x - 3.5x',
    },
    'EBITDA multiple': {
        definition: 'Core valuation multiple comparing Enterprise Value to operating EBITDA earnings.',
        defaultReason: '8.0x reflects standard mid-market upper bound valuation ceiling.',
        typicalRange: '4.0x - 8.5x',
    },
    'Asset haircut': {
        definition: 'Discount applied to tangible book assets under orderly liquidation scenarios.',
        defaultReason: '10% discount accounts for auction depreciation and collection friction.',
        typicalRange: '5% - 20%',
    },
    'Purchase price': {
        definition: 'Total negotiated Enterprise Value agreed for target acquisition.',
        defaultReason: '4.0x baseline multiple on reported EBITDA in absence of asking price.',
        typicalRange: 'Target specific',
    },
    'Transaction fees': {
        definition: 'Total closing legal, accounting (QoE), and broker fees.',
        defaultReason: '1.0% of enterprise value provides standard closing transaction buffer.',
        typicalRange: '1% - 3% of EV',
    },
    'Working capital': {
        definition: 'Minimum cash reserve required for operational inventory and receivables lag.',
        defaultReason: '2.0% of purchase price ensures adequate day-one working liquidity.',
        typicalRange: '1% - 4% of EV',
    },
    'Seller note': {
        definition: 'Subordinated loan provided directly by the seller to bridge deal financing.',
        defaultReason: '$0 baseline assumes all-bank/equity financing until seller terms are finalized.',
        typicalRange: '10% - 25% of EV',
    },
}

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

function buildRow(label: string, valueStr: string, isSet: boolean): AssumptionRow {
    const vocab = VOCAB_GUIDE[label] || {
        definition: `Financial model parameter for ${label}.`,
        defaultReason: 'Standard industry heuristic proxy value.',
        typicalRange: 'Market standard',
    }

    return {
        label,
        value: valueStr,
        isSet,
        isPreview: !isSet,
        evidence: {
            metricName: `${label} (${isSet ? 'Saved User Input' : 'Default Proxy Assumption'})`,
            valueFormatted: valueStr,
            sourceDoc: isSet ? 'Custom User Deal Model' : 'Standard Private Equity & SMB Benchmark Rules',
            quoteSnippet: `Definition: ${vocab.definition}`,
            confidence: isSet ? 'high' : 'medium',
            status: isSet ? 'confirmed' : 'estimated',
            notes: isSet
                ? 'Analyst has customized and saved this variable for this specific deal.'
                : `Why this starting value was chosen: ${vocab.defaultReason} Typical industry range: ${vocab.typicalRange}.`,
        },
    }
}

function getReturnsAssumptions(model: DealModel): AssumptionRow[] {
    const holdPeriod = pickNumber(model.holdPeriodYears, 5)
    const taxRate = pickNumber(model.taxRate, 0.25)
    const exitMultiple = pickNumber(model.exitMultiple, 4)
    const equity = pickNumber(model.equityContributionPercent, 0.3)
    const interest = pickNumber(model.interestRate, 0.1)
    const amortization = pickNumber(model.amortizationYears, 10)
    return [
        buildRow('Hold period', `${holdPeriod.value} yrs`, holdPeriod.isSet),
        buildRow('Tax rate', fmt(taxRate.value, 'percent'), taxRate.isSet),
        buildRow('Exit multiple', `${exitMultiple.value}x`, exitMultiple.isSet),
        buildRow('Equity %', fmt(equity.value, 'percent'), equity.isSet),
        buildRow('Interest rate', fmt(interest.value, 'percent'), interest.isSet),
        buildRow('Amortization', `${amortization.value} yrs`, amortization.isSet),
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
        buildRow('Bear growth', fmt(bearGrowth.value, 'percent'), bearGrowth.isSet),
        buildRow('Base growth', fmt(baseGrowth.value, 'percent'), baseGrowth.isSet),
        buildRow('Bull growth', fmt(bullGrowth.value, 'percent'), bullGrowth.isSet),
        buildRow('Bear margin', fmt(bearMargin.value, 'percent'), bearMargin.isSet),
        buildRow('Base margin', fmt(baseMargin.value, 'percent'), baseMargin.isSet),
        buildRow('Bull margin', fmt(bullMargin.value, 'percent'), bullMargin.isSet),
    ]
}

function getValuationAssumptions(model: DealModel): AssumptionRow[] {
    const revenueMultiple = pickNumber(model.revenueMultiple, 2.1)
    const ebitdaMultiple = pickNumber(model.ebitdaMultiple, 8)
    const assetHaircut = pickNumber(model.assetHaircutPercent, 0.1)
    return [
        buildRow('Revenue multiple', `${revenueMultiple.value}x`, revenueMultiple.isSet),
        buildRow('EBITDA multiple', `${ebitdaMultiple.value}x`, ebitdaMultiple.isSet),
        buildRow('Asset haircut', fmt(assetHaircut.value, 'percent'), assetHaircut.isSet),
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
        buildRow('Purchase price', fmt(purchasePrice.value, 'currency'), purchasePrice.isSet),
        buildRow('Transaction fees', fmt(transactionFees.value, 'currency'), transactionFees.isSet),
        buildRow('Working capital', fmt(workingCapital.value, 'currency'), workingCapital.isSet),
        buildRow('Equity %', fmt(equity.value, 'percent'), equity.isSet),
        buildRow('Seller note', fmt(sellerNote.value, 'currency'), sellerNote.isSet),
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
                            className="h-7 gap-1.5 text-xs cursor-pointer"
                            onClick={() => {
                                // Scroll to the appropriate editable block per area. Valuation inputs live
                                // inside the valuation card, so target its special selector; other
                                // areas use the shared deal-model pending card.
                                const selector = area === 'valuation' ? '[data-valuation-assumptions]' : '[data-deal-model-pending]'
                                const el = document.querySelector(selector)
                                el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }}
                        >
                            <Settings2 className="h-3 w-3" />
                            Edit
                        </Button>
                    </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Saved assumptions appear first. When something is still blank, the same preview defaults used by the cards below are shown here so the starting model is visible.</p>
                <p className="mt-1 text-xs text-muted-foreground">Hover or click any metric card to inspect its vocabulary definition, default rationale, or ask AI.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {rows.map((row) => (
                        <InPlaceEvidencePopover key={row.label} evidence={row.evidence} align="auto">
                            <div className={`group rounded-md border px-3 py-2 text-left cursor-pointer transition-all hover:scale-[1.02] ${row.isSet ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60' : 'border-dashed border-amber-500/40 bg-amber-500/5 hover:border-amber-500/80'}`}>
                                <div className="flex items-start justify-between gap-1">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">{row.label}</p>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary transition-opacity shrink-0" />
                                </div>
                                <p className="mt-1 text-sm font-bold text-foreground group-hover:text-primary transition-colors">{row.value}</p>
                                <p className={`mt-0.5 text-[10px] font-semibold ${row.isSet ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {row.isSet ? '✓ Saved Input' : '⚠ Preview Proxy'}
                                </p>
                            </div>
                        </InPlaceEvidencePopover>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
