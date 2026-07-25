import { FileUp, FileCheck, Sparkles, AlertCircle, Clock } from 'lucide-react'

import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    documents: SubmissionHistoryItem[]
    maxItems?: number
}

function relativeTime(dateStr: string): string {
    const now = Date.now()
    const then = new Date(dateStr).getTime()
    if (isNaN(then)) return ''
    const diffMin = Math.floor((now - then) / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    return `${Math.floor(diffHrs / 24)}d ago`
}

type ActivityEvent = {
    id: string
    icon: React.ReactNode
    label: string
    detail: string
    time: string
    sortTime: number
}

export default function ActivityFeed({ documents, maxItems = 8 }: Props) {
    const events: ActivityEvent[] = []

    for (const doc of documents) {
        const uploadTime = doc.createdAt || doc.triggerTimestamp || ''
        if (uploadTime) {
            events.push({
                id: `upload-${doc.requestID}`,
                icon: <FileUp className="h-3.5 w-3.5 text-blue-500" />,
                label: 'Document uploaded',
                detail: doc.fileName || doc.requestID.slice(0, 8),
                time: relativeTime(uploadTime),
                sortTime: new Date(uploadTime).getTime(),
            })
        }

        if (doc.status === 'completed' && doc.processedAt) {
            events.push({
                id: `done-${doc.requestID}`,
                icon: <FileCheck className="h-3.5 w-3.5 text-green-500" />,
                label: 'Analysis complete',
                detail: doc.fileName || doc.requestID.slice(0, 8),
                time: relativeTime(doc.processedAt),
                sortTime: new Date(doc.processedAt).getTime(),
            })
        } else if (doc.status === 'failed') {
            events.push({
                id: `fail-${doc.requestID}`,
                icon: <AlertCircle className="h-3.5 w-3.5 text-destructive" />,
                label: 'Analysis failed',
                detail: doc.fileName || doc.requestID.slice(0, 8),
                time: relativeTime(doc.processedAt || uploadTime),
                sortTime: new Date(doc.processedAt || uploadTime).getTime(),
            })
        } else if (doc.status === 'processing') {
            events.push({
                id: `proc-${doc.requestID}`,
                icon: <Clock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />,
                label: 'Processing',
                detail: doc.fileName || doc.requestID.slice(0, 8),
                time: relativeTime(uploadTime),
                sortTime: new Date(uploadTime).getTime() + 1,
            })
        }
    }

    events.sort((a, b) => b.sortTime - a.sortTime)
    const visible = events.slice(0, maxItems)

    if (visible.length === 0) {
        return (
            <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Activity</CardTitle>
                </CardHeader>
                <CardContent className="pb-4">
                    <p className="text-xs text-muted-foreground">No activity yet. Upload a document to get started.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {visible.map(event => (
                        <div key={event.id} className="flex items-center gap-3 px-4 py-2.5">
                            <span className="shrink-0">{event.icon}</span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-foreground">{event.label}</p>
                                <p className="truncate text-[11px] text-muted-foreground">{event.detail}</p>
                            </div>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{event.time}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
