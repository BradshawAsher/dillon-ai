import { TrendingUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { buildDerivedEvidence, buildFactEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import { safeFormatCurrency } from '../utils/diligenceDashboardUtils'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { EbitdaLineChart } from './DealCharts'

function facts(model: DealModel) { try { return JSON.parse(model.documentedFactsJson || '{}') as Record<string, { value?: number; status?: string; currency?: string }> } catch { return {} } }

type EbitdaProjectionCardProps = {
    model: DealModel
    documents?: SubmissionHistoryItem[]
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

export default function EbitdaProjectionCard({ model, documents = [], onOpenEvidence }: EbitdaProjectionCardProps) {
    const documented = facts(model)
    const revenue = (documented.revenue?.status === 'confirmed' || documented.revenue?.status === 'illustrative') ? documented.revenue.value ?? null : null
    const currency = documented.revenue?.currency || documented.ebitda_sde?.currency || 'USD'
    const parsedFacts = parseDocumentedFacts(model.documentedFactsJson)
    const revenueEvidence = buildFactEvidence({ field: 'revenue', title: 'Starting revenue', facts: parsedFacts, documents })
    const years = model.holdPeriodYears ?? 5

    const bearMargin = model.bearEbitdaMargin
    const baseMargin = model.baseEbitdaMargin
    const bullMargin = model.bullEbitdaMargin

    // At least one margin must be present alongside revenue to render the chart
    const hasAtLeastOneMargin = bearMargin !== null || baseMargin !== null || bullMargin !== null
    const ready = revenue !== null && hasAtLeastOneMargin

    const ebitdaChartData = !ready ? [] : Array.from({ length: years + 1 }, (_, year) => {
        const datum: Record<string, string | number> = { label: year === 0 ? 'Today' : `Year ${year}` }
        const bearRevenue = revenue * (1 + (model.bearRevenueGrowth ?? 0)) ** year
        const baseRevenue = revenue * (1 + (model.baseRevenueGrowth ?? 0.05)) ** year
        const bullRevenue = revenue * (1 + (model.bullRevenueGrowth ?? 0.1)) ** year
        if (bearMargin !== null) datum.Bear = bearRevenue * bearMargin
        if (baseMargin !== null) datum.Base = baseRevenue * baseMargin
        if (bullMargin !== null) datum.Bull = bullRevenue * bullMargin
        return datum
    })

    const evidenceItem = buildDerivedEvidence({
        title: 'EBITDA projection',
        formula: 'For each year and scenario: EBITDA = Revenue x (1 + growth rate)^year x EBITDA margin',
        documentedInputs: [{ label: 'Starting revenue', value: revenue === null ? 'Not documented' : safeFormatCurrency(revenue, currency) }],
        analystInputs: [
            ...(bearMargin !== null ? [{ label: 'Bear EBITDA margin', value: `${(bearMargin * 100).toFixed(1)}%` }] : []),
            ...(baseMargin !== null ? [{ label: 'Base EBITDA margin', value: `${(baseMargin * 100).toFixed(1)}%` }] : []),
            ...(bullMargin !== null ? [{ label: 'Bull EBITDA margin', value: `${(bullMargin * 100).toFixed(1)}%` }] : []),
            { label: 'Bear revenue growth', value: `${((model.bearRevenueGrowth ?? 0) * 100).toFixed(1)}%` },
            { label: 'Base revenue growth', value: `${((model.baseRevenueGrowth ?? 0.05) * 100).toFixed(1)}%` },
            { label: 'Bull revenue growth', value: `${((model.bullRevenueGrowth ?? 0.1) * 100).toFixed(1)}%` },
            { label: 'Hold period', value: `${years} years` },
        ],
        primaryFact: revenueEvidence,
    })

    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><CardTitle className="text-xl">EBITDA projection</CardTitle></div><CardDescription>Projected EBITDA across bear, base, and bull scenarios based on revenue growth and margin assumptions.</CardDescription></CardHeader><CardContent className="p-5">{!ready ? <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add documented revenue and at least one EBITDA margin assumption (bear, base, or bull) to see the EBITDA projection chart.</p> : <><EbitdaLineChart data={ebitdaChartData} />{onOpenEvidence ? <div className="mt-3 text-right"><button type="button" onClick={() => onOpenEvidence(evidenceItem)} className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How this was calculated</button></div> : null}</>}<p className="mt-4 text-xs text-muted-foreground">EBITDA margin and revenue growth are scenario assumptions entered by the analyst. Revenue is a documented starting figure. EBITDA = projected revenue x scenario margin for each year of the hold period.</p></CardContent></Card>
}
