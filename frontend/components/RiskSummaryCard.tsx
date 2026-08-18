import { ShieldAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    synthesis?: ProjectSynthesisItem
}

type RiskCategory = {
    label: string
    count: number
    severity: 'critical' | 'high' | 'medium' | 'low' | 'none'
}

function categorizeFinding(text: string): string {
    const lower = text.toLowerCase()
    if (lower.includes('revenue') || lower.includes('sales') || lower.includes('income')) return 'Revenue'
    if (lower.includes('customer') || lower.includes('client') || lower.includes('concentration')) return 'Customer'
    if (lower.includes('debt') || lower.includes('loan') || lower.includes('liability') || lower.includes('leverage')) return 'Debt'
    if (lower.includes('legal') || lower.includes('compliance') || lower.includes('litigation') || lower.includes('regulatory')) return 'Legal'
    if (lower.includes('employee') || lower.includes('staff') || lower.includes('key person') || lower.includes('management')) return 'People'
    if (lower.includes('margin') || lower.includes('cost') || lower.includes('expense') || lower.includes('ebitda')) return 'Margins'
    if (lower.includes('growth') || lower.includes('trend') || lower.includes('decline')) return 'Growth'
    return 'Other'
}

export default function RiskSummaryCard({ synthesis }: Props) {
    if (!synthesis) return null

    const allFindings = [
        ...synthesis.redFlags.map(f => ({ text: f, level: 'critical' as const })),
        ...(synthesis.yellowFlags || []).map(f => ({ text: f, level: 'medium' as const })),
        ...(synthesis.greenFlags || []).map(f => ({ text: f, level: 'low' as const })),
    ]

    if (allFindings.length === 0) return null

    const categoryMap = new Map<string, { critical: number; medium: number; low: number }>()
    for (const f of allFindings) {
        const cat = categorizeFinding(f.text)
        const current = categoryMap.get(cat) || { critical: 0, medium: 0, low: 0 }
        current[f.level === 'critical' ? 'critical' : f.level === 'medium' ? 'medium' : 'low']++
        categoryMap.set(cat, current)
    }

    const categories: RiskCategory[] = Array.from(categoryMap.entries())
        .map(([label, counts]) => ({
            label,
            count: counts.critical + counts.medium + counts.low,
            severity: counts.critical > 0 ? 'critical' as const : counts.medium > 0 ? 'high' as const : 'low' as const,
        }))
        .sort((a, b) => {
            const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }
            return order[a.severity] - order[b.severity] || b.count - a.count
        })

    const severityColors = {
        critical: 'bg-destructive/80 text-destructive-foreground',
        high: 'bg-destructive/50 text-foreground',
        medium: 'bg-amber-500/40 text-foreground',
        low: 'bg-green-500/30 text-foreground',
        none: 'bg-muted text-muted-foreground',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    <CardTitle className="text-sm font-semibold">Risk concentration</CardTitle>
                    <CardInfoPopover cardId="risk-summary" />
                </div>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                        <div
                            key={cat.label}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${severityColors[cat.severity]}`}
                            title={`${cat.count} finding${cat.count > 1 ? 's' : ''} in ${cat.label}`}
                        >
                            {cat.label} <span className="opacity-70">({cat.count})</span>
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                    {synthesis.redFlags.length} critical · {(synthesis.yellowFlags || []).length} medium · {(synthesis.greenFlags || []).length} positive
                </p>
            </CardContent>
        </Card>
    )
}
