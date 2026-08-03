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
])

const stoppedSubmissionStatuses = new Set([
    'stopped',
    'stopped_by_user',
])

export function normalizeSubmissionStatus(status: string) {
    return status.trim().toLowerCase()
}

export function isActiveSubmissionStatus(status: string) {
    return activeSubmissionStatuses.has(normalizeSubmissionStatus(status))
}

export function isStoppedSubmissionStatus(status: string) {
    return stoppedSubmissionStatuses.has(normalizeSubmissionStatus(status))
}

export function formatSubmissionStatus(status: string) {
    const trimmed = status.trim()

    if (trimmed.length === 0) {
        return 'Unknown'
    }

    return trimmed
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
