import { useMemo, useCallback, useState } from 'react'
import { Award, Check, Copy, AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { copyToClipboard } from '../utils/clipboard'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import InPlaceEvidencePopover from './InPlaceEvidencePopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
}

type MetricItem = {
    label: string
    value: string
    sourceDoc?: string
    pageNumber?: string
    quoteSnippet?: string
    isDerived?: boolean
    formula?: string
    confidence?: string
    notes?: string
}

type ScorecardData = {
    verdict: string
    metrics: MetricItem[]
    redFlagCount: number
    yellowFlagCount: number
    greenFlagCount: number
    redFlags: string[]
    yellowFlags: string[]
    greenFlags: string[]
    financingSummary: string
    recommendation: 'Go' | 'Conditional Go' | 'No-Go'
    recommendationReason: string
    grade: string
}

export default function DealScorecardExportCard({ model, synthesis, projectName }: Props) {
    const [selectedRiskCategory, setSelectedRiskCategory] = useState<'red' | 'yellow' | 'green' | null>('red')

    const scorecard = useMemo((): ScorecardData | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const multiple = price / ebitda
        const margin = revenue && revenue > 0 ? ebitda / revenue : (model.baseEbitdaMargin ?? 0.20)
        const growth = model.baseRevenueGrowth ?? 0.05
        const taxRate = model.taxRate ?? 0.25
        const holdYears = model.holdPeriodYears ?? 5
        const exitMult = model.exitMultiple ?? 4.0

        // Key metrics
        const afterTaxCash = ebitda * (1 - taxRate) - (model.maintenanceCapex ?? 0)
        const payback = afterTaxCash > 0 ? price / afterTaxCash : 0

        const futureRevenue = (revenue ?? ebitda / margin) * Math.pow(1 + growth, holdYears)
        const futureEbitda = futureRevenue * margin
        const exitEV = futureEbitda * exitMult
        const totalInvestment = price + (model.transactionFees ?? 0) + (model.workingCapitalRequirement ?? 0)
        const moic = totalInvestment > 0 ? exitEV / totalInvestment : 0

        const metrics: MetricItem[] = [
            {
                label: 'Purchase price',
                value: `$${Math.round(price).toLocaleString()}`,
                sourceDoc: facts.purchase_price?.citations?.[0]?.source_file || facts.asking_price?.citations?.[0]?.source_file || 'Deal Files / CIM',
                pageNumber: facts.purchase_price?.citations?.[0]?.row_or_cell || facts.asking_price?.citations?.[0]?.row_or_cell,
                quoteSnippet: facts.purchase_price?.citations?.[0]?.excerpt || facts.asking_price?.citations?.[0]?.excerpt || 'Documented transaction purchase / asking price.',
                notes: 'Base transaction valuation.',
            },
            {
                label: 'EBITDA/SDE',
                value: `$${Math.round(ebitda).toLocaleString()}`,
                sourceDoc: facts.ebitda_sde?.citations?.[0]?.source_file || 'P&L Financial Statements',
                pageNumber: facts.ebitda_sde?.citations?.[0]?.row_or_cell,
                quoteSnippet: facts.ebitda_sde?.citations?.[0]?.excerpt || 'Historical adjusted EBITDA / SDE extracted from financial statements.',
                notes: 'Normalized earnings baseline.',
            },
            {
                label: 'Multiple',
                value: `${multiple.toFixed(1)}x`,
                isDerived: true,
                formula: 'Purchase Price / Adjusted EBITDA',
                notes: 'Valuation entry multiple based on historical cash flow.',
            },
            {
                label: 'Margin',
                value: `${(margin * 100).toFixed(0)}%`,
                isDerived: true,
                formula: 'EBITDA / Revenue',
                notes: 'Operating profitability margin.',
            },
            {
                label: 'Revenue growth',
                value: `${(growth * 100).toFixed(1)}%`,
                isDerived: true,
                notes: 'Annual compound revenue growth rate assumption.',
            },
            {
                label: 'Payback',
                value: payback > 0 ? `${payback.toFixed(1)} yrs` : 'N/A',
                isDerived: true,
                formula: 'Purchase Price / After-Tax Free Cash Flow',
                notes: 'Unlevered cash payback period.',
            },
            {
                label: 'Projected MOIC',
                value: `${moic.toFixed(1)}x`,
                isDerived: true,
                formula: 'Projected Exit Value / Total Capital Invested',
                notes: 'Multiple on Invested Capital over hold period.',
            },
            {
                label: 'Hold period',
                value: `${holdYears} yrs`,
                isDerived: true,
                notes: 'Target investment hold horizon.',
            },
        ]

        // Risk assessment
        const redFlags = synthesis?.redFlags ?? []
        const yellowFlags = synthesis?.yellowFlags ?? []
        const greenFlags = synthesis?.greenFlags ?? []

        // Financing summary
        const equityPct = Math.round(normalizeEquityFraction(model.equityContributionPercent) * 100)
        const equity = price * (equityPct / 100)
        const sellerNote = model.sellerNoteAmount ?? 0
        const seniorDebt = price - equity - sellerNote
        const rate = model.interestRate ?? 0.07
        const financingSummary = `Equity: $${Math.round(equity).toLocaleString()} (${equityPct}%) | Senior debt: $${Math.round(seniorDebt).toLocaleString()} at ${(rate * 100).toFixed(1)}%${sellerNote > 0 ? ` | Seller note: $${Math.round(sellerNote).toLocaleString()}` : ''}`

        // Recommendation logic (mirrors DealGradeCard scoring)
        let score = 0
        let maxScore = 0

        // Pricing
        if (multiple <= 3.0) score += 3
        else if (multiple <= 4.0) score += 2
        else if (multiple <= 5.5) score += 1
        maxScore += 3

        // Margin
        if (margin >= 0.25) score += 3
        else if (margin >= 0.18) score += 2
        else if (margin >= 0.10) score += 1
        maxScore += 3

        // Risk
        if (redFlags.length === 0 && yellowFlags.length <= 1) score += 3
        else if (redFlags.length <= 1 && yellowFlags.length <= 3) score += 2
        else if (redFlags.length <= 3) score += 1
        maxScore += 3

        // Payback
        if (payback > 0) {
            if (payback <= 3) score += 3
            else if (payback <= 4.5) score += 2
            else if (payback <= 6) score += 1
            maxScore += 3
        }

        const pct = maxScore > 0 ? score / maxScore : 0
        let recommendation: 'Go' | 'Conditional Go' | 'No-Go'
        let recommendationReason: string
        let grade: string

        if (pct >= 0.70) {
            recommendation = 'Go'
            recommendationReason = 'Strong fundamentals across pricing, profitability, and risk dimensions'
            grade = pct >= 0.85 ? 'A' : 'B'
        } else if (pct >= 0.45) {
            recommendation = 'Conditional Go'
            recommendationReason = 'Acceptable deal with specific risks that require mitigation before closing'
            grade = pct >= 0.55 ? 'C' : 'D'
        } else {
            recommendation = 'No-Go'
            recommendationReason = 'Significant concerns in pricing, risk, or return profile'
            grade = 'F'
        }

        const verdict = `${projectName}: ${multiple.toFixed(1)}x EBITDA, ${(margin * 100).toFixed(0)}% margins, ${redFlags.length} red flags — ${recommendation}`

        return {
            verdict,
            metrics,
            redFlagCount: redFlags.length,
            yellowFlagCount: yellowFlags.length,
            greenFlagCount: greenFlags.length,
            redFlags,
            yellowFlags,
            greenFlags,
            financingSummary,
            recommendation,
            recommendationReason,
            grade,
        }
    }, [model, synthesis, projectName])

    const [copied, setCopied] = useState(false)

    const handleCopy = useCallback(async () => {
        if (!scorecard) return

        const lines = [
            `DEAL SCORECARD: ${projectName}`,
            '='.repeat(40),
            '',
            `VERDICT: ${scorecard.verdict}`,
            '',
            'KEY METRICS:',
            ...scorecard.metrics.map(m => `  ${m.label}: ${m.value}`),
            '',
            'RISK ASSESSMENT:',
            `  Red flags: ${scorecard.redFlagCount} | Yellow: ${scorecard.yellowFlagCount} | Green: ${scorecard.greenFlagCount}`,
            ...(scorecard.redFlags.length > 0 ? ['  Red Flags:'] : []),
            ...scorecard.redFlags.map(f => `    - ${f}`),
            ...(scorecard.yellowFlags.length > 0 ? ['  Yellow Flags:'] : []),
            ...scorecard.yellowFlags.map(f => `    - ${f}`),
            ...(scorecard.greenFlags.length > 0 ? ['  Green Flags / Strengths:'] : []),
            ...scorecard.greenFlags.map(f => `    - ${f}`),
            '',
            'FINANCING:',
            `  ${scorecard.financingSummary}`,
            '',
            `RECOMMENDATION: ${scorecard.recommendation}`,
            `  ${scorecard.recommendationReason}`,
            '',
            `Grade: ${scorecard.grade}`,
        ]

        if (await copyToClipboard(lines.join('\n'))) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }, [scorecard, projectName])

    if (!scorecard) return null

    const recommendationColors = {
        'Go': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        'Conditional Go': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        'No-Go': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    }

    const activeList =
        selectedRiskCategory === 'red'
            ? scorecard.redFlags
            : selectedRiskCategory === 'yellow'
            ? scorecard.yellowFlags
            : selectedRiskCategory === 'green'
            ? scorecard.greenFlags
            : []

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Deal scorecard</CardTitle>
                        <CardInfoPopover cardId="deal-scorecard" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopy}
                            aria-label="Copy deal scorecard to clipboard"
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                        </button>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Exportable deal scorecard summary. Click any metric to inspect in-place source citations.
                </p>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
                {/* Executive Summary */}
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Executive Summary</p>
                    <p className="text-sm font-semibold text-foreground leading-snug">{scorecard.verdict}</p>
                </div>

                {/* Key Metrics - 2x4 grid */}
                <div>
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Metrics</p>
                        <span className="text-[10px] text-muted-foreground">Click metric for source citation &amp; formula</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {scorecard.metrics.map(m => (
                            <InPlaceEvidencePopover
                                key={m.label}
                                evidence={{
                                    metricName: m.label,
                                    valueFormatted: m.value,
                                    sourceDoc: m.sourceDoc || (m.isDerived ? 'Underwriting Financial Model' : 'VDR Financial Records'),
                                    pageNumber: m.pageNumber,
                                    quoteSnippet: m.quoteSnippet || (m.isDerived ? `Formula calculation: ${m.formula || m.label}` : 'Extracted data point from project VDR.'),
                                    status: m.isDerived ? 'estimated' : 'confirmed',
                                    notes: m.notes,
                                }}
                            >
                                <div className="rounded-xl border border-border/50 bg-muted/40 p-3 text-center hover:border-primary/40 hover:bg-muted/70 transition-all cursor-pointer">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{m.label}</p>
                                    <p className="text-sm sm:text-base font-bold text-foreground underline decoration-dotted decoration-primary/40 underline-offset-4">{m.value}</p>
                                </div>
                            </InPlaceEvidencePopover>
                        ))}
                    </div>
                </div>

                {/* Interactive Risk Assessment */}
                <div className="rounded-xl border border-border/60 bg-background p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Risk Assessment (Click badge to view)</p>
                        <span className="text-[10px] text-muted-foreground">Click any category to filter</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectedRiskCategory(selectedRiskCategory === 'red' ? null : 'red')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                                selectedRiskCategory === 'red'
                                    ? 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/40 ring-1 ring-red-500/30'
                                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                            }`}
                        >
                            <AlertOctagon className="h-3.5 w-3.5 text-red-500" />
                            <span>{scorecard.redFlagCount} red flags</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedRiskCategory(selectedRiskCategory === 'yellow' ? null : 'yellow')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                                selectedRiskCategory === 'yellow'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                            }`}
                        >
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            <span>{scorecard.yellowFlagCount} yellow flags</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedRiskCategory(selectedRiskCategory === 'green' ? null : 'green')}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all border cursor-pointer ${
                                selectedRiskCategory === 'green'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30'
                                    : 'bg-muted/40 text-muted-foreground border-transparent hover:bg-muted'
                            }`}
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span>{scorecard.greenFlagCount} green flags</span>
                        </button>
                    </div>

                    {selectedRiskCategory && activeList.length > 0 && (
                        <div className="space-y-2 border-t border-border/40 pt-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {selectedRiskCategory === 'red' && 'Identified Red Flags & Critical Concerns:'}
                                {selectedRiskCategory === 'yellow' && 'Identified Moderate / Yellow Watch Items:'}
                                {selectedRiskCategory === 'green' && 'Identified Green Flags & Key Strengths:'}
                            </p>
                            <div className="space-y-1.5">
                                {activeList.map((flag, i) => (
                                    <div key={i} className="flex items-start gap-2 rounded-lg bg-muted/30 p-2 border border-border/30">
                                        <span className={`mt-0.5 text-sm font-bold leading-none ${
                                            selectedRiskCategory === 'red' ? 'text-red-500' : selectedRiskCategory === 'yellow' ? 'text-amber-500' : 'text-emerald-500'
                                        }`}>
                                            &#x2022;
                                        </span>
                                        <span className="text-xs sm:text-sm leading-relaxed text-foreground font-medium">{flag}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedRiskCategory && activeList.length === 0 && (
                        <p className="text-xs italic text-muted-foreground border-t border-border/40 pt-2">
                            No {selectedRiskCategory} flags recorded in the current synthesis.
                        </p>
                    )}
                </div>

                {/* Financing Summary */}
                <div className="rounded-xl border border-border/60 bg-background p-4 shadow-sm">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Financing</p>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">{scorecard.financingSummary}</p>
                </div>

                {/* Recommendation */}
                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Recommendation</p>
                        <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">{scorecard.recommendationReason}</p>
                    </div>
                    <span className={`shrink-0 ml-3 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-bold ${recommendationColors[scorecard.recommendation]}`}>
                        {scorecard.recommendation}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
