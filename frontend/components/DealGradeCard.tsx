import { useState } from 'react'
import { Award, ChevronDown, ChevronUp } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import CardInfoPopover from './common/CardInfoPopover'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type Dimension = {
    label: string
    score: number
    maxScore: number
    detail: string
}

function computeGrade(totalScore: number, maxScore: number): { letter: string; color: string; bg: string } {
    const pct = maxScore > 0 ? totalScore / maxScore : 0
    if (pct >= 0.85) return { letter: 'A', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40' }
    if (pct >= 0.70) return { letter: 'B', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' }
    if (pct >= 0.55) return { letter: 'C', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' }
    if (pct >= 0.40) return { letter: 'D', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40' }
    return { letter: 'F', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' }
}

const IMPROVEMENT_TIPS: Record<string, string> = {
    Pricing: 'Negotiate a lower purchase price, or identify add-backs that increase true EBITDA (lowering the effective multiple).',
    Profitability: 'Look for cost-cutting opportunities or undocumented add-backs that would raise margins.',
    Risk: 'Request documentation that addresses red flags. Resolve open questions through management meetings.',
    'Data quality': 'Upload more financial documents (P&L, tax returns, balance sheet) to confirm key figures.',
    Payback: 'Reduce the purchase price, identify revenue growth levers, or reduce post-acquisition capex needs.',
}

export default function DealGradeCard({ model, synthesis }: Props) {
    const [showTips, setShowTips] = useState(false)
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'illustrative') && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = (facts.revenue?.status === 'confirmed' || facts.revenue?.status === 'illustrative') && typeof facts.revenue.value === 'number' ? facts.revenue.value : null
    const price = model.purchasePrice ?? model.askingPrice

    const dimensions: Dimension[] = []

    // Pricing dimension (0-3 points)
    if (price && ebitda && ebitda > 0) {
        const multiple = price / ebitda
        let score = 0
        let detail = ''
        if (multiple <= 3.0) { score = 3; detail = `${multiple.toFixed(1)}x — excellent entry price` }
        else if (multiple <= 4.0) { score = 2; detail = `${multiple.toFixed(1)}x — fair value` }
        else if (multiple <= 5.5) { score = 1; detail = `${multiple.toFixed(1)}x — premium` }
        else { score = 0; detail = `${multiple.toFixed(1)}x — expensive` }
        dimensions.push({ label: 'Pricing', score, maxScore: 3, detail })
    }

    // Profitability dimension (0-3 points)
    if (revenue && ebitda) {
        const margin = ebitda / revenue
        let score = 0
        let detail = ''
        if (margin >= 0.25) { score = 3; detail = `${(margin * 100).toFixed(0)}% margin — strong` }
        else if (margin >= 0.18) { score = 2; detail = `${(margin * 100).toFixed(0)}% margin — adequate` }
        else if (margin >= 0.10) { score = 1; detail = `${(margin * 100).toFixed(0)}% margin — thin` }
        else { score = 0; detail = `${(margin * 100).toFixed(0)}% margin — concerning` }
        dimensions.push({ label: 'Profitability', score, maxScore: 3, detail })
    }

    // Risk dimension (0-3 points based on synthesis flags)
    if (synthesis) {
        const redCount = synthesis.redFlags?.length ?? 0
        const yellowCount = synthesis.yellowFlags?.length ?? 0
        let score = 0
        let detail = ''
        if (redCount === 0 && yellowCount <= 1) { score = 3; detail = 'Minimal flags' }
        else if (redCount <= 1 && yellowCount <= 3) { score = 2; detail = `${redCount} red, ${yellowCount} yellow` }
        else if (redCount <= 3) { score = 1; detail = `${redCount} red flags — investigate` }
        else { score = 0; detail = `${redCount} red flags — high risk` }
        dimensions.push({ label: 'Risk', score, maxScore: 3, detail })
    }

    // Data quality dimension (0-3 points)
    const confirmedCount = Object.values(facts).filter(f => f && f.status === 'confirmed').length
    const docsCount = synthesis?.documentsCompletedCount ?? 0
    {
        let score = 0
        let detail = ''
        if (confirmedCount >= 5 && docsCount >= 3) { score = 3; detail = `${confirmedCount} facts, ${docsCount} docs` }
        else if (confirmedCount >= 3 || docsCount >= 2) { score = 2; detail = `${confirmedCount} facts, ${docsCount} docs` }
        else if (confirmedCount >= 1 || docsCount >= 1) { score = 1; detail = 'Limited data' }
        else { score = 0; detail = 'Insufficient data' }
        dimensions.push({ label: 'Data quality', score, maxScore: 3, detail })
    }

    // Payback dimension (0-3 points)
    if (price && ebitda && ebitda > 0) {
        const taxRate = model.taxRate ?? 0.25
        const annualCash = ebitda * (1 - taxRate) - (model.maintenanceCapex ?? 0)
        if (annualCash > 0) {
            const payback = price / annualCash
            let score = 0
            let detail = ''
            if (payback <= 3) { score = 3; detail = `${payback.toFixed(1)}yr payback — fast` }
            else if (payback <= 4.5) { score = 2; detail = `${payback.toFixed(1)}yr payback — moderate` }
            else if (payback <= 6) { score = 1; detail = `${payback.toFixed(1)}yr payback — slow` }
            else { score = 0; detail = `${payback.toFixed(1)}yr payback — long` }
            dimensions.push({ label: 'Payback', score, maxScore: 3, detail })
        }
    }

    if (dimensions.length < 2) return null

    const totalScore = dimensions.reduce((s, d) => s + d.score, 0)
    const maxScore = dimensions.reduce((s, d) => s + d.maxScore, 0)
    const grade = computeGrade(totalScore, maxScore)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Deal grade</CardTitle>
                </div>
                <CardInfoPopover cardId="deal-grade" />
            </CardHeader>
            <CardContent className="p-5">
                <div className="flex items-start gap-5">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl ${grade.bg}`}>
                        <span className={`text-3xl font-black ${grade.color}`}>{grade.letter}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                        {dimensions.map(d => (
                            <div key={d.label} className="flex items-center gap-2">
                                <span className="w-24 shrink-0 text-xs font-medium text-muted-foreground">{d.label}</span>
                                <div className="flex flex-1 gap-0.5">
                                    {Array.from({ length: d.maxScore }, (_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 flex-1 rounded-sm ${i < d.score ? 'bg-primary' : 'bg-muted'}`}
                                        />
                                    ))}
                                </div>
                                <span className="hidden sm:inline sm:w-40 shrink-0 text-right text-[10px] text-muted-foreground">{d.detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                        {totalScore}/{maxScore} points across {dimensions.length} dimensions. Grade reflects deal attractiveness for a typical SMB buyer.
                    </p>
                    {dimensions.some(d => d.score < d.maxScore) && (
                        <button
                            onClick={() => setShowTips(!showTips)}
                            className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                        >
                            How to improve {showTips ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                    )}
                </div>
                {showTips && (
                    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-border bg-muted/20 p-3">
                        {dimensions.filter(d => d.score < d.maxScore).map(d => (
                            <div key={d.label} className="flex items-start gap-2">
                                <span className="mt-0.5 text-[10px] font-bold text-primary">{d.label}:</span>
                                <span className="text-[11px] text-muted-foreground">{IMPROVEMENT_TIPS[d.label] ?? 'Improve the underlying metrics.'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
