// Fetches project-level synthesis rows written by the n8n consolidator
// workflow. See docs/n8n-webhooks.md for the webhook this expects and the
// row fields it understands (based on the project-level schema recommended in
// frontend/notes/project-handoff.md §14).
type TextValue = string | number | boolean | null | undefined

type ProjectSynthesisRow = {
  projectId?: TextValue
  project_id?: TextValue
  projectStatus?: TextValue
  project_status?: TextValue
  documentsReceivedCount?: number | string | null
  documents_received_count?: number | string | null
  documentsCompletedCount?: number | string | null
  documents_completed_count?: number | string | null
  missingDocumentsJson?: unknown
  missing_documents?: unknown
  missingDocuments?: unknown
  crossDocumentConflictsJson?: unknown
  cross_document_conflicts?: unknown
  crossDocumentConflicts?: unknown
  openQuestionsJson?: unknown
  open_questions?: unknown
  openQuestions?: unknown
  negotiationLeversJson?: unknown
  negotiation_levers?: unknown
  negotiationLevers?: unknown
  finalRiskLevel?: TextValue
  final_risk_level?: TextValue
  finalTrafficLight?: TextValue
  final_traffic_light?: TextValue
  finalRecommendation?: TextValue
  final_recommendation?: TextValue
  finalJudgmentJson?: unknown
  // Legacy spelling retained by the existing n8n Project-Level Fields table.
  finalJudgementJson?: unknown
  final_judgment?: unknown
  finalJudgment?: unknown
  ai_summary?: TextValue
  ai_error_message?: TextValue
  ai_risk_flag?: TextValue
  ai_processedAt?: TextValue
  aiCitations?: unknown
  ai_citations?: unknown
  valuationLowerBound?: TextValue
  lower_bound_estimate?: TextValue
  valuationBaseEstimate?: TextValue
  base_estimate?: TextValue
  valuationUpperBound?: TextValue
  upper_bound_estimate?: TextValue
  valuationCurrency?: TextValue
  currency?: TextValue
  projectProcessedAt?: TextValue
  project_processed_at?: TextValue
  id?: number | string | null
  createdAt?: TextValue
  updatedAt?: TextValue
}

type ProjectSynthesisResponse =
  | ProjectSynthesisRow[]
  | ProjectSynthesisRow
  | {
      rows?: ProjectSynthesisRow[]
      data?: ProjectSynthesisRow[]
      items?: ProjectSynthesisRow[]
    }

type Params = {
  environment?: 'production' | 'test'
}

export type ProjectSynthesisItem = {
  projectId: string
  projectStatus: string
  documentsReceivedCount: number
  documentsCompletedCount: number
  missingDocuments: string[]
  crossDocumentConflicts: string[]
  openQuestions: string[]
  negotiationLevers: string[]
  keyTakeaways: string[]
  citations: string[]
  citationDetails: ProjectCitation[]
  finalRiskLevel: string
  finalTrafficLight: string
  finalRecommendation: string
  finalJudgmentSummary: string
  finalJudgmentJson: string
  aiErrorMessage: string
  valuationLowerBound: string
  valuationBaseEstimate: string
  valuationUpperBound: string
  valuationCurrency: string
  projectProcessedAt: string
  id: number
  createdAt: string
  updatedAt: string
}

function getStringValue(value: TextValue) {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  return ''
}

function getFirstStringValue(values: TextValue[]) {
  for (const value of values) {
    const stringValue = getStringValue(value)

    if (stringValue.trim().length > 0) {
      return stringValue
    }
  }

  return ''
}

function getNumberValue(value: number | string | null | undefined) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function getFirstNumberValue(values: Array<number | string | null | undefined>) {
  for (const value of values) {
    const numberValue = getNumberValue(value)

    if (numberValue !== 0 || value === 0 || value === '0') {
      return numberValue
    }
  }

  return 0
}

// Accepts an array, a JSON-encoded array string, or a delimited plain string,
// and returns a clean string list. The consolidator's output format may vary
// while the workflow is iterated on, so stay permissive.
type ObjectListItemFormatter = (record: Record<string, unknown>) => string

