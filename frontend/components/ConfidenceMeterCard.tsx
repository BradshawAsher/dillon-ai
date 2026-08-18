import { useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documents: SubmissionHistoryItem[]
}

type Dimension = {
    label: string
    score: number
    maxScore: number
    detail: string
}

export default function ConfidenceMeterCard({ model, synthesis, documents }: Props) {
    const dimensions = useMemo(() => {
        const dims: Dimension[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const completedDocs = documents.filter(d => d.status === 'completed')

        // Data volume
        const docScore = Math.min(completedDocs.length, 5)
        dims.push({ label: 'Data volume', score: docScore, maxScore: 5, detail: `${completedDocs.length} documents analyzed` })

        // Financial confirmation
        let finScore = 0
        if (facts.revenue?.status === 'confirmed') finScore++
        if (facts.ebitda_sde?.status === 'confirmed') finScore++
        if (facts.gross_profit?.value != null) finScore++
        if (facts.total_debt?.value != null || facts.total_assets?.value != null) finScore++
        dims.push({ label: 'Financial data', score: finScore, maxScore: 4, detail: `${finScore}/4 core metrics confirmed` })

        // AI synthesis quality
        let synthScore = 0
        if (synthesis) {
            synthScore++
            if (synthesis.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0') synthScore++
            if (synthesis.aiConfidence && parseFloat(synthesis.aiConfidence) > 0.5) synthScore++
            if (synthesis.documentsCompletedCount >= 2) synthScore++
        }
        dims.push({ label: 'AI synthesis', score: synthScore, maxScore: 4, detail: synthesis ? `Confidence: ${synthesis.aiConfidence ? Math.round(parseFloat(synthesis.aiConfidence) * 100) + '%' : 'N/A'}` : 'Pending' })

        // Deal model completeness
        let modelScore = 0
        if (model.purchasePrice ?? model.askingPrice) modelScore++
        if (model.holdPeriodYears) modelScore++
        if (model.exitMultiple) modelScore++
        if (model.baseRevenueGrowth != null) modelScore++
        if (model.equityContributionPercent != null) modelScore++
        dims.push({ label: 'Model inputs', score: modelScore, maxScore: 5, detail: `${modelScore}/5 assumptions configured` })

        return dims
    }, [model, synthesis, documents])

    const totalScore = dimensions.reduce((sum, d) => sum + d.score, 0)
    const totalMax = dimensions.reduce((sum, d) => sum + d.maxScore, 0)
    const pct = Math.round((totalScore / totalMax) * 100)

    const level = pct >= 75 ? 'High' : pct >= 50 ? 'Medium' : pct >= 25 ? 'Low' : 'Very low'
    const levelColor = pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'
    const ringColor = pct >= 75 ? 'stroke-green-500' : pct >= 50 ? 'stroke-amber-500' : 'stroke-red-500'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Analysis confidence</CardTitle>
                </div>
                <CardInfoPopover cardId="confidence-meter" />
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex items-center gap-6">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                className="stroke-muted"
                                strokeWidth="3"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                className={ringColor}
                                strokeWidth="3"
                                strokeDasharray={`${pct}, 100`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="text-center">
                            <p className={`text-lg font-bold ${levelColor}`}>{pct}%</p>
                            <p className="text-[9px] text-muted-foreground">{level}</p>
                        </div>
                    </div>
                    <div className="flex-1 space-y-2">
                        {dimensions.map(dim => (
                            <div key={dim.label}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-foreground">{dim.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{dim.detail}</span>
                                </div>
                                <div className="mt-0.5 h-1.5 w-full rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-primary/70 transition-all"
                                        style={{ width: `${(dim.score / dim.maxScore) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
