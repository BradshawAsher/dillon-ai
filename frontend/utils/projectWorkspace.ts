import {
    formatSubmissionStatus,
    isActiveSubmissionStatus,
    normalizeSubmissionStatus,
    type SubmissionHistoryItem,
} from './submissionHistory'

type ProjectCoverageItem = {
    label: string
    count: number
    matched: boolean
}

type ProjectDocumentSummary = {
    fileName: string
    documentType: string
    status: string
    requestID: string
    processedAt: string
    isConsidered: boolean
}

type ProjectSynthesisField = {
    label: string
    value: string
}

export type ProjectSummary = {
    projectKey: string
    projectId: string
    projectName: string
    companyName: string
    stage: string
    workstream: string
    latestActivity: string
    documentCount: number
    completedCount: number
    activeCount: number
    failedCount: number
    reviewCount: number
    redRiskCount: number
    highRiskCount: number
    documentTypes: string[]
    documents: ProjectDocumentSummary[]
    coverage: ProjectCoverageItem[]
    recommendation: string
    statusLabel: string
    synthesisFields: ProjectSynthesisField[]
    employeeCount: number | null
    employeeType: string
    employeeAsOfDate: string
    employeeEvidenceStatus: string
    employeeCitation: string
    employeeConfidence: number | null
}

const requiredCoverageRules = [
    { label: 'P&L / income statement', keywords: ['p&l', 'income statement', 'profit and loss', 'comparative p&l'] },
    { label: 'Balance sheet', keywords: ['balance sheet', 'bs'] },
    { label: 'Financial model / valuation', keywords: ['financial model', 'valuation model', 'modelling', 'model'] },
    { label: 'Bank statements', keywords: ['bank', 'statement'] },
    { label: 'General ledger / trial balance', keywords: ['general ledger', 'trial balance', 'gl'] },
    { label: 'Add-back support', keywords: ['add-back', 'addback', 'adjustment', 'ebitda normalization'] },
    { label: 'Customer concentration / revenue detail', keywords: ['customer concentration', 'revenue detail', 'customer', 'sales by customer'] },
]

function normalizeText(value: string) {
    return value.trim().toLowerCase()
}

function getProjectName(row: SubmissionHistoryItem) {
    return row.dealName || row.companyName || 'Untitled project'
}

function getCompanyName(row: SubmissionHistoryItem) {
    const companyName = row.companyName.trim()
    return companyName.length > 0 && !['n/a', 'na', 'unknown'].includes(normalizeText(companyName))
        ? companyName
        : ''
}

export function getProjectKey(row: SubmissionHistoryItem) {
    const explicitProjectId = row.projectId.trim()

    if (explicitProjectId.length > 0) {
        return explicitProjectId
    }

    const dealName = normalizeText(row.dealName)
    const companyName = normalizeText(row.companyName)
    const fallback = `${dealName}::${companyName}`.trim()

    return fallback.length > 2 ? fallback : row.requestID || `row-${row.id}`
}

function getDisplayTimestamp(row: SubmissionHistoryItem) {
    return row.processedAt || row.processingStartedAt || row.receivedAt || row.updatedAt || row.createdAt || row.triggerTimestamp
}

function getTimestampValue(value: string) {
    if (value.length === 0) {
        return 0
    }

    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? 0 : parsed
}

function inferTypeFromFileName(fileName: string) {
    const name = normalizeText(fileName)
    const types: string[] = []
    if (name.includes('p&l') || name.includes('pnl') || name.includes('profit and loss') || name.includes('income statement')) {
        types.push('Profit and Loss Statement')
    }
    if (name.includes('balance sheet')) {
        types.push('Balance Sheet')
    }
    if (name.includes('model') || name.includes('modelling') || name.endsWith('.xlsm') || name.endsWith('.xlsx')) {
        types.push('Financial Model')
    }
    if (name.includes('add-back') || name.includes('ebitda') || name.includes('normalization')) {
        types.push('EBITDA Normalization')
    }
    if (name.includes('customer') || name.includes('concentration')) {
        types.push('Customer or Revenue Analysis')
    }
    return types
}

