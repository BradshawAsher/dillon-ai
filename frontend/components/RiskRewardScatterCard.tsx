import { useMemo } from 'react'
import { Target } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
}

type ScatterData = {
    riskScore: number
    rewardScore: number
    quadrant: string
    quadrantColor: string
    moic: number
}

export default function RiskRewardScatterCard({ model, synthesis }: Props) {
    const data = useMemo((): ScatterData | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || price <= 0) return null
        if (!ebitda && !revenue) return null

        // Risk score: based on red and yellow flags
        const redCount = synthesis?.redFlags?.length ?? 0
        const yellowCount = synthesis?.yellowFlags?.length ?? 0
        const riskScore = Math.min(100, redCount * 15 + yellowCount * 5)

        // Reward score: based on projected MOIC
        const rev = revenue ?? (ebitda ? ebitda / (model.baseEbitdaMargin ?? 0.20) : 0)
        const ebit = ebitda ?? rev * (model.baseEbitdaMargin ?? 0.20)
        const growthRate = model.baseRevenueGrowth ?? 0.05
        const ebitdaMargin = model.baseEbitdaMargin ?? 0.20
        const exitMult = model.exitMultiple ?? 4.0
        const holdPeriod = model.holdPeriodYears ?? 5
        const taxRate = model.taxRate ?? 0.25
        const fees = model.transactionFees ?? 0

        const initial = price + fees
        const yearlyRevenue = Array.from({ length: holdPeriod }, (_, y) => rev * (1 + growthRate) ** (y + 1))
        const yearlyOcf = yearlyRevenue.map(r => r * ebitdaMargin * (1 - taxRate))
        const exitEbitda = yearlyRevenue[holdPeriod - 1] * ebitdaMargin
        const exitProceeds = exitEbitda * exitMult
        const totalReturn = yearlyOcf.reduce((sum, cf) => sum + cf, 0) + exitProceeds
        const moic = initial > 0 ? totalReturn / initial : 0

        // Convert MOIC to reward score: 1x=20, 2x=50, 3x=75, 4x+=100
        let rewardScore: number
        if (moic <= 1) {
            rewardScore = moic * 20
        } else if (moic <= 2) {
            rewardScore = 20 + (moic - 1) * 30
        } else if (moic <= 3) {
            rewardScore = 50 + (moic - 2) * 25
        } else if (moic <= 4) {
            rewardScore = 75 + (moic - 3) * 25
        } else {
            rewardScore = 100
        }
        rewardScore = Math.min(100, Math.max(0, rewardScore))

        // Determine quadrant
        const highRisk = riskScore >= 50
        const highReward = rewardScore >= 50

        let quadrant: string
        let quadrantColor: string
        if (!highRisk && highReward) {
            quadrant = 'Sweet Spot'
            quadrantColor = 'text-green-600 dark:text-green-400'
        } else if (highRisk && highReward) {
            quadrant = 'High Roller'
            quadrantColor = 'text-amber-600 dark:text-amber-400'
        } else if (!highRisk && !highReward) {
            quadrant = 'Safe Harbor'
            quadrantColor = 'text-blue-600 dark:text-blue-400'
        } else {
            quadrant = 'Danger Zone'
            quadrantColor = 'text-red-600 dark:text-red-400'
        }

        return { riskScore, rewardScore, quadrant, quadrantColor, moic }
    }, [model, synthesis])

    if (!data) return null

    // Dot position (CSS percentage based)
    const dotLeft = data.riskScore
    const dotBottom = data.rewardScore

    // Dot color based on quadrant
    const dotColor = data.quadrant === 'Sweet Spot'
        ? 'bg-green-500'
        : data.quadrant === 'High Roller'
            ? 'bg-amber-500'
            : data.quadrant === 'Safe Harbor'
                ? 'bg-blue-500'
                : 'bg-red-500'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Risk vs Reward positioning</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Deal plotted on risk/reward grid ({data.moic.toFixed(1)}x projected MOIC)
                </p>
            </CardHeader>
            <CardContent className="p-4">
                {/* Chart area */}
                <div className="relative w-full aspect-square max-w-[280px] mx-auto border border-border rounded-lg overflow-hidden">
                    {/* Quadrant backgrounds */}
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                        {/* Top-left: Sweet Spot (low risk, high reward) */}
                        <div className="bg-green-50 dark:bg-green-950/20 border-r border-b border-border/50 flex items-center justify-center">
                            <span className="text-[9px] font-medium text-green-600/60 dark:text-green-400/60 text-center px-1">Sweet Spot</span>
                        </div>
                        {/* Top-right: High Roller (high risk, high reward) */}
                        <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-border/50 flex items-center justify-center">
                            <span className="text-[9px] font-medium text-amber-600/60 dark:text-amber-400/60 text-center px-1">High Roller</span>
                        </div>
                        {/* Bottom-left: Safe Harbor (low risk, low reward) */}
                        <div className="bg-blue-50 dark:bg-blue-950/20 border-r border-border/50 flex items-center justify-center">
                            <span className="text-[9px] font-medium text-blue-600/60 dark:text-blue-400/60 text-center px-1">Safe Harbor</span>
                        </div>
                        {/* Bottom-right: Danger Zone (high risk, low reward) */}
                        <div className="bg-red-50 dark:bg-red-950/20 flex items-center justify-center">
                            <span className="text-[9px] font-medium text-red-600/60 dark:text-red-400/60 text-center px-1">Danger Zone</span>
                        </div>
                    </div>

                    {/* Deal dot */}
                    <div
                        className="absolute z-10"
                        style={{
                            left: `${dotLeft}%`,
                            bottom: `${dotBottom}%`,
                            transform: 'translate(-50%, 50%)',
                        }}
                    >
                        <div className={`h-4 w-4 rounded-full ${dotColor} ring-2 ring-white dark:ring-gray-900 shadow-md`} />
                    </div>

                    {/* Axis labels */}
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground font-medium">
                        Risk Score →
                    </div>
                    <div className="absolute left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[8px] text-muted-foreground font-medium whitespace-nowrap">
                        Reward Score →
                    </div>
                </div>

                {/* Deal position summary */}
                <div className="mt-3 rounded-lg bg-muted/50 p-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className={`text-sm font-bold ${data.quadrantColor}`}>{data.quadrant}</span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                Risk: {data.riskScore}/100 | Reward: {Math.round(data.rewardScore)}/100
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-mono text-foreground">{data.moic.toFixed(2)}x MOIC</div>
                            {synthesis && (
                                <div className="text-[10px] text-muted-foreground">
                                    {synthesis.redFlags.length} red, {synthesis.yellowFlags.length} yellow flags
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
