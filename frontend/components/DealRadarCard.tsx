import { useMemo } from 'react'
import { Radar } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documentsCount: number
}

type Dimension = {
    label: string
    score: number
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
    const rad = (angle - 90) * (Math.PI / 180)
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

export default function DealRadarCard({ model, synthesis, documentsCount }: Props) {
    const dimensions = useMemo(() => {
        const dims: Dimension[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        // Pricing (lower multiple = better, max 3 = 100%)
        if (price && ebitda) {
            const mult = price / ebitda
            dims.push({ label: 'Pricing', score: Math.max(0, Math.min(100, (1 - (mult - 2) / 6) * 100)) })
        } else {
            dims.push({ label: 'Pricing', score: 0 })
        }

        // Profitability (margin, 30%+ = 100%)
        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            dims.push({ label: 'Margins', score: Math.min(100, (margin / 30) * 100) })
        } else {
            dims.push({ label: 'Margins', score: 0 })
        }

        // Risk (fewer red flags = better)
        const redCount = synthesis?.redFlags?.length ?? 0
        dims.push({ label: 'Safety', score: Math.max(0, Math.min(100, (1 - redCount / 6) * 100)) })

        // Data quality
        const confirmedFacts = Object.values(facts).filter(f => f?.status === 'confirmed').length
        dims.push({ label: 'Data', score: Math.min(100, (confirmedFacts / 5) * 100 + (documentsCount >= 3 ? 20 : 0)) })

        // Growth potential
        if (synthesis?.greenFlags && synthesis.greenFlags.length > 0) {
            dims.push({ label: 'Upside', score: Math.min(100, synthesis.greenFlags.length * 25) })
        } else {
            dims.push({ label: 'Upside', score: synthesis ? 30 : 0 })
        }

        return dims
    }, [model, synthesis, documentsCount])

    const hasData = dimensions.some(d => d.score > 0)
    if (!hasData) return null

    const cx = 100, cy = 100, maxR = 70
    const n = dimensions.length
    const angleStep = 360 / n

    const points = dimensions.map((d, i) => {
        const r = (d.score / 100) * maxR
        return polarToCartesian(cx, cy, r, i * angleStep)
    })
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

    const gridLevels = [0.25, 0.5, 0.75, 1.0]

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Radar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Deal profile</CardTitle>
                    <CardInfoPopover cardId="deal-radar" />
                </div>
            </CardHeader>
            <CardContent className="p-4 flex items-center justify-center">
                <svg
                    viewBox="0 0 200 200"
                    className="w-full max-w-[280px] h-auto"
                    role="img"
                    aria-label={`Deal profile radar across ${dimensions.length} dimensions: ${dimensions.map(d => `${d.label} ${Math.round(d.score)} out of 100`).join(', ')}.`}
                >
                    {gridLevels.map(level => {
                        const gridPoints = Array.from({ length: n }, (_, i) => {
                            const r = level * maxR
                            return polarToCartesian(cx, cy, r, i * angleStep)
                        })
                        const gridPath = gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
                        return <path key={level} d={gridPath} fill="none" className="stroke-border" strokeWidth="0.5" />
                    })}

                    {dimensions.map((_, i) => {
                        const p = polarToCartesian(cx, cy, maxR, i * angleStep)
                        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} className="stroke-border" strokeWidth="0.5" />
                    })}

                    <path d={pathData} className="fill-primary/20 stroke-primary" strokeWidth="1.5" />

                    {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3" className="fill-primary" />
                    ))}

                    {dimensions.map((d, i) => {
                        const labelR = maxR + 14
                        const lp = polarToCartesian(cx, cy, labelR, i * angleStep)
                        return (
                            <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[8px] font-medium">
                                {d.label}
                            </text>
                        )
                    })}
                </svg>
            </CardContent>
        </Card>
    )
}