function getDocumentTypeLabels(row: SubmissionHistoryItem) {
    try {
        const detected = JSON.parse(row.detectedDocumentTypesJson || '')
        if (Array.isArray(detected) && detected.every((value) => typeof value === 'string') && detected.length > 0) {
            return detected.map((value) => value.trim()).filter(Boolean)
        }
    } catch {
        // Older rows do not have multi-type classification yet.
    }

    if (row.detectedDocumentType?.trim() && row.detectedDocumentType.trim() !== 'auto-detect') {
        return [row.detectedDocumentType.trim()]
    }

    const inferredFromFileName = inferTypeFromFileName(row.fileName)
    if (inferredFromFileName.length > 0) {
        return inferredFromFileName
    }

    if (row.documentType.trim().length > 0 && row.documentType.trim() !== 'auto-detect') {
        return [row.documentType.trim()]
    }

    if (row.fileType.trim().length > 0) {
        return [row.fileType.trim()]
    }

    return ['Unknown document']
}

function getDocumentTypeLabel(row: SubmissionHistoryItem) {
    return getDocumentTypeLabels(row).join(' + ')
}

function buildCoverage(documentTypes: string[]) {
    const normalizedTypes = documentTypes.map(normalizeText)

    return requiredCoverageRules.map((rule) => {
        const count = normalizedTypes.filter((documentType) => {
            return rule.keywords.some((keyword) => documentType.includes(keyword))
        }).length

        return {
            label: rule.label,
            count,
            matched: count > 0,
        }
    })
}

function getRecommendation(args: {
    failedCount: number
    activeCount: number
    reviewCount: number
    redRiskCount: number
    highRiskCount: number
    coverage: ProjectCoverageItem[]
}) {
    if (args.failedCount > 0) {
        return 'Resolve failed document processing before relying on project-level conclusions.'
    }

    if (args.activeCount > 0) {
        return 'Project dossier is still processing. Wait for all queued documents before final synthesis.'
    }

    const missingCoverageCount = args.coverage.filter((item) => !item.matched).length

    if (args.reviewCount > 0 || args.redRiskCount > 0 || args.highRiskCount > 0) {
        return 'Negotiation leverage identified. Reconcile flagged documents and prepare management follow-up requests.'
    }

    if (missingCoverageCount > 0) {
        return 'Project is partially assembled. Request the missing core diligence materials before final judgment.'
    }

    return 'Project has broad coverage and appears ready for cross-document synthesis and acquisition judgment.'
}

function getStatusLabel(args: {
    failedCount: number
    activeCount: number
    reviewCount: number
    completedCount: number
    documentCount: number
    hasSynthesis?: boolean
}) {
    if (args.activeCount > 0) {
        return 'In progress'
    }

    if (args.failedCount > 0) {
        return 'Needs triage'
    }

    if (args.reviewCount > 0) {
        return 'Needs review'
    }

    if (args.completedCount === 0) {
        return 'Awaiting processing'
    }

    if (args.hasSynthesis) {
        return 'Synthesized'
    }

    return 'Ready for synthesis'
}

function formatSynthesisLabel(key: string) {
    return key
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase())
}

function stringifySynthesisValue(value: unknown): string {
    if (typeof value === 'string') {
        return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    }

    if (value == null) {
        return '—'
    }

    if (Array.isArray(value)) {
        return value.map((item) => stringifySynthesisValue(item)).join(', ')
    }

    if (typeof value === 'object') {
        return JSON.stringify(value)
    }

    return '—'
}

