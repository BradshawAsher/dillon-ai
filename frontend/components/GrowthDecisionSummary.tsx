import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'

import { safeFormatCurrency } from '../utils/diligenceDashboardUtils'

function money(value: number, currency = 'USD') {
    return safeFormatCurrency(value, currency)
}

export default function GrowthDecisionSummary({ model }: { model: DealModel }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenueFact = facts.revenue
    const revenue = (revenueFact?.status === 'confirmed' || revenueFact?.status === 'illustrative') && typeof revenueFact.value === 'number'
        ? revenueFact.value
        : null
    const years = model.holdPeriodYears ?? 5
    const bearGrowth = model.bearRevenueGrowth ?? 0
    const baseGrowth = model.baseRevenueGrowth ?? 0.05
    const bullGrowth = model.bullRevenueGrowth ?? 0.1
    const currency = revenueFact?.currency || 'USD'

    if (revenue === null) {
        return <Card className="overflow-hidden border-2 border-primary shadow-md"><CardContent className="bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5"><p className="text-sm font-bold uppercase tracking-wide text-primary">Start here — growth at a glance</p><p className="mt-2 text-sm leading-6 text-foreground">Starting revenue has not been returned yet. Once it is available, this section will show the expected year-{years} revenue and the practical range between downside and upside.</p></CardContent></Card>
    }

    const bear = revenue * (1 + bearGrowth) ** years
    const base = revenue * (1 + baseGrowth) ** years
    const bull = revenue * (1 + bullGrowth) ** years

    return <Card className="overflow-hidden border-2 border-primary shadow-md"><CardContent className="bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5"><p className="text-sm font-bold uppercase tracking-wide text-primary">Start here — growth at a glance</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Expected year-{years} revenue</p><p className="mt-1 text-lg font-bold">{money(base, currency)}</p><p className="mt-1 text-xs text-muted-foreground">Base case: {(baseGrowth * 100).toFixed(1)}% annual growth</p></div><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Downside case</p><p className="mt-1 text-lg font-bold">{money(bear, currency)}</p><p className="mt-1 text-xs text-muted-foreground">Bear: {(bearGrowth * 100).toFixed(1)}% annual growth</p></div><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Upside case</p><p className="mt-1 text-lg font-bold">{money(bull, currency)}</p><p className="mt-1 text-xs text-muted-foreground">Bull: {(bullGrowth * 100).toFixed(1)}% annual growth</p></div></div><p className="mt-4 text-sm leading-6 text-foreground">The key question is whether the business can stay near the blue base path. The red bear case finishes {money(Math.max(0, base - bear), currency)} below that expectation; treat the green bull case as upside, not the plan.</p></CardContent></Card>
}
