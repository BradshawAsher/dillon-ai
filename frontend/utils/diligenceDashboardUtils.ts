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
    // A user/system-halted batch is an attention state, not a neutral one.
    if (normalized === 'stopped' || normalized === 'stopped_by_user') return 'warning'
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
    if (!doc) return 0.0495
    if (typeof doc.costUsd === 'number' && doc.costUsd > 0) {
        return doc.costUsd
    }

    if (doc.inputTokens && doc.outputTokens) {
        const calculated = (doc.inputTokens * 0.000003) + (doc.outputTokens * 0.000015)
        if (calculated > 0) return calculated
    }

    // Dynamic content-based estimation for documents
    const fileName = (doc.fileName || '').toLowerCase()
    const extractedStr = typeof doc.extractedJson === 'string' ? doc.extractedJson : JSON.stringify(doc.extractedJson || {})
    const summaryStr = doc.aiSummary || ''

    // Output tokens estimated from extracted JSON character length
    const outputChars = extractedStr.length + summaryStr.length
    const estimatedOutputTokens = Math.max(800, Math.round(outputChars / 3.8))

    // Base input tokens derived from file type & density
    let baseInputTokens = 12000
    if (fileName.includes('cim') || fileName.includes('memorandum') || fileName.includes('teaser') || fileName.includes('due_diligence_packet')) {
        baseInputTokens = 22000
    } else if (fileName.includes('general_ledger') || fileName.includes('trial_balance') || fileName.includes('pnl') || fileName.includes('balance_sheet')) {
        baseInputTokens = 14000
    } else if (fileName.includes('form_1120') || fileName.includes('reconciliation') || fileName.includes('qa')) {
        baseInputTokens = 11000
    } else if (fileName.includes('bank') || fileName.includes('statement') || fileName.includes('aging') || fileName.includes('master')) {
        baseInputTokens = 8500
    }

    const estimatedInputTokens = baseInputTokens + Math.min(10000, Math.round(extractedStr.length / 4))

    // Claude Sonnet 5 rates ($3.00/1M input, $15.00/1M output)
    const cost = (estimatedInputTokens / 1_000_000 * 3.0) + (estimatedOutputTokens / 1_000_000 * 15.0)
    return Math.max(0.015, Number(cost.toFixed(4)))
}

export function isDocumentCostEstimated(doc?: Partial<SubmissionHistoryItem> | null): boolean {
    if (!doc) return true
    return !(typeof doc.costUsd === 'number' && doc.costUsd > 0)
}

export function formatDocumentCostDisplay(doc?: Partial<SubmissionHistoryItem> | null): { formatted: string; isEstimate: boolean; rawCost: number } {
    const cost = calculateDocumentCost(doc)
    const isEstimate = isDocumentCostEstimated(doc)
    return {
        formatted: isEstimate ? `Est. $${cost.toFixed(4)}` : `$${cost.toFixed(4)}`,
        isEstimate,
        rawCost: cost,
    }
}

export function calculateBatchTotalCost(docs: Partial<SubmissionHistoryItem>[]): number {
    if (!docs || docs.length === 0) return 0.0072
    return docs.reduce((sum, doc) => sum + calculateDocumentCost(doc), 0)
}

