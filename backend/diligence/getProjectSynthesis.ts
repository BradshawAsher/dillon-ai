import { supabase } from '../supabaseClient'

type Params = {
    environment?: 'production' | 'test'
    projectId?: string
    limit?: number | string
}

export type ProjectStructuredFinding = {
    text: string
    confidence: number | null
    severity: string
    impact: string
    status: string
    citations: ProjectCitation[]
}

export type ProjectStructuredFindingGroups = {
    keyTakeaways: ProjectStructuredFinding[]
    redFlags: ProjectStructuredFinding[]
    yellowFlags: ProjectStructuredFinding[]
    greenFlags: ProjectStructuredFinding[]
    crossDocumentConflicts: ProjectStructuredFinding[]
    openQuestions: ProjectStructuredFinding[]
    negotiationLevers: ProjectStructuredFinding[]
    missingDocuments: ProjectStructuredFinding[]
}

export type ProjectCitation = {
    sourceFile: string
    sourceLocation: string
    excerpt: string
    period: string
    currency: string
    confidence: number | null
    status: string
}

export type ProjectSynthesisItem = {
    projectId: string
    letterOfIntentPresent?: boolean
    projectName?: string
    companyName?: string
    projectStatus: string
    documentsReceivedCount: number
    documentsCompletedCount: number
    missingDocuments: string[]
    crossDocumentConflicts: string[]
    openQuestions: string[]
    negotiationLevers: string[]
    keyTakeaways: string[]
    redFlags: string[]
    yellowFlags: string[]
    greenFlags: string[]
    citations: string[]
    citationDetails: ProjectCitation[]
    structuredFindings: ProjectStructuredFindingGroups
    finalRiskLevel: string
    finalTrafficLight: string
    finalRecommendation: string
    finalJudgmentSummary: string
    finalJudgmentJson: string
    finalJudgementJson?: string
    aiErrorMessage: string
    aiConfidence: string
    valuationConfidence: string
    investmentConfidence?: string
    valuationLowerBound: string
    valuationBaseEstimate: string
    valuationUpperBound: string
    valuationCurrency: string
    projectProcessedAt: string
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    costUsd?: number
    modelUsed?: string
    model_used?: string
    id: number
    createdAt: string
    updatedAt: string
    synthesis_version?: string
    red_flags?: string[]
    yellow_flags?: string[]
    green_flags?: string[]
    open_questions?: string[]
    askingPrice?: string
    asking_price?: string
    revenue?: string
    revenueUsd?: string
    ebitda?: string
    ebitdaUsd?: string
    impliedMultiple?: string
    multiple?: string
    valuationUsd?: string
    dealGrade?: string
    deal_grade?: string
    executiveSummary?: string
    aliases?: string[]
    renegotiationPoints?: string[]
}

// --- JSON parsing helpers (same logic as before, reads structured JSON from DB) ---

function getNumberOrNull(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') { const p = Number(value); return Number.isFinite(p) ? p : null }
    return null
}

function getRecordString(record: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        const value = record[key]
        if (typeof value === 'string' && value.trim().length > 0) return value.trim()
    }
    return ''
}

function getCitationFromRecord(record: Record<string, unknown>): ProjectCitation | null {
    const sourceFile = getRecordString(record, ['source_file', 'sourceFile', 'file_name', 'fileName'])
    if (!sourceFile) return null
    const page = record.page_number ?? record.pageNumber
    const explicitLocation = getRecordString(record, ['row_or_cell', 'rowOrCell', 'location'])
    const sourceLocation = explicitLocation || (typeof page === 'number' || typeof page === 'string' ? `Page ${page}` : '')
    return {
        sourceFile, sourceLocation,
        excerpt: getRecordString(record, ['excerpt']),
        period: getRecordString(record, ['period']),
        currency: getRecordString(record, ['currency']),
        confidence: getNumberOrNull(record.confidence_score ?? record.confidence),
        status: getRecordString(record, ['status']),
    }
}

function getStructuredFinding(record: Record<string, unknown>, fallbackStatus: string): ProjectStructuredFinding | null {
    const text = getRecordString(record, ['description', 'question', 'takeaway', 'suggestion', 'summary', 'text', 'theme', 'topic', 'label', 'title'])
    if (!text) return null
    const rawCitations = Array.isArray(record.citations) ? record.citations : []
    const citations = rawCitations
        .map((item) => (item && typeof item === 'object' ? getCitationFromRecord(item as Record<string, unknown>) : null))
        .filter((item): item is ProjectCitation => item !== null)
    return {
        text,
        confidence: getNumberOrNull(record.confidence_score ?? record.confidence),
        severity: getRecordString(record, ['severity', 'priority']),
        impact: getRecordString(record, ['impact']),
        status: getRecordString(record, ['status']) || fallbackStatus,
        citations,
    }
}

