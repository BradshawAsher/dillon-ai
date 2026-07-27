import { useMemo } from 'react'
import { Target } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type ScoreDimension = {
    label: string
    score: number
    color: string
    detail: string
}

function CircleScore({ score, size, color, label }: { score: number; size: number; color: string; label: string }) {
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (score / 100) * circumference

    return (
        <div className="flex flex-col items-center gap-1.5">
            <svg width={size} height={size} className="rotate-[-90deg]">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={4}
                    className="text-muted/30"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={4}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <div className="absolute flex items-center justify-center" style={{ width: size, height: size }}>
                <span className="text-lg font-bold text-foreground">{score}</span>
            </div>
            <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
        </div>
    )
}

export default function DealAnalysisScoresCard({ model, synthesis }: Props) {
    const scores = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const redCount = synthesis?.redFlags?.length ?? 0
        const yellowCount = synthesis?.yellowFlags?.length ?? 0
        const greenCount = synthesis?.greenFlags?.length ?? 0

        const dims: ScoreDimension[] = []

        // Valuation score (0-100) — how attractive is the entry price
        let valuationScore = 50
        if (price && ebitda && ebitda > 0) {
            const mult = price / ebitda
            if (mult <= 2.5) valuationScore = 95
            else if (mult <= 3.0) valuationScore = 85
            else if (mult <= 3.5) valuationScore = 75
            else if (mult <= 4.0) valuationScore = 65
            else if (mult <= 5.0) valuationScore = 50
            else if (mult <= 6.0) valuationScore = 35
            else valuationScore = 20
        }
        dims.push({ label: 'Valuation', score: valuationScore, color: valuationScore >= 65 ? '#22c55e' : valuationScore >= 45 ? '#eab308' : '#ef4444', detail: 'Entry price attractiveness' })

        // Cash flow score
        let cashFlowScore = 50
        if (revenue && ebitda) {
            const margin = ebitda / revenue
            if (margin >= 0.30) cashFlowScore = 92
            else if (margin >= 0.25) cashFlowScore = 80
            else if (margin >= 0.20) cashFlowScore = 68
            else if (margin >= 0.15) cashFlowScore = 55
            else if (margin >= 0.10) cashFlowScore = 40
            else cashFlowScore = 25
        }
        dims.push({ label: 'Cash Flow', score: cashFlowScore, color: cashFlowScore >= 65 ? '#22c55e' : cashFlowScore >= 45 ? '#eab308' : '#ef4444', detail: 'Margin and cash generation' })

        // Risk score (inverted — fewer flags = higher score)
        let riskScore = 80
        if (synthesis) {
            const totalNeg = redCount * 3 + yellowCount
            if (totalNeg === 0) riskScore = 95
            else if (totalNeg <= 2) riskScore = 80
            else if (totalNeg <= 5) riskScore = 60
            else if (totalNeg <= 8) riskScore = 40
            else riskScore = 20
        }
        dims.push({ label: 'Risk', score: riskScore, color: riskScore >= 65 ? '#22c55e' : riskScore >= 45 ? '#eab308' : '#ef4444', detail: 'Lower flags = higher score' })

        // Growth score
        let growthScore = 50
        if (model.baseRevenueGrowth) {
            const g = model.baseRevenueGrowth
            if (g >= 0.15) growthScore = 90
            else if (g >= 0.10) growthScore = 75
            else if (g >= 0.05) growthScore = 60
            else if (g >= 0.02) growthScore = 45
            else growthScore = 30
        } else if (greenCount > 0) {
            growthScore = 55 + Math.min(greenCount * 5, 25)
        }
        dims.push({ label: 'Growth', score: growthScore, color: growthScore >= 65 ? '#22c55e' : growthScore >= 45 ? '#eab308' : '#ef4444', detail: 'Revenue growth outlook' })

        // Overall score — weighted average
        const overall = Math.round(valuationScore * 0.30 + cashFlowScore * 0.25 + riskScore * 0.25 + growthScore * 0.20)

        return { dims, overall }
    }, [model, synthesis])

    const overallColor = scores.overall >= 70 ? '#22c55e' : scores.overall >= 50 ? '#eab308' : '#ef4444'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Deal analysis scores</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center">
                    {/* Overall large circle */}
                    <div className="relative flex flex-col items-center">
                        <svg width={100} height={100} className="rotate-[-90deg]">
                            <circle cx={50} cy={50} r={42} fill="none" stroke="currentColor" strokeWidth={6} className="text-muted/30" />
                            <circle cx={50} cy={50} r={42} fill="none" stroke={overallColor} strokeWidth={6} strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 - (scores.overall / 100) * 2 * Math.PI * 42} strokeLinecap="round" className="transition-all duration-700" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-black text-foreground">{scores.overall}</span>
                        </div>
                        <span className="mt-1.5 text-xs font-semibold text-muted-foreground">Overall</span>
                    </div>

                    {/* Sub-dimension circles */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        {scores.dims.map(d => (
                            <div key={d.label} className="relative flex flex-col items-center" title={d.detail}>
                                <CircleScore score={d.score} size={64} color={d.color} label={d.label} />
                            </div>
                        ))}
                    </div>
                </div>
                <p className="mt-4 text-center text-[10px] text-muted-foreground">
                    Weighted: Valuation 30% · Cash Flow 25% · Risk 25% · Growth 20%
                </p>
            </CardContent>
        </Card>
    )
}
