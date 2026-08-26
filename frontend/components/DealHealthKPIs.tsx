import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Coins,
    DollarSign,
    FileCheck,
    FolderCheck,
    FolderKanban,
    Layers,
    Sparkles,
    TrendingUp,
} from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { parseDocumentedFacts } from '../utils/evidence'
import { formatCompactMoney } from '../utils/diligenceDashboardUtils'
import type { ImpactMetrics } from '../utils/impactMetrics'

export type TodayPipelineStats = {
    projectsFinishedToday?: number
    synthesesFinishedToday?: number
    docsFinishedToday?: number
    totalCostToday?: number
}

type KPIItem = {
    label: string
    value: string
    subtext?: string
    icon: React.ReactNode
    variant: 'success' | 'warning' | 'destructive' | 'default'
}

// Delegate to the shared compact formatter so this card renders money exactly
// like the rest of the dashboard — including negatives, a billions tier, and
// the tier-edge rounding fix — instead of its own inline variant.
function money(value: number) {
    return formatCompactMoney(value)
}

export default function DealHealthKPIs({
    synthesis,
    model,
    impact,
    documentsCount,
    docCost,
    totalCost,
    portfolioTotalCost,
    todayStats,
    projectSummaries,
}: {
    synthesis?: ProjectSynthesisItem
    model: DealModel
    impact: ImpactMetrics
    documentsCount: number
    docCost?: number
    totalCost?: number
    portfolioTotalCost?: number
    todayStats?: TodayPipelineStats
    projectSummaries?: any[]
}) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const price = model.purchasePrice ?? model.askingPrice

    const kpis: KPIItem[] = []

    // Synthesis Verdict KPI
    if (synthesis) {
        const verdict = synthesis.finalRecommendation || synthesis.finalTrafficLight || 'Pending'
        const upper = verdict.toUpperCase()
        let verdictVariant: 'success' | 'warning' | 'destructive' | 'default' = 'default'
        if (upper.includes('PROCEED WITH') || upper.includes('CONDITIONS') || upper.includes('YELLOW') || upper.includes('HOLD') || upper.includes('REVISE') || upper.includes('RENEGOTIATE')) {
            verdictVariant = 'warning'
        } else if (upper.includes('PROCEED') || upper.includes('GREEN') || upper.includes('FAVORABLE')) {
            verdictVariant = 'success'
        } else if (upper.includes('REJECT') || upper.includes('RED') || upper.includes('TERMINATE') || upper.includes('UNFAVORABLE')) {
            verdictVariant = 'destructive'
        }

        kpis.push({
            label: 'Synthesis Verdict',
            value: verdict,
            subtext: 'Acquisition judgment',
            icon: <Sparkles className="h-5 w-5" />,
            variant: verdictVariant,
        })
    }

    // Deal risk signal
    if (synthesis) {
        const riskLevel = synthesis.finalRiskLevel.trim().toLowerCase()
        const trafficLight = (synthesis.finalTrafficLight || '').trim().toLowerCase()

        // Map 'red' / 'yellow' / 'green' signals directly so they are styled correctly
        let variant: 'success' | 'warning' | 'destructive' | 'default' = 'success'
        if (trafficLight === 'red' || riskLevel === 'red' || riskLevel === 'critical' || riskLevel === 'high') {
            variant = 'destructive'
        } else if (trafficLight === 'yellow' || riskLevel === 'yellow' || riskLevel === 'medium') {
            variant = 'warning'
        }

        kpis.push({
            label: 'Risk Signal',
            value: synthesis.finalTrafficLight || synthesis.finalRiskLevel || 'Pending',
            subtext: `${synthesis.redFlags.length} red flags`,
            icon: <AlertTriangle className="h-5 w-5" />,
            variant,
        })
    }

    // Entry multiple
    if (price && ebitda && ebitda > 0) {
        const multiple = price / ebitda
        kpis.push({
            label: 'Entry Multiple',
            value: `${multiple.toFixed(1)}x`,
            subtext: 'Price / EBITDA',
            icon: <TrendingUp className="h-5 w-5" />,
            variant: multiple > 12 ? 'destructive' : multiple > 7 ? 'warning' : 'success',
        })
    }

    // EBITDA margin
    if (revenue && ebitda && revenue > 0) {
        const margin = (ebitda / revenue) * 100
        const revenueConf = facts.revenue?.confidence ? Math.round(facts.revenue.confidence * (facts.revenue.confidence <= 1 ? 100 : 1)) : null
        const ebitdaConf = facts.ebitda_sde?.confidence ? Math.round(facts.ebitda_sde.confidence * (facts.ebitda_sde.confidence <= 1 ? 100 : 1)) : null
        const avgConf = revenueConf && ebitdaConf ? Math.round((revenueConf + ebitdaConf) / 2) : revenueConf || ebitdaConf || null

        kpis.push({
            label: 'EBITDA Margin',
            value: `${margin.toFixed(1)}%`,
            subtext: `${money(revenue)} rev${avgConf ? ` (${avgConf}% conf)` : ''}`,
            icon: <Activity className="h-5 w-5" />,
            variant: margin > 25 ? 'success' : margin > 10 ? 'default' : 'warning',
        })
    }

    // Data completeness
    const confirmedFacts = Object.values(facts).filter((f) => f?.status === 'confirmed' && typeof f?.value === 'number').length
    const totalCoreFacts = 5
    kpis.push({
        label: 'Data Quality',
        value: `${confirmedFacts}/${totalCoreFacts}`,
        subtext: 'Core facts confirmed',
        icon: <CheckCircle2 className="h-5 w-5" />,
        variant: confirmedFacts >= 4 ? 'success' : confirmedFacts >= 2 ? 'warning' : 'destructive',
    })

    // Portfolio project totals KPIs
    if (projectSummaries && projectSummaries.length > 0) {
        kpis.push({
            label: 'Projects',
            value: `${projectSummaries.length}`,
            subtext: 'Grouped submissions',
            icon: <FolderKanban className="h-5 w-5" />,
            variant: 'default',
        })

        const activeProjectsCount = projectSummaries.filter((p) => (p.activeCount ?? 0) > 0).length
        kpis.push({
            label: 'Active Projects',
            value: `${activeProjectsCount}`,
            subtext: 'In processing pipeline',
            icon: <Activity className="h-5 w-5" />,
            variant: activeProjectsCount > 0 ? 'warning' : 'default',
        })

        const totalDocsCount = projectSummaries.reduce((sum, p) => sum + (p.documentCount || 0), 0)
        kpis.push({
            label: 'Total Documents',
            value: `${totalDocsCount}`,
            subtext: 'Cross-project total',
            icon: <Layers className="h-5 w-5" />,
            variant: 'default',
        })
    }

    // Documents processed for active deal
    kpis.push({
        label: 'Deal Documents',
        value: `${impact.completedDocuments}/${documentsCount}`,
        subtext: impact.completedDocuments === documentsCount && documentsCount > 0 ? 'All processed' : 'In progress',
        icon: <FileCheck className="h-5 w-5" />,
        variant: impact.completedDocuments === documentsCount && documentsCount > 0 ? 'success' : documentsCount > 0 ? 'warning' : 'default',
    })

    // Active deal execution cost KPI (specific to the currently selected project)
    if (typeof totalCost === 'number' && totalCost > 0) {
        kpis.push({
            label: 'Active Deal Cost',
            value: `$${totalCost.toFixed(3)}`,
            subtext: typeof docCost === 'number' && docCost > 0 ? `Active deal · Doc: $${docCost.toFixed(3)}` : 'Selected deal execution',
            icon: <DollarSign className="h-5 w-5" />,
            variant: 'success',
        })
    }

    // Portfolio all-time execution cost (across all projects in the portfolio)
    if (typeof portfolioTotalCost === 'number' && portfolioTotalCost > 0) {
        kpis.push({
            label: 'All-Time Spend',
            value: `$${portfolioTotalCost.toFixed(2)}`,
            subtext: 'Cross-portfolio total',
            icon: <Coins className="h-5 w-5" />,
            variant: 'default',
        })
    }

    // Today's Pipeline Operations KPIs
    if (todayStats) {
        kpis.push({
            label: 'Projects Finished Today',
            value: `${todayStats.projectsFinishedToday ?? 0}`,
            subtext: 'Processed today',
            icon: <FolderCheck className="h-5 w-5" />,
            variant: 'success',
        })
        kpis.push({
            label: 'Syntheses Finished Today',
            value: `${todayStats.synthesesFinishedToday ?? 0}`,
            subtext: 'Synthesized today',
            icon: <Sparkles className="h-5 w-5" />,
            variant: 'success',
        })
        kpis.push({
            label: 'Docs Finished Today',
            value: `${todayStats.docsFinishedToday ?? 0}`,
            subtext: 'Extracted today',
            icon: <FileCheck className="h-5 w-5" />,
            variant: 'success',
        })
        kpis.push({
            label: 'Total Cost Used Today',
            value: `$${(todayStats.totalCostToday ?? 0).toFixed(2)}`,
            subtext: 'Pipeline cost today',
            icon: <Coins className="h-5 w-5" />,
            variant: 'success',
        })
    }

    if (kpis.length === 0) return null

    return (
        <Card className="dashboard-kpi-glass border-primary/20 relative">
            <div className="absolute top-2 right-2 z-10">
                <CardInfoPopover cardId="deal-health-kpis" />
            </div>
            <CardContent className="p-4 sm:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className="flex items-center gap-3 rounded-xl border border-primary/15 bg-background/60 p-3.5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:bg-background/90 hover:shadow-md">
                            <div className={`rounded-xl p-2.5 shrink-0 ${kpi.variant === 'success' ? 'bg-success/10 text-success'
                                    : kpi.variant === 'warning' ? 'bg-warning/10 text-warning'
                                        : kpi.variant === 'destructive' ? 'bg-destructive/10 text-destructive'
                                            : 'bg-muted text-muted-foreground'
                                }`}>
                                {kpi.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 leading-snug line-clamp-2" title={kpi.label}>
                                    {kpi.label}
                                </p>
                                <p className={`font-black text-foreground tracking-tight leading-tight mt-0.5 break-words ${kpi.value.length > 16 ? 'text-xs sm:text-sm' : kpi.value.length > 10 ? 'text-sm sm:text-base' : 'text-base sm:text-lg'}`} title={kpi.value}>
                                    {kpi.value}
                                </p>
                                {kpi.subtext && (
                                    <p className="text-xs font-medium text-muted-foreground leading-snug break-words mt-0.5" title={kpi.subtext}>
                                        {kpi.subtext}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

