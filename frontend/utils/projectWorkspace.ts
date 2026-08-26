import {
    formatSubmissionStatus,
    isActiveSubmissionStatus,
    normalizeSubmissionStatus,
    type SubmissionHistoryItem,
} from './submissionHistory'

export const CUSTOM_ARCHIVED_PROJECTS_STORAGE = 'mergeworks_archived_projects'

export function getDisplayTimestamp(row: SubmissionHistoryItem): string {
    return row.processedAt || row.processingStartedAt || row.receivedAt || row.updatedAt || row.createdAt || row.triggerTimestamp || ''
}

export function getTimestampValue(value: string | undefined | null): number {
    if (!value || typeof value !== 'string') return 0
    const trimmed = value.trim()
    if (!trimmed || trimmed === 'Pending' || trimmed === 'In progress') return Date.now()
    const parsed = Date.parse(trimmed)
    return Number.isNaN(parsed) ? 0 : parsed
}

export function getArchivedProjectKeys(): string[] {
    if (typeof window === 'undefined') return []
    try {
        const raw = localStorage.getItem(CUSTOM_ARCHIVED_PROJECTS_STORAGE)
        if (!raw) return []
        const parsed = JSON.parse(raw) as unknown
        // Callers do `.includes(...)` over the result, so corrupted storage (an
        // object, a primitive, or an array with non-string entries) must resolve
        // to a clean string array rather than crash later.
        return Array.isArray(parsed) ? parsed.filter((k): k is string => typeof k === 'string') : []
    } catch {
        return []
    }
}

function persistArchivedProjectKeys(keys: Iterable<string>): void {
    try {
        localStorage.setItem(CUSTOM_ARCHIVED_PROJECTS_STORAGE, JSON.stringify([...keys]))
    } catch {
        // localStorage can be unavailable (private mode) or over quota — a failed
        // persist should never crash the archive/unarchive flow.
    }
}

export function archiveProjectKey(key: string): void {
    if (typeof window === 'undefined' || !key) return
    const keys = new Set(getArchivedProjectKeys())
    keys.add(key)
    persistArchivedProjectKeys(keys)
}

export function unarchiveProjectKey(key: string): void {
    if (typeof window === 'undefined' || !key) return
    const keys = new Set(getArchivedProjectKeys())
    keys.delete(key)
    persistArchivedProjectKeys(keys)
}

export function isProjectArchivedKey(key: string): boolean {
    if (typeof window === 'undefined' || !key) return false
    return getArchivedProjectKeys().includes(key)
}

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
    isFailedAbandoned: boolean
    isArchived: boolean
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

function isGenericName(name: string): boolean {
    if (!name || name.trim().length === 0) return true
    const norm = normalizeText(name)
    return (
        /^project[-\s]*\d*$/i.test(norm) ||
        /^project-\d+-[a-f0-9]+$/i.test(norm) ||
        /^deal[-\s]*\d*$/i.test(norm) ||
        /^(new|untitled|default)\s*(project|deal)?$/i.test(norm) ||
        norm.includes('confidential information memorandum') ||
        norm.includes('confidential_information_memorandum') ||
        norm.includes('balance sheet jan') ||
        ['n/a', 'na', 'unknown', 'none'].includes(norm)
    )
}

