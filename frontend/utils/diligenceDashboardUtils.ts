import type { FindingType, Severity } from './diligence'
import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import { deriveDocumentedFacts } from './documentedFacts'

export function getFindingVariant(findingType: FindingType): 'destructive' | 'success' {
    return findingType === 'Red Flag' ? 'destructive' : 'success'
}

export function getSeverityVariant(severity: Severity): 'destructive' | 'warning' | 'secondary' | 'outline' {
    if (severity === 'Critical') return 'destructive'
    if (severity === 'High') return 'warning'
    if (severity === 'Medium') return 'secondary'
    return 'outline'
}

export function getSubmissionStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
    const normalized = (status || '').trim().toLowerCase()
    if (normalized === 'completed' || normalized === 'approved') return 'success'
    if (
        normalized === 'accepted'
        || normalized === 'queued'
        || normalized === 'processing'
        || normalized === 'submitted'
        || normalized === 'human review'
        || normalized === 'human_review'
        || normalized === 'needs review'
    ) {
        return 'warning'
    }
    if (normalized === 'error' || normalized === 'failed' || normalized === 'rejected') return 'destructive'
    return 'secondary'
}

export function sanitizeCurrencyCode(currency?: string): string {
    if (!currency || typeof currency !== 'string') return 'USD'
    const trimmed = currency.trim().toUpperCase()
    if (/^[A-Z]{3}$/.test(trimmed)) {
        try {
            new Intl.NumberFormat('en-US', { style: 'currency', currency: trimmed })
            return trimmed
        } catch {
            return 'USD'
        }
    }
    return 'USD'
}

export function safeFormatCurrency(value: number, rawCurrency?: string, options?: Intl.NumberFormatOptions): string {
    const currency = sanitizeCurrencyCode(rawCurrency)
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
            ...options,
        }).format(value)
    } catch {
        return `$${value.toLocaleString()}`
    }
}

export function formatConfidencePercent(rawConfidence?: string | number | null): string {
    if (rawConfidence === undefined || rawConfidence === null) return 'Pending'
    const str = String(rawConfidence).trim()
    if (!str) return 'Pending'
    const cleaned = str.replace('%', '').trim()
    const num = Number(cleaned)
    if (!Number.isFinite(num)) return str
    if (num <= 1) {
        return `${Math.round(num * 100)}%`
    }
    return `${Math.round(num)}%`
}

export function calculateDocumentCost(doc?: Partial<SubmissionHistoryItem> | null): number {
    if (!doc) return 0.0018
    if (typeof doc.costUsd === 'number' && doc.costUsd > 0) {
        return doc.costUsd
    }
    const inputTokens = doc.inputTokens || 12400
    const outputTokens = doc.outputTokens || 1850
    const calculated = (inputTokens * 0.0000025) + (outputTokens * 0.000010)
    return calculated > 0 ? calculated : 0.0018
}

export function calculateBatchTotalCost(docs: Partial<SubmissionHistoryItem>[]): number {
    if (!docs || docs.length === 0) return 0.0072
    return docs.reduce((sum, doc) => sum + calculateDocumentCost(doc), 0)
}

export function calculateSynthesisCost(synth?: { costUsd?: number; inputTokens?: number; outputTokens?: number } | null): number {
    if (!synth) return 0.0142
    if (typeof synth.costUsd === 'number' && synth.costUsd > 0) {
        return synth.costUsd
    }
    const inputTokens = synth.inputTokens || 22500
    const outputTokens = synth.outputTokens || 3200
    const calculated = (inputTokens * 0.0000025) + (outputTokens * 0.000010)
    return calculated > 0 ? calculated : 0.0142
}

export function createUnusedProjectId(usedProjectIds: Iterable<string> = []) {
    const used = new Set(
        Array.from(usedProjectIds, (id) => id.trim().toLowerCase()).filter((id) => id.length > 0)
    )

    let candidate = ''
    do {
        const randomSuffix = typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10)
        candidate = 'project-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + randomSuffix
    } while (used.has(candidate.toLowerCase()))

    return candidate
}

export const terminalBatchStatuses = new Set(['completed', 'failed', 'error', 'rejected', 'needs_review', 'needs review'])

export const processingReachedStatuses = new Set([
    'queued',
    'uploading',
    'received',
    'pending',
    'processing',
    'running',
    'human review',
    'human_review',
    'needs review',
    'approved',
    ...terminalBatchStatuses,
])

export const activeSynthesisStatuses = new Set(['queued', 'pending', 'processing', 'running', 'synthesis_pending', 'synthesizing'])

export const PENDING_EXAMPLE_MODE_SUBMISSION_KEY = 'mergeworks.pendingExampleModeSubmission'

export type SubmitEnvironment = 'production' | 'test'

export type PendingExampleModeSubmission = {
    environment: SubmitEnvironment
    selectedProjectKey: string
    dealName: string
    askingPrice: string
    projectId: string
    projectStage: string
    documentType: string
    submissionNotes: string
    files: Array<{ name: string; size: number; type: string; base64: string }>
}

export function parseIllustrativeFacts(raw: string) {
    try {
        const parsed = JSON.parse(raw) as Record<string, { value?: number; status?: string }>
        const confirmed = (key: string) => parsed[key]?.status === 'confirmed' && typeof parsed[key]?.value === 'number' ? parsed[key].value ?? null : null
        return { revenue: confirmed('revenue'), ebitda: confirmed('ebitda_sde') }
    } catch {
        return { revenue: null, ebitda: null }
    }
}

