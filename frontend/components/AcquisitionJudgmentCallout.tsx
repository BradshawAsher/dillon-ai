import { Download, Mail, Pin, PinOff, Scale } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import ExpandableText from './ExpandableText'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent } from '../lib/shadcn/card'
import { getSubmissionInsightTone } from '../utils/aiSubmissionData'
import { formatHours, type ImpactMetrics } from '../utils/impactMetrics'
import { downloadSynthesisReport } from './ProjectSynthesisCard'
import DealEmailDraftModal from './DealEmailDraftModal'

import { useMemo, useState } from 'react'
import ActionableRecommendationInfoButton from './ActionableRecommendationInfoButton'
import CardInfoPopover from './common/CardInfoPopover'

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
        if (cleaned.length > 30 && cleaned.lastIndexOf(' ') > cleaned.length - 15) {
            const lastSpace = cleaned.lastIndexOf(' ')
            const trailingWord = cleaned.slice(lastSpace + 1)
            // If trailing token is not a normal word or is incomplete, chop it
            if (trailingWord.length < 3 || !/^[a-zA-Z0-9]+$/.test(trailingWord)) {
                cleaned = cleaned.slice(0, lastSpace)
            }
        }
        cleaned += '.'
    }
    return cleaned
}

export interface AcquisitionJudgmentCalloutProps {
    synthesis?: ProjectSynthesisItem
    impact: ImpactMetrics
    onSwitchTab?: (tab: any) => void
    model?: DealModel
    projectName?: string
    projectId?: string
}