function getRecordString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }

  return ''
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

function getStringListValue(raw: unknown, formatObject?: ObjectListItemFormatter): string[] {
  let value = raw

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length === 0) {
      return []
    }
    try {
      value = JSON.parse(trimmed)
    } catch {
      return trimmed
        .split(/\r?\n|;/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    }
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>
          if (formatObject) {
            return formatObject(record)
          }
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

function getFirstStringListValue(values: unknown[], formatObject?: ObjectListItemFormatter): string[] {
  for (const value of values) {
    const list = getStringListValue(value, formatObject)
    if (list.length > 0) {
      return list
    }
  }

  return []
}

function getJudgmentValues(raw: unknown): { summary: string; json: string } {
  if (raw == null) {
    return { summary: '', json: '' }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (trimmed.length === 0) {
      return { summary: '', json: '' }
    }
    try {
      const parsed = JSON.parse(trimmed) as unknown
      return { summary: extractJudgmentSummary(parsed), json: trimmed }
    } catch {
      return { summary: trimmed, json: '' }
    }
  }

  if (typeof raw === 'object') {
    return { summary: extractJudgmentSummary(raw), json: JSON.stringify(raw) }
  }

  return { summary: String(raw), json: '' }
}

function getCitationDetails(values: unknown[]): ProjectCitation[] {
  const found: ProjectCitation[] = []
  const seen = new Set<string>()
  const visit = (value: unknown) => {
    if (typeof value === 'string') {
      try { visit(JSON.parse(value)) } catch { /* Plain legacy citations are handled below. */ }
      return
    }
    if (Array.isArray(value)) { value.forEach(visit); return }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    const sourceFile = getRecordString(record, ['source_file', 'sourceFile', 'file_name', 'fileName'])
    if (sourceFile) {
      const page = record.page_number ?? record.pageNumber
      const explicitLocation = getRecordString(record, ['row_or_cell', 'rowOrCell', 'location'])
      const sourceLocation = explicitLocation || (typeof page === 'number' || typeof page === 'string' ? `Page ${page}` : '')
      const confidenceValue = record.confidence_score ?? record.confidence
      const confidence = typeof confidenceValue === 'number' && Number.isFinite(confidenceValue)
        ? confidenceValue
        : typeof confidenceValue === 'string' && Number.isFinite(Number(confidenceValue)) ? Number(confidenceValue) : null
      const citation: ProjectCitation = { sourceFile, sourceLocation, excerpt: getRecordString(record, ['excerpt']), period: getRecordString(record, ['period']), currency: getRecordString(record, ['currency']), confidence, status: getRecordString(record, ['status']) }
      const key = JSON.stringify(citation)
      if (!seen.has(key)) { seen.add(key); found.push(citation) }
    }
    Object.values(record).forEach(visit)
  }
  values.forEach(visit)
  return found.slice(0, 30)
}

function getFirstJudgmentValues(values: unknown[]) {
  for (const value of values) {
    const judgment = getJudgmentValues(value)
    if (judgment.summary.length > 0 || judgment.json.length > 0) {
      return judgment
    }
  }

  return { summary: '', json: '' }
}

function getJudgmentField(raw: string, field: string): unknown {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return parsed[field]
  } catch {
    return undefined
  }
}

function formatTakeaway(record: Record<string, unknown>) {
  const takeaway = getRecordString(record, ['takeaway', 'summary', 'text', 'description'])
  const impact = getRecordString(record, ['impact', 'why_it_matters'])
  return takeaway && impact ? `${takeaway} — ${impact}` : takeaway || impact
}

