import { useMemo } from 'react'
import { BarChart3, ShieldAlert } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { BENCHMARK_PROVENANCE, detectSector, getSectorProfile } from '../utils/verticalBenchmarks'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model?: DealModel | null
    synthesis?: ProjectSynthesisItem | null
    projectName?: string
}

const metricRows = [
    ['Entry multiple', 'entryMultiple', 'x'],
    ['Gross margin', 'grossMargin', '%'],
    ['EBITDA margin', 'ebitdaMargin', '%'],
    ['Revenue growth', 'revenueGrowth', '%'],
    ['Payback period', 'paybackYears', 'yr'],
    ['Senior DSCR', 'dscr', 'x'],
] as const

export default function IndustryBenchmarksCard({ model, synthesis, projectName = '' }: Props) {
    const profile = useMemo(() => {
        const candidate = [
            projectName,
            (synthesis as any)?.industry,
            synthesis?.projectName,
            synthesis?.companyName,
            (model as any)?.industry,
            (model as any)?.companyName,
        ].filter(Boolean).join(' ')
        return getSectorProfile(detectSector(candidate))
    }, [model, projectName, synthesis])

    const formatValue = (value: number, unit: string) => unit === '%' ? `${(value * 100).toFixed(0)}%` : `${value.toFixed(1)}${unit}`
    const aiContext = `${profile.displayName}. ${BENCHMARK_PROVENANCE.label}. ${metricRows.map(([label, key, unit]) => {
        const band = profile.metrics[key]
        return `${label}: ${formatValue(band.low, unit)} to ${formatValue(band.high, unit)}; internal midpoint ${formatValue(band.median, unit)}`
    }).join('. ')}`

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Industry benchmarks</CardTitle>
                            <CardInfoPopover cardId="industry-benchmarks" aiContext={aiContext} />
                        </div>
                        <CardDescription>Illustrative sector screening ranges for early underwriting. Validate them against current, citable comparables before investment use.</CardDescription>
                    </div>
                    <Badge variant="outline">{profile.shortCategory}</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Likely profile: {profile.displayName}</p>
                            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{profile.description}</p>
                        </div>
                        <Badge variant="warning">Analyst validation required</Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {metricRows.map(([label, key, unit]) => {
                            const band = profile.metrics[key]
                            return (
                                <div key={key} className="rounded-md border border-border bg-background p-3">
                                    <p className="text-xs font-medium text-muted-foreground">{label}</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{formatValue(band.low, unit)} – {formatValue(band.high, unit)}</p>
                                    <p className="mt-1 text-[10px] text-muted-foreground">Internal midpoint: {formatValue(band.median, unit)}</p>
                                </div>
                            )
                        })}
                    </div>
                    <div className="mt-4 flex gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-muted-foreground">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <p><strong className="text-foreground">{BENCHMARK_PROVENANCE.label}.</strong> {BENCHMARK_PROVENANCE.sourceNote}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
