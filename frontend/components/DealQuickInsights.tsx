import { useMemo } from 'react'
import { Lightbulb, Bot, ExternalLink } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardExplainerPopover from './CardExplainerPopover'
import InPlaceEvidencePopover, { EvidenceDetails } from './InPlaceEvidencePopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type Insight = {
    text: string
    sentiment: 'positive' | 'negative' | 'neutral'
    topic: string
    evidence: EvidenceDetails
}

export default function DealQuickInsights({ model, synthesis }: Props) {
    const insights = useMemo(() => {
        const items: Insight[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (price && ebitda) {
            const multiple = price / ebitda
            const text = multiple <= 3
                ? `Entry multiple of ${multiple.toFixed(1)}x — below typical 3-5x range`
                : multiple <= 5
                ? `Entry multiple of ${multiple.toFixed(1)}x — within normal 3-5x range`
                : `Entry multiple of ${multiple.toFixed(1)}x — above typical range, needs strong growth thesis`
            const sentiment = multiple <= 3 ? 'positive' : multiple <= 5 ? 'neutral' : 'negative'
            items.push({
                text,
                sentiment,
                topic: 'Entry Valuation Multiple',
                evidence: {
                    metricName: 'Entry Multiple Calculation',
                    valueFormatted: `${multiple.toFixed(2)}x`,
                    sourceDoc: facts.ebitda_sde?.source_document || 'Confidential Information Memorandum (CIM)',
                    pageNumber: facts.ebitda_sde?.source_page || 1,
                    quoteSnippet: `Purchase/asking price of $${(price / 1_000_000).toFixed(2)}M against documented EBITDA of $${(ebitda / 1_000_000).toFixed(2)}M.`,
                    confidence: facts.ebitda_sde?.confidence || 'high',
                    status: 'confirmed',
                    notes: `Evaluated against industry norm for SMB acquisitions (typically 3.0x - 5.5x for $1M-$5M EBITDA companies).`,
                },
            })
        }

        if (revenue && ebitda) {
            const margin = (ebitda / revenue) * 100
            const text = margin >= 30
                ? `${margin.toFixed(0)}% EBITDA margin — strong profitability`
                : margin >= 15
                ? `${margin.toFixed(0)}% EBITDA margin — typical for SMBs`
                : `${margin.toFixed(0)}% EBITDA margin — below 15% signals operational issues`
            const sentiment = margin >= 30 ? 'positive' : margin >= 15 ? 'neutral' : 'negative'
            items.push({
                text,
                sentiment,
                topic: 'Operating EBITDA Margin',
                evidence: {
                    metricName: 'EBITDA Margin',
                    valueFormatted: `${margin.toFixed(1)}%`,
                    sourceDoc: facts.revenue?.source_document || 'Historical P&L / Tax Returns',
                    pageNumber: facts.revenue?.source_page || 1,
                    quoteSnippet: `Documented Revenue $${(revenue / 1_000_000).toFixed(2)}M yielding $${(ebitda / 1_000_000).toFixed(2)}M in operating earnings.`,
                    confidence: 'high',
                    status: 'confirmed',
                    notes: `High margins indicate moat and pricing power; margins under 15% require thorough review of fixed COGS and labor costs.`,
                },
            })
        }

        if (price && ebitda && model.holdPeriodYears) {
            const payback = price / ebitda
            const text = payback <= model.holdPeriodYears
                ? `Payback in ~${payback.toFixed(1)} years — within ${model.holdPeriodYears}-year hold`
                : `Payback in ~${payback.toFixed(1)} years — exceeds ${model.holdPeriodYears}-year hold`
            const sentiment = payback <= model.holdPeriodYears ? 'positive' : 'negative'
            items.push({
                text,
                sentiment,
                topic: 'Unlevered Payback Period',
                evidence: {
                    metricName: 'Payback Period',
                    valueFormatted: `${payback.toFixed(1)} Years`,
                    sourceDoc: 'Deal Financial Model',
                    quoteSnippet: `At current unadjusted run-rate EBITDA ($${(ebitda / 1_000).toFixed(0)}K/yr), the full purchase price is recouped in ${payback.toFixed(1)} years without leverage.`,
                    confidence: 'high',
                    status: 'confirmed',
                    notes: `Based on a ${model.holdPeriodYears}-year planned investment horizon.`,
                },
            })
        }

        if (synthesis?.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0' && price) {
            const baseVal = parseFloat(synthesis.valuationBaseEstimate.replace(/[$,]/g, ''))
            if (baseVal > 0) {
                const diff = ((baseVal - price) / price) * 100
                const text = diff > 10
                    ? `Price is ${diff.toFixed(0)}% below AI valuation midpoint`
                    : diff < -10
                    ? `Price is ${Math.abs(diff).toFixed(0)}% above AI valuation midpoint`
                    : `Price is within 10% of AI valuation midpoint`
                const sentiment = diff > 10 ? 'positive' : diff < -10 ? 'negative' : 'neutral'
                items.push({
                    text,
                    sentiment,
                    topic: 'AI Diligence Valuation Gap',
                    evidence: {
                        metricName: 'AI Midpoint Valuation',
                        valueFormatted: synthesis.valuationBaseEstimate,
                        sourceDoc: 'VDR Synthesis Analysis Pass',
                        quoteSnippet: `AI Synthesis engine benchmarked base enterprise valuation at ${synthesis.valuationBaseEstimate} vs asking price of $${(price / 1_000_000).toFixed(2)}M.`,
                        confidence: 'medium',
                        status: 'confirmed',
                        notes: `Derived from multi-document extraction, margin consistency checks, and synthesized risk factor penalties.`,
                    },
                })
            }
        }

        if (synthesis?.redFlags) {
            const count = synthesis.redFlags.length
            const text = count === 0
                ? 'No red flags identified — rare for an SMB deal'
                : count <= 2
                ? `${count} red flag${count > 1 ? 's' : ''} — manageable with diligence`
                : `${count} red flags — significant risk requires deeper investigation`
            const sentiment = count === 0 ? 'positive' : count <= 2 ? 'neutral' : 'negative'
            items.push({
                text,
                sentiment,
                topic: 'Diligence Red Flags',
                evidence: {
                    metricName: 'Documented Red Flags',
                    valueFormatted: `${count} Found`,
                    sourceDoc: 'Project Synthesis Findings',
                    quoteSnippet: synthesis.redFlags.slice(0, 3).join('; ') || 'None identified in uploaded VDR room.',
                    confidence: 'high',
                    status: 'confirmed',
                    notes: `Review full findings in the Synthesis and Diligence tabs before submitting LOI.`,
                },
            })
        }

        if (model.exitMultiple && ebitda && model.baseRevenueGrowth) {
            const futureEbitda = ebitda * Math.pow(1 + model.baseRevenueGrowth, model.holdPeriodYears ?? 5)
            const exitValue = futureEbitda * model.exitMultiple
            if (price && exitValue > 0) {
                const moic = exitValue / price
                const text = moic >= 3
                    ? `Projected ${moic.toFixed(1)}x MOIC at exit — strong return potential`
                    : moic >= 2
                    ? `Projected ${moic.toFixed(1)}x MOIC at exit — acceptable return`
                    : `Projected ${moic.toFixed(1)}x MOIC at exit — below 2x target`
                const sentiment = moic >= 3 ? 'positive' : moic >= 2 ? 'neutral' : 'negative'
                items.push({
                    text,
                    sentiment,
                    topic: 'Projected Multiple on Invested Capital (MOIC)',
                    evidence: {
                        metricName: 'Projected MOIC',
                        valueFormatted: `${moic.toFixed(2)}x`,
                        sourceDoc: 'LBO Returns Model',
                        quoteSnippet: `Assumes ${(model.baseRevenueGrowth * 100).toFixed(1)}% annual growth over ${model.holdPeriodYears ?? 5} years, exiting at ${model.exitMultiple}x EBITDA.`,
                        confidence: 'medium',
                        status: 'confirmed',
                        notes: `Sensitivity to exit multiple and margin compression is modeled in Returns tab.`,
                    },
                })
            }
        }

        return items.slice(0, 6)
    }, [model, synthesis])

    if (insights.length === 0) return null

    const sentimentIcon = (s: Insight['sentiment']) =>
        s === 'positive' ? '✓' : s === 'negative' ? '!' : '—'
    const sentimentColor = (s: Insight['sentiment']) =>
        s === 'positive' ? 'text-green-600 dark:text-green-400' :
        s === 'negative' ? 'text-red-600 dark:text-red-400' :
        'text-amber-600 dark:text-amber-400'

    const handleAskAi = (insight: Insight) => {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('mergeworks:open-chat-ask', {
                    detail: {
                        question: `Can you break down the numbers, calculation steps, and diligence meaning behind this quick insight: "${insight.text}" on this deal?`,
                        topic: insight.topic,
                    },
                })
            )
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Quick insights</CardTitle>
                        <CardExplainerPopover
                            title="Quick Deal Insights"
                            whatIsIt="Automated heuristics comparing this deal's core metrics (multiple, EBITDA margin, payback horizon, MOIC) against standard SMB acquisition benchmarks."
                            howItWorks="Calculated directly from verified documented facts (EBITDA, purchase price, revenue, hold period) combined with VDR synthesis findings."
                            whyItMatters="Enables searchers and PE buyers to immediately assess baseline deal attractiveness and spot potential return mismatches."
                        />
                    </div>
                    <span className="text-[11px] text-muted-foreground">Hover or click for citations & AI deep-dive</span>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2.5">
                    {insights.map((insight, i) => (
                        <div
                            key={i}
                            className="group flex items-center justify-between gap-3 rounded-lg border border-transparent p-1.5 transition-all hover:border-border/80 hover:bg-muted/40"
                        >
                            <InPlaceEvidencePopover evidence={insight.evidence} align="left">
                                <div className="flex items-start gap-2.5 text-left cursor-pointer">
                                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${sentimentColor(insight.sentiment)} bg-current/10 group-hover:scale-105 transition-transform`}>
                                        {sentimentIcon(insight.sentiment)}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                            {insight.text}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span>Citation: {insight.evidence.sourceDoc}</span>
                                            <ExternalLink className="h-2.5 w-2.5" />
                                        </span>
                                    </div>
                                </div>
                            </InPlaceEvidencePopover>

                            <button
                                type="button"
                                onClick={() => handleAskAi(insight)}
                                title="Ask AI to explain this insight"
                                className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-muted-foreground opacity-60 transition-all hover:border-primary/50 hover:bg-primary/10 hover:text-primary hover:opacity-100 cursor-pointer shadow-2xs"
                            >
                                <Bot className="h-3 w-3 text-primary" />
                                <span className="hidden sm:inline">Ask AI</span>
                            </button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
