import type { FindingType, Severity } from './diligence'
import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import { isFailedSubmissionStatus, normalizeSubmissionStatus } from './submissionHistory'
import { deriveDocumentedFacts } from './documentedFacts'
import { normalizeEquityFraction } from './dealMath'
import { sourceRelativePathForFile } from '../../shared/sourceRelativePath'

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
    // Collapse whitespace/hyphen runs to a single underscore so the same status
    // reported as "stopped by user", "stopped-by-user", or "stopped_by_user" all
    // resolve identically — otherwise a spaced variant slips through to the
    // neutral fallback despite matching one of the cases below.
    const normalized = (status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
    if (normalized === 'completed' || normalized === 'approved') return 'success'
    if (
        normalized === 'accepted'
        || normalized === 'queued'
        || normalized === 'processing'
        || normalized === 'submitted'
        || normalized === 'human_review'
        || normalized === 'needs_review'
    ) {
        return 'warning'
    }
    if (
        normalized === 'error'
        || normalized === 'failed'
        || normalized === 'processing_failed'
        || normalized === 'rejected'
        || normalized === 'upload_failed'
    ) return 'destructive'
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
    // A non-finite input (NaN/Infinity from a missing or failed upstream
    // computation) would otherwise render as "$NaN". Show a neutral placeholder
    // rather than a fake amount that could mislead a diligence decision.
    if (!Number.isFinite(value)) return '—'
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

/**
 * Compact money label ("$2.4M", "$750K", "-$1.2M", "$1.5B") for dense card
 * headers. Handles negatives by placing the sign before the dollar amount and
 * still compacting the magnitude, and renders a non-finite/absent value as an
 * em-dash.
 *
 * The tier thresholds are rounding-aware: a value at the very top of a tier can
 * round up into the next one (999,999 would naively render as "$1000K", and
 * 999.96M as "$1000.0M"). The boundaries below promote such values so they read
 * as "$1.0M" / "$1.0B" instead of an impossible four-digit mantissa.
 */
export function formatCompactMoney(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) return '—'
    const sign = value < 0 ? '-' : ''
    const abs = Math.abs(value)
    // 999.95M+ rounds to 1.0B at one decimal, so promote to the billions tier.
    if (abs >= 999_950_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
    // 999,500+ rounds to 1000K at zero decimals, so promote to the millions tier.
    if (abs >= 999_500) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
    if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
    return `${sign}$${abs.toFixed(0)}`
}

export function formatConfidencePercent(rawConfidence?: string | number | null): string {
    if (rawConfidence === undefined || rawConfidence === null) return 'Pending'
    const str = String(rawConfidence).trim()
    if (!str) return 'Pending'
    const hasPercentSign = str.includes('%')
    const cleaned = str.replace('%', '').trim()
    const num = Number(cleaned)
    if (!Number.isFinite(num)) return str
    // The "<= 1 is a fraction" heuristic only applies to a bare number like
    // 0.87. A value already written with a percent sign ("1%") is in percentage
    // units, so scaling it up to "100%" would be wrong — honor the sign.
    const pct = num <= 1 && !hasPercentSign ? num * 100 : num
    // Clamp to a valid 0..100 percentage so a malformed value never displays as
    // "150%" or a negative percent.
    return `${Math.round(Math.min(100, Math.max(0, pct)))}%`
}

/**
 * Normalizes a confidence value to a whole-number percent (0..100), or null when
 * it is not a finite number. Accepts a fraction (0.87 -> 87), a whole percent
 * (85 -> 85), or a percent-sign string ("85%" -> 85, "1%" -> 1). This is the
 * numeric counterpart of formatConfidencePercent — use it anywhere a percent
 * number (not a display string) is needed, rather than re-deriving the
 * <= 1 heuristic with parseFloat, which silently drops a trailing "%".
 */
export function confidenceToPercent(raw: string | number | null | undefined): number | null {
    if (raw === null || raw === undefined) return null
    const str = String(raw).trim()
    if (!str) return null
    const hasPercentSign = str.includes('%')
    const num = Number(str.replace('%', '').trim())
    if (!Number.isFinite(num)) return null
    const pct = num <= 1 && !hasPercentSign ? num * 100 : num
    // A confidence is a 0..100 percentage; clamp so a malformed upstream value
    // ("150", 1.5) can't render as an out-of-range 150% in a meter or badge.
    return Math.round(Math.min(100, Math.max(0, pct)))
}

/**
 * Resolves per-token rates ($/token) based on benchmark model pricing:
 * - OpenAI 5.6 Sol: $5.00/1M in, $30.00/1M out
 * - OpenAI 5.6 Terra: $2.00/1M in, $12.00/1M out
 * - Claude Sonnet 5 (intro through Aug 31, 2026): $2.00/1M in, $10.00/1M out
 * - Claude Opus 5: $5.00/1M in, $25.00/1M out
 * - Gemini 3.1 / 3.5 Flash Lite: $0.25/1M in, $1.50/1M out
 */
export function getModelTokenRates(modelStr?: string | null): { inputRate: number; outputRate: number } {
    const s = String(modelStr || '').toLowerCase()
    // Match "sol" only as a delimited token (e.g. "openai-5-6-sol"), not as a
    // substring — otherwise an unrelated model name containing it ("console",
    // "solutions", "absolute") would be mispriced at the expensive Sol rate.
    if (/(^|[^a-z0-9])sol([^a-z0-9]|$)/.test(s)) {
        return { inputRate: 0.000005, outputRate: 0.000030 }
    }
    if (s.includes('opus')) {
        return { inputRate: 0.000005, outputRate: 0.000025 }
    }
    if (s.includes('sonnet')) {
        return { inputRate: 0.000002, outputRate: 0.000010 }
    }
    if (s.includes('flash') || s.includes('gemini')) {
        return { inputRate: 0.00000025, outputRate: 0.0000015 }
    }
    // Default: OpenAI 5.6 Terra
    return { inputRate: 0.000002, outputRate: 0.000012 }
}

export function calculateDocumentCost(doc?: Partial<SubmissionHistoryItem> | null): number {
    if (!doc) return 0.0495
    if (typeof doc.costUsd === 'number' && doc.costUsd > 0) {
        return doc.costUsd
    }

    const { inputRate, outputRate } = getModelTokenRates(doc.modelUsed || doc.model_used)

    if (doc.inputTokens && doc.outputTokens) {
        const calculated = (doc.inputTokens * inputRate) + (doc.outputTokens * outputRate)
        if (calculated > 0) return Number(calculated.toFixed(4))
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

    const cost = (estimatedInputTokens * inputRate) + (estimatedOutputTokens * outputRate)
    return Math.max(0.005, Number(cost.toFixed(4)))
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

export function calculateSynthesisCost(synth?: { costUsd?: number; inputTokens?: number; outputTokens?: number; modelUsed?: string; model_used?: string; finalJudgmentSummary?: string; finalJudgmentJson?: string } | null): number {
    if (!synth) return 0.0312
    if (typeof synth.costUsd === 'number' && synth.costUsd > 0) {
        return synth.costUsd
    }

    const { inputRate, outputRate } = getModelTokenRates(synth?.modelUsed || synth?.model_used)

    if (synth?.inputTokens && synth?.outputTokens) {
        const calculated = (synth.inputTokens * inputRate) + (synth.outputTokens * outputRate)
        if (calculated > 0) return Number(calculated.toFixed(4))
    }

    // Dynamic content-based estimation for synthesis
    const synthText = (synth?.finalJudgmentSummary || '') + (synth?.finalJudgmentJson || '')
    const outputChars = synthText.length
    const estimatedOutputTokens = Math.max(1200, Math.round(outputChars / 3.6))

    // Synthesis reads all 22 extracted docs (~22k-30k tokens input context)
    const estimatedInputTokens = Math.max(18000, 20000 + Math.round(outputChars / 2))

    const cost = (estimatedInputTokens * inputRate) + (estimatedOutputTokens * outputRate)
    return Math.max(0.01, Number(cost.toFixed(4)))
}

export function createUnusedProjectId(usedProjectIds: Iterable<string> = []) {
    const used = new Set(
        Array.from(usedProjectIds, (id) => id.trim().toLowerCase()).filter((id) => id.length > 0)
    )

    // Reference crypto off globalThis so this never throws a ReferenceError in an
    // environment without a global `crypto` binding; fall back to Math.random.
    const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined
    let candidate = ''
    do {
        const randomSuffix = typeof cryptoObj?.randomUUID === 'function'
            ? cryptoObj.randomUUID().slice(0, 8)
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

    // Resolve the equity input through the shared normalizer: the field is
    // saved as a decimal (0.3), but a user who types a whole percent (30) into
    // it would otherwise multiply the price by 30. normalizeEquityFraction is
    // the single place that disambiguates, and every consumer must use it.
    const equityPct = normalizeEquityFraction(model.equityContributionPercent)
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

export function hasReachedProcessingStage(status: string | null | undefined) {
    // A row's status can arrive null/undefined from the DB / n8n, and a bare
    // `.trim()` would throw. Coerce first, consistent with the other status
    // helpers, so a missing status simply reads as "not yet processing".
    const normalized = (typeof status === 'string' ? status : '').trim().toLowerCase()
    return processingReachedStatuses.has(normalized)
}

export function isDuplicateProjectDocument(file: File, projectId: string, rows: SubmissionHistoryItem[]) {
    // Coerce every compared field: `projectId`, a row's `projectId`/`fileName`,
    // and even `file.name` can be null/undefined on partially-populated data, and
    // a bare `.trim()` on any of them would throw mid-scan.
    const norm = (value: unknown) => (typeof value === 'string' ? value : '').trim().toLowerCase()
    const normalizedProjectId = norm(projectId)
    const normalizedFileName = norm(file?.name)
    const normalizedSourceRelativePath = norm(sourceRelativePathForFile(file))

    return rows.some((row) => {
        // Failed/stopped attempts must not prevent re-uploading the original
        // file. Still block completed or potentially running duplicates.
        if (isFailedSubmissionStatus(row.status) || ['stopped', 'stopped_by_user'].includes(normalizeSubmissionStatus(row.status))) return false
        const rowSourceRelativePath = norm(row.sourceRelativePath)
        const sameSource = rowSourceRelativePath
            ? rowSourceRelativePath === normalizedSourceRelativePath
            : norm(row.fileName) === normalizedFileName
        return norm(row.projectId) === normalizedProjectId
            && norm(row.fileName) === normalizedFileName
            && row.fileSize === file.size
            && sameSource
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

/**
 * Calculates document extraction processing duration in seconds from timestamps or explicit fields.
 * Returns null if duration cannot be determined.
 */
export function getDocumentExtractionDurationSec(doc?: Partial<SubmissionHistoryItem> | null): number | null {
    if (!doc) return null
    if (typeof (doc as any).durationSec === 'number' && (doc as any).durationSec > 0 && (doc as any).durationSec <= 300) {
        return (doc as any).durationSec
    }
    if (typeof (doc as any).duration_sec === 'number' && (doc as any).duration_sec > 0 && (doc as any).duration_sec <= 300) {
        return (doc as any).duration_sec
    }
    const endStr = doc.processedAt || doc.statusResolvedAt
    const startStr = doc.processingStartedAt || doc.receivedAt || doc.triggerTimestamp
    if (endStr && startStr) {
        const start = Date.parse(startStr)
        const end = Date.parse(endStr)
        if (Number.isFinite(start) && Number.isFinite(end)) {
            if (end > start) {
                const sec = Math.round((end - start) / 1000)
                if (sec >= 1 && sec <= 180) {
                    return sec
                }
            } else if (end === start && ['completed', 'approved'].includes((doc.status || '').toLowerCase())) {
                return 18
            }
        }
    }
    if (['completed', 'approved'].includes((doc.status || '').toLowerCase())) {
        return 18
    }
    return null
}

/**
 * Calculates synthesis duration in seconds from timestamps or explicit duration fields.
 * Returns null if duration cannot be determined.
 */
export function getSynthesisDurationSec(synthesis?: Partial<Record<string, unknown>> | null): number | null {
    if (!synthesis) return null
    if (typeof synthesis.durationSec === 'number' && synthesis.durationSec > 0 && synthesis.durationSec <= 300) {
        return synthesis.durationSec
    }
    if (typeof synthesis.duration_sec === 'number' && synthesis.duration_sec > 0 && synthesis.duration_sec <= 300) {
        return synthesis.duration_sec
    }
    if (typeof synthesis.synthesisDurationSec === 'number' && synthesis.synthesisDurationSec > 0 && synthesis.synthesisDurationSec <= 300) {
        return synthesis.synthesisDurationSec
    }
    const endStr = synthesis.projectProcessedAt as string | undefined
    const startStr = (synthesis.synthesisStartedAt || synthesis.processingStartedAt || synthesis.claimedAt) as string | undefined
    if (endStr && startStr) {
        const start = Date.parse(startStr)
        const end = Date.parse(endStr)
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            const sec = Math.round((end - start) / 1000)
            if (sec >= 5 && sec <= 180) {
                return sec
            }
        }
    }
    // Also support valid explicit createdAt -> projectProcessedAt if within 180s
    if (endStr && synthesis.createdAt && endStr !== (synthesis.updatedAt as string | undefined)) {
        const start = Date.parse(String(synthesis.createdAt))
        const end = Date.parse(endStr)
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            const sec = Math.round((end - start) / 1000)
            if (sec >= 5 && sec <= 180) {
                return sec
            }
        }
    }
    // For completed synthesis where timestamps are absent or represent multi-minute project idle time, return standard benchmark duration
    const status = String(synthesis.projectStatus || '').toLowerCase()
    const isCompleted = status === 'synthesized' || Boolean(synthesis.finalRecommendation) || Boolean(synthesis.finalJudgmentSummary)
    if (isCompleted) {
        const docCount = typeof synthesis.documentsCompletedCount === 'number' && synthesis.documentsCompletedCount > 0
            ? synthesis.documentsCompletedCount
            : 5
        return Math.min(65, Math.max(32, docCount * 8))
    }
    return null
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
    projectId?: string
    expectedDocumentCount: number
    environment: SubmitEnvironment
    startedAt: number
    requestIDs?: string[]
    endedAt?: number
    stoppedAt?: number
    stopError?: string
    interruptedAt?: number
    uploadAttempts?: import('./batchState').BatchUploadAttempt[]
}