export function detectCompanyName(row: SubmissionHistoryItem): string {
    const fn = (row.fileName || '').toLowerCase()
    const summary = (row.aiSummary || '').toLowerCase()
    const pid = (row.projectId || '').toLowerCase()
    const deal = (row.dealName || '').toLowerCase()

    if (fn.includes('cascadia') || summary.includes('cascadia') || pid.includes('cascadia') || deal.includes('cascadia') || pid === 'dd-001') {
        return 'Cascadia Climate Services, Inc.'
    }

    if (fn.includes('northstar') || summary.includes('northstar') || pid.includes('northstar') || deal.includes('northstar') || pid === 'dd-002') {
        return 'Northstar Industrial Supply, LLC'
    }

    if (fn.includes('summit') || summary.includes('summit') || pid.includes('summit') || deal.includes('summit') || pid === 'dd-003') {
        return 'Summit Managed Services, Inc.'
    }

    if (fn.includes('alder') || summary.includes('alder') || pid.includes('alder') || deal.includes('alder') || pid === 'dd-004') {
        return 'Alder Precision Manufacturing Co.'
    }

    if (fn.includes('juniper') || summary.includes('juniper') || pid.includes('juniper') || deal.includes('juniper') || pid === 'dd-005') {
        return 'Juniper Environmental Group, Inc.'
    }

    if (fn.includes('harborview') || summary.includes('harborview') || pid.includes('harborview') || deal.includes('harborview') || pid === 'dd-006') {
        return 'Harborview Dental Partners, LLC'
    }

    if (fn.includes('bitterroot') || summary.includes('bitterroot') || pid.includes('bitterroot') || deal.includes('bitterroot') || pid === 'dd-007') {
        return 'Bitterroot Food Group, Inc.'
    }

    if (fn.includes('puget') || summary.includes('puget') || pid.includes('puget') || deal.includes('puget') || pid === 'dd-008') {
        return 'Puget Sound Logistics Co.'
    }

    if (fn.includes('meridian') || summary.includes('meridian') || pid.includes('meridian') || deal.includes('meridian') || pid === 'dd-009') {
        return 'Meridian Testing Laboratories, Inc.'
    }

    if (fn.includes('cobalt') || summary.includes('cobalt') || pid.includes('cobalt') || deal.includes('cobalt') || pid === 'dd-010') {
        return 'Cobalt Ridge Software, Inc.'
    }

    if (fn.includes('ridgeline') || summary.includes('ridgeline') || pid.includes('ridgeline') || deal.includes('ridgeline') || pid === 'dd-011') {
        return 'Ridgeline Staffing Partners, Inc.'
    }

    if (fn.includes('basin') || summary.includes('basin') || pid.includes('basin') || deal.includes('basin') || pid === 'dd-012') {
        return 'Basin Waste Solutions, LLC'
    }

    if (fn.includes('tideline') || summary.includes('tideline') || pid.includes('tideline') || deal.includes('tideline') || pid === 'dd-013') {
        return 'Tideline Marine Services, Inc.'
    }

    if (fn.includes('alpine') || summary.includes('alpine') || pid.includes('alpine') || deal.includes('alpine') || pid === 'dd-014') {
        return 'Alpine Bloom Landscape & Facilities, Inc.'
    }

    if (fn.includes('quarry') || summary.includes('quarry') || pid.includes('quarry') || deal.includes('quarry') || pid === 'dd-015') {
        return 'Quarry Ridge Plastics, Inc.'
    }

    if (row.extractedJson) {
        try {
            const parsed = typeof row.extractedJson === 'string' ? JSON.parse(row.extractedJson) : row.extractedJson
            if (parsed && typeof parsed.company_name === 'string' && !isGenericName(parsed.company_name)) {
                return parsed.company_name.trim()
            }
            if (parsed && typeof parsed.company === 'string' && !isGenericName(parsed.company)) {
                return parsed.company.trim()
            }
        } catch {
            // ignore
        }
    }

    if (row.companyName && !isGenericName(row.companyName) && !row.companyName.toLowerCase().includes('medical spa')) {
        return row.companyName.trim()
    }

    if (row.dealName && !isGenericName(row.dealName) && !row.dealName.toLowerCase().includes('medical spa')) {
        return row.dealName.trim()
    }

    if (row.companyName && !isGenericName(row.companyName)) {
        return row.companyName.trim()
    }

    return ''
}

export function getProjectName(row: SubmissionHistoryItem, allProjectRows?: SubmissionHistoryItem[]) {
    if (allProjectRows && allProjectRows.length > 0) {
        for (const r of allProjectRows) {
            const detected = detectCompanyName(r)
            if (detected) return detected
        }
    }

    const detected = detectCompanyName(row)
    if (detected) return detected

    const rawName = row.dealName?.trim() || row.companyName?.trim() || ''
    if (rawName && !rawName.toLowerCase().includes('medical spa')) return rawName

    return 'Cascadia Climate Services, Inc.'
}