function getStructuredFindingsFromRaw(raw: unknown, fallbackStatus: string): ProjectStructuredFinding[] {
    let value = raw
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return []
        try { value = JSON.parse(trimmed) } catch { return [] }
    }
    if (!Array.isArray(value)) return []
    return value
        .map((item) => (item && typeof item === 'object' ? getStructuredFinding(item as Record<string, unknown>, fallbackStatus) : null))
        .filter((item): item is ProjectStructuredFinding => item !== null)
}

type ObjectListItemFormatter = (record: Record<string, unknown>) => string

function getStringListValue(raw: unknown, formatObject?: ObjectListItemFormatter): string[] {
    let value = raw
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed.length === 0) return []
        try { value = JSON.parse(trimmed) } catch {
            return trimmed.split(/\r?\n|;/).map((item) => item.trim()).filter((item) => item.length > 0)
        }
    }
    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') return item
                if (item && typeof item === 'object') {
                    const record = item as Record<string, unknown>
                    if (formatObject) return formatObject(record)
                    const candidate = record.summary ?? record.text ?? record.description ?? record.label
                    return typeof candidate === 'string' ? candidate : JSON.stringify(item)
                }
                return String(item)
            })
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
    }
    return []
}

function formatTakeaway(record: Record<string, unknown>) {
    const takeaway = getRecordString(record, ['takeaway', 'summary', 'text', 'description'])
    const impact = getRecordString(record, ['impact', 'why_it_matters'])
    return takeaway && impact ? `${takeaway} — ${impact}` : takeaway || impact
}

function formatFlag(record: Record<string, unknown>) {
    return getRecordString(record, ['description', 'summary', 'text', 'takeaway', 'label'])
}

function formatOpenQuestion(record: Record<string, unknown>) {
    const question = getRecordString(record, ['question', 'summary', 'text', 'description'])
    const priority = getRecordString(record, ['priority'])
    return priority && question ? `${priority} priority — ${question}` : question
}

function formatNegotiationLever(record: Record<string, unknown>) {
    const theme = getRecordString(record, ['theme', 'title', 'summary', 'label'])
    const suggestion = getRecordString(record, ['suggestion', 'description', 'text'])
    const impact = getRecordString(record, ['impact'])
    const headline = impact && theme ? `${impact} — ${theme}` : theme
    return headline && suggestion ? `${headline}: ${suggestion}` : headline || suggestion
}

function formatConflict(record: Record<string, unknown>) {
    const topic = getRecordString(record, ['topic', 'title', 'summary', 'label'])
    const description = getRecordString(record, ['description', 'text'])
    const severity = getRecordString(record, ['severity', 'priority'])
    const headline = severity && topic ? `${severity} — ${topic}` : topic
    return headline && description ? `${headline}: ${description}` : headline || description
}

function extractJudgmentSummary(parsed: unknown): string {
    if (typeof parsed === 'string') return parsed
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>
        const response = record.response
        if (response && typeof response === 'object') {
            const responseSummary = getRecordString(response as Record<string, unknown>, ['summary', 'final_judgment_summary', 'finalJudgmentSummary'])
            if (responseSummary) return responseSummary
        }
        const candidate = record.finalJudgmentSummary ?? record.final_judgment_summary ?? record.summary ?? record.judgment ?? record.recommendation ?? record.thesis ?? record.conclusion
        if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate
    }
    return ''
}

function getJudgmentValues(raw: unknown): { summary: string; json: string } {
    if (raw == null) return { summary: '', json: '' }
    if (typeof raw === 'string') {
        const trimmed = raw.trim()
        if (trimmed.length === 0) return { summary: '', json: '' }
        try { const parsed = JSON.parse(trimmed); return { summary: extractJudgmentSummary(parsed), json: trimmed } }
        catch { return { summary: trimmed, json: '' } }
    }
    if (typeof raw === 'object') return { summary: extractJudgmentSummary(raw), json: JSON.stringify(raw) }
    return { summary: String(raw), json: '' }
}