function getProjectSynthesisFields(row: SubmissionHistoryItem) {
    const record = row as SubmissionHistoryItem & Record<string, unknown>
    const sourceFields = [
        record.projectLevelFields,
        record.projectLevelData,
        record.projectSynthesis,
        record.synthesisResult,
    ].filter((value): value is Record<string, unknown> => typeof value === 'object' && value !== null)

    const fields = sourceFields.flatMap((source) => Object.entries(source))
        .filter(([key, value]) => key && value !== undefined)
        .map(([key, value]) => ({
            label: formatSynthesisLabel(key),
            value: stringifySynthesisValue(value),
        }))

    const summary = [record.projectSynthesisSummary, record.projectLevelSummary, record.synthesisSummary]
        .find((value): value is string => typeof value === 'string' && value.trim().length > 0)

    if (summary) {
        return [{ label: 'Project summary', value: summary }, ...fields]
    }

    return fields
}

export function getProjectStatusVariant(statusLabel: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
    const normalized = normalizeText(statusLabel)

    if (normalized === 'ready for synthesis') {
        return 'success'
    }

    if (normalized === 'needs triage') {
        return 'destructive'
    }

    if (normalized === 'in progress' || normalized === 'needs review') {
        return 'warning'
    }

    return 'secondary'
}