export default function AcquisitionJudgmentCallout({
    synthesis,
    impact,
    onSwitchTab,
    model,
    projectName,
    projectId,
}: AcquisitionJudgmentCalloutProps) {
    const [isPinned, setIsPinned] = useState(false)
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

    const pending = !synthesis || !synthesis.finalJudgmentSummary
    const message = pending
        ? synthesis?.finalRecommendation
            ? `n8n returned “${synthesis.finalRecommendation},” but the final plain-English judgment has not arrived yet. Refresh after the next synthesis pass.`
            : 'The project-level judgment will appear here once the consolidator completes its synthesis.'
        : synthesis.finalJudgmentSummary

    const parsedSummary = useMemo(() => {
        // 1. First check if n8n returned structured key_acquisition_takeaways
        let structuredTakeaways: any[] = []

        let jsonObj: any = null
        const rawJson = (synthesis as any)?.finalJudgementJson || synthesis?.finalJudgmentJson
        if (rawJson) {
            try {
                jsonObj = typeof rawJson === 'string'
                    ? JSON.parse(rawJson)
                    : rawJson
            } catch { /* skip */ }
        }

        if (jsonObj) {
            if (Array.isArray(jsonObj.key_acquisition_takeaways)) {
                structuredTakeaways = jsonObj.key_acquisition_takeaways
            } else if (Array.isArray(jsonObj.response?.key_acquisition_takeaways)) {
                structuredTakeaways = jsonObj.response.key_acquisition_takeaways
            }
        }

        if (structuredTakeaways.length === 0 && Array.isArray((synthesis as any)?.key_acquisition_takeaways)) {
            structuredTakeaways = (synthesis as any).key_acquisition_takeaways
        }

        if (structuredTakeaways.length === 0 && Array.isArray(synthesis?.keyTakeaways) && synthesis.keyTakeaways.length > 0) {
            structuredTakeaways = synthesis.keyTakeaways
        }

        if (structuredTakeaways.length === 0 && Array.isArray(synthesis?.structuredFindings?.keyTakeaways) && synthesis.structuredFindings.keyTakeaways.length > 0) {
            structuredTakeaways = synthesis.structuredFindings.keyTakeaways
        }

        if (structuredTakeaways.length > 0) {
            const bullets = structuredTakeaways
                .map((t: any) => {
                    const text = typeof t === 'string'
                        ? t
                        : (t.takeaway ? `${t.takeaway}${t.impact ? ` (${t.impact})` : ''}` : (t.description || t.text || ''))
                    return cleanCompleteSentence(text)
                })
                .filter(b => b.length > 10)

            const recommendation = jsonObj?.recommendation ||
                (synthesis as any)?.recommendation ||
                synthesis?.finalRecommendation ||
                ''

            return {
                recommendation,
                bullets
            }
        }

        // 2. Fallback: Parse from markdown summary text
        const lines = message.split('\n')
        let recommendationText = ''
        const bulletLines: string[] = []

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            // Look for explicit Recommendation: prefix
            const recMatch = trimmed.match(/^(?:Recommendation|Action|Verdict|Acquisition Judgment):\s*(.+)$/i)
            if (recMatch) {
                recommendationText = recMatch[1].trim()
                continue
            }

            // Look for bullet points
            if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
                bulletLines.push(trimmed)
            }
        }

        if (bulletLines.length > 0) {
            return {
                recommendation: recommendationText || synthesis?.finalRecommendation || '',
                bullets: bulletLines.map(b => cleanCompleteSentence(b)).filter(b => b.length > 10)
            }
        }

        // 3. Fallback: Split by sentences if no bullet points exist
        const sentences = message
            .replace(/([.!?])\s+/g, '$1|')
            .split('|')
            .map(s => s.trim())
            .filter(s => s.length > 0)

        // If first sentence contains bold or strong recommendation keyword, check it
        let firstSentence = sentences[0] || ''
        const verdictKeywords = ['PROCEED WITH CAUTION', 'PROCEED', 'HOLD', 'AVOID', 'REJECT', 'ESCALATE', 'RENEGOTIATE']
        for (const kw of verdictKeywords) {
            if (firstSentence.toUpperCase().includes(kw)) {
                recommendationText = kw
                break
            }
        }

        const bullets = sentences
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

    const cardClass = isPinned
        ? 'fixed top-14 left-4 right-4 md:left-8 md:right-8 max-w-7xl mx-auto z-40 overflow-hidden border-2 border-primary shadow-2xl backdrop-blur-2xl bg-background/95 transition-all duration-300 rounded-xl'
        : pending
            ? 'overflow-hidden border-2 border-warning shadow-lg transition-all duration-200'
            : 'overflow-hidden border-2 border-primary shadow-lg transition-all duration-200'

    return (
        <>
            {isPinned && <div className="h-44 w-full rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center text-xs font-semibold text-primary"><Pin className="h-4 w-4 mr-2 animate-bounce" /> Acquisition Judgment Card Pinned Below Navbar</div>}
            <Card id="synthesis-judgment-callout" data-acquisition-judgment="true" className={cardClass}>
            <CardContent className={isPinned ? 'p-4 max-h-56 overflow-y-auto space-y-3 bg-gradient-to-br from-primary/20 via-primary/8 to-background' : (pending ? 'bg-gradient-to-br from-warning/20 via-warning/10 to-background p-6' : 'bg-gradient-to-br from-primary/20 via-primary/8 to-background p-6')}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className={pending ? 'rounded-lg bg-warning/20 p-2 text-warning' : 'rounded-lg bg-primary/15 p-2 text-primary'}>
                            <Scale className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className={pending ? 'text-sm font-bold uppercase tracking-wide text-warning' : 'text-sm font-bold uppercase tracking-wide text-primary'}>
                                    {pending ? 'Acquisition judgment pending' : 'Start here — acquisition judgment'}
                                </p>
                                <CardInfoPopover cardId="acquisition-judgment" />
                                {isPinned ? (
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary bg-primary/10">
                                        Pinned
                                    </Badge>
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">The project-level decision summary, based on all considered documents.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {synthesis ? (
                            <button
                                type="button"
                                onClick={() => downloadSynthesisReport(synthesis, synthesis.projectName || synthesis.companyName || synthesis.projectId || 'Deal')}
                                className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20 shadow-2xs"
                                title="Download complete project synthesis report (Markdown)"
                            >
                                <Download className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span>Download Project Report</span>
                            </button>
                        ) : null}
                        {synthesis ? (
                            <button
                                type="button"
                                onClick={() => setIsEmailModalOpen(true)}
                                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 transition-colors hover:bg-indigo-500/20 shadow-2xs"
                                title="Open interactive deal update email draft modal"
                            >
                                <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                <span>View Email Draft</span>
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setIsPinned(!isPinned)}
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${isPinned
                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            title={isPinned ? 'Unpin card from top of page' : 'Pin card to top of page while scrolling'}
                        >
                            {isPinned ? (
                                <>
                                    <PinOff className="h-3.5 w-3.5" />
                                    <span>Unpin Card</span>
                                </>
                            ) : (
                                <>
                                    <Pin className="h-3.5 w-3.5" />
                                    <span>Pin Card</span>
                                </>
                            )}
                        </button>
                        {parsedSummary.recommendation ? (
                            <div className="flex items-center gap-1.5">
                                <Badge variant={getSubmissionInsightTone(synthesis?.finalTrafficLight || 'YELLOW')}>{parsedSummary.recommendation}</Badge>
                                <ActionableRecommendationInfoButton
                                    recommendation={parsedSummary.recommendation}
                                    trafficLight={synthesis?.finalTrafficLight}
                                    onSwitchTab={onSwitchTab}
                                    size="sm"
                                />
                            </div>
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
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <span className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight ${getActionColor(parsedSummary.recommendation)}`}>
                                    {parsedSummary.recommendation}
                                </span>
                                <ActionableRecommendationInfoButton
                                    recommendation={parsedSummary.recommendation}
                                    trafficLight={synthesis?.finalTrafficLight}
                                    onSwitchTab={onSwitchTab}
                                    size="sm"
                                />
                            </div>
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

        <DealEmailDraftModal
            isOpen={isEmailModalOpen}
            onClose={() => setIsEmailModalOpen(false)}
            model={model}
            synthesis={synthesis}
            projectName={projectName}
            projectId={projectId}
        />
        </>
    )
}
