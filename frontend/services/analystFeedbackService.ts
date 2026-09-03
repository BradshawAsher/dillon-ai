import { supabaseAuthClient } from './supabaseAuth'
import { sendIssueReportSlackAlert } from './slackAlertService'
import type { OverrideCategory } from '../utils/documentedFacts'

export interface AnalystOverrideRecord {
    id: string
    projectId: string
    documentId?: string
    targetField: string
    originalAiValue: number | null
    overrideValue: number
    deltaAmount: number | null
    deltaPercent: number | null
    reasonCategory: OverrideCategory | string
    reasonNotes?: string
    analystEmail: string
    modelUsed?: string
    timestamp: string
}

const LOCAL_STORAGE_KEY = 'mergeworks_analyst_feedback_ledger'

export const OVERRIDE_CATEGORY_LABELS: Record<OverrideCategory, { label: string; description: string }> = {
    disallowed_addback: {
        label: 'Disallowed Add-Back',
        description: 'Seller-claimed normalization rejected (e.g. personal expense, above-market rent).',
    },
    timing_difference: {
        label: 'Timing / Period Alignment',
        description: 'Correction for cut-off, stub period, or cash vs. accrual basis mismatch.',
    },
    intercompany: {
        label: 'Intercompany Elimination',
        description: 'Excluded affiliate transfers, internal fees, or non-arms-length items.',
    },
    false_positive: {
        label: 'False Positive / Standard Practice',
        description: 'AI flagged standard industry operational nuance as a risk.',
    },
    ocr_error: {
        label: 'OCR / Extraction Failure',
        description: 'Scanned document, footnote, or table column was misread by OCR.',
    },
    accounting_policy: {
        label: 'GAAP / Revenue Recognition',
        description: 'Reclassification for deferred revenue, ASC 606, or capitalization policy.',
    },
    other: {
        label: 'Other Forensic Adjustment',
        description: 'Custom deal team underwriting judgment.',
    },
}

function getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof localStorage !== 'undefined') return localStorage
    return null
}

function getStoredLedger(): AnalystOverrideRecord[] {
    try {
        const storage = getStorage()
        if (!storage) return []
        const raw = storage.getItem(LOCAL_STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

function saveStoredLedger(items: AnalystOverrideRecord[]): void {
    try {
        const storage = getStorage()
        if (!storage) return
        storage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items.slice(-200)))
    } catch {
        // Storage quota exceeded or disabled
    }
}

/**
 * Records an analyst override event into the local audit trail and Supabase ledger.
 */
export async function recordAnalystOverride(params: {
    projectId: string
    documentId?: string
    targetField: string
    originalAiValue: number | null
    overrideValue: number
    reasonCategory: OverrideCategory | string
    reasonNotes?: string
    analystEmail?: string
    modelUsed?: string
}): Promise<AnalystOverrideRecord> {
    const original = params.originalAiValue
    const current = params.overrideValue
    const deltaAmount = typeof original === 'number' ? current - original : null
    const deltaPercent = (typeof original === 'number' && original !== 0 && deltaAmount !== null)
        ? (deltaAmount / Math.abs(original)) * 100
        : null

    const record: AnalystOverrideRecord = {
        id: `ovr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        projectId: params.projectId,
        documentId: params.documentId,
        targetField: params.targetField,
        originalAiValue: params.originalAiValue,
        overrideValue: params.overrideValue,
        deltaAmount,
        deltaPercent,
        reasonCategory: params.reasonCategory,
        reasonNotes: params.reasonNotes?.trim() || '',
        analystEmail: params.analystEmail || 'analyst@mergeworks.io',
        modelUsed: params.modelUsed || 'OpenAI 5.6 Terra',
        timestamp: new Date().toISOString(),
    }

    // 1. Save in local audit ledger
    const existing = getStoredLedger()
    saveStoredLedger([record, ...existing])

    // 2. Asynchronously attempt remote Supabase persistence (non-blocking)
    void (async () => {
        try {
            await supabaseAuthClient
                .from('analyst_feedback_ledger')
                .insert({
                    id: record.id,
                    project_id: record.projectId,
                    document_id: record.documentId || null,
                    target_field: record.targetField,
                    original_ai_value: record.originalAiValue,
                    override_value: record.overrideValue,
                    delta_amount: record.deltaAmount,
                    delta_percent: record.deltaPercent,
                    reason_category: record.reasonCategory,
                    analyst_notes: record.reasonNotes || null,
                    analyst_email: record.analystEmail,
                    model_used: record.modelUsed,
                    created_at: record.timestamp,
                })
        } catch {
            // Supabase table not provisioned yet or offline — local ledger is authoritative
        }
    })()

    // 3. Optional Slack notification for significant financial overrides (> $50k or > 10%)
    if (deltaAmount && (Math.abs(deltaAmount) >= 50_000 || (deltaPercent && Math.abs(deltaPercent) >= 10))) {
        void sendIssueReportSlackAlert({
            reporterName: record.analystEmail.split('@')[0],
            reporterEmail: record.analystEmail,
            category: 'data_accuracy',
            title: `Analyst Overrode ${params.targetField.toUpperCase()} on Deal`,
            description: `Field: ${params.targetField}\nOriginal AI: $${params.originalAiValue?.toLocaleString() ?? 'N/A'}\nAnalyst Value: $${params.overrideValue.toLocaleString()}\nDelta: ${deltaAmount >= 0 ? '+' : ''}$${deltaAmount.toLocaleString()} (${deltaPercent?.toFixed(1)}%)\nReason: ${params.reasonCategory} — ${params.reasonNotes || 'No extra notes'}`,
            projectName: params.projectId,
            source: 'button',
        }).catch(() => {})
    }

    return record
}

/**
 * Returns all logged overrides for a specific project.
 */
export function getProjectAuditTrail(projectId: string): AnalystOverrideRecord[] {
    const all = getStoredLedger()
    return all.filter((item) => item.projectId === projectId)
}

/**
 * Clears the local override audit trail for a project.
 */
export function clearProjectAuditTrail(projectId: string): void {
    const all = getStoredLedger()
    saveStoredLedger(all.filter((item) => item.projectId !== projectId))
}
