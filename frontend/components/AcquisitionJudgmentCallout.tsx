import { Scale } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import ExpandableText from './ExpandableText'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent } from '../lib/shadcn/card'
import { getSubmissionInsightTone } from '../utils/aiSubmissionData'
import { formatHours, type ImpactMetrics } from '../utils/impactMetrics'

import { useMemo } from 'react'

export default function AcquisitionJudgmentCallout({ synthesis, impact }: { synthesis?: ProjectSynthesisItem; impact: ImpactMetrics }) {
    const pending = !synthesis || !synthesis.finalJudgmentSummary
    const message = pending
        ? synthesis?.finalRecommendation
            ? `n8n returned “${synthesis.finalRecommendation},” but the final plain-English judgment has not arrived yet. Refresh after the next synthesis pass.`
            : 'The project-level judgment will appear here once the consolidator completes its synthesis.'
        : synthesis.finalJudgmentSummary

    const parsedSummary = useMemo(() => {
        if (!message) return { recommendation: '', bullets: [] }

        // Find leading uppercase recommendation phrase ending with a period or exclamation mark
        // (e.g., "RECOMMEND ESCALATION AND RENEGOTIATION. The target reports...")
        const uppercaseMatch = message.match(/^([A-Z\s&]{4,}\.)\s*([\s\S]*)/)

        let recommendationText = synthesis?.finalRecommendation || ''
        let remainderText = message

        if (uppercaseMatch) {
            recommendationText = uppercaseMatch[1].replace(/\.$/, '').trim()
            remainderText = uppercaseMatch[2].trim()
        }

        const bullets = remainderText
            .split(/(?<=[.!?])\s+/)
            .map(s => s.trim())
            .filter(Boolean)

        return {
            recommendation: recommendationText || synthesis?.finalRecommendation || '',
            bullets
        }
    }, [message, synthesis?.finalRecommendation])

    return (
        <Card className={pending ? 'overflow-hidden border-2 border-warning shadow-lg' : 'overflow-hidden border-2 border-primary shadow-lg'}>
            <CardContent className={pending ? 'bg-gradient-to-br from-warning/20 via-warning/10 to-background p-6' : 'bg-gradient-to-br from-primary/20 via-primary/8 to-background p-6'}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className={pending ? 'rounded-lg bg-warning/20 p-2 text-warning' : 'rounded-lg bg-primary/15 p-2 text-primary'}>
                            <Scale className="h-6 w-6" />
                        </div>
                        <div>
                            <p className={pending ? 'text-sm font-bold uppercase tracking-wide text-warning' : 'text-sm font-bold uppercase tracking-wide text-primary'}>
                                {pending ? 'Acquisition judgment pending' : 'Start here — acquisition judgment'}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">The project-level decision summary, based on all considered documents.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {parsedSummary.recommendation ? (
                            <Badge variant={getSubmissionInsightTone(synthesis?.finalTrafficLight || 'YELLOW')}>{parsedSummary.recommendation}</Badge>
                        ) : null}
                        {impact.completedDocuments > 0 ? (
                            <Badge variant="success">~{formatHours(impact.timeSavedHours)} analyst time saved</Badge>
                        ) : null}
                    </div>
                </div>

                <div className="mt-5 rounded-xl border border-primary/25 bg-background/90 p-5 shadow-sm">
                    {parsedSummary.recommendation && !pending && (
                        <div className="mb-4 pb-3 border-b border-border/60">
                            <p className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground mb-1">Acquisition Recommendation</p>
                            <p className="text-xl sm:text-2xl font-black text-destructive tracking-tight uppercase leading-relaxed">{parsedSummary.recommendation}</p>
                        </div>
                    )}
                    {parsedSummary.bullets.length > 0 ? (
                        <div className="space-y-3">
                            {parsedSummary.bullets.map((point, index) => (
                                <div key={index} className="flex items-start gap-2.5">
                                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                    <p className="text-sm sm:text-base leading-relaxed text-foreground/95 font-medium">{point}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <ExpandableText text={message} maxHeight={150} className="text-base leading-7" />
                    )}
                </div>

                {impact.completedDocuments > 0 ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        This decision consolidates {impact.completedDocuments} completed document{impact.completedDocuments === 1 ? '' : 's'}: ~{formatHours(impact.analystHours)} estimated manual review versus {impact.agentMinutes >= 1 ? `${Math.round(impact.agentMinutes)}m` : '<1m'} of recorded agent runtime.
                    </p>
                ) : null}
            </CardContent>
        </Card>
    )
}
