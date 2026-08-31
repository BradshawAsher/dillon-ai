import { CheckCircle2, Clock, FileText, Loader2, XCircle } from 'lucide-react'

import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'
import { formatElapsedDuration, getDocumentExtractionDurationSec, getSynthesisDurationSec } from '../utils/diligenceDashboardUtils'

type Props = {
    documents: SubmissionHistoryItem[]
    synthesis?: ProjectSynthesisItem
    projectName: string
}

type TimelineEvent = {
    id: string
    timestamp: number
    label: string
    detail: string
    status: 'completed' | 'processing' | 'failed' | 'pending'
}

function parseTimestamp(value: string): number {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
}

function formatRelative(timestamp: number): string {
    if (timestamp === 0) return 'Pending'
    const now = Date.now()
    const diffMs = now - timestamp
    const diffMin = Math.floor(diffMs / 60_000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
}

export default function DealTimelineCard({ documents, synthesis, projectName }: Props) {
    const events: TimelineEvent[] = []

    const sortedDocs = [...documents].sort((a, b) => {
        const aTime = parseTimestamp(a.receivedAt || a.createdAt || a.triggerTimestamp)
        const bTime = parseTimestamp(b.receivedAt || b.createdAt || b.triggerTimestamp)
        return aTime - bTime
    })

    for (const doc of sortedDocs) {
        const receivedAt = parseTimestamp(doc.receivedAt || doc.createdAt || doc.triggerTimestamp)
        const status = doc.status.trim().toLowerCase()
        const eventStatus: TimelineEvent['status'] =
            status === 'completed' ? 'completed' :
            ['failed', 'error', 'rejected'].includes(status) ? 'failed' :
            ['processing', 'running', 'queued', 'submitted', 'accepted'].includes(status) ? 'processing' :
            'pending'

        const docDuration = getDocumentExtractionDurationSec(doc)
        events.push({
            id: `doc-${doc.requestID}`,
            timestamp: receivedAt,
            label: doc.fileName || 'Document uploaded',
            detail: eventStatus === 'completed' ? `Completed${docDuration !== null ? ` in ${formatElapsedDuration(docDuration)}` : ''} · ${doc.detectedDocumentType || doc.documentType || 'Unknown type'}` :
                   eventStatus === 'failed' ? `Failed: ${doc.errorMessage || 'Unknown error'}` :
                   eventStatus === 'processing' ? 'Processing...' : 'Queued',
            status: eventStatus,
        })
    }

    if (synthesis) {
        const synthStatus = synthesis.projectStatus.trim().toLowerCase()
        const isSynthComplete = synthStatus === 'synthesized' && (synthesis.finalJudgmentSummary.trim().length > 0 || synthesis.finalRecommendation.trim().length > 0)
        const synthDuration = getSynthesisDurationSec(synthesis)
        events.push({
            id: 'synthesis',
            timestamp: parseTimestamp(synthesis.projectProcessedAt || ''),
            label: 'Project synthesis',
            detail: isSynthComplete ? `Synthesized${synthDuration !== null ? ` in ${formatElapsedDuration(synthDuration)}` : ''} · ${synthesis.finalTrafficLight || synthesis.finalRiskLevel} · ${synthesis.finalRecommendation.slice(0, 60)}${synthesis.finalRecommendation.length > 60 ? '…' : ''}` :
                   ['queued', 'pending', 'processing', 'running', 'synthesis_pending', 'synthesizing'].includes(synthStatus) ? 'Running...' : 'Pending',
            status: isSynthComplete ? 'completed' : ['queued', 'pending', 'processing', 'running', 'synthesis_pending', 'synthesizing'].includes(synthStatus) ? 'processing' : 'pending',
        })
    }

    if (events.length === 0) return null

    const statusIcon = (status: TimelineEvent['status']) => {
        if (status === 'completed') return <CheckCircle2 className="h-4 w-4 text-success" />
        if (status === 'processing') return <Loader2 className="h-4 w-4 animate-spin text-primary" />
        if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }

    const completedCount = events.filter((e) => e.status === 'completed').length
    const totalCount = events.length

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Project timeline</CardTitle>
                            <CardInfoPopover cardId="deal-timeline" />
                        </div>
                        <CardDescription>{projectName} — {completedCount}/{totalCount} milestones complete</CardDescription>
                    </div>
                    <Badge variant={completedCount === totalCount ? 'success' : 'warning'}>
                        {completedCount === totalCount ? 'All complete' : `${totalCount - completedCount} in progress`}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="relative space-y-0">
                    {events.map((event, index) => (
                        <div key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
                            {index < events.length - 1 && (
                                <div className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-px bg-border" />
                            )}
                            <div className="relative z-10 mt-0.5 shrink-0">{statusIcon(event.status)}</div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-medium text-foreground truncate">{event.label}</p>
                                    {event.timestamp > 0 && (
                                        <span className="text-xs text-muted-foreground">{formatRelative(event.timestamp)}</span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
