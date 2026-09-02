import { supabase } from '../supabaseClient'

type Params = {
  requestId?: unknown
  sourceType?: unknown
  fileName?: unknown
  sourceText?: unknown
  imageDataUrl?: unknown
  currentValues?: unknown
  userOpenAiApiKey?: unknown
  dispatchAsync?: unknown
}

const TEXT_FIELDS = new Set([
  'dealName', 'companyName', 'industry', 'city', 'state', 'businessDescription',
  'customerConcentrationNotes', 'generalNotes',
])
const NUMBER_FIELDS = new Set([
  'employeeCount', 'askingPrice', 'annualRevenue', 'reportedEbitda', 'grossMarginPercent',
  'ownerCompensation', 'disallowedAddBacks', 'cashIncluded', 'accountsReceivable', 'inventory',
  'equipmentAndVehicles', 'realEstate', 'intellectualProperty', 'otherAssets', 'accountsPayable',
  'shortTermDebt', 'longTermDebt', 'otherLiabilities', 'equityContributionPercent', 'interestRate',
  'amortizationYears', 'sellerNoteAmount', 'sellerNoteInterestRate', 'bearRevenueGrowth',
  'baseRevenueGrowth', 'bullRevenueGrowth', 'bearEbitdaMargin', 'baseEbitdaMargin',
  'bullEbitdaMargin', 'exitMultiple', 'topCustomerConcentrationPercent', 'leaseExpiryYears',
])
const ENUM_FIELDS: Record<string, Set<string>> = {
  ebitdaOrSdeType: new Set(['EBITDA', 'SDE']),
  keyPersonRisk: new Set(['low', 'moderate', 'high']),
}
const REQUIRED_FIELDS = ['dealName', 'askingPrice', 'annualRevenue', 'reportedEbitda']
const ALLOWED_FIELDS = new Set([...TEXT_FIELDS, ...NUMBER_FIELDS, ...Object.keys(ENUM_FIELDS)])
const MAX_IMAGE_DATA_URL_LENGTH = 2_800_000

function boundedText(value: unknown, field: string, maxLength: number, required = false): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (required && !text) throw new Error(`${field} is required`)
  if (text.length > maxLength) throw new Error(`${field} exceeds the maximum length`)
  return text
}

function sanitizeCurrentValues(value: unknown): Record<string, string | number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const sanitized: Record<string, string | number> = {}
  for (const [field, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!ALLOWED_FIELDS.has(field)) continue
    if (typeof raw === 'string' && raw.trim()) sanitized[field] = raw.trim().slice(0, 1_000)
    if (typeof raw === 'number' && Number.isFinite(raw)) sanitized[field] = raw
  }
  return sanitized
}

function sanitizeField(raw: unknown): QuestionnaireDraftField | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const candidate = raw as Record<string, unknown>
  const field = typeof candidate.field === 'string' ? candidate.field : ''
  if (!ALLOWED_FIELDS.has(field)) return null

  let value: string | number
  if (TEXT_FIELDS.has(field)) {
    if (typeof candidate.value !== 'string' || !candidate.value.trim()) return null
    value = candidate.value.trim().slice(0, 2_000)
  } else if (NUMBER_FIELDS.has(field)) {
    const parsed = typeof candidate.value === 'number' ? candidate.value : Number(candidate.value)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000_000) return null
    value = parsed
  } else {
    const enumValue = typeof candidate.value === 'string' ? candidate.value : ''
    if (!ENUM_FIELDS[field]?.has(enumValue)) return null
    value = enumValue
  }

  const confidence = typeof candidate.confidence === 'number' && Number.isFinite(candidate.confidence)
    ? Math.min(1, Math.max(0, candidate.confidence))
    : 0.5
  const kind = candidate.kind === 'derived' || candidate.kind === 'assumption' ? candidate.kind : 'extracted'
  return {
    field,
    value,
    confidence,
    source: boundedText(candidate.source, 'source', 1_000) || 'AI-assisted extraction',
    sourceLocation: boundedText(candidate.sourceLocation, 'sourceLocation', 500),
    period: boundedText(candidate.period, 'period', 100),
    units: boundedText(candidate.units, 'units', 100),
    kind,
    origin: 'ai',
  }
}

function unwrapResponse(value: unknown): Record<string, unknown> {
  let candidate = value
  if (Array.isArray(candidate)) candidate = candidate[0]
  if (candidate && typeof candidate === 'object') {
    const record = candidate as Record<string, unknown>
    candidate = record.output ?? record.data ?? record
  }
  if (typeof candidate === 'string') {
    try {
      candidate = JSON.parse(candidate)
    } catch {
      throw new Error('Questionnaire AI returned an invalid response')
    }
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error('Questionnaire AI returned an invalid response')
  }
  return candidate as Record<string, unknown>
}

export type QuestionnaireDraftField = {
  field: string
  value: string | number
  confidence: number
  source: string
  sourceLocation?: string
  period?: string
  units?: string
  kind: 'extracted' | 'derived' | 'assumption'
  origin: 'ai'
}

export type QuestionnaireDraftResult = {
  requestId: string
  draftId?: string
  fields: QuestionnaireDraftField[]
  warnings: string[]
  missingRequiredFields: string[]
}

