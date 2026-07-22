import { BadgeDollarSign, ChartNoAxesCombined, Scale, TriangleAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { formatCurrencyValue } from '../utils/aiSubmissionData'

type DealValuationCardProps = {
    synthesis?: ProjectSynthesisItem
    askingPrice: string
}

function parseMoney(value: string) {
    const parsed = Number(value.replace(/[$,\s]/g, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export default function DealValuationCard({ synthesis, askingPrice }: DealValuationCardProps) {
    const askingPriceValue = parseMoney(askingPrice)
    const baseValue = synthesis ? parseMoney(synthesis.valuationBaseEstimate) : null
    const premiumPercent = askingPriceValue !== null && baseValue !== null && baseValue > 0
        ? ((askingPriceValue - baseValue) / baseValue) * 100
        : null
    const cases = synthesis ? [
        { label: 'Downside case', value: synthesis.valuationLowerBound, description: 'Current lower supported estimate' },
        { label: 'Base case', value: synthesis.valuationBaseEstimate, description: 'Current supported estimate' },
        { label: 'Upside case', value: synthesis.valuationUpperBound, description: 'Current upper supported estimate' },
    ] : []

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
                            <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">Method comparison and sensitivity</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Not calculated yet. To populate this section, the deal model needs extracted or confirmed EBITDA/SDE, revenue, assets, liabilities, benchmark multiples, and analyst-approved bear/base/bull assumptions.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">Asset-based</Badge><Badge variant="outline">Revenue multiple</Badge><Badge variant="outline">EBITDA / SDE multiple</Badge><Badge variant="outline">Sensitivity analysis</Badge></div></div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
