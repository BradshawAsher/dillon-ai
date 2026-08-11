import { Scale } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import ExpandableText from './ExpandableText'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent } from '../lib/shadcn/card'
import { getSubmissionInsightTone } from '../utils/aiSubmissionData'
import { formatHours, type ImpactMetrics } from '../utils/impactMetrics'

import { useMemo } from 'react'

function cleanCompleteSentence(str: string): string {
    if (!str) return ''
    let cleaned = str.trim()
    // Clean leading bullets, dashes, or markdown
    cleaned = cleaned.replace(/^[-•*#\s]+/, '')
    // Strip leading transitional conjunctions (e.g. "And ", "Also ", "Furthermore ")
    cleaned = cleaned.replace(/^(?:and|also|furthermore|however|moreover|additionally|plus)\b\s*/i, '')
    if (!cleaned) return ''
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)

    // Ensure sentence ends with valid punctuation
    if (!/[.!?]$/.test(cleaned)) {
        // If string ends with an incomplete word fragment at end of a long sentence, trim to last space
        if (cleaned.length > 30) {
            const lastSpaceIndex = cleaned.lastIndexOf(' ')
            if (lastSpaceIndex > 15 && cleaned.length - lastSpaceIndex < 12) {
                cleaned = cleaned.substring(0, lastSpaceIndex).trim()
            }
        }
        cleaned += '.'
    }
    return cleaned
}

export default function AcquisitionJudgmentCallout({ synthesis, impact }: { synthesis?: ProjectSynthesisItem; impact: ImpactMetrics }) {
    const pending = !synthesis || !synthesis.finalJudgmentSummary
    const message = pending
        ? synthesis?.finalRecommendation
            ? `n8n returned “${synthesis.finalRecommendation},” but the final plain-English judgment has not arrived yet. Refresh after the next synthesis pass.`
            : 'The project-level judgment will appear here once the consolidator completes its synthesis.'
        : synthesis.finalJudgmentSummary

    const parsedSummary = useMemo(() => {
        // 1. First check if n8n returned structured key_acquisition_takeaways
        const structuredTakeaways: any[] = (synthesis as any)?.finalJudgementJson?.key_acquisition_takeaways || (synthesis as any)?.key_acquisition_takeaways || []

        if (Array.isArray(structuredTakeaways) && structuredTakeaways.length > 0) {
            const bullets = structuredTakeaways
                .map((t: any) => {
                    const text = typeof t === 'string' ? t : (t.takeaway ? `${t.takeaway}${t.impact ? ` (${t.impact})` : ''}` : (t.description || ''))
                    return cleanCompleteSentence(text)
                })
                .filter(Boolean)

            if (bullets.length > 0) {
                return {
                    recommendation: synthesis?.finalRecommendation || 'PROCEED WITH CAUTION',
                    bullets
                }
            }
        }

        if (!message) return { recommendation: '', bullets: [] }

        // 2. Fallback: Parse message string safely with sentence boundary protection
        let cleanMessage = message.trim()
        cleanMessage = cleanMessage.replace(/^(?:###\s+)?Summary:?\s*/i, '').trim()

        const uppercaseMatch = cleanMessage.match(/^([A-Z\s&,-]{4,}\.?)\s*([\s\S]*)/)

        let recommendationText = synthesis?.finalRecommendation || ''
        let remainderText = cleanMessage

        if (uppercaseMatch) {
            recommendationText = uppercaseMatch[1].replace(/\.$/, '').trim()
            remainderText = uppercaseMatch[2].trim()
        }

        const bullets = remainderText
            .split(/(?<!\d\.\d+)(?<=[.!?])\s+(?=[A-Z0-9"\u201C\u201D])/)
            .map(s => cleanCompleteSentence(s))
            .filter(b => b.length > 10)

        return {
            recommendation: recommendationText || synthesis?.finalRecommendation || '',
            bullets
        }
    }, [message, synthesis])

    const getActionColor = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.includes('escalat') || lower.includes('renegotiat') || lower.includes('abort') || lower.includes('avoid') || lower.includes('risk') || lower.includes('warning')) {
            return 'text-destructive';
        }
        if (lower.includes('proceed') || lower.includes('buy') || lower.includes('acquire') || lower.includes('accept') || lower.includes('approve')) {
            return 'text-success';
        }
        return 'text-primary';
    };

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

                <div className="space-y-4 mt-5">
                    {parsedSummary.recommendation && !pending && (
                        <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Actionable Recommendation</p>
                            <p className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight ${getActionColor(parsedSummary.recommendation)}`}>
                                {parsedSummary.recommendation}
                            </p>
                        </div>
                    )}
                    {parsedSummary.bullets.length > 0 ? (
                        <div className="space-y-3 bg-background/50 rounded-xl p-5 border border-border/40">
                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-2 mb-2">Key Assessment Details</p>
                            {parsedSummary.bullets.map((point, index) => (
                                <div key={index} className="flex items-start gap-2.5">
                                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${parsedSummary.recommendation ? getActionColor(parsedSummary.recommendation).replace('text-', 'bg-') : 'bg-primary'}`} />
                                    <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-medium">{point}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border bg-background p-5 shadow-sm">
                            <ExpandableText text={message} maxHeight={150} className="text-base leading-7" />
                        </div>
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
