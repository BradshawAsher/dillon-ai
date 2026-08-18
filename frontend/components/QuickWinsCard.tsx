import { useMemo } from 'react'
import { Zap } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
}

type QuickWin = {
    title: string
    impact: string
    effort: 'Low' | 'Medium' | 'High'
    category: 'negotiation' | 'operations' | 'structure' | 'risk'
}

export default function QuickWinsCard({ model, synthesis }: Props) {
    const wins = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const result: QuickWin[] = []

        const entryMult = price / ebitda
        if (entryMult > 4.0) {
            const savings = price - ebitda * 4.0
            result.push({
                title: 'Negotiate entry multiple to 4.0x',
                impact: `Save $${Math.round(savings).toLocaleString()}`,
                effort: 'Medium',
                category: 'negotiation',
            })
        }

        if ((model.sellerNoteAmount ?? 0) === 0) {
            const sellerNote = price * 0.15
            result.push({
                title: 'Request 15% seller financing',
                impact: `Reduce upfront equity by $${Math.round(sellerNote).toLocaleString()}`,
                effort: 'Low',
                category: 'structure',
            })
        }

        const margin = revenue && revenue > 0 ? ebitda / revenue : 0
        if (margin < 0.20 && revenue) {
            const improvedEbitda = revenue * 0.20
            const gain = (improvedEbitda - ebitda) * (model.exitMultiple ?? 4.0)
            result.push({
                title: 'Improve margins to 20%',
                impact: `+$${Math.round(gain).toLocaleString()} exit value`,
                effort: 'High',
                category: 'operations',
            })
        }

        if ((model.workingCapitalRequirement ?? 0) > 0) {
            const wcSavings = (model.workingCapitalRequirement ?? 0) * 0.2
            result.push({
                title: 'Optimize working capital by 20%',
                impact: `Free up $${Math.round(wcSavings).toLocaleString()}`,
                effort: 'Medium',
                category: 'operations',
            })
        }

        const redFlags = synthesis?.redFlags ?? []
        if (redFlags.length > 0) {
            result.push({
                title: `Use ${redFlags.length} red flags as negotiation leverage`,
                impact: 'Potential 5-15% price reduction',
                effort: 'Low',
                category: 'negotiation',
            })
        }

        const growth = model.baseRevenueGrowth ?? 0.05
        if (growth < 0.03 && revenue) {
            const targetGrowth = 0.05
            const additionalRev = revenue * (targetGrowth - growth)
            result.push({
                title: 'Accelerate growth to 5%',
                impact: `+$${Math.round(additionalRev).toLocaleString()}/yr revenue`,
                effort: 'High',
                category: 'operations',
            })
        }

        const debt = model.seniorDebtAmount ?? 0
        if (debt > 0 && (model.interestRate ?? 0) > 0.06) {
            const rateSavings = debt * ((model.interestRate ?? 0.07) - 0.06)
            result.push({
                title: 'Shop for lower interest rate',
                impact: `Save $${Math.round(rateSavings).toLocaleString()}/yr in interest`,
                effort: 'Low',
                category: 'structure',
            })
        }

        return result.slice(0, 6)
    }, [model, synthesis])

    if (!wins || wins.length === 0) return null

    const effortColor = (effort: string) => {
        switch (effort) {
            case 'Low': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            case 'Medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            default: return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        }
    }

    const catIcon = (cat: string) => {
        switch (cat) {
            case 'negotiation': return '🤝'
            case 'operations': return '⚙️'
            case 'structure': return '🏗️'
            default: return '🛡️'
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Quick wins</CardTitle>
                    <CardInfoPopover cardId="quick-wins" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Highest-impact improvements ranked by effort level.
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2">
                    {wins.map((win, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 hover:bg-muted/30 transition-colors">
                            <span className="text-sm mt-0.5">{catIcon(win.category)}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground">{win.title}</p>
                                <p className="text-[10px] text-muted-foreground">{win.impact}</p>
                            </div>
                            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-medium ${effortColor(win.effort)}`}>
                                {win.effort}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
