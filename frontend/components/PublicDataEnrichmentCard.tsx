import { useMemo } from 'react'
import { Globe } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
    projectName: string
}

type EnrichmentSource = {
    dataType: string
    source: string
    valueAdd: 'High' | 'Medium' | 'Low'
    availability: string
    description: string
}

export default function PublicDataEnrichmentCard({ model, synthesis, projectName }: Props) {
    const sources = useMemo((): EnrichmentSource[] | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : model.revenue
        const price = model.purchasePrice ?? model.askingPrice

        if (!price && !revenue) return null

        // Determine revenue size tier for context
        const revenueTier = revenue
            ? revenue < 1000000 ? 'micro' : revenue < 5000000 ? 'small' : revenue < 20000000 ? 'mid' : 'large'
            : 'unknown'

        const tierLabel = revenueTier === 'micro' ? '<$1M' : revenueTier === 'small' ? '$1-5M' : revenueTier === 'mid' ? '$5-20M' : revenueTier === 'large' ? '$20M+' : 'Unknown'

        const items: EnrichmentSource[] = [
            {
                dataType: 'Industry average margins',
                source: 'BLS, IBIS World, Census Bureau',
                valueAdd: 'High',
                availability: 'Available when connected',
                description: `Benchmark margins for ${tierLabel} revenue businesses in sector`,
            },
            {
                dataType: 'Market growth rates',
                source: 'Bureau of Economic Analysis, Industry reports',
                valueAdd: 'High',
                availability: 'Available when connected',
                description: 'Sector-specific growth projections and historical trends',
            },
            {
                dataType: 'Comparable transactions',
                source: 'BizBuySell, DealStats, public filings',
                valueAdd: 'High',
                availability: 'Available when connected',
                description: 'Recent transaction multiples for similar businesses',
            },
            {
                dataType: 'Regulatory requirements',
                source: 'Federal/state registries, compliance databases',
                valueAdd: 'Medium',
                availability: 'Available when connected',
                description: 'Industry-specific licenses, permits, and compliance needs',
            },
            {
                dataType: 'Local market indicators',
                source: 'Census, BLS, local economic development',
                valueAdd: 'Medium',
                availability: 'Available when connected',
                description: 'Employment trends, population growth, business climate',
            },
        ]

        return items
    }, [model, synthesis, projectName])

    if (!sources) return null

    const valueAddColors = {
        High: 'bg-green-100 text-green-700',
        Medium: 'bg-amber-100 text-amber-700',
        Low: 'bg-muted text-muted-foreground',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">External data enrichment</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Public and external data sources to improve analysis quality
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Banner */}
                <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-medium text-primary">
                        Connect external data sources to automatically enrich your analysis
                    </p>
                </div>

                {/* Data sources */}
                <div className="space-y-2">
                    {sources.map((source) => (
                        <div key={source.dataType} className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-foreground">{source.dataType}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${valueAddColors[source.valueAdd]}`}>
                                    {source.valueAdd} value
                                </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">{source.description}</div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-muted-foreground italic">{source.source}</span>
                                <span className="text-[9px] text-muted-foreground/70">{source.availability}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        External enrichment can validate assumptions, identify risks not visible in internal
                        documents, and provide market context for valuation. Data is sourced from public
                        databases and does not require seller cooperation.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
