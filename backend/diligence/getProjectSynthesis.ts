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
  final_judgment?: unknown
  finalJudgment?: unknown
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
  finalRiskLevel: string
  finalTrafficLight: string
  finalRecommendation: string
  finalJudgmentSummary: string
  finalJudgmentJson: string
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
function getStringListValue(raw: unknown): string[] {
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

function getFirstStringListValue(values: unknown[]): string[] {
  for (const value of values) {
    const list = getStringListValue(value)
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
    : responseData.rows ?? responseData.data ?? responseData.items ?? []

  return rows.map((row): ProjectSynthesisItem => {
    const judgment = getJudgmentValues(row.finalJudgmentJson ?? row.final_judgment ?? row.finalJudgment)

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
      ]),
      openQuestions: getFirstStringListValue([row.openQuestionsJson, row.open_questions, row.openQuestions]),
      negotiationLevers: getFirstStringListValue([
        row.negotiationLeversJson,
        row.negotiation_levers,
        row.negotiationLevers,
      ]),
      finalRiskLevel: getFirstStringValue([row.finalRiskLevel, row.final_risk_level]),
      finalTrafficLight: getFirstStringValue([row.finalTrafficLight, row.final_traffic_light]),
      finalRecommendation: getFirstStringValue([row.finalRecommendation, row.final_recommendation]),
      finalJudgmentSummary: judgment.summary,
      finalJudgmentJson: judgment.json,
      valuationLowerBound: getFirstStringValue([row.valuationLowerBound, row.lower_bound_estimate]),
      valuationBaseEstimate: getFirstStringValue([row.valuationBaseEstimate, row.base_estimate]),
      valuationUpperBound: getFirstStringValue([row.valuationUpperBound, row.upper_bound_estimate]),
      valuationCurrency: getFirstStringValue([row.valuationCurrency, row.currency]),
      projectProcessedAt: getFirstStringValue([row.projectProcessedAt, row.project_processed_at, row.updatedAt]),
      id: getFirstNumberValue([row.id]),
      createdAt: getStringValue(row.createdAt),
      updatedAt: getStringValue(row.updatedAt),
    }
  })
}