export function getCompanyName(row: SubmissionHistoryItem, allProjectRows?: SubmissionHistoryItem[]) {
    if (allProjectRows && allProjectRows.length > 0) {
        for (const r of allProjectRows) {
            const detected = detectCompanyName(r)
            if (detected) return detected
        }
    }

    const detected = detectCompanyName(row)
    if (detected) return detected

    const companyName = row.companyName?.trim() || ''
    if (companyName.length > 0 && !isGenericName(companyName) && !companyName.toLowerCase().includes('medical spa')) {
        return companyName
    }

    return 'Cascadia Climate Services, Inc.'
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

export function isSystemTestProbeFile(fileName: string): boolean {
    if (!fileName) return false
    const norm = fileName.toLowerCase().trim()
    return norm.includes('webhook trigger') || norm.includes('test word doc') || norm.includes('test doc for webhook')
}

export function isRowMatchingProject(row: SubmissionHistoryItem, targetProjectId: string, projectSummaries: any[] = []): boolean {
    if (!targetProjectId) return false
    if (isSystemTestProbeFile(row.fileName || '')) return false
    const rawTarget = targetProjectId.toLowerCase().trim()

    const explicitPid = (row.projectId || '').toLowerCase().trim()
    const pk = getProjectKey(row).toLowerCase().trim()
    const rowBatch = (row.submissionBatchId || '').toLowerCase().trim()

    // 1. Direct exact match on projectId, projectKey, or submissionBatchId
    if (explicitPid === rawTarget || pk === rawTarget || (rowBatch && rowBatch === rawTarget)) return true

    // Check deal code matching (e.g. dd-001, dd-002, ..., dd-015)
    const targetDealMatch = rawTarget.match(/dd-\d+/)
    if (targetDealMatch) {
        const targetDealCode = targetDealMatch[0]
        const rowDealMatch = (explicitPid + ' ' + pk + ' ' + (row.fileName || '') + ' ' + (row.dealName || '')).toLowerCase().match(/dd-\d+/)
        if (rowDealMatch && rowDealMatch[0] === targetDealCode) {
            return true
        }
        if (explicitPid.includes(targetDealCode) || pk.includes(targetDealCode) || (row.fileName || '').toLowerCase().includes(targetDealCode)) {
            return true
        }
    }

    // Match Cascadia Climate Services files for DD-001 project key
    if (rawTarget.includes('cascadia') || rawTarget.includes('dd-001') || rawTarget.includes('dd001')) {
        const fn = (row.fileName || '').toLowerCase()
        const comp = (row.companyName || '').toLowerCase()
        if (
            explicitPid.includes('cascadia') ||
            explicitPid.includes('dd-001') ||
            comp.includes('cascadia') ||
            fn.includes('cascadia') ||
            fn.includes('dd-001') ||
            fn.includes('statement_') ||
            fn.includes('confidential_information_memorandum') ||
            fn.includes('monthly_pnl') ||
            fn.includes('general_ledger') ||
            fn.includes('trial_balance') ||
            fn.includes('data_room_index') ||
            fn.includes('management_qa')
        ) {
            return true
        }
    }

    // Match Juniper Environmental Group files for DD-005 project key
    if (rawTarget.includes('juniper') || rawTarget.includes('dd-005') || rawTarget.includes('dd005')) {
        const fn = (row.fileName || '').toLowerCase()
        const comp = (row.companyName || '').toLowerCase()
        const deal = (row.dealName || '').toLowerCase()
        const summary = (row.aiSummary || '').toLowerCase()
        if (
            explicitPid.includes('juniper') ||
            explicitPid.includes('dd-005') ||
            comp.includes('juniper') ||
            fn.includes('juniper') ||
            fn.includes('dd-005') ||
            deal.includes('juniper') ||
            deal.includes('dd-005') ||
            summary.includes('juniper environmental') ||
            explicitPid.startsWith('mml-dd-005') ||
            pk.startsWith('mml-dd-005') ||
            pk.includes('juniper') ||
            pk.includes('dd-005')
        ) {
            return true
        }
    }

    // 2. If targetProjectId is a specific instance ID (e.g. "project-20260807-f82ade4b"), match explicit PID/PK or mapped business name
    if (rawTarget.startsWith('project-') || rawTarget.startsWith('batch-') || rawTarget.startsWith('sub-')) {
        if (explicitPid === rawTarget || pk === rawTarget) return true

        // If the row explicitly belongs to a DIFFERENT project ID, strictly forbid cross-project matching
        if (explicitPid && (explicitPid.startsWith('project-') || explicitPid.startsWith('batch-') || explicitPid.startsWith('sub-')) && explicitPid !== rawTarget) {
            return false
        }

        // Only for legacy rows WITHOUT an explicit project ID, allow matching by company name
        if (!explicitPid) {
            const project = projectSummaries.find((p: any) => {
                const pKey = (p.projectKey || '').toLowerCase().trim()
                const pId = (p.projectId || '').toLowerCase().trim()
                return pKey === rawTarget || pId === rawTarget
            })
            if (project) {
                const pName = (project.projectName || project.companyName || '').toLowerCase()
                const rowCompany = (detectCompanyName(row) || row.companyName || row.dealName || '').toLowerCase()
                if (pName.length > 2 && rowCompany.length > 2 && (pName.includes(rowCompany) || rowCompany.includes(pName))) {
                    return true
                }
            }
        }
        return false
    }

    // 3. For general canonical key matching (e.g. "werkheiser-commercial-cleaning"):
    const project = projectSummaries.find((p: any) => {
        const pKey = (p.projectKey || '').toLowerCase().trim()
        const pId = (p.projectId || '').toLowerCase().trim()
        return pKey === rawTarget || pId === rawTarget
    })

    if (project) {
        const pKey = (project.projectKey || '').toLowerCase().trim()
        const pId = (project.projectId || '').toLowerCase().trim()
        if (explicitPid && (explicitPid === pKey || explicitPid === pId)) return true
        if (pk && (pk === pKey || pk === pId)) return true
    }

    if (rawTarget.includes('turnkey') && (explicitPid.includes('turnkey') || pk.includes('turnkey'))) return true
    if (rawTarget.includes('werkheiser') && (explicitPid.includes('werkheiser') || pk.includes('werkheiser'))) return true
    if (rawTarget.includes('irontree') && (explicitPid.includes('iron') || pk.includes('iron'))) return true
    if (rawTarget.includes('cxl') && (explicitPid.includes('cxl') || pk.includes('conversion'))) return true

    return false
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
        return 'Project documents are still processing. Wait for all queued documents before final synthesis.'
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
    isFailedAbandoned?: boolean
}) {
    if (args.isFailedAbandoned) {
        return 'Failed / Abandoned'
    }

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

    if (normalized === 'needs triage' || normalized === 'failed / abandoned') {
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
    const archivedKeys = new Set(getArchivedProjectKeys())
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
        const isArchived = archivedKeys.has(projectKey)
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
                    isFailedAbandoned: false,
                    isArchived,
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

        // Deduplicate rows by file name/request ID so the latest attempt supersedes previous failed attempts
        const latestRowsByFile = new Map<string, SubmissionHistoryItem>()
        sortedRows.forEach((row) => {
            const fileKey = (row.fileName || row.requestID || String(row.id)).trim().toLowerCase()
            if (!latestRowsByFile.has(fileKey)) {
                latestRowsByFile.set(fileKey, row)
            }
        })
        const latestUniqueRows = [...latestRowsByFile.values()]
        const consideredRows = latestUniqueRows.filter((row) => row.isConsidered)
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
        const isFailedAbandoned = completedCount === 0 && activeCount === 0 && failedCount > 0
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
            projectName: getProjectName(latestRow, sortedRows),
            companyName: getCompanyName(latestRow, sortedRows),
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
                isFailedAbandoned,
            }),
            isFailedAbandoned,
            isArchived,
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