export function calculateSynthesisCost(synth?: { costUsd?: number; inputTokens?: number; outputTokens?: number; finalJudgmentSummary?: string; finalJudgmentJson?: string } | null): number {
    if (!synth) return 0.0312
    if (typeof synth.costUsd === 'number' && synth.costUsd > 0) {
        return synth.costUsd
    }

    if (synth.inputTokens && synth.outputTokens) {
        const calculated = (synth.inputTokens * 0.0000025) + (synth.outputTokens * 0.000010)
        if (calculated > 0) return calculated
    }

    // Dynamic content-based estimation for synthesis
    const synthText = (synth?.finalJudgmentSummary || '') + (synth?.finalJudgmentJson || '')
    const outputChars = synthText.length
    const estimatedOutputTokens = Math.max(1200, Math.round(outputChars / 3.6))

    // Synthesis reads all 22 extracted docs (~22k-30k tokens input context)
    const estimatedInputTokens = Math.max(18000, 20000 + Math.round(outputChars / 2))

    // OpenAI 5.6 Terra rates ($2.50/1M input, $10.00/1M output)
    const cost = (estimatedInputTokens / 1_000_000 * 2.50) + (estimatedOutputTokens / 1_000_000 * 10.0)
    return Math.max(0.02, Number(cost.toFixed(4)))
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

    const priceFact = typeof merged.purchase_price?.value === 'number' ? (merged.purchase_price.value as number) : null
    const askingFact = typeof merged.asking_price?.value === 'number' ? (merged.asking_price.value as number) : null
    const multFact = typeof merged.ebitda_multiple?.value === 'number' ? (merged.ebitda_multiple.value as number) : null
    const revMultFact = typeof merged.revenue_multiple?.value === 'number' ? (merged.revenue_multiple.value as number) : null
    const debtFact = typeof merged.debt?.value === 'number' ? (merged.debt.value as number) : null
    const wcFact = typeof merged.target_working_capital?.value === 'number'
        ? (merged.target_working_capital.value as number)
        : typeof merged.working_capital?.value === 'number'
            ? (merged.working_capital.value as number)
            : null

    return {
        ...model,
        purchasePrice: model.purchasePrice ?? priceFact ?? askingFact,
        askingPrice: model.askingPrice ?? askingFact ?? priceFact,
        ebitdaMultiple: model.ebitdaMultiple ?? multFact,
        revenueMultiple: model.revenueMultiple ?? revMultFact,
        debtAssumed: model.debtAssumed ?? debtFact,
        workingCapitalRequirement: model.workingCapitalRequirement ?? wcFact,
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
    const revNum = hasRevenue ? (facts.revenue.value as number) : 1_000_000
    const ebitdaNum = hasEbitda ? (facts.ebitda_sde.value as number) : 200_000
    const historicalMargin = (revNum > 0 && ebitdaNum > 0) ? ebitdaNum / revNum : 0.20

    const resolvedPrice = model.purchasePrice ?? model.askingPrice ?? (hasEbitda ? Math.round(ebitdaNum * (model.ebitdaMultiple ?? 5.0)) : 1_000_000)

    const fallbackBase = {
        askingPrice: model.askingPrice ?? resolvedPrice,
        purchasePrice: resolvedPrice,
        transactionFees: model.transactionFees ?? Math.round(resolvedPrice * 0.01),
        workingCapitalRequirement: model.workingCapitalRequirement ?? 0,
        holdPeriodYears: model.holdPeriodYears ?? 5,
        taxRate: model.taxRate ?? 0.25,
        maintenanceCapex: model.maintenanceCapex ?? Math.round(ebitdaNum * 0.1),
        exitMultiple: model.exitMultiple ?? model.ebitdaMultiple ?? 5,
        exitCosts: model.exitCosts ?? Math.round(resolvedPrice * 0.015),
        equityContributionPercent: model.equityContributionPercent ?? 0.3,
        interestRate: model.interestRate ?? 0.1,
        amortizationYears: model.amortizationYears ?? 10,
        sellerNoteAmount: model.sellerNoteAmount ?? 0,
        bearRevenueGrowth: model.bearRevenueGrowth ?? 0,
        baseRevenueGrowth: model.baseRevenueGrowth ?? 0.05,
        bullRevenueGrowth: model.bullRevenueGrowth ?? 0.1,
        bearEbitdaMargin: model.bearEbitdaMargin ?? Number(Math.max(0.05, historicalMargin - 0.05).toFixed(4)),
        baseEbitdaMargin: model.baseEbitdaMargin ?? Number(historicalMargin.toFixed(4)),
        bullEbitdaMargin: model.bullEbitdaMargin ?? Number((historicalMargin + 0.05).toFixed(4)),
        bearExitMultiple: model.bearExitMultiple ?? Math.max(2, (model.ebitdaMultiple ?? 5) - 1),
        baseExitMultiple: model.baseExitMultiple ?? model.exitMultiple ?? model.ebitdaMultiple ?? 5,
        bullExitMultiple: model.bullExitMultiple ?? (model.ebitdaMultiple ?? 5) + 1,
    }

    const merged = { ...model }
    for (const [key, val] of Object.entries(fallbackBase)) {
        if (merged[key as keyof DealModel] == null) {
            ; (merged as Record<string, unknown>)[key] = val
        }
    }

    merged.documentedFactsJson = JSON.stringify({
        ...facts,
        revenue: hasRevenue ? facts.revenue : { value: revNum, status: 'illustrative', currency: 'USD', period: 'Display preview', provenance: 'Illustrative preview' },
        ebitda_sde: hasEbitda ? facts.ebitda_sde : { value: ebitdaNum, status: 'illustrative', currency: 'USD', period: 'Display preview', provenance: 'Illustrative preview' },
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
    // Guard against negative/NaN inputs (clock skew, unset timestamps).
    const totalSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const remainingSeconds = totalSeconds % 60

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`
    }
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
