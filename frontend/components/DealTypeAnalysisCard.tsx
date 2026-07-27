import { useMemo } from 'react'
import { Layers } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type DealType = {
    label: string
    confidence: number
    riskLevel: 'Low' | 'Medium' | 'High'
    opportunity: string
    considerations: string[]
    actions: string[]
}

export default function DealTypeAnalysisCard({ model, synthesis }: Props) {
    const dealType = useMemo((): DealType | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        if (!ebitda || !price) return null

        const growth = model.baseRevenueGrowth ?? 0.05
        const margin = revenue && ebitda ? ebitda / revenue : 0.20
        const mult = price / ebitda
        const redCount = synthesis?.redFlags?.length ?? 0

        if (growth >= 0.12 && margin >= 0.20) {
            return {
                label: 'Growth Story',
                confidence: Math.min(85, 60 + (growth * 100)),
                riskLevel: redCount >= 3 ? 'High' : redCount >= 1 ? 'Medium' : 'Low',
                opportunity: 'Revenue trajectory supports premium valuation. Focus on sustainability of growth drivers.',
                considerations: [
                    'Verify revenue growth is organic, not one-time project revenue',
                    'Check customer concentration — growth from one client is fragile',
                    `Current multiple (${mult.toFixed(1)}x) ${mult <= 5 ? 'seems reasonable' : 'is premium'} for a growth asset`,
                ],
                actions: [
                    'Request trailing 3-year monthly revenue to confirm trend',
                    'Interview top 3 customers about renewal intent',
                    'Model downside scenario if growth slows to industry average',
                ],
            }
        }

        if (margin >= 0.25 && mult <= 4.0) {
            return {
                label: 'Cash Cow',
                confidence: 75,
                riskLevel: redCount >= 3 ? 'High' : 'Low',
                opportunity: 'Strong margins with reasonable entry price. Classic self-funding acquisition candidate.',
                considerations: [
                    'High margins may depend on owner involvement or key customer relationships',
                    'Check for deferred maintenance, capex, or tech debt',
                    `${mult.toFixed(1)}x multiple implies ${(1/mult*100).toFixed(0)}% unlevered yield — strong`,
                ],
                actions: [
                    'Quantify owner-dependent revenue and transition risk',
                    'Review capex history vs. depreciation schedule',
                    'Model SBA 7(a) financing at current rates',
                ],
            }
        }

        if (mult >= 5.5) {
            return {
                label: 'Premium / Turnaround',
                confidence: 65,
                riskLevel: 'High',
                opportunity: `Entry multiple (${mult.toFixed(1)}x) is above market. Requires clear value-creation thesis to justify.`,
                considerations: [
                    'Price assumes growth or operational improvement that may not materialize',
                    'Negotiate hard — seller expectations may be anchored to peak performance',
                    'Consider earn-out structure to bridge valuation gap',
                ],
                actions: [
                    'Build bottoms-up value creation plan with specific levers',
                    'Present comparable transaction data showing lower market multiples',
                    'Structure offer with 20-30% contingent on performance milestones',
                ],
            }
        }

        return {
            label: 'Stable / Value',
            confidence: 70,
            riskLevel: redCount >= 3 ? 'High' : redCount >= 1 ? 'Medium' : 'Low',
            opportunity: 'Moderate growth and margins with fair pricing. Solid foundation for operational improvements.',
            considerations: [
                'Look for quick-win margin improvements (pricing, vendor renegotiation)',
                'Assess whether growth can be accelerated with modest investment',
                'Check for hidden liabilities or deferred costs',
            ],
            actions: [
                'Identify 3 specific operational improvements with $ impact',
                'Request aged AR/AP to assess working capital quality',
                'Model conservative base case with current trajectory',
            ],
        }
    }, [model, synthesis])

    if (!dealType) return null

    const riskColor = dealType.riskLevel === 'Low' ? 'success' : dealType.riskLevel === 'High' ? 'destructive' : 'warning'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Deal type analysis</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{dealType.label}</Badge>
                        <Badge variant={riskColor}>{dealType.riskLevel} risk</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <p className="text-sm text-foreground leading-relaxed">{dealType.opportunity}</p>

                <div className="space-y-3">
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Key considerations</h4>
                        <ul className="space-y-1.5">
                            {dealType.considerations.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                                    {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Recommended actions</h4>
                        <ul className="space-y-1.5">
                            {dealType.actions.map((a, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                    {a}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