export function sanitizeQuestionnaireDraftResponse(value: unknown, requestId: string): QuestionnaireDraftResult {
  const candidate = unwrapResponse(value)
  const seen = new Set<string>()
  const draftId = typeof candidate.draftId === 'string' ? candidate.draftId : undefined
  const fields = (Array.isArray(candidate.fields) ? candidate.fields : [])
    .map(sanitizeField)
    .filter((field): field is QuestionnaireDraftField => Boolean(field))
    .filter((field) => {
      if (seen.has(field.field)) return false
      seen.add(field.field)
      return true
    })
  const warnings = (Array.isArray(candidate.warnings) ? candidate.warnings : [])
    .filter((warning): warning is string => typeof warning === 'string' && Boolean(warning.trim()))
    .slice(0, 20)
    .map((warning) => warning.trim().slice(0, 500))
  const missingRequiredFields = REQUIRED_FIELDS.filter((field) => !seen.has(field))
  return { requestId, draftId, fields, warnings, missingRequiredFields }
}

/**
 * Bounded relay for optional questionnaire AI assistance. The workflow only
 * proposes a draft and never writes a deal, document, or synthesis record.
 */
export default async function questionnaireDraftAssistant(req: { params: Params; user: User }) {
  const requestId = boundedText(req.params.requestId, 'requestId', 200, true)
  const sourceType = boundedText(req.params.sourceType, 'sourceType', 20, true)
  if (sourceType !== 'text' && sourceType !== 'image') throw new Error('sourceType must be text or image')
  const fileName = boundedText(req.params.fileName, 'fileName', 255)
  const sourceText = boundedText(req.params.sourceText, 'sourceText', 50_000)
  const imageDataUrl = boundedText(req.params.imageDataUrl, 'imageDataUrl', MAX_IMAGE_DATA_URL_LENGTH)
  // Accepted for backward compatibility, but never forwarded: the questionnaire
  // workflow intentionally uses the managed Pod 1 OpenAI credential.
  boundedText(req.params.userOpenAiApiKey, 'userOpenAiApiKey', 1_000)

  if (sourceType === 'text' && !sourceText) throw new Error('sourceText is required for text assistance')
  if (sourceType === 'image') {
    if (!/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)) {
      throw new Error('imageDataUrl must be a PNG, JPEG, or WebP data URL')
    }
    const encoded = imageDataUrl.slice(imageDataUrl.indexOf(',') + 1)
    const approximateBytes = Math.floor(encoded.length * 3 / 4)
    if (approximateBytes > 2 * 1024 * 1024) throw new Error('Quick Fill images must be 2 MB or smaller')
  }

  if (req.params.dispatchAsync) {
    // Record initial placeholder row in Supabase so status is known
    try {
      await supabase.from('questionnaire_drafts').upsert({
        id: requestId,
        session_id: `draft_${requestId}`,
        source_name: fileName || 'Broker Teaser',
        source_type: sourceType,
        extracted_fields_json: [],
        warnings_json: [],
        status: 'processing',
      })
    } catch (err) {
      console.warn('[questionnaireDraftAssistant] Failed to insert initial processing row:', err)
    }

    // Dispatch webhook to n8n asynchronously (fire-and-forget)
    void n8nFinancialAgent.rawRequest<unknown>({
      path: 'webhook/dd-questionnaire-prefill',
      method: 'POST',
      bodyType: 'json',
      json: {
        requestId,
        sourceType,
        fileName,
        sourceText,
        imageDataUrl,
        currentValues: sanitizeCurrentValues(req.params.currentValues),
      },
    }).catch((err) => {
      console.error('[questionnaireDraftAssistant] Async webhook dispatch error:', err)
      void supabase.from('questionnaire_drafts').update({
        status: 'failed',
        warnings_json: [err instanceof Error ? err.message : String(err)],
      }).eq('id', requestId)
    })

    return { status: 'queued', requestId }
  }

  const response = await n8nFinancialAgent.rawRequest<unknown>({
    path: 'webhook/dd-questionnaire-prefill',
    method: 'POST',
    bodyType: 'json',
    json: {
      requestId,
      sourceType,
      fileName,
      sourceText,
      imageDataUrl,
      currentValues: sanitizeCurrentValues(req.params.currentValues),
    },
  })

  return sanitizeQuestionnaireDraftResponse(response.data, requestId)
}

export async function getQuestionnaireDraft(req: { params: { requestId?: unknown }; user: User }) {
  const requestId = boundedText(req.params.requestId, 'requestId', 200, true)

  try {
    const { data, error } = await supabase
      .from('questionnaire_drafts')
      .select('id, session_id, source_name, source_type, extracted_fields_json, warnings_json, status')
      .eq('id', requestId)
      .maybeSingle()

    if (error) {
      console.warn('[getQuestionnaireDraft] Supabase query warning:', error.message)
      return { status: 'processing', requestId }
    }

    if (!data) {
      return { status: 'processing', requestId }
    }

    if (data.status === 'completed' || (Array.isArray(data.extracted_fields_json) && data.extracted_fields_json.length > 0)) {
      const sanitized = sanitizeQuestionnaireDraftResponse({
        fields: data.extracted_fields_json,
        warnings: data.warnings_json,
        draftId: data.id,
      }, requestId)
      return { status: 'completed', ...sanitized }
    }

    if (data.status === 'failed') {
      const errMsg = Array.isArray(data.warnings_json) && data.warnings_json.length > 0
        ? String(data.warnings_json[0])
        : 'Draft extraction failed'
      return { status: 'failed', requestId, error: errMsg }
    }

    return { status: 'processing', requestId }
  } catch (err) {
    console.warn('[getQuestionnaireDraft] Error checking draft status:', err)
    return { status: 'processing', requestId }
  }
}
