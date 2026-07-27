import { useMemo } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type Reason = {
    text: string
    severity: 'high' | 'medium' | 'low'
}

export default function DealFitCard({ model, synthesis }: Props) {
    const { matches, mismatches } = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const mult = price && ebitda ? price / ebitda : null
        const margin = revenue && ebitda ? ebitda / revenue : null
        const redCount = synthesis?.redFlags?.length ?? 0
        const greenCount = synthesis?.greenFlags?.length ?? 0

        const good: Reason[] = []
        const bad: Reason[] = []

        if (mult && mult <= 4.0) good.push({ text: `Entry multiple (${mult.toFixed(1)}x) is at or below market median`, severity: 'high' })
        else if (mult && mult > 5.5) bad.push({ text: `Entry multiple (${mult.toFixed(1)}x) is above market — premium pricing`, severity: 'high' })

        if (margin && margin >= 0.25) good.push({ text: `Strong ${(margin * 100).toFixed(0)}% EBITDA margin provides cash flow cushion`, severity: 'high' })
        else if (margin && margin < 0.12) bad.push({ text: `Thin ${(margin * 100).toFixed(0)}% margin — limited room for error`, severity: 'high' })

        if (redCount === 0) good.push({ text: 'No red flags identified in due diligence', severity: 'medium' })
        else if (redCount >= 3) bad.push({ text: `${redCount} red flags require investigation before proceeding`, severity: 'high' })
        else bad.push({ text: `${redCount} red flag${redCount > 1 ? 's' : ''} identified — manageable but needs attention`, severity: 'medium' })

        if (greenCount >= 3) good.push({ text: `${greenCount} positive indicators support the thesis`, severity: 'medium' })

        if (price && ebitda && (price / ebitda) <= 3.5) good.push({ text: 'Quick payback potential — self-funding within 3-4 years', severity: 'medium' })
        else if (price && ebitda && (price / ebitda) > 6) bad.push({ text: 'Extended payback (6+ years) increases risk', severity: 'medium' })

        if (synthesis?.negotiationLevers?.length && synthesis.negotiationLevers.length >= 2) {
            good.push({ text: `${synthesis.negotiationLevers.length} negotiation levers available for price improvement`, severity: 'low' })
        }

        if (synthesis?.openQuestions?.length && synthesis.openQuestions.length >= 4) {
            bad.push({ text: `${synthesis.openQuestions.length} open questions remain unanswered`, severity: 'medium' })
        }

        if (synthesis?.missingDocuments?.length && synthesis.missingDocuments.length >= 2) {
            bad.push({ text: `Missing ${synthesis.missingDocuments.length} recommended documents`, severity: 'low' })
        }

        return { matches: good, mismatches: bad }
    }, [model, synthesis])

    if (matches.length === 0 && mismatches.length === 0) return null

    const severityColor = (s: Reason['severity']) =>
        s === 'high' ? 'bg-foreground/80' : s === 'medium' ? 'bg-foreground/50' : 'bg-foreground/25'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Deal fit analysis</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-semibold text-green-600">Good match</span>
                            <Badge variant="outline" className="text-[9px]">{matches.length}</Badge>
                        </div>
                        {matches.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">Upload more data to identify positive signals.</p>
                        ) : (
                            matches.map((r, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityColor(r.severity)}`} />
                                    <span className="text-xs text-foreground">{r.text}</span>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 mb-3">
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-semibold text-red-600">Mismatches</span>
                            <Badge variant="outline" className="text-[9px]">{mismatches.length}</Badge>
                        </div>
                        {mismatches.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No mismatches detected.</p>
                        ) : (
                            mismatches.map((r, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityColor(r.severity)}`} />
                                    <span className="text-xs text-foreground">{r.text}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
