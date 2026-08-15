import { useMemo, useState } from 'react'
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, AlertOctagon, CheckCircle2 } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardExplainerPopover from './CardExplainerPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type Reason = {
    text: string
    subItems?: string[]
    severity: 'high' | 'medium' | 'low'
}

export default function DealFitCard({ model, synthesis }: Props) {
    const [expandedRedFlags, setExpandedRedFlags] = useState(true)
    const [expandedGreenFlags, setExpandedGreenFlags] = useState(false)

    const { matches, mismatches, redFlagList, greenFlagList } = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const mult = price && ebitda ? price / ebitda : null
        const margin = revenue && ebitda ? ebitda / revenue : null
        const redFlags = synthesis?.redFlags ?? []
        const greenFlags = synthesis?.greenFlags ?? []

        const good: Reason[] = []
        const bad: Reason[] = []

        if (mult && mult <= 4.0) good.push({ text: `Entry multiple (${mult.toFixed(1)}x) is at or below market median (3.0-4.0x)`, severity: 'high' })
        else if (mult && mult > 5.5) bad.push({ text: `Entry multiple (${mult.toFixed(1)}x) is significantly above market — premium pricing risk`, severity: 'high' })

        if (margin && margin >= 0.25) good.push({ text: `Strong ${(margin * 100).toFixed(0)}% EBITDA margin provides cash flow cushion`, severity: 'high' })
        else if (margin && margin < 0.12) bad.push({ text: `Thin ${(margin * 100).toFixed(0)}% margin — limited room for operational error`, severity: 'high' })

        if (price && ebitda && (price / ebitda) <= 3.5) good.push({ text: 'Quick payback potential — self-funding within 3-4 years', severity: 'medium' })
        else if (price && ebitda && (price / ebitda) > 6) bad.push({ text: 'Extended payback (6+ years) increases capital exposure', severity: 'medium' })

        if (synthesis?.negotiationLevers?.length && synthesis.negotiationLevers.length >= 2) {
            good.push({ text: `${synthesis.negotiationLevers.length} negotiation levers available for purchase price improvement`, severity: 'low' })
        }

        if (synthesis?.openQuestions?.length && synthesis.openQuestions.length >= 4) {
            bad.push({ text: `${synthesis.openQuestions.length} open diligence questions remain unanswered`, severity: 'medium' })
        }

        if (synthesis?.missingDocuments?.length && synthesis.missingDocuments.length >= 2) {
            bad.push({ text: `Missing ${synthesis.missingDocuments.length} recommended financial documents`, severity: 'low' })
        }

        return { matches: good, mismatches: bad, redFlagList: redFlags, greenFlagList: greenFlags }
    }, [model, synthesis])

    if (matches.length === 0 && mismatches.length === 0 && redFlagList.length === 0 && greenFlagList.length === 0) return null

    const severityColor = (s: Reason['severity']) =>
        s === 'high' ? 'bg-red-500' : s === 'medium' ? 'bg-amber-500' : 'bg-muted-foreground/50'

    const goodSeverityColor = (s: Reason['severity']) =>
        s === 'high' ? 'bg-emerald-500' : s === 'medium' ? 'bg-blue-500' : 'bg-muted-foreground/50'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Deal fit analysis</CardTitle>
                    </div>
                    <CardExplainerPopover
                        title="Deal Fit Analysis"
                        whatIsIt="Consolidates the strategic Pros (Matches) and Cons (Mismatches) of the acquisition against standard investment criteria."
                        howItWorks="Synthesizes valuation multiples, margin quality, cash payback, unverified add-backs, and flagged operational risks."
                        whyItMatters="Helps you quickly weigh whether the strengths (high margin, market position) outweigh the liabilities (customer concentration, missing records)."
                    />
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Good matches column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                            <ThumbsUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Positive Signals & Matches</span>
                            <Badge variant="outline" className="text-[10px] ml-auto font-mono">{matches.length + greenFlagList.length}</Badge>
                        </div>

                        {/* Direct Green Flags from Diligence Synthesis */}
                        {greenFlagList.length > 0 && (
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setExpandedGreenFlags(!expandedGreenFlags)}
                                    className="flex w-full items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400 text-left"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                        {greenFlagList.length} Verified Strengths Identified
                                    </span>
                                    {expandedGreenFlags ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                                {expandedGreenFlags && (
                                    <ul className="space-y-1.5 pt-1 text-xs">
                                        {greenFlagList.map((flag, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-foreground/90 leading-snug">
                                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                                <span>{flag}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* General Thesis Matches */}
                        <div className="space-y-2 pt-1">
                            {matches.map((r, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${goodSeverityColor(r.severity)}`} />
                                    <span className="text-xs text-foreground">{r.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Mismatches and Red Flags column */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 pb-1 border-b border-border/40">
                            <ThumbsDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-semibold text-red-600 dark:text-red-400">Mismatches & Red Flags</span>
                            <Badge variant="outline" className="text-[10px] ml-auto font-mono">{mismatches.length + redFlagList.length}</Badge>
                        </div>

                        {/* Direct Red Flags from Diligence Synthesis */}
                        {redFlagList.length > 0 && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 space-y-2">
                                <button
                                    type="button"
                                    onClick={() => setExpandedRedFlags(!expandedRedFlags)}
                                    className="flex w-full items-center justify-between text-xs font-semibold text-red-700 dark:text-red-400 text-left"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <AlertOctagon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                                        {redFlagList.length} Red Flags Requiring Action:
                                    </span>
                                    {expandedRedFlags ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </button>
                                {expandedRedFlags && (
                                    <ul className="space-y-1.5 pt-1 text-xs">
                                        {redFlagList.map((flag, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-foreground/90 font-medium leading-snug">
                                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                                                <span>{flag}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        {/* General Thesis Mismatches */}
                        <div className="space-y-2 pt-1">
                            {mismatches.map((r, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityColor(r.severity)}`} />
                                    <span className="text-xs text-foreground">{r.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