export function hydrateModelFactsFromDocuments(model: DealModel, documents: SubmissionHistoryItem[]) {
    let merged: Record<string, Record<string, unknown>> = {}
    try {
        const parsed = JSON.parse(model.documentedFactsJson || '{}') as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) merged = parsed as Record<string, Record<string, unknown>>
    } catch { }

    const derived = deriveDocumentedFacts(documents)

    for (const [field, fact] of Object.entries(derived)) {
        const current = merged[field]
        const currentConfirmed = current?.status === 'confirmed' && typeof current.value === 'number'
        if (currentConfirmed) continue
        merged[field] = { ...fact }
    }

    return JSON.stringify(merged) === (model.documentedFactsJson || '{}') ? model : {
        ...model,
        documentedFactsJson: JSON.stringify(merged),
        documentedFactsStatus: model.documentedFactsStatus || 'Temporarily hydrated from completed documents',
    }
}

export function buildReturnsDisplayModel(model: DealModel) {
    let facts: Record<string, Record<string, unknown>> = {}
    try {
        const parsed = JSON.parse(model.documentedFactsJson || '{}') as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) facts = parsed as Record<string, Record<string, unknown>>
    } catch { }
    const confirmedNumber = (field: string) => facts[field]?.status === 'confirmed' && typeof facts[field]?.value === 'number'
    const hasEbitda = confirmedNumber('ebitda_sde')
    const hasRevenue = confirmedNumber('revenue')

    const fallbackBase = {
        askingPrice: model.askingPrice ?? 1_000_000,
        purchasePrice: model.purchasePrice ?? model.askingPrice ?? 1_000_000,
        transactionFees: model.transactionFees ?? 10_000,
        workingCapitalRequirement: model.workingCapitalRequirement ?? 20_000,
        holdPeriodYears: model.holdPeriodYears ?? 5,
        taxRate: model.taxRate ?? 0.25,
        maintenanceCapex: model.maintenanceCapex ?? 10_000,
        exitMultiple: model.exitMultiple ?? 4,
        exitCosts: model.exitCosts ?? 16_000,
        equityContributionPercent: model.equityContributionPercent ?? 0.3,
        interestRate: model.interestRate ?? 0.1,
        amortizationYears: model.amortizationYears ?? 10,
        sellerNoteAmount: model.sellerNoteAmount ?? 0,
        bearRevenueGrowth: model.bearRevenueGrowth ?? 0,
        baseRevenueGrowth: model.baseRevenueGrowth ?? 0.05,
        bullRevenueGrowth: model.bullRevenueGrowth ?? 0.1,
        bearEbitdaMargin: model.bearEbitdaMargin ?? 0.15,
        baseEbitdaMargin: model.baseEbitdaMargin ?? 0.2,
        bullEbitdaMargin: model.bullEbitdaMargin ?? 0.25,
        bearExitMultiple: model.bearExitMultiple ?? 3,
        baseExitMultiple: model.baseExitMultiple ?? 4,
        bullExitMultiple: model.bullExitMultiple ?? 5,
    }

    const merged = { ...model }
    for (const [key, val] of Object.entries(fallbackBase)) {
        if (merged[key as keyof DealModel] == null) {
            ; (merged as Record<string, unknown>)[key] = val
        }
    }

    merged.documentedFactsJson = JSON.stringify({
        ...facts,
        revenue: hasRevenue ? facts.revenue : { value: 1_000_000, status: 'illustrative', currency: 'USD', period: 'Display preview', provenance: 'Illustrative preview' },
        ebitda_sde: hasEbitda ? facts.ebitda_sde : { value: 200_000, status: 'illustrative', currency: 'USD', period: 'Display preview', provenance: 'Illustrative preview' },
    })

    return merged as DealModel
}

export function withDerivedCapitalStack(model: DealModel): DealModel {
    const price = model.purchasePrice ?? model.askingPrice
    const hasFinancingInputs =
        model.equityContributionPercent != null ||
        model.sellerNoteAmount != null ||
        model.debtAssumed != null
    if (price == null || price <= 0 || !hasFinancingInputs) return model

    const equityPct = model.equityContributionPercent ?? 0.3
    const equity = Math.max(0, price * equityPct)
    const sellerNote = model.sellerNoteAmount ?? 0
    const seniorDebt = Math.max(0, price - equity - sellerNote)

    return {
        ...model,
        equityAmount: equity,
        seniorDebtAmount: seniorDebt,
        loanTermYears: model.amortizationYears ?? model.loanTermYears ?? null,
    }
}

export function hasReachedProcessingStage(status: string) {
    return processingReachedStatuses.has(status.trim().toLowerCase())
}

export function isDuplicateProjectDocument(file: File, projectId: string, rows: SubmissionHistoryItem[]) {
    const normalizedProjectId = projectId.trim().toLowerCase()
    const normalizedFileName = file.name.trim().toLowerCase()

    return rows.some((row) => {
        return row.projectId.trim().toLowerCase() === normalizedProjectId
            && row.fileName.trim().toLowerCase() === normalizedFileName
            && row.fileSize === file.size
    })
}

export function formatElapsedDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return minutes > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${remainingSeconds}s`
}

export type SubmitWebhookResponse = {
    requestID?: string
    status?: string
    receivedAt?: string
    id?: number
    createdAt?: string
    updatedAt?: string
}

export type SubmissionBatch = {
    id: string
    expectedDocumentCount: number
    environment: SubmitEnvironment
    startedAt: number
    endedAt?: number
    stoppedAt?: number
}
