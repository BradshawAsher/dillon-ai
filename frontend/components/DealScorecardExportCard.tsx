import { useMemo, useCallback } from 'react'
import { Award } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
}

type ScorecardData = {
    verdict: string
    metrics: { label: string; value: string }[]
    redFlagCount: number
    yellowFlagCount: number
    greenFlagCount: number
    topRedFlags: string[]
    financingSummary: string
    recommendation: 'Go' | 'Conditional Go' | 'No-Go'
    recommendationReason: string
    grade: string
}

export default function DealScorecardExportCard({ model, synthesis, projectName }: Props) {
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

        const metrics: { label: string; value: string }[] = [
            { label: 'Purchase price', value: `$${Math.round(price).toLocaleString()}` },
            { label: 'EBITDA/SDE', value: `$${Math.round(ebitda).toLocaleString()}` },
            { label: 'Multiple', value: `${multiple.toFixed(1)}x` },
            { label: 'Margin', value: `${(margin * 100).toFixed(0)}%` },
            { label: 'Revenue growth', value: `${(growth * 100).toFixed(1)}%` },
            { label: 'Payback', value: payback > 0 ? `${payback.toFixed(1)} yrs` : 'N/A' },
            { label: 'Projected MOIC', value: `${moic.toFixed(1)}x` },
            { label: 'Hold period', value: `${holdYears} yrs` },
        ]

        // Risk assessment
        const redFlags = synthesis?.redFlags ?? []
        const yellowFlags = synthesis?.yellowFlags ?? []
        const greenFlags = synthesis?.greenFlags ?? []
        const topRedFlags = redFlags.slice(0, 3)

        // Financing summary
        const equityPct = model.equityContributionPercent ?? 25
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

        // Executive summary verdict
        const verdict = `${projectName}: ${multiple.toFixed(1)}x EBITDA, ${(margin * 100).toFixed(0)}% margins, ${redFlags.length} red flags — ${recommendation}`

        return {
            verdict,
            metrics,
            redFlagCount: redFlags.length,
            yellowFlagCount: yellowFlags.length,
            greenFlagCount: greenFlags.length,
            topRedFlags,
            financingSummary,
            recommendation,
            recommendationReason,
            grade,
        }
    }, [model, synthesis, projectName])

    const copyToClipboard = useCallback(() => {
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
            ...(scorecard.topRedFlags.length > 0 ? ['  Top concerns:'] : []),
            ...scorecard.topRedFlags.map(f => `    - ${f}`),
            '',
            'FINANCING:',
            `  ${scorecard.financingSummary}`,
            '',
            `RECOMMENDATION: ${scorecard.recommendation}`,
            `  ${scorecard.recommendationReason}`,
            '',
            `Grade: ${scorecard.grade}`,
        ]

        navigator.clipboard.writeText(lines.join('\n'))
    }, [scorecard, projectName])

    if (!scorecard) return null

    const recommendationColors = {
        'Go': 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        'Conditional Go': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        'No-Go': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Deal scorecard</CardTitle>
                    </div>
                    <button
                        onClick={copyToClipboard}
                        className="rounded-md border border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                        Copy to Clipboard
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Exportable deal scorecard
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Executive Summary */}
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Executive Summary</p>
                    <p className="text-xs text-foreground font-medium">{scorecard.verdict}</p>
                </div>

                {/* Key Metrics - 2x4 grid */}
                <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Key Metrics</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {scorecard.metrics.map(m => (
                            <div key={m.label} className="rounded-lg bg-muted/50 p-2 text-center">
                                <p className="text-[9px] text-muted-foreground">{m.label}</p>
                                <p className="text-xs font-bold text-foreground">{m.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk Assessment */}
                <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Risk Assessment</p>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-[11px] font-medium text-red-600 dark:text-red-400">{scorecard.redFlagCount} red</span>
                        <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">{scorecard.yellowFlagCount} yellow</span>
                        <span className="text-[11px] font-medium text-green-600 dark:text-green-400">{scorecard.greenFlagCount} green</span>
                    </div>
                    {scorecard.topRedFlags.length > 0 && (
                        <div className="space-y-1">
                            {scorecard.topRedFlags.map((flag, i) => (
                                <div key={i} className="flex items-start gap-1.5">
                                    <span className="mt-0.5 text-[10px] text-red-500">&#x2022;</span>
                                    <span className="text-[11px] text-foreground">{flag}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Financing Summary */}
                <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Financing</p>
                    <p className="text-[11px] text-foreground">{scorecard.financingSummary}</p>
                </div>

                {/* Recommendation */}
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Recommendation</p>
                        <p className="text-[10px] text-muted-foreground">{scorecard.recommendationReason}</p>
                    </div>
                    <span className={`shrink-0 ml-3 rounded-md px-2.5 py-1.5 text-xs font-bold ${recommendationColors[scorecard.recommendation]}`}>
                        {scorecard.recommendation}
                    </span>
                </div>
            </CardContent>
        </Card>
    )
}
