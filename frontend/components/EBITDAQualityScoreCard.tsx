import { useMemo } from 'react'
import { BadgeCheck } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
}

type QualityDimension = {
    name: string
    score: number
    maxScore: number
    status: 'high' | 'medium' | 'low'
    detail: string
}

function getGrade(totalScore: number, maxScore: number): { grade: string; color: string } {
    const pct = totalScore / maxScore
    if (pct >= 0.8) return { grade: 'A', color: 'text-green-600' }
    if (pct >= 0.6) return { grade: 'B', color: 'text-blue-600' }
    if (pct >= 0.4) return { grade: 'C', color: 'text-amber-600' }
    return { grade: 'D', color: 'text-red-600' }
}

function flagsContain(flags: string[], ...keywords: string[]): boolean {
    return flags.some((flag) => {
        const lower = flag.toLowerCase()
        return keywords.some((kw) => lower.includes(kw))
    })
}

export default function EBITDAQualityScoreCard({ model, synthesis }: Props) {
    const analysis = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null

        if (!ebitda || ebitda <= 0) return null

        const margin = revenue && revenue > 0 ? (ebitda / revenue) * 100 : null
        const revenueGrowth = model.baseRevenueGrowth ?? 0.05

        const redFlags = synthesis?.redFlags ?? []
        const yellowFlags = synthesis?.yellowFlags ?? []
        const greenFlags = synthesis?.greenFlags ?? []

        const dimensions: QualityDimension[] = []

        // 1. Margin sustainability
        if (margin !== null) {
            let score: number
            let status: 'high' | 'medium' | 'low'
            let detail: string
            if (margin >= 20) {
                score = 3
                status = 'high'
                detail = `${margin.toFixed(1)}% margin - healthy and sustainable`
            } else if (margin >= 10) {
                score = 2
                status = 'medium'
                detail = `${margin.toFixed(1)}% margin - adequate but limited buffer`
            } else {
                score = 1
                status = 'low'
                detail = `${margin.toFixed(1)}% margin - thin and vulnerable to cost pressure`
            }
            dimensions.push({ name: 'Margin sustainability', score, maxScore: 3, status, detail })
        } else {
            dimensions.push({
                name: 'Margin sustainability',
                score: 1,
                maxScore: 3,
                status: 'low',
                detail: 'Revenue not available to assess margin',
            })
        }

        // 2. Revenue diversity
        const hasConcentrationRisk = flagsContain(
            [...redFlags, ...yellowFlags],
            'concentration', 'customer', 'client', 'single source'
        )
        dimensions.push({
            name: 'Revenue diversity',
            score: hasConcentrationRisk ? 1 : 3,
            maxScore: 3,
            status: hasConcentrationRisk ? 'low' : 'high',
            detail: hasConcentrationRisk
                ? 'Concentration risk flagged in due diligence findings'
                : 'No concentration concerns identified',
        })

        // 3. Add-back transparency
        const hasAddBackConcerns = flagsContain(
            [...redFlags, ...yellowFlags, ...greenFlags],
            'add-back', 'add back', 'addback', 'adjustment'
        )
        const addBackPositive = flagsContain(greenFlags, 'add-back', 'add back', 'addback')
        const addBackNegative = flagsContain([...redFlags, ...yellowFlags], 'add-back', 'add back', 'addback')
        let addBackScore: number
        let addBackStatus: 'high' | 'medium' | 'low'
        let addBackDetail: string
        if (!hasAddBackConcerns) {
            addBackScore = 2
            addBackStatus = 'medium'
            addBackDetail = 'No add-back information available in findings'
        } else if (addBackNegative) {
            addBackScore = 1
            addBackStatus = 'low'
            addBackDetail = 'Add-back concerns flagged - may inflate reported EBITDA'
        } else if (addBackPositive) {
            addBackScore = 3
            addBackStatus = 'high'
            addBackDetail = 'Add-backs appear well-documented and supported'
        } else {
            addBackScore = 2
            addBackStatus = 'medium'
            addBackDetail = 'Add-backs mentioned but quality unclear'
        }
        dimensions.push({
            name: 'Add-back transparency',
            score: addBackScore,
            maxScore: 3,
            status: addBackStatus,
            detail: addBackDetail,
        })

        // 4. Recurring revenue signals
        const hasRecurring = flagsContain(greenFlags, 'recurring', 'subscription', 'contract', 'retainer')
        const hasOneTime = flagsContain([...redFlags, ...yellowFlags], 'one-time', 'non-recurring', 'project-based')
        let recurringScore: number
        let recurringStatus: 'high' | 'medium' | 'low'
        let recurringDetail: string
        if (hasRecurring && !hasOneTime) {
            recurringScore = 3
            recurringStatus = 'high'
            recurringDetail = 'Recurring or subscription revenue signals found'
        } else if (hasOneTime) {
            recurringScore = 1
            recurringStatus = 'low'
            recurringDetail = 'Revenue may include significant one-time or non-recurring items'
        } else {
            recurringScore = 2
            recurringStatus = 'medium'
            recurringDetail = 'No strong recurring revenue signals identified'
        }
        dimensions.push({
            name: 'Recurring revenue signals',
            score: recurringScore,
            maxScore: 3,
            status: recurringStatus,
            detail: recurringDetail,
        })

        // 5. Growth trajectory
        let growthScore: number
        let growthStatus: 'high' | 'medium' | 'low'
        let growthDetail: string
        if (revenueGrowth > 0.05) {
            growthScore = 3
            growthStatus = 'high'
            growthDetail = `${(revenueGrowth * 100).toFixed(1)}% growth - strong positive trajectory`
        } else if (revenueGrowth >= 0) {
            growthScore = 2
            growthStatus = 'medium'
            growthDetail = `${(revenueGrowth * 100).toFixed(1)}% growth - stable but modest`
        } else {
            growthScore = 1
            growthStatus = 'low'
            growthDetail = `${(revenueGrowth * 100).toFixed(1)}% growth - declining revenue is a concern`
        }
        dimensions.push({
            name: 'Growth trajectory',
            score: growthScore,
            maxScore: 3,
            status: growthStatus,
            detail: growthDetail,
        })

        const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)
        const maxScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0)
        const { grade, color } = getGrade(totalScore, maxScore)

        return { dimensions, totalScore, maxScore, grade, gradeColor: color }
    }, [model, synthesis])

    if (!analysis) return null

    const statusColors = {
        high: 'bg-green-500',
        medium: 'bg-amber-500',
        low: 'bg-red-500',
    }

    const statusLabels = {
        high: 'Strong',
        medium: 'Moderate',
        low: 'Weak',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">EBITDA quality score</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    EBITDA quality assessment
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Overall grade */}
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-4">
                    <div>
                        <div className="text-xs text-muted-foreground">Overall EBITDA Quality</div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                            {analysis.totalScore}/{analysis.maxScore} points
                        </div>
                    </div>
                    <div className={`text-4xl font-bold ${analysis.gradeColor}`}>
                        {analysis.grade}
                    </div>
                </div>

                {/* Per-dimension progress bars */}
                <div className="space-y-3">
                    {analysis.dimensions.map((dim) => (
                        <div key={dim.name}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-foreground">{dim.name}</span>
                                <span className={`text-[10px] font-medium ${
                                    dim.status === 'high' ? 'text-green-600' :
                                    dim.status === 'medium' ? 'text-amber-600' :
                                    'text-red-600'
                                }`}>
                                    {statusLabels[dim.status]}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${statusColors[dim.status]}`}
                                    style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {dim.detail}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Explanation section */}
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-foreground">What impacts quality score</p>
                    <ul className="text-[10px] text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Sustainable margins above 20% signal pricing power and operational efficiency</li>
                        <li>Diversified revenue base reduces single-point-of-failure risk</li>
                        <li>Well-documented add-backs increase confidence in true earnings</li>
                        <li>Recurring revenue provides predictability for debt service</li>
                        <li>Positive growth trajectory supports exit valuation assumptions</li>
                    </ul>
                </div>
            </CardContent>
        </Card>
    )
}
