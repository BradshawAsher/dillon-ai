import { ThumbsUp, ThumbsDown, Info } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import TruncatedListItem from './TruncatedListItem'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type Insight = {
    text: string
    source: 'synthesis' | 'model' | 'calculated'
}

export default function StrengthsWeaknessesCard({ model, synthesis }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'illustrative') && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = (facts.revenue?.status === 'confirmed' || facts.revenue?.status === 'illustrative') && typeof facts.revenue.value === 'number' ? facts.revenue.value : null
    const price = model.purchasePrice ?? model.askingPrice

    const strengths: Insight[] = []
    const weaknesses: Insight[] = []

    if (synthesis?.greenFlags?.length) {
        synthesis.greenFlags.slice(0, 3).forEach(f => strengths.push({ text: f, source: 'synthesis' }))
    }

    if (synthesis?.redFlags?.length) {
        synthesis.redFlags.slice(0, 3).forEach(f => weaknesses.push({ text: f, source: 'synthesis' }))
    }

    if (price && ebitda && ebitda > 0) {
        const multiple = price / ebitda
        if (multiple <= 3.5) strengths.push({ text: `Low entry multiple (${multiple.toFixed(1)}x) — favorable buyer pricing`, source: 'calculated' })
        if (multiple > 5) weaknesses.push({ text: `High entry multiple (${multiple.toFixed(1)}x) — requires strong growth to justify`, source: 'calculated' })
    }

    if (revenue && ebitda) {
        const margin = ebitda / revenue
        if (margin >= 0.25) strengths.push({ text: `Strong margins (${(margin * 100).toFixed(0)}% EBITDA) — healthy cash conversion`, source: 'calculated' })
        if (margin < 0.12) weaknesses.push({ text: `Thin margins (${(margin * 100).toFixed(0)}% EBITDA) — limited room for error`, source: 'calculated' })
    }

    if (synthesis?.missingDocuments?.length && synthesis.missingDocuments.length >= 3) {
        weaknesses.push({ text: `${synthesis.missingDocuments.length} document types still missing — incomplete picture`, source: 'synthesis' })
    }

    if (synthesis?.negotiationLevers?.length && synthesis.negotiationLevers.length >= 2) {
        strengths.push({ text: `${synthesis.negotiationLevers.length} negotiation levers identified for price reduction`, source: 'synthesis' })
    }

    if (strengths.length === 0 && weaknesses.length === 0) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Strengths & weaknesses</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <div className="mb-2 flex items-center gap-1.5">
                            <ThumbsUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">Strengths</span>
                            <Badge variant="outline" className="ml-1 text-[10px] text-green-700 dark:text-green-400">{strengths.length}</Badge>
                        </div>
                        {strengths.length > 0 ? (
                            <ul className="space-y-1.5">
                                {strengths.slice(0, 5).map((s, i) => (
                                    <TruncatedListItem key={i} text={s.text} bulletColor="bg-green-500" maxLength={90} />
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground">No strengths identified yet — upload more documents or run synthesis.</p>
                        )}
                    </div>
                    <div>
                        <div className="mb-2 flex items-center gap-1.5">
                            <ThumbsDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">Weaknesses</span>
                            <Badge variant="outline" className="ml-1 text-[10px] text-red-700 dark:text-red-400">{weaknesses.length}</Badge>
                        </div>
                        {weaknesses.length > 0 ? (
                            <ul className="space-y-1.5">
                                {weaknesses.slice(0, 5).map((w, i) => (
                                    <TruncatedListItem key={i} text={w.text} bulletColor="bg-red-500" maxLength={90} />
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-muted-foreground">No weaknesses identified yet.</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
