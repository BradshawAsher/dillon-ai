import { Shield, TrendingUp, FileSearch, AlertTriangle } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'
import type { ImpactMetrics } from '../utils/impactMetrics'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    impact: ImpactMetrics
    documentsCount: number
}

type ScoreDimension = {
    label: string
    score: number
    maxScore: number
    icon: React.ReactNode
}

export default function DealScorecard({ model, synthesis, impact, documentsCount }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const confirmedFacts = Object.values(facts).filter(f => f?.status === 'confirmed' && typeof f?.value === 'number').length

    const dimensions: ScoreDimension[] = []

    // Data completeness (0-25)
    const dataScore = Math.min(25, Math.round((confirmedFacts / 5) * 25))
    dimensions.push({ label: 'Data', score: dataScore, maxScore: 25, icon: <FileSearch className="h-4 w-4" /> })

    // Document coverage (0-25)
    const docScore = documentsCount === 0 ? 0 : Math.min(25, Math.round((impact.completedDocuments / documentsCount) * 25))
    dimensions.push({ label: 'Coverage', score: docScore, maxScore: 25, icon: <Shield className="h-4 w-4" /> })

    // Risk assessment (0-25)
    let riskScore = 12
    if (synthesis) {
        const level = synthesis.finalRiskLevel.trim().toLowerCase()
        riskScore = level === 'low' ? 25 : level === 'medium' ? 18 : level === 'high' ? 8 : 4
    }
    dimensions.push({ label: 'Risk', score: riskScore, maxScore: 25, icon: <AlertTriangle className="h-4 w-4" /> })

    // Model readiness (0-25)
    const hasPrice = model.askingPrice !== null || model.purchasePrice !== null
    const hasExit = model.exitMultiple !== null
    const hasHold = model.holdPeriodYears !== null
    const hasSynthesis = !!synthesis
    const modelScore = [hasPrice, hasExit, hasHold, hasSynthesis, confirmedFacts >= 2].filter(Boolean).length * 5
    dimensions.push({ label: 'Model', score: modelScore, maxScore: 25, icon: <TrendingUp className="h-4 w-4" /> })

    const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)
    const grade = totalScore >= 85 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 50 ? 'C' : totalScore >= 30 ? 'D' : 'F'
    const gradeColor = totalScore >= 85 ? 'text-green-500' : totalScore >= 70 ? 'text-primary' : totalScore >= 50 ? 'text-amber-500' : 'text-destructive'

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
                        <span className={`text-2xl font-bold ${gradeColor}`}>{grade}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-baseline gap-2">
                            <p className="text-sm font-semibold text-foreground">Deal readiness score</p>
                            <span className="text-xs text-muted-foreground">{totalScore}/100</span>
                        </div>
                        <div className="mt-2 flex gap-3">
                            {dimensions.map(d => (
                                <div key={d.label} className="flex items-center gap-1.5">
                                    <span className="text-muted-foreground">{d.icon}</span>
                                    <div className="w-12">
                                        <div className="h-1.5 rounded-full bg-muted">
                                            <div
                                                className="h-1.5 rounded-full bg-primary transition-all"
                                                style={{ width: `${(d.score / d.maxScore) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{d.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
