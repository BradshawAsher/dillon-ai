export type SubmissionHistoryItem = {
    requestID: string
    dealName: string
    companyName: string
    workstream: string
    submissionNotes: string
    analystName: string
    analystEmail: string
    projectId: string
    projectStage: string
    documentType: string
    /** AI classification from the completed per-document analysis; preserves the intake selection above. */
    detectedDocumentType?: string
    /** JSON list of every material document type detected in one uploaded file. */
    detectedDocumentTypesJson?: string
    /** Deterministic CSV/table preflight result, when applicable. */
    tableStructureStatus?: string
    tableStructureIssues?: string
    detectedHeaderRow?: number
    columnMapConfidence?: number
    validatedColumnMap?: string
    /** Evidence-backed employee count; null means this document did not support one. */
    employeeCount?: number | null
    employeeType?: string
    employeeAsOfDate?: string
    employeeConfidence?: number | null
    employeeCitation?: string
    employeeEvidenceStatus?: string
    /** Cited facts and calculator output saved by the deterministic reconciliation step. */
    financialFactsJson?: string
    reconciliationJson?: string
    mathCheckStatus?: string
    submissionBatchId: string
    expectedBatchDocumentCount: number
    fileName: string
    fileSize: number
    fileType: string
    triggerTimestamp: string
    status: string
    environment: 'production' | 'test' | ''
    receivedAt: string
    processingStartedAt: string
    processedAt: string
    errorMessage: string
    riskLevel: string
    category: string
    trafficLight: string
    ebitdaExtracted: string
    revenueExtracted?: string
    needsHumanReview: boolean
    extractedJson: string
    storageFileId: string
    storageFileUrl: string
    aiSummary: string
    aiTargetValue: string
    aiVariance: string
    aiEscalationReason: string
    aiIntent: string
    aiCitations: string
    aiRedFlags: string
    aiYellowFlags: string
    aiGreenFlags: string
    aiConfidence: string
    valuationLowerBound: string
    valuationBaseEstimate: string
    valuationUpperBound: string
    valuationCurrency: string
    investmentIsFavorable: boolean | null
    investmentBuyReasoning: string
    isConsidered: boolean
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    costUsd?: number
    modelUsed?: string
    model_used?: string
    projectLevelFields?: Record<string, string | number | boolean | null | undefined>
    projectSynthesisSummary?: string
    projectSynthesisRecommendation?: string
    projectSynthesisConfidence?: string
    id: number
    createdAt: string
    updatedAt: string
}

const activeSubmissionStatuses = new Set([
    'accepted',
    'queued',
    'processing',
    'received',
    'running',
    'submitted',
    'uploading',
])

const stoppedSubmissionStatuses = new Set([
    'stopped',
    'stopped_by_user',
])

const failedSubmissionStatuses = new Set([
    'error',
    'failed',
    'processing_failed',
    'rejected',
    'upload_failed',
])

export function normalizeSubmissionStatus(status: string | null | undefined) {
    // Coerce first: DB / n8n rows can hand back null or a non-string status, and
    // a bare `.trim()` would throw. Matches the defensive coercion the variant
    // and date helpers already use.
    return (typeof status === 'string' ? status : status == null ? '' : String(status)).trim().toLowerCase()
}

// Membership lookups compare against underscore-delimited tokens (e.g.
// "stopped_by_user"). A source that reports the same status with spaces or
// hyphens ("Stopped By User") should still match, so collapse those to a
// single underscore for the comparison only.
function statusToken(status: string | null | undefined) {
    return normalizeSubmissionStatus(status).replace(/[\s-]+/g, '_')
}

export function isActiveSubmissionStatus(status: string | null | undefined) {
    return activeSubmissionStatuses.has(statusToken(status))
}

export function isStoppedSubmissionStatus(status: string | null | undefined) {
    return stoppedSubmissionStatuses.has(statusToken(status))
}

export function isFailedSubmissionStatus(status: string | null | undefined) {
    return failedSubmissionStatuses.has(statusToken(status))
}

export function isTerminalSubmissionStatus(status: string | null | undefined) {
    const token = statusToken(status)
    return token === 'completed'
        || token === 'approved'
        || failedSubmissionStatuses.has(token)
        || stoppedSubmissionStatuses.has(token)
}

export function formatSubmissionStatus(status: string | null | undefined) {
    const trimmed = (typeof status === 'string' ? status : status == null ? '' : String(status)).trim()

    if (trimmed.length === 0) {
        return 'Unknown'
    }

    // Lowercase first so an all-caps source status ("IN_PROGRESS", "COMPLETED")
    // becomes title case ("In Progress", "Completed") rather than staying shouty.
    return trimmed
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function hasAiEnrichment(row: SubmissionHistoryItem) {
    // DB / n8n rows can hand back null/undefined for any string column even
    // though the type says string, so guard each field rather than calling
    // `.trim()` on it directly — a bare `.trim()` on a null throws and takes
    // down the whole row render. Matches the defensive coercion the status and
    // date helpers already use.
    const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0
    return (
        hasText(row.riskLevel)
        || hasText(row.category)
        || hasText(row.trafficLight)
        || hasText(row.ebitdaExtracted)
        || hasText(row.extractedJson)
        || hasText(row.aiSummary)
        || hasText(row.aiTargetValue)
        || hasText(row.aiConfidence)
        || hasText(row.projectId)
        || hasText(row.projectStage)
        || hasText(row.documentType)
        || hasText(row.valuationLowerBound)
        || hasText(row.valuationBaseEstimate)
        || hasText(row.valuationUpperBound)
        || hasText(row.investmentBuyReasoning)
        || row.needsHumanReview === true
    )
}
