import { useMemo } from 'react'
import { Rocket } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
}

type ActionItem = {
    text: string
    priority: 'high' | 'medium' | 'low'
}

type Phase = {
    label: string
    days: string
    theme: string
    items: ActionItem[]
    status: 'Pending'
}

export default function First100DaysCard({ model, synthesis }: Props) {
    const phases = useMemo((): Phase[] | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const redFlags = synthesis?.redFlags ?? []
        const margin = revenue && revenue > 0 ? ebitda / revenue : (model.baseEbitdaMargin ?? 0.20)
        const growth = model.baseRevenueGrowth ?? 0.05
        const workingCapital = model.workingCapitalRequirement ?? (revenue ? revenue * 0.10 : 0)

        // Phase 1: Stabilize (Days 1-30)
        const phase1Items: ActionItem[] = []

        // Check for customer-related red flags
        const hasCustomerRisk = redFlags.some(f => f.toLowerCase().includes('customer'))
        if (hasCustomerRisk) {
            phase1Items.push({ text: 'Secure key customer relationships', priority: 'high' })
        }

        // Check for employee/staff red flags
        const hasEmployeeRisk = redFlags.some(f => f.toLowerCase().includes('employee') || f.toLowerCase().includes('staff'))
        if (hasEmployeeRisk) {
            phase1Items.push({ text: 'Meet and retain key employees', priority: 'high' })
        }

        // Address top red flags
        const ownerDependency = redFlags.some(f =>
            f.toLowerCase().includes('owner') || f.toLowerCase().includes('key person') || f.toLowerCase().includes('management')
        )
        if (ownerDependency) {
            phase1Items.push({ text: 'Begin owner transition and knowledge transfer', priority: 'high' })
        }

        // Generic stabilization items
        for (const flag of redFlags.slice(0, 2)) {
            const existingTexts = phase1Items.map(i => i.text.toLowerCase())
            const flagLower = flag.toLowerCase()
            if (!existingTexts.some(t => t.includes('customer') || t.includes('employee') || t.includes('owner'))) {
                phase1Items.push({ text: `Address: ${flag.length > 60 ? flag.slice(0, 57) + '...' : flag}`, priority: 'high' })
            } else if (!existingTexts.some(t => flagLower.includes('customer') || flagLower.includes('employee') || flagLower.includes('staff') || flagLower.includes('owner'))) {
                phase1Items.push({ text: `Address: ${flag.length > 60 ? flag.slice(0, 57) + '...' : flag}`, priority: 'high' })
            }
        }

        if (phase1Items.length < 3) {
            phase1Items.push({ text: 'Audit existing vendor contracts and commitments', priority: 'medium' })
        }
        if (phase1Items.length < 3) {
            phase1Items.push({ text: 'Establish financial reporting cadence', priority: 'medium' })
        }

        // Phase 2: Optimize (Days 31-60)
        const phase2Items: ActionItem[] = []

        if (margin < 0.20) {
            phase2Items.push({ text: `Improve EBITDA margin from ${(margin * 100).toFixed(0)}% toward 20% target`, priority: 'high' })
        } else {
            phase2Items.push({ text: 'Identify cost reduction opportunities to protect margins', priority: 'medium' })
        }

        if (workingCapital > 0) {
            phase2Items.push({ text: 'Optimize working capital: tighten AR collections and review AP terms', priority: 'medium' })
        }

        phase2Items.push({ text: 'Implement operational KPI dashboard and weekly reviews', priority: 'medium' })

        if (phase2Items.length < 4) {
            phase2Items.push({ text: 'Renegotiate top vendor contracts for better terms', priority: 'low' })
        }

        // Phase 3: Grow (Days 61-100)
        const phase3Items: ActionItem[] = []

        if (growth >= 0.10) {
            phase3Items.push({ text: `Capitalize on ${(growth * 100).toFixed(0)}% growth trajectory with expanded sales capacity`, priority: 'high' })
        } else if (growth >= 0.05) {
            phase3Items.push({ text: 'Develop growth plan to accelerate beyond baseline 5% rate', priority: 'medium' })
        } else {
            phase3Items.push({ text: 'Identify new revenue streams to reverse flat/declining growth', priority: 'high' })
        }

        if (revenue) {
            const targetRevenue = revenue * (1 + growth)
            phase3Items.push({ text: `Set Year 1 revenue target: $${Math.round(targetRevenue).toLocaleString()}`, priority: 'medium' })
        }

        phase3Items.push({ text: 'Launch customer feedback program to identify upsell opportunities', priority: 'medium' })

        if (phase3Items.length < 4) {
            phase3Items.push({ text: 'Evaluate adjacent market expansion opportunities', priority: 'low' })
        }

        return [
            { label: 'Phase 1', days: 'Days 1-30', theme: 'Stabilize', items: phase1Items.slice(0, 4), status: 'Pending' },
            { label: 'Phase 2', days: 'Days 31-60', theme: 'Optimize', items: phase2Items.slice(0, 4), status: 'Pending' },
            { label: 'Phase 3', days: 'Days 61-100', theme: 'Grow', items: phase3Items.slice(0, 4), status: 'Pending' },
        ]
    }, [model, synthesis])

    if (!phases) return null

    const phaseColors = [
        'bg-blue-500',
        'bg-amber-500',
        'bg-green-500',
    ]

    const priorityStyles = {
        high: 'text-red-600 dark:text-red-400',
        medium: 'text-amber-600 dark:text-amber-400',
        low: 'text-muted-foreground',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">First 100 days plan</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Post-acquisition first 100 days plan
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {phases.map((phase, idx) => (
                    <div key={phase.label} className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">{phase.days}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                                    {phase.theme}
                                </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{phase.status}</span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full ${phaseColors[idx]} opacity-30`}
                                style={{ width: '0%' }}
                            />
                        </div>

                        {/* Action items */}
                        <div className="space-y-1 pl-2">
                            {phase.items.map((item, i) => (
                                <div key={i} className="flex items-start gap-2">
                                    <span className={`mt-0.5 text-[10px] ${priorityStyles[item.priority]}`}>
                                        {item.priority === 'high' ? '!' : item.priority === 'medium' ? '-' : '.'}
                                    </span>
                                    <span className="text-[11px] text-foreground">{item.text}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                        Plan is auto-generated from deal characteristics and identified risks. Adjust priorities based on
                        seller transition support and team readiness.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
