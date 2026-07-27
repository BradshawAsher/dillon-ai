import { useMemo } from 'react'
import { LogOut } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
}

type ReadinessItem = {
    label: string
    status: 'ready' | 'partial' | 'not-ready'
    detail: string
}

export default function ExitReadinessCard({ model, synthesis }: Props) {
    const items = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda) return null

        const holdYears = model.holdPeriodYears ?? 5
        const exitMult = model.exitMultiple ?? (price / ebitda)
        const growth = model.baseRevenueGrowth ?? 0.05
        const margin = model.baseEbitdaMargin ?? (revenue && revenue > 0 ? ebitda / revenue : 0.20)

        const futureRevenue = (revenue ?? ebitda / margin) * Math.pow(1 + growth, holdYears)
        const futureEbitda = futureRevenue * margin
        const exitEV = futureEbitda * exitMult
        const totalInvestment = price + (model.transactionFees ?? 0) + (model.workingCapitalRequirement ?? 0)
        const moic = exitEV / totalInvestment

        const result: ReadinessItem[] = []

        result.push({
            label: 'Growth trajectory',
            status: growth >= 0.05 ? 'ready' : growth >= 0 ? 'partial' : 'not-ready',
            detail: growth >= 0.05 ? `${(growth * 100).toFixed(0)}% annual growth supports attractive exit` : growth >= 0 ? 'Flat growth may limit buyer interest' : 'Declining revenue reduces exit options',
        })

        result.push({
            label: 'Exit multiple achievable',
            status: exitMult <= 5 ? 'ready' : exitMult <= 7 ? 'partial' : 'not-ready',
            detail: exitMult <= 5 ? `${exitMult.toFixed(1)}x is reasonable for SMB market` : exitMult <= 7 ? `${exitMult.toFixed(1)}x requires above-average business quality` : `${exitMult.toFixed(1)}x is aggressive — needs exceptional performance`,
        })

        result.push({
            label: 'MOIC potential',
            status: moic >= 2.5 ? 'ready' : moic >= 1.5 ? 'partial' : 'not-ready',
            detail: moic >= 2.5 ? `${moic.toFixed(1)}x projected MOIC — strong return` : moic >= 1.5 ? `${moic.toFixed(1)}x projected MOIC — acceptable` : `${moic.toFixed(1)}x projected MOIC — below target`,
        })

        const redFlagCount = synthesis?.redFlags?.length ?? 0
        result.push({
            label: 'Risk profile for sale',
            status: redFlagCount === 0 ? 'ready' : redFlagCount <= 2 ? 'partial' : 'not-ready',
            detail: redFlagCount === 0 ? 'Clean risk profile — attractive to buyers' : redFlagCount <= 2 ? `${redFlagCount} red flags may require disclosure/mitigation` : `${redFlagCount} red flags will reduce buyer pool and price`,
        })

        const hasManagement = synthesis ? !synthesis.redFlags.some(f => f.toLowerCase().includes('management') || f.toLowerCase().includes('key person') || f.toLowerCase().includes('owner')) : true
        result.push({
            label: 'Management independence',
            status: hasManagement ? 'ready' : 'not-ready',
            detail: hasManagement ? 'No owner dependency signals — transferable business' : 'Owner dependency detected — needs transition plan before exit',
        })

        const hasGoodMargins = margin >= 0.20
        result.push({
            label: 'Margin profile',
            status: hasGoodMargins ? 'ready' : margin >= 0.12 ? 'partial' : 'not-ready',
            detail: hasGoodMargins ? `${(margin * 100).toFixed(0)}% margin — premium positioning` : margin >= 0.12 ? `${(margin * 100).toFixed(0)}% margin — standard for sector` : `${(margin * 100).toFixed(0)}% margin — buyers will discount valuation`,
        })

        return { items: result, moic, exitEV, holdYears }
    }, [model, synthesis])

    if (!items) return null

    const readyCount = items.items.filter(i => i.status === 'ready').length
    const totalCount = items.items.length
    const readyPct = (readyCount / totalCount) * 100

    const statusIcon = (status: string) => {
        switch (status) {
            case 'ready': return '●'
            case 'partial': return '◐'
            default: return '○'
        }
    }

    const statusColor = (status: string) => {
        switch (status) {
            case 'ready': return 'text-green-600'
            case 'partial': return 'text-amber-600'
            default: return 'text-red-600'
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <LogOut className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Exit readiness assessment</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    How well-positioned is this deal for a profitable exit in {items.holdYears} years?
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${readyPct >= 70 ? 'bg-green-500' : readyPct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${readyPct}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-foreground">{readyCount}/{totalCount} ready</span>
                </div>

                <div className="space-y-2">
                    {items.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className={`mt-0.5 text-sm ${statusColor(item.status)}`}>{statusIcon(item.status)}</span>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-foreground">{item.label}</p>
                                <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-3 mt-2 grid grid-cols-2 gap-2 text-center">
                    <div>
                        <p className="text-[10px] text-muted-foreground">Projected exit value</p>
                        <p className="text-sm font-bold text-foreground">${Math.round(items.exitEV).toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-muted-foreground">Projected MOIC</p>
                        <p className={`text-sm font-bold ${items.moic >= 2 ? 'text-green-600' : items.moic >= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>{items.moic.toFixed(1)}x</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
