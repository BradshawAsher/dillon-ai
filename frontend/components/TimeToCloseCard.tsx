import { useMemo } from 'react'
import { Clock } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    documentsCount: number
    completedDocuments: number
    hasSynthesis: boolean
    hasValuation: boolean
    hasFinancing: boolean
}

const STAGE_KEY = 'mergeworks.dealStage'

const STAGE_WEEKS: Record<string, { remaining: string; typical: string }> = {
    discovery: { remaining: '8-16 weeks', typical: 'Discovery to close typically takes 10-20 weeks' },
    'pre-loi': { remaining: '6-14 weeks', typical: 'Pre-LOI to close typically takes 8-16 weeks' },
    loi: { remaining: '4-10 weeks', typical: 'LOI signed to close typically takes 6-12 weeks' },
    diligence: { remaining: '3-8 weeks', typical: 'Active DD to close typically takes 4-10 weeks' },
    negotiation: { remaining: '2-6 weeks', typical: 'Final negotiation to close typically takes 2-6 weeks' },
    closing: { remaining: '1-3 weeks', typical: 'Closing process typically takes 1-3 weeks' },
}

export default function TimeToCloseCard({ documentsCount, completedDocuments, hasSynthesis, hasValuation, hasFinancing }: Props) {
    const analysis = useMemo(() => {
        let stage = 'discovery'
        try {
            stage = localStorage.getItem(STAGE_KEY) || 'discovery'
        } catch {}

        const stageInfo = STAGE_WEEKS[stage] ?? STAGE_WEEKS.discovery
        const blockers: string[] = []

        if (documentsCount === 0) blockers.push('No documents uploaded')
        else if (completedDocuments < 3) blockers.push(`Only ${completedDocuments} documents analyzed`)
        if (!hasSynthesis) blockers.push('Synthesis not complete')
        if (!hasValuation) blockers.push('Valuation not established')
        if (!hasFinancing && (stage === 'negotiation' || stage === 'closing')) blockers.push('Financing terms not configured')

        return { stage, stageInfo, blockers }
    }, [documentsCount, completedDocuments, hasSynthesis, hasValuation, hasFinancing])

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Time to close</CardTitle>
                    </div>
                    <Badge variant="secondary">{analysis.stageInfo.remaining}</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{analysis.stageInfo.typical}</p>
                {analysis.blockers.length > 0 && (
                    <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Potential delays</p>
                        <div className="space-y-1">
                            {analysis.blockers.map((b, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    <span className="text-xs text-foreground">{b}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
