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
    return (
        row.riskLevel.trim().length > 0
        || row.category.trim().length > 0
        || row.trafficLight.trim().length > 0
        || row.ebitdaExtracted.trim().length > 0
        || row.extractedJson.trim().length > 0
        || row.aiSummary.trim().length > 0
        || row.aiTargetValue.trim().length > 0
        || row.aiConfidence.trim().length > 0
        || row.projectId.trim().length > 0
        || row.projectStage.trim().length > 0
        || row.documentType.trim().length > 0
        || row.valuationLowerBound.trim().length > 0
        || row.valuationBaseEstimate.trim().length > 0
        || row.valuationUpperBound.trim().length > 0
        || row.investmentBuyReasoning.trim().length > 0
        || row.needsHumanReview
    )
}
