import { Download, Loader2, RefreshCw } from 'lucide-react'

import ExpandableInsightGroup from '../ExpandableInsightGroup'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import {
    getAiSubmissionViewModel,
    getSubmissionInsightTone,
} from '../../utils/aiSubmissionData'
import { downloadTextFile, fileSafeName } from '../../utils/downloadFile'
import { computeImpactMetrics, formatHours, HUMAN_MINUTES_PER_DOCUMENT } from '../../utils/impactMetrics'
import {
    formatSubmissionStatus,
    normalizeSubmissionStatus,
    type SubmissionHistoryItem,
} from '../../utils/submissionHistory'
import type { EvidenceItem } from '../EvidenceDrawer'

function getStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
    const normalized = normalizeSubmissionStatus(status)
    if (normalized === 'completed' || normalized === 'approved') return 'success'
    if (
        normalized === 'accepted'
        || normalized === 'queued'
        || normalized === 'processing'
        || normalized === 'submitted'
        || normalized === 'human review'
        || normalized === 'human_review'
        || normalized === 'needs review'
    ) return 'warning'
    if (normalized === 'error' || normalized === 'failed' || normalized === 'rejected') return 'destructive'
    return 'secondary'
}

function downloadDocumentAnalysis(row: SubmissionHistoryItem) {
    const title = row.dealName || row.companyName || row.fileName || 'submission-analysis'
    const fileName = `${fileSafeName(title)}-analysis.json`
    const data = {
        requestID: row.requestID,
        dealName: row.dealName,
        companyName: row.companyName,
        workstream: row.workstream,
        status: row.status,
        fileName: row.fileName,
        fileType: row.fileType,
        fileSize: row.fileSize,
        projectId: row.projectId,
        projectStage: row.projectStage,
        documentType: row.documentType,
        detectedDocumentType: row.detectedDocumentType,
        receivedAt: row.receivedAt,
        processedAt: row.processedAt,
        riskLevel: row.riskLevel,
        category: row.category,
        trafficLight: row.trafficLight,
        ebitdaExtracted: row.ebitdaExtracted,
        aiSummary: row.aiSummary,
        aiTargetValue: row.aiTargetValue,
        aiVariance: row.aiVariance,
        aiEscalationReason: row.aiEscalationReason,
        extractedJson: row.extractedJson,
    }
    downloadTextFile(fileName, JSON.stringify(data, null, 2), 'application/json')
}

export type SubmissionDetailModalProps = {
    selectedRow: SubmissionHistoryItem
    retryingRequestId?: string
    onRetryFailedDocument?: (requestId: string) => void
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

export default function SubmissionDetailModal({
    selectedRow,
    retryingRequestId,
    onRetryFailedDocument,
}: SubmissionDetailModalProps) {
    const aiViewModel = getAiSubmissionViewModel(selectedRow)
    const documentImpact = computeImpactMetrics([selectedRow])
    const isCompleted = normalizeSubmissionStatus(selectedRow.status) === 'completed'

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Selected request</p>
                    <h3 className="text-lg font-semibold text-foreground">
                        {selectedRow.dealName || selectedRow.companyName || 'Untitled submission'}
                    </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {selectedRow.requestID.startsWith('mock-') ? <Badge variant="secondary">Example document output</Badge> : null}
                    <Button type="button" size="sm" onClick={() => downloadDocumentAnalysis(selectedRow)}>
                        <Download className="h-4 w-4 mr-1.5" />
                        Download document analysis
                    </Button>
                    {['failed', 'error', 'rejected', 'needs_review', 'needs review'].includes(selectedRow.status.trim().toLowerCase()) && selectedRow.requestID && onRetryFailedDocument ? (
                        <Button type="button" size="sm" variant="outline" disabled={retryingRequestId === selectedRow.requestID} onClick={() => onRetryFailedDocument(selectedRow.requestID)}>
                            {retryingRequestId === selectedRow.requestID ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                            Retry document
                        </Button>
                    ) : null}
                    <Badge variant={getStatusVariant(selectedRow.status)}>
                        {formatSubmissionStatus(selectedRow.status)}
                    </Badge>
                    {selectedRow.trafficLight ? (
                        <Badge variant={getSubmissionInsightTone(selectedRow.trafficLight)}>
                            {selectedRow.trafficLight}
                        </Badge>
                    ) : null}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 sm:col-span-2">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Document review impact</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                        {isCompleted ? `~${formatHours(documentImpact.timeSavedHours)} analyst time saved` : `~${HUMAN_MINUTES_PER_DOCUMENT}m estimated manual review`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {isCompleted
                            ? `Estimated manual review: ${HUMAN_MINUTES_PER_DOCUMENT}m · Agent runtime: ${documentImpact.agentMinutes >= 1 ? `${Math.round(documentImpact.agentMinutes)}m` : '<1m'}`
                            : 'This becomes a saved-time estimate after the document finishes processing.'}
                    </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Request ID</p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground">{selectedRow.requestID || 'Missing'}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">n8n Row ID</p>
                    <p className="mt-1 font-mono text-sm text-foreground">{selectedRow.id || 'Pending'}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Company</p>
                    <p className="mt-1 text-sm text-foreground">{selectedRow.companyName || 'Not provided'}</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project ID</p>
                    <p className="mt-1 break-all font-mono text-sm text-foreground">{selectedRow.projectId || 'Not provided'}</p>
                </div>
            </div>

            {selectedRow.tableStructureStatus === 'needs_review' ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-foreground">
                    <p className="font-medium">Table structure needs review</p>
                    <p className="mt-1 text-muted-foreground">{selectedRow.tableStructureIssues || 'The uploaded table could not be mapped confidently.'}</p>
                </div>
            ) : null}

            <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Submission Notes</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{selectedRow.submissionNotes || 'No notes captured yet.'}</p>
            </div>

            {(aiViewModel.summary || aiViewModel.intent) ? (
                <ExpandableInsightGroup title="AI Summary" items={[]} itemCount={1} className="border-border bg-background" emptyLabel="No AI summary returned." defaultOpen>
                    <div className="space-y-3">
                        {aiViewModel.summary ? <p className="text-sm leading-6 text-foreground">{aiViewModel.summary}</p> : null}
                    </div>
                </ExpandableInsightGroup>
            ) : null}
        </div>
    )
}