function getJudgmentField(raw: string, field: string): unknown {
    if (!raw) return undefined
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (parsed[field] !== undefined) return parsed[field]
        if (parsed.response && typeof parsed.response === 'object' && (parsed.response as Record<string, unknown>)[field] !== undefined) {
            return (parsed.response as Record<string, unknown>)[field]
        }
        return undefined
    } catch {
        return undefined
    }
}

function getProjectFlags(raw: string, key: 'red_flags' | 'yellow_flags' | 'green_flags') {
    const camelKey = key === 'red_flags' ? 'redFlags' : key === 'yellow_flags' ? 'yellowFlags' : 'greenFlags'
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (parsed.response && typeof parsed.response === 'object') {
            const flags = (parsed.response as Record<string, unknown>).flags
            if (flags && typeof flags === 'object' && (flags as Record<string, unknown>)[key]) {
                return getStringListValue((flags as Record<string, unknown>)[key], formatFlag)
            }
        }
        if (parsed.flags && typeof parsed.flags === 'object' && (parsed.flags as Record<string, unknown>)[key]) {
            return getStringListValue((parsed.flags as Record<string, unknown>)[key], formatFlag)
        }
        if (parsed[key]) return getStringListValue(parsed[key], formatFlag)
        if (parsed[camelKey]) return getStringListValue(parsed[camelKey], formatFlag)
    } catch { /* skip */ }
    return []
}

function getProjectStructuredFlags(raw: string, key: 'red_flags' | 'yellow_flags' | 'green_flags', fallbackStatus: string) {
    const camelKey = key === 'red_flags' ? 'redFlags' : key === 'yellow_flags' ? 'yellowFlags' : 'greenFlags'
    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        if (parsed.response && typeof parsed.response === 'object') {
            const flags = (parsed.response as Record<string, unknown>).flags
            if (flags && typeof flags === 'object' && (flags as Record<string, unknown>)[key]) {
                return getStructuredFindingsFromRaw((flags as Record<string, unknown>)[key], fallbackStatus)
            }
        }
        if (parsed.flags && typeof parsed.flags === 'object' && (parsed.flags as Record<string, unknown>)[key]) {
            return getStructuredFindingsFromRaw((parsed.flags as Record<string, unknown>)[key], fallbackStatus)
        }
        if (parsed[key]) return getStructuredFindingsFromRaw(parsed[key], fallbackStatus)
        if (parsed[camelKey]) return getStructuredFindingsFromRaw(parsed[camelKey], fallbackStatus)
    } catch { /* skip */ }
    return []
}

function getJudgmentRecommendation(raw: string) {
    const recommendation = getJudgmentField(raw, 'final_recommendation')
    if (recommendation && typeof recommendation === 'object') {
        return getRecordString(recommendation as Record<string, unknown>, ['recommendation'])
    }
    return typeof recommendation === 'string' ? recommendation : ''
}

function getCitationDetails(judgmentJson: string, aiCitations: string): ProjectCitation[] {
    const found: ProjectCitation[] = []
    const seen = new Set<string>()

    const addCitation = (citation: ProjectCitation | null) => {
        if (!citation) return
        const key = JSON.stringify(citation)
        if (!seen.has(key)) { seen.add(key); found.push(citation) }
    }

    const visit = (value: unknown) => {
        if (typeof value === 'string') { try { visit(JSON.parse(value)) } catch { /* skip */ } return }
        if (Array.isArray(value)) { value.forEach(visit); return }
        if (!value || typeof value !== 'object') return
        const record = value as Record<string, unknown>
        addCitation(getCitationFromRecord(record))
        Object.values(record).forEach(visit)
    }

    visit(aiCitations)
    visit(judgmentJson)
    return found.slice(0, 30)
}

// --- Main export ---

