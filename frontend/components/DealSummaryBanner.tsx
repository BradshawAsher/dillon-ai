import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

function compact(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

export default function DealSummaryBanner({ model, synthesis, projectName }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'illustrative') && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = (facts.revenue?.status === 'confirmed' || facts.revenue?.status === 'illustrative') && typeof facts.revenue.value === 'number' ? facts.revenue.value : null
    const price = model.purchasePrice ?? model.askingPrice
    const multiple = price && ebitda ? price / ebitda : null

    const chips: { label: string; value: string }[] = []
    if (revenue) chips.push({ label: 'Rev', value: compact(revenue) })
    if (ebitda) chips.push({ label: 'EBITDA', value: compact(ebitda) })
    if (price) chips.push({ label: 'Price', value: compact(price) })
    if (multiple) chips.push({ label: 'Multiple', value: `${multiple.toFixed(1)}x` })

    if (chips.length === 0 && !synthesis) return null

    const trafficColor = synthesis?.finalTrafficLight === 'GREEN' ? 'bg-green-500' :
        synthesis?.finalTrafficLight === 'RED' ? 'bg-red-500' :
        synthesis?.finalTrafficLight === 'YELLOW' ? 'bg-amber-500' : 'bg-muted-foreground/30'

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card/80 px-4 py-2.5">
            <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${trafficColor}`} />
                <span className="text-sm font-semibold text-foreground truncate max-w-[200px]">{projectName || 'Untitled deal'}</span>
            </div>
            {synthesis?.finalRecommendation && (
                <Badge variant={synthesis.finalTrafficLight === 'GREEN' ? 'success' : synthesis.finalTrafficLight === 'RED' ? 'destructive' : 'warning'} className="text-[11px]">
                    {synthesis.finalRecommendation}
                </Badge>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {chips.map(c => (
                    <span key={c.label} className="flex items-center gap-1">
                        <span className="font-medium text-foreground">{c.value}</span>
                        <span>{c.label}</span>
                    </span>
                ))}
            </div>
            {synthesis?.redFlags && synthesis.redFlags.length > 0 && (
                <span className="text-xs text-destructive font-medium">{synthesis.redFlags.length} red flag{synthesis.redFlags.length > 1 ? 's' : ''}</span>
            )}
        </div>
    )
}
