import { useMemo } from 'react'
import { Calendar } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
}

type Milestone = {
    label: string
    durationWeeks: number
    status: 'complete' | 'in-progress' | 'future'
}

export default function AcquisitionTimelineCard({ model, synthesis }: Props) {
    const milestones = useMemo((): Milestone[] | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const hasFinancials = typeof facts.revenue?.value === 'number' || typeof facts.ebitda_sde?.value === 'number'
        const hasFinancing = (model.interestRate !== null) || (model.sellerNoteAmount !== null)
        const hasSynthesis = synthesis !== null && (synthesis.redFlags.length > 0 || synthesis.greenFlags.length > 0)
        const hasPrice = model.purchasePrice !== null || model.askingPrice !== null

        if (!hasPrice && !hasFinancials) return null

        // Determine statuses based on available data
        const loiStatus: Milestone['status'] = hasPrice ? 'complete' : 'future'
        const ddKickoffStatus: Milestone['status'] = hasFinancials ? 'complete' : hasPrice ? 'in-progress' : 'future'
        const financialReviewStatus: Milestone['status'] = hasSynthesis ? 'complete' : hasFinancials ? 'in-progress' : 'future'
        const legalReviewStatus: Milestone['status'] = hasSynthesis && synthesis && synthesis.redFlags.length === 0 ? 'complete' : hasSynthesis ? 'in-progress' : 'future'
        const financingStatus: Milestone['status'] = hasFinancing ? 'in-progress' : 'future'
        const purchaseAgreementStatus: Milestone['status'] = 'future'
        const closingStatus: Milestone['status'] = 'future'
        const transitionStatus: Milestone['status'] = 'future'

        return [
            { label: 'LOI signed', durationWeeks: 1, status: loiStatus },
            { label: 'DD kickoff', durationWeeks: 1, status: ddKickoffStatus },
            { label: 'Financial review', durationWeeks: 3, status: financialReviewStatus },
            { label: 'Legal review', durationWeeks: 3, status: legalReviewStatus },
            { label: 'Financing secured', durationWeeks: 4, status: financingStatus },
            { label: 'Purchase agreement', durationWeeks: 2, status: purchaseAgreementStatus },
            { label: 'Closing', durationWeeks: 1, status: closingStatus },
            { label: 'Transition start', durationWeeks: 2, status: transitionStatus },
        ]
    }, [model, synthesis])

    if (!milestones) return null

    const totalWeeks = milestones.reduce((sum, m) => sum + m.durationWeeks, 0)
    const completedWeeks = milestones
        .filter(m => m.status === 'complete')
        .reduce((sum, m) => sum + m.durationWeeks, 0)

    const statusColors = {
        'complete': 'bg-green-500',
        'in-progress': 'bg-primary',
        'future': 'bg-muted-foreground/30',
    }

    const statusTextColors = {
        'complete': 'text-green-600 dark:text-green-400',
        'in-progress': 'text-primary',
        'future': 'text-muted-foreground',
    }

    const statusLabels = {
        'complete': 'Done',
        'in-progress': 'Active',
        'future': 'Pending',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Projected timeline from LOI to close</CardTitle>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-foreground">{totalWeeks} wks</div>
                        <div className="text-[10px] text-muted-foreground">total estimated</div>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    {completedWeeks} of {totalWeeks} weeks completed
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="relative space-y-0">
                    {milestones.map((milestone, idx) => (
                        <div key={milestone.label} className="flex items-start gap-3 pb-4 last:pb-0">
                            {/* Vertical line and dot */}
                            <div className="flex flex-col items-center">
                                <div className={`h-3 w-3 rounded-full shrink-0 ${statusColors[milestone.status]} ${milestone.status === 'in-progress' ? 'ring-2 ring-primary/30' : ''}`} />
                                {idx < milestones.length - 1 && (
                                    <div className={`w-0.5 flex-1 min-h-[20px] ${milestones[idx + 1].status === 'complete' ? 'bg-green-500/50' : 'bg-border'}`} />
                                )}
                            </div>
                            {/* Content */}
                            <div className="flex-1 flex items-center justify-between min-h-[28px]">
                                <div>
                                    <span className={`text-xs font-medium ${statusTextColors[milestone.status]}`}>
                                        {milestone.label}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground ml-2">
                                        ~{milestone.durationWeeks} wk{milestone.durationWeeks > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <span className={`text-[10px] font-medium ${statusTextColors[milestone.status]}`}>
                                    {statusLabels[milestone.status]}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
