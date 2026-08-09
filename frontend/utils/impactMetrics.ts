// Impact / ROI metrics for the header KPI strip — the "before vs after"
// contrast (analyst hours vs agent runtime) plus throughput and confidence.
// Computed entirely from polled submission rows; no backend dependency.
import { getAiSubmissionViewModel } from './aiSubmissionData'
import { normalizeSubmissionStatus, type SubmissionHistoryItem } from './submissionHistory'

// Conservative baseline for how long a human analyst spends manually reading
// and extracting one financial document. Deliberately modest so the contrast
// is defensible rather than inflated.
export const HUMAN_MINUTES_PER_DOCUMENT = 40

export type ImpactMetrics = {
    completedDocuments: number
    agentMinutes: number
    analystHours: number
    timeSavedHours: number
    fasterMultiple: number | null
    avgConfidence: number | null
}

function parseTime(value: string) {
    if (!value) {
        return NaN
    }
    return Date.parse(value)
}

export function computeImpactMetrics(rows: SubmissionHistoryItem[]): ImpactMetrics {
    const completed = rows.filter((row) => {
        const st = normalizeSubmissionStatus(row.status)
        return ['completed', 'approved', 'success', 'synthesized', 'done', 'processed'].includes(st) ||
            (row.extractedJson && row.extractedJson.trim().length > 0 && row.extractedJson.trim() !== 'null')
    })
    const completedDocuments = completed.length

    let agentMs = 0
    for (const row of completed) {
        const start = parseTime(row.processingStartedAt || row.receivedAt || row.triggerTimestamp)
        const end = parseTime(row.processedAt || row.updatedAt)
        if (!Number.isNaN(start) && !Number.isNaN(end) && end > start) {
            const rawDuration = end - start
            // Capping threshold: 10 hours (36,000,000ms). If a document record sat
            // idle for days before re-processing, cap its runtime at 1 minute to prevent
            // offline gap skew from making analyst time saved 0.
            const MAX_REALISTIC_AGENT_MS = 10 * 3600 * 1000
            const duration = rawDuration > MAX_REALISTIC_AGENT_MS ? 60 * 1000 : rawDuration
            agentMs += duration
        }
    }
    const agentMinutes = agentMs / 60000

    const analystMinutes = completedDocuments * HUMAN_MINUTES_PER_DOCUMENT
    const analystHours = analystMinutes / 60
    const timeSavedHours = Math.max(0, (analystMinutes - agentMinutes) / 60)
    const fasterMultiple = agentMinutes > 0 ? analystMinutes / agentMinutes : null

    const confidences = completed
        .map((row) => getAiSubmissionViewModel(row).confidencePercent)
        .filter((value): value is number => typeof value === 'number' && value > 0)
    const avgConfidence = confidences.length > 0
        ? Math.round(confidences.reduce((sum, value) => sum + value, 0) / confidences.length)
        : null

    return {
        completedDocuments,
        agentMinutes,
        analystHours,
        timeSavedHours,
        fasterMultiple,
        avgConfidence,
    }
}

export function formatHours(hours: number) {
    if (hours <= 0) {
        return '0h'
    }
    if (hours < 1) {
        return `${Math.round(hours * 60)}m`
    }
    return `${hours.toFixed(hours < 10 ? 1 : 0)}h`
}
