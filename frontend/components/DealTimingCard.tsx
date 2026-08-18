import { useMemo } from 'react'
import { Calendar } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
}

type TimingAnalysis = {
    bestMonthToClose: string
    bestMonthReason: string
    daysUntilQuarterEnd: number
    nextQuarterEnd: string
    workingCapitalAdjustment: string
    taxYearRecommendation: 'before' | 'after'
    taxYearReason: string
    holdPeriodYears: number
    taxRate: number
}

export default function DealTimingCard({ model }: Props) {
    const analysis = useMemo((): TimingAnalysis | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null

        if (!revenue && !ebitda) return null

        const holdPeriodYears = model.holdPeriodYears ?? 5
        const taxRate = model.taxRate ?? 0.25

        // Calendar year alignment (default fiscal year)
        const now = new Date()
        const currentMonth = now.getMonth() // 0-indexed
        const currentYear = now.getFullYear()

        // Calculate days until next quarter end
        const quarterEnds = [
            new Date(currentYear, 2, 31),  // March 31
            new Date(currentYear, 5, 30),  // June 30
            new Date(currentYear, 8, 30),  // September 30
            new Date(currentYear, 11, 31), // December 31
        ]

        // Find the next quarter end from today
        let nextQuarterEnd = quarterEnds.find((d) => d > now)
        if (!nextQuarterEnd) {
            nextQuarterEnd = new Date(currentYear + 1, 2, 31)
        }

        const daysUntilQuarterEnd = Math.ceil(
            (nextQuarterEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        const quarterEndLabel = nextQuarterEnd.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })

        let bestMonth: number
        let bestMonthReason: string

        if (currentMonth >= 9) {
            // Q4: recommend January for clean calendar year start
            bestMonth = 0
            bestMonthReason = 'Aligns with calendar year start for clean annual reporting'
        } else if (currentMonth <= 2) {
            // Q1: close now to capture full fiscal year
            bestMonth = currentMonth
            bestMonthReason = 'Close now to capture maximum fiscal year benefit'
        } else {
            // Q2/Q3: recommend start of next quarter
            const nextQuarterStart = [3, 6, 9, 0]
            bestMonth = nextQuarterStart.find((m) => m > currentMonth) ?? 0
            bestMonthReason = 'Aligns with quarter start for clean interim reporting'
        }

        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December',
        ]

        // Working capital seasonal adjustment
        // Recommend closing during low working capital months (typically Q1)
        let workingCapitalAdjustment: string
        if (currentMonth >= 0 && currentMonth <= 2) {
            workingCapitalAdjustment = 'Favorable: Q1 typically has lower working capital needs, reducing purchase price adjustments'
        } else if (currentMonth >= 3 && currentMonth <= 5) {
            workingCapitalAdjustment = 'Moderate: Q2 working capital may be elevated from seasonal buildup — negotiate a peg based on trailing 12-month average'
        } else if (currentMonth >= 6 && currentMonth <= 8) {
            workingCapitalAdjustment = 'Caution: Q3 often has peak inventory and receivables — consider a working capital collar in the SPA'
        } else {
            workingCapitalAdjustment = 'Mixed: Q4 collections may reduce receivables but holiday buildup can inflate inventory — use a normalized peg'
        }

        // Tax year optimization
        // If taxRate is high and we're late in the year, close after year-end to defer
        // If holdPeriodYears is long, close before year-end to start depreciation sooner
        let taxYearRecommendation: 'before' | 'after'
        let taxYearReason: string

        if (taxRate > 0.30 && currentMonth >= 8) {
            taxYearRecommendation = 'after'
            taxYearReason = `High tax rate (${(taxRate * 100).toFixed(0)}%) favors deferring acquisition costs to the new tax year`
        } else if (holdPeriodYears >= 5) {
            taxYearRecommendation = 'before'
            taxYearReason = `${holdPeriodYears}-year hold period benefits from starting depreciation and amortization deductions sooner`
        } else if (currentMonth >= 10) {
            taxYearRecommendation = 'after'
            taxYearReason = 'Late-year close risks partial-year complications; deferring simplifies first-year reporting'
        } else {
            taxYearRecommendation = 'before'
            taxYearReason = 'Earlier close maximizes time for value creation within the hold period'
        }

        return {
            bestMonthToClose: monthNames[bestMonth],
            bestMonthReason,
            daysUntilQuarterEnd,
            nextQuarterEnd: quarterEndLabel,
            workingCapitalAdjustment,
            taxYearRecommendation,
            taxYearReason,
            holdPeriodYears,
            taxRate,
        }
    }, [model])

    if (!analysis) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Deal timing</CardTitle>
                    <CardInfoPopover cardId="deal-timing" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Optimal close timing based on fiscal alignment and tax planning
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                {/* Best month to close */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">Best month to close</span>
                        <span className="text-sm font-bold text-primary">{analysis.bestMonthToClose}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{analysis.bestMonthReason}</p>
                </div>

                {/* Days until quarter end */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                        <div className="text-[10px] text-muted-foreground">Days until quarter end</div>
                        <div className="text-lg font-bold text-foreground">{analysis.daysUntilQuarterEnd}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Next quarter end</div>
                        <div className="text-xs font-medium text-foreground">{analysis.nextQuarterEnd}</div>
                    </div>
                </div>

                {/* Working capital adjustment */}
                <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-[10px] font-medium text-foreground mb-1">Working capital seasonal adjustment</div>
                    <p className="text-[10px] text-muted-foreground">{analysis.workingCapitalAdjustment}</p>
                </div>

                {/* Tax year recommendation */}
                <div className={`rounded-lg border p-3 ${
                    analysis.taxYearRecommendation === 'before'
                        ? 'border-green-200 bg-green-50'
                        : 'border-amber-200 bg-amber-50'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${
                            analysis.taxYearRecommendation === 'before' ? 'text-green-700' : 'text-amber-700'
                        }`}>
                            Close {analysis.taxYearRecommendation} year-end
                        </span>
                    </div>
                    <p className={`text-[10px] mt-1 ${
                        analysis.taxYearRecommendation === 'before' ? 'text-green-600' : 'text-amber-600'
                    }`}>
                        {analysis.taxYearReason}
                    </p>
                </div>

                {/* Model parameters */}
                <div className="flex gap-3 text-[9px] text-muted-foreground">
                    <span>Hold period: {analysis.holdPeriodYears}yr</span>
                    <span>Tax rate: {(analysis.taxRate * 100).toFixed(0)}%</span>
                </div>
            </CardContent>
        </Card>
    )
}