export function createProjectSummaries(
    rows: SubmissionHistoryItem[],
    inFlightBatch?: { projectId: string; dealName?: string; projectStage?: string; expectedDocumentCount?: number } | null,
    syntheses?: Array<{ projectId: string; projectProcessedAt?: string; projectStatus?: string }>
): ProjectSummary[] {
    const rowsByProject = new Map<string, SubmissionHistoryItem[]>()

    rows.forEach((row) => {
        const projectKey = getProjectKey(row)
        const existingRows = rowsByProject.get(projectKey)

        if (existingRows) {
            existingRows.push(row)
            return
        }

        rowsByProject.set(projectKey, [row])
    })

    if (inFlightBatch?.projectId) {
        const key = getProjectKey({ projectId: inFlightBatch.projectId, dealName: inFlightBatch.dealName || '' } as SubmissionHistoryItem)
        if (!rowsByProject.has(key)) {
            rowsByProject.set(key, [])
        }
    }

    const summaries = [...rowsByProject.entries()].map(([projectKey, projectRows]) => {
        const sortedRows = [...projectRows].sort((left, right) => {
            return getTimestampValue(getDisplayTimestamp(right)) - getTimestampValue(getDisplayTimestamp(left))
        })
        const latestRow = sortedRows[0]

        if (!latestRow) {
            if (inFlightBatch && getProjectKey({ projectId: inFlightBatch.projectId, dealName: inFlightBatch.dealName || '' } as SubmissionHistoryItem) === projectKey) {
                const projName = inFlightBatch.dealName?.trim() || inFlightBatch.projectId
                return {
                    projectKey,
                    projectId: inFlightBatch.projectId,
                    projectName: projName,
                    companyName: projName,
                    stage: inFlightBatch.projectStage || 'post-loi',
                    workstream: 'All workstreams',
                    latestActivity: 'In progress',
                    documentCount: inFlightBatch.expectedDocumentCount || 1,
                    completedCount: 0,
                    activeCount: inFlightBatch.expectedDocumentCount || 1,
                    failedCount: 0,
                    reviewCount: 0,
                    redRiskCount: 0,
                    highRiskCount: 0,
                    documentTypes: ['In-flight submission'],
                    documents: [],
                    coverage: buildCoverage([]),
                    recommendation: 'In progress — batch processing is underway.',
                    statusLabel: 'Processing batch...',
                    synthesisFields: [],
                    employeeCount: null,
                    employeeType: '',
                    employeeAsOfDate: '',
                    employeeEvidenceStatus: '',
                    employeeCitation: '',
                    employeeConfidence: null,
                } satisfies ProjectSummary
            }
            return null
        }

        const consideredRows = sortedRows.filter((row) => row.isConsidered)
        const documentTypes = [...new Set(consideredRows.flatMap(getDocumentTypeLabels))]
        const completedCount = consideredRows.filter((row) => normalizeSubmissionStatus(row.status) === 'completed').length
        const activeCount = consideredRows.filter((row) => isActiveSubmissionStatus(row.status)).length
        const failedCount = consideredRows.filter((row) => {
            const normalizedStatus = normalizeSubmissionStatus(row.status)
            return normalizedStatus === 'failed' || normalizedStatus === 'error' || normalizedStatus === 'rejected'
        }).length
        const reviewCount = consideredRows.filter((row) => row.needsHumanReview).length
        const redRiskCount = consideredRows.filter((row) => normalizeText(row.trafficLight) === 'red').length
        const highRiskCount = consideredRows.filter((row) => normalizeText(row.riskLevel) === 'high').length
        const coverage = buildCoverage(documentTypes)
        const documents = sortedRows.map((row) => ({
            fileName: row.fileName || 'Unnamed document',
            documentType: getDocumentTypeLabel(row),
            status: row.status || 'pending',
            requestID: row.requestID || row.id?.toString() || 'unknown',
            processedAt: row.processedAt || row.processingStartedAt || row.receivedAt || row.updatedAt || row.createdAt || row.triggerTimestamp,
            isConsidered: row.isConsidered,
        }))
        const synthesisFields = getProjectSynthesisFields(latestRow)
        const employeeEvidence = ['confirmed', 'estimated']
            .flatMap((status) => consideredRows.filter((row) => {
                return normalizeText(row.employeeEvidenceStatus ?? '') === status
                    && typeof row.employeeCount === 'number'
                    && Number.isFinite(row.employeeCount)
            }))
            .at(0)

        const matchingSynth = syntheses?.find((s) => s.projectId === latestRow.projectId)
        const hasSynthesis = Boolean(
            matchingSynth
            && matchingSynth.projectProcessedAt
            && matchingSynth.projectStatus !== 'synthesis_refresh_failed'
            && matchingSynth.projectStatus !== 'synthesis_blocked'
        )

        return {
            projectKey,
            projectId: latestRow.projectId,
            projectName: getProjectName(latestRow),
            companyName: getCompanyName(latestRow),
            stage: latestRow.projectStage,
            workstream: latestRow.workstream || 'All workstreams',
            latestActivity: getDisplayTimestamp(latestRow) || 'Pending',
            documentCount: consideredRows.length,
            completedCount,
            activeCount,
            failedCount,
            reviewCount,
            redRiskCount,
            highRiskCount,
            documentTypes,
            documents,
            coverage,
            recommendation: getRecommendation({
                failedCount,
                activeCount,
                reviewCount,
                redRiskCount,
                highRiskCount,
                coverage,
            }),
            statusLabel: getStatusLabel({
                failedCount,
                activeCount,
                reviewCount,
                completedCount,
                documentCount: consideredRows.length,
                hasSynthesis,
            }),
            synthesisFields,
            employeeCount: employeeEvidence?.employeeCount ?? null,
            employeeType: employeeEvidence?.employeeType ?? '',
            employeeAsOfDate: employeeEvidence?.employeeAsOfDate ?? '',
            employeeEvidenceStatus: employeeEvidence?.employeeEvidenceStatus ?? '',
            employeeCitation: employeeEvidence?.employeeCitation ?? '',
            employeeConfidence: employeeEvidence?.employeeConfidence ?? null,
        } satisfies ProjectSummary
    }).filter((summary): summary is ProjectSummary => summary !== null)

    return summaries.sort((left, right) => {
        return getTimestampValue(right.latestActivity) - getTimestampValue(left.latestActivity)
    })
}

export function formatProjectStage(stage: string) {
    const trimmed = stage.trim()

    if (trimmed.length === 0) {
        return 'Stage not captured'
    }

    return formatSubmissionStatus(trimmed)
}