function extractJudgmentSummary(parsed: unknown): string {
  if (typeof parsed === 'string') {
    return parsed
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const record = parsed as Record<string, unknown>
    const candidate =
      record.summary ?? record.judgment ?? record.recommendation ?? record.thesis ?? record.conclusion
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  return ''
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

function isProjectSynthesisRow(value: ProjectSynthesisResponse): value is ProjectSynthesisRow {
  return typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && ('projectId' in value || 'project_id' in value)
}

export default async function getProjectSynthesis(req: { params: Params; user: User }) {
  const path = req.params.environment === 'test'
    ? 'webhook-test/d19d24da-21d4-40f8-8626-a06a7dd54ac7'
    : 'webhook/d19d24da-21d4-40f8-8626-a06a7dd54ac7'

  const response = await n8nFinancialAgent.rawRequest<ProjectSynthesisResponse>({
    path,
    method: 'GET',
  })

  const responseData = response.data
  const rows = Array.isArray(responseData)
    ? responseData
    : isProjectSynthesisRow(responseData)
      ? [responseData]
      : responseData.rows ?? responseData.data ?? responseData.items ?? []

  // A historical workflow version could create a synthesis row without its
  // project ID. It cannot be attached to a portfolio project, so keep it out
  // of the product response rather than rendering an unusable orphan.
  return rows
    .filter((row) => getFirstStringValue([row.projectId, row.project_id]).trim().length > 0)
    .map((row): ProjectSynthesisItem => {
      const judgment = getFirstJudgmentValues([
        row.finalJudgmentJson,
        row.finalJudgementJson,
        row.final_judgment,
        row.finalJudgment,
        row.ai_summary,
      ])

      const citationDetails = getCitationDetails([row.aiCitations, row.ai_citations, judgment.json])
      return {
        projectId: getFirstStringValue([row.projectId, row.project_id]),
        projectStatus: getFirstStringValue([row.projectStatus, row.project_status]),
        documentsReceivedCount: getFirstNumberValue([row.documentsReceivedCount, row.documents_received_count]),
        documentsCompletedCount: getFirstNumberValue([row.documentsCompletedCount, row.documents_completed_count]),
        missingDocuments: getFirstStringListValue([row.missingDocumentsJson, row.missing_documents, row.missingDocuments]),
        crossDocumentConflicts: getFirstStringListValue([
          row.crossDocumentConflictsJson,
          row.cross_document_conflicts,
          row.crossDocumentConflicts,
        ], formatConflict),
        openQuestions: getFirstStringListValue([row.openQuestionsJson, row.open_questions, row.openQuestions], formatOpenQuestion),
        negotiationLevers: getFirstStringListValue([
          row.negotiationLeversJson,
          row.negotiation_levers,
          row.negotiationLevers,
        ], formatNegotiationLever),
        keyTakeaways: getStringListValue(getJudgmentField(judgment.json, 'key_acquisition_takeaways'), formatTakeaway),
        citations: citationDetails.map((citation) => citation.sourceFile).filter((value, index, values) => values.indexOf(value) === index).length
          ? citationDetails.map((citation) => citation.sourceFile).filter((value, index, values) => values.indexOf(value) === index)
          : getFirstStringListValue([row.aiCitations, row.ai_citations]),
        citationDetails,
        finalRiskLevel: getFirstStringValue([row.finalRiskLevel, row.final_risk_level, row.ai_risk_flag]),
        finalTrafficLight: getFirstStringValue([row.finalTrafficLight, row.final_traffic_light]),
        finalRecommendation: getFirstStringValue([row.finalRecommendation, row.final_recommendation]),
        finalJudgmentSummary: judgment.summary,
        finalJudgmentJson: judgment.json,
        aiErrorMessage: getStringValue(row.ai_error_message),
        valuationLowerBound: getFirstStringValue([row.valuationLowerBound, row.lower_bound_estimate]),
        valuationBaseEstimate: getFirstStringValue([row.valuationBaseEstimate, row.base_estimate]),
        valuationUpperBound: getFirstStringValue([row.valuationUpperBound, row.upper_bound_estimate]),
        valuationCurrency: getFirstStringValue([row.valuationCurrency, row.currency]),
        projectProcessedAt: getFirstStringValue([row.projectProcessedAt, row.project_processed_at, row.ai_processedAt, row.updatedAt]),
        id: getFirstNumberValue([row.id]),
        createdAt: getStringValue(row.createdAt),
        updatedAt: getStringValue(row.updatedAt),
      }
    })
}
