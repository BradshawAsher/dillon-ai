import { Activity, AlertTriangle, CheckCircle2, FileCheck, TrendingUp } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'
import type { ImpactMetrics } from '../utils/impactMetrics'

type KPIItem = {
    label: string
    value: string
    subtext?: string
    icon: React.ReactNode
    variant: 'success' | 'warning' | 'destructive' | 'default'
}

function money(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

export default function DealHealthKPIs({ synthesis, model, impact, documentsCount }: { synthesis?: ProjectSynthesisItem; model: DealModel; impact: ImpactMetrics; documentsCount: number }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const price = model.purchasePrice ?? model.askingPrice

    const kpis: KPIItem[] = []

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
        kpis.push({
            label: 'EBITDA Margin',
            value: `${margin.toFixed(1)}%`,
            subtext: revenue ? money(revenue) + ' revenue' : undefined,
            icon: <Activity className="h-5 w-5" />,
            variant: margin > 25 ? 'success' : margin > 10 ? 'default' : 'warning',
        })
    }

    // Documents processed
    kpis.push({
        label: 'Documents',
        value: `${impact.completedDocuments}/${documentsCount}`,
        subtext: impact.completedDocuments === documentsCount && documentsCount > 0 ? 'All processed' : 'In progress',
        icon: <FileCheck className="h-5 w-5" />,
        variant: impact.completedDocuments === documentsCount && documentsCount > 0 ? 'success' : documentsCount > 0 ? 'warning' : 'default',
    })

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

    if (kpis.length === 0) return null

    return (
        <Card className="dashboard-kpi-glass border-primary/20">
            <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {kpis.map((kpi) => (
                        <div key={kpi.label} className="flex items-start gap-3 rounded-lg p-1 transition-transform duration-200 hover:scale-[1.02]">
                            <div className={`mt-0.5 rounded-lg p-2 ${kpi.variant === 'success' ? 'bg-success/10 text-success'
                                    : kpi.variant === 'warning' ? 'bg-warning/10 text-warning'
                                        : kpi.variant === 'destructive' ? 'bg-destructive/10 text-destructive'
                                            : 'bg-muted text-muted-foreground'
                                }`}>
                                {kpi.icon}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                                <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                                {kpi.subtext && <p className="text-xs text-muted-foreground">{kpi.subtext}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