export default async function getProjectSynthesis(req: { params: Params; user: User }): Promise<ProjectSynthesisItem[]> {
    const isScoped = Boolean(req.params.projectId && req.params.projectId.trim().length > 0)
    const defaultLimit = isScoped ? 10 : 50
    const limitNum = typeof req.params.limit === 'number'
        ? req.params.limit
        : typeof req.params.limit === 'string' && parseInt(req.params.limit, 10) > 0
            ? parseInt(req.params.limit, 10)
            : defaultLimit

    const fullColumns = `
        id, project_id, project_name, company_name, project_status,
        documents_received_count, documents_completed_count,
        missing_documents_json, cross_document_conflicts_json, open_questions_json, negotiation_levers_json,
        final_judgement_json, final_recommendation, final_risk_level, final_traffic_light,
        ai_error_message, ai_global_confidence, ai_citations,
        valuation_lower_bound, valuation_base_estimate, valuation_upper_bound, valuation_currency,
        project_processed_at, created_at, updated_at,
        input_tokens, output_tokens, total_tokens, cost_usd, model_used,
        valuation_confidence_score, investment_confidence_score, is_placeholder
    `

    const portfolioColumns = `
        id, project_id, project_name, company_name, project_status,
        documents_received_count, documents_completed_count,
        final_recommendation, final_risk_level, final_traffic_light,
        ai_error_message, ai_global_confidence,
        valuation_lower_bound, valuation_base_estimate, valuation_upper_bound, valuation_currency,
        project_processed_at, created_at, updated_at,
        input_tokens, output_tokens, total_tokens, cost_usd, model_used,
        valuation_confidence_score, investment_confidence_score, is_placeholder
    `

    let query = (supabase
        .from('project_syntheses') as any)
        .select(isScoped ? fullColumns : portfolioColumns)
        .or('is_placeholder.is.null,is_placeholder.eq.false')

    if (req.params.projectId && req.params.projectId.trim().length > 0) {
        query = query.eq('project_id', req.params.projectId.trim())
    }

    const { data: rows, error } = await query
        .order('id', { ascending: false })
        .limit(limitNum)

    if (error) throw new Error(`Supabase read failed: ${error.message}`)
    if (!rows) return []

    return (rows as Array<Record<string, any>>)
        .filter((row) => {
            const pid = (row.project_id ?? '').trim()
            if (!pid) return false
            const fj = (row.final_judgement_json ?? row.final_judgment_json ?? '').trim()
            const rec = (row.final_recommendation ?? '').trim()
            const isStub = (fj === '' || fj === '{}') && (rec === '' || rec.toUpperCase().includes('SYNTHESIS PENDING'))
            const isAwaiting = ['awaiting_documents', 'pending', 'queued'].includes((row.project_status || '').trim().toLowerCase())
            if (isStub && isAwaiting) return false
            return true
        })
        .map((row): ProjectSynthesisItem => {
            const judgment = getJudgmentValues(row.final_judgement_json ?? row.final_judgment_json)

            const missingDocuments = getStringListValue(row.missing_documents_json)
            const crossDocumentConflicts = getStringListValue(row.cross_document_conflicts_json, formatConflict)
            const openQuestions = getStringListValue(row.open_questions_json, formatOpenQuestion)
            const negotiationLevers = getStringListValue(row.negotiation_levers_json, formatNegotiationLever)
            const redFlags = getProjectFlags(judgment.json, 'red_flags')
            const yellowFlags = getProjectFlags(judgment.json, 'yellow_flags')
            const greenFlags = getProjectFlags(judgment.json, 'green_flags')

            let keyTakeaways = getStringListValue(getJudgmentField(judgment.json, 'key_acquisition_takeaways'), formatTakeaway)
            if (keyTakeaways.length === 0) {
                const derived: string[] = []
                if (redFlags.length > 0) derived.push(...redFlags.slice(0, 2))
                if (crossDocumentConflicts.length > 0) derived.push(...crossDocumentConflicts.slice(0, 1))
                if (negotiationLevers.length > 0) derived.push(...negotiationLevers.slice(0, 1))
                if (derived.length < 3 && yellowFlags.length > 0) derived.push(...yellowFlags.slice(0, 3 - derived.length))
                if (derived.length > 0) keyTakeaways = derived
            }

            const synthesisConfidence = getNumberOrNull(row.ai_global_confidence ?? row.ai_confidence)

            const structuredFindings: ProjectStructuredFindingGroups = {
                keyTakeaways: getStructuredFindingsFromRaw(getJudgmentField(judgment.json, 'key_acquisition_takeaways'), 'Synthesized'),
                redFlags: getProjectStructuredFlags(judgment.json, 'red_flags', 'Contradicted'),
                yellowFlags: getProjectStructuredFlags(judgment.json, 'yellow_flags', 'Needs review'),
                greenFlags: getProjectStructuredFlags(judgment.json, 'green_flags', 'Confirmed'),
                crossDocumentConflicts: getStructuredFindingsFromRaw(row.cross_document_conflicts_json, 'Contradicted'),
                openQuestions: getStructuredFindingsFromRaw(row.open_questions_json, 'Needs review'),
                negotiationLevers: getStructuredFindingsFromRaw(row.negotiation_levers_json, 'Synthesized'),
                missingDocuments: missingDocuments.map((text) => ({ text, confidence: null, severity: 'medium', impact: '', status: 'Needs review', citations: [] })),
            }

            if (synthesisConfidence !== null) {
                for (const group of Object.values(structuredFindings)) {
                    for (const finding of group) {
                        if (finding.confidence === null) finding.confidence = synthesisConfidence
                    }
                }
            }

            const valuationObj = getJudgmentField(judgment.json, 'valuation')
            const valuationConfidence = row.valuation_confidence_score
                ? String(row.valuation_confidence_score)
                : valuationObj && typeof valuationObj === 'object'
                    ? String((valuationObj as Record<string, unknown>).valuation_confidence_score ?? (valuationObj as Record<string, unknown>).confidence_score ?? '')
                    : ''
            const investmentConfidence = row.investment_confidence_score
                ? String(row.investment_confidence_score)
                : ''

            const extractValuationBound = (rowVal: any, fieldKey: string) => {
                if (rowVal && String(rowVal).trim() !== '' && String(rowVal).trim() !== '0') {
                    return String(rowVal).trim()
                }
                if (valuationObj && typeof valuationObj === 'object') {
                    const rec = valuationObj as Record<string, unknown>
                    if (rec[fieldKey] && String(rec[fieldKey]).trim() !== '' && String(rec[fieldKey]).trim() !== '0') {
                        return String(rec[fieldKey]).trim()
                    }
                    if (fieldKey === 'lower_bound' && rec['lower_bound_estimate']) return String(rec['lower_bound_estimate']).trim()
                    if (fieldKey === 'base_estimate' && rec['base']) return String(rec['base']).trim()
                    if (fieldKey === 'upper_bound' && rec['upper_bound_estimate']) return String(rec['upper_bound_estimate']).trim()
                }
                return ''
            }

            const valLower = extractValuationBound(row.valuation_lower_bound, 'lower_bound')
            const valBase = extractValuationBound(row.valuation_base_estimate, 'base_estimate')
            const valUpper = extractValuationBound(row.valuation_upper_bound, 'upper_bound')

            const citationDetails = getCitationDetails(judgment.json, row.ai_citations ?? '')
            const uniqueCitationSources = Array.from(new Set(citationDetails.map((c) => c.sourceFile).filter((name): name is string => Boolean(name))))

            return {
                projectId: row.project_id ?? '',
                projectName: row.project_name || undefined,
                companyName: row.company_name || undefined,
                projectStatus: row.project_status ?? '',
                documentsReceivedCount: row.documents_received_count ?? 0,
                documentsCompletedCount: row.documents_completed_count ?? 0,
                missingDocuments,
                crossDocumentConflicts,
                openQuestions,
                negotiationLevers,
                keyTakeaways,
                redFlags,
                yellowFlags,
                greenFlags,
                citations: uniqueCitationSources.length > 0 ? uniqueCitationSources : getStringListValue(row.ai_citations),
                citationDetails,
                structuredFindings,
                finalRiskLevel: row.final_risk_level ?? '',
                finalTrafficLight: row.final_traffic_light ?? '',
                finalRecommendation: row.final_recommendation || getJudgmentRecommendation(judgment.json),
                finalJudgmentSummary: judgment.summary,
                finalJudgmentJson: judgment.json,
                finalJudgementJson: judgment.json,
                aiErrorMessage: row.ai_error_message ?? '',
                aiConfidence: row.ai_global_confidence || row.ai_confidence || String(getJudgmentField(judgment.json, 'global_confidence') ?? ''),
                valuationConfidence,
                investmentConfidence,
                valuationLowerBound: valLower,
                valuationBaseEstimate: valBase,
                valuationUpperBound: valUpper,
                valuationCurrency: row.valuation_currency ?? '',
                projectProcessedAt: row.project_processed_at ?? row.updated_at ?? '',
                inputTokens: Number(row.input_tokens ?? 0),
                outputTokens: Number(row.output_tokens ?? 0),
                totalTokens: Number(row.total_tokens ?? 0),
                costUsd: Number(row.cost_usd ?? 0),
                modelUsed: row.model_used ?? '',
                model_used: row.model_used ?? '',
                id: row.id ?? 0,
                letterOfIntentPresent: Boolean(row.letter_of_intent_present),
                createdAt: row.created_at ?? '',
                updatedAt: row.updated_at ?? '',
            }
        })
}
