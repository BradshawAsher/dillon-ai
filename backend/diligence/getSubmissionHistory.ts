type TextValue = string | number | boolean | null | undefined

type SubmissionHistoryRow = {
  requestID?: TextValue
  dealName?: TextValue
  companyName?: TextValue
  workstream?: TextValue
  submissionNotes?: TextValue
  notes?: TextValue
  analystName?: TextValue
  analystEmail?: TextValue
  projectId?: TextValue
  projectStage?: TextValue
  documentType?: TextValue
  detectedDocumentType?: TextValue
  tableStructureStatus?: TextValue
  tableStructureIssues?: TextValue
  detectedHeaderRow?: number | string | null
  columnMapConfidence?: number | string | null
  validatedColumnMap?: TextValue
  submissionBatchId?: TextValue
  expectedBatchDocumentCount?: number | string | null
  fileName?: TextValue
  fileSize?: number | string | null
  fileType?: TextValue
  triggerTimestamp?: TextValue
  status?: TextValue
  environment?: TextValue
  receivedAt?: TextValue
  processingStartedAt?: TextValue
  processedAt?: TextValue
  ai_processedAt?: TextValue
  errorMessage?: TextValue
  ai_errorMessage?: TextValue
  riskLevel?: TextValue
  ai_riskLevel?: TextValue
  ai_risk_flag?: TextValue
  category?: TextValue
  ai_category?: TextValue
  trafficLight?: TextValue
  ai_trafficLight?: TextValue
  ebitdaExtracted?: TextValue
  ai_ebitdaExtracted?: TextValue
  extractedJson?: TextValue
  ai_extractedJson?: TextValue
  storageFileId?: TextValue
  storageFileUrl?: TextValue
  driveFileID?: TextValue
  needsHumanReview?: TextValue
  humanReviewRequired?: TextValue
  ai_needsHumanReview?: TextValue
  ai_is_escalated?: TextValue
  ai_summary?: TextValue
  ai_target_value?: TextValue
  ai_variance?: TextValue
  ai_escalation_reason?: TextValue
  ai_intent?: TextValue
  ai_citations?: TextValue
  ai_red_flags?: TextValue
  ai_yellow_flags?: TextValue
  ai_green_flags?: TextValue
  ai_confidence?: TextValue
  lower_bound_estimate?: TextValue
  upper_bound_estimate?: TextValue
  base_estimate?: TextValue
  currency?: TextValue
  is_favorable_indicator?: TextValue
  buy_reasoning?: TextValue
  isConsidered?: TextValue
  id?: number | string | null
  rowId?: number | string | null
  createdAt?: TextValue
  updatedAt?: TextValue
}

type SubmissionHistoryResponse =
  | SubmissionHistoryRow[]
  | {
      rows?: SubmissionHistoryRow[]
      data?: SubmissionHistoryRow[]
      items?: SubmissionHistoryRow[]
    }

type Params = {
  environment?: 'production' | 'test'
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

function parseBooleanValue(value: TextValue) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true
    }

    if (value === 0) {
      return false
    }
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false
    }
  }

  return undefined
}

function getFirstBooleanValue(values: TextValue[]) {
  for (const value of values) {
    const booleanValue = parseBooleanValue(value)

    if (typeof booleanValue === 'boolean') {
      return booleanValue
    }
  }

  return false
}

function getFirstOptionalBooleanValue(values: TextValue[]) {
  for (const value of values) {
    const booleanValue = parseBooleanValue(value)

    if (typeof booleanValue === 'boolean') {
      return booleanValue
    }
  }

  return null
}

function getNormalizedEnvironment(value: string): 'production' | 'test' | '' {
  if (value === 'test') {
    return 'test'
  }

  if (value === 'production') {
    return 'production'
  }

  return ''
}

export default async function getSubmissionHistory(req: {
  params: Params
  user: User
}) {
  const path = req.params.environment === 'test'
    ? 'webhook-test/1d02344c-0512-4a40-9c5b-ad8172bc91e8'
    : 'webhook/1d02344c-0512-4a40-9c5b-ad8172bc91e8'

  const response = await n8nFinancialAgent.rawRequest<SubmissionHistoryResponse>({
    path,
    method: 'GET',
  })

  const responseData = response.data
  const rows = Array.isArray(responseData)
    ? responseData
    : responseData.rows ?? responseData.data ?? responseData.items ?? []

  return rows.map((row) => ({
    requestID: getFirstStringValue([row.requestID]),
    dealName: getFirstStringValue([row.dealName]),
    companyName: getFirstStringValue([row.companyName]),
    workstream: getFirstStringValue([row.workstream]),
    submissionNotes: getFirstStringValue([row.submissionNotes, row.notes]),
    analystName: getFirstStringValue([row.analystName]),
    analystEmail: getFirstStringValue([row.analystEmail]),
    projectId: getFirstStringValue([row.projectId]),
    projectStage: getFirstStringValue([row.projectStage]),
    documentType: getFirstStringValue([row.documentType]),
    detectedDocumentType: getFirstStringValue([row.detectedDocumentType]),
    tableStructureStatus: getFirstStringValue([row.tableStructureStatus]),
    tableStructureIssues: getFirstStringValue([row.tableStructureIssues]),
    detectedHeaderRow: getFirstNumberValue([row.detectedHeaderRow]),
    columnMapConfidence: getFirstNumberValue([row.columnMapConfidence]),
    validatedColumnMap: getFirstStringValue([row.validatedColumnMap]),
    submissionBatchId: getFirstStringValue([row.submissionBatchId]),
    expectedBatchDocumentCount: getFirstNumberValue([row.expectedBatchDocumentCount]),
    fileName: getFirstStringValue([row.fileName]),
    fileSize: getFirstNumberValue([row.fileSize]),
    fileType: getFirstStringValue([row.fileType]),
    triggerTimestamp: getFirstStringValue([row.triggerTimestamp]),
    status: getFirstStringValue([row.status]) || 'unknown',
    environment: getNormalizedEnvironment(getFirstStringValue([row.environment])),
    receivedAt: getFirstStringValue([row.receivedAt]),
    processingStartedAt: getFirstStringValue([row.processingStartedAt]),
    processedAt: getFirstStringValue([row.processedAt, row.ai_processedAt]),
    errorMessage: getFirstStringValue([row.errorMessage, row.ai_errorMessage]),
    riskLevel: getFirstStringValue([row.riskLevel, row.ai_riskLevel, row.ai_risk_flag]),
    category: getFirstStringValue([row.category, row.ai_category]),
    trafficLight: getFirstStringValue([row.trafficLight, row.ai_trafficLight]),
    ebitdaExtracted: getFirstStringValue([row.ebitdaExtracted, row.ai_ebitdaExtracted]),
    extractedJson: getFirstStringValue([row.extractedJson, row.ai_extractedJson]),
    storageFileId: getFirstStringValue([row.storageFileId, row.driveFileID]),
    storageFileUrl: getFirstStringValue([row.storageFileUrl]),
    needsHumanReview: getFirstBooleanValue([
      row.needsHumanReview,
      row.humanReviewRequired,
      row.ai_needsHumanReview,
      row.ai_is_escalated,
    ]),
    aiSummary: getFirstStringValue([row.ai_summary]),
    aiTargetValue: getFirstStringValue([row.ai_target_value]),
    aiVariance: getFirstStringValue([row.ai_variance]),
    aiEscalationReason: getFirstStringValue([row.ai_escalation_reason]),
    aiIntent: getFirstStringValue([row.ai_intent]),
    aiCitations: getFirstStringValue([row.ai_citations]),
    aiRedFlags: getFirstStringValue([row.ai_red_flags]),
    aiYellowFlags: getFirstStringValue([row.ai_yellow_flags]),
    aiGreenFlags: getFirstStringValue([row.ai_green_flags]),
    aiConfidence: getFirstStringValue([row.ai_confidence]),
    valuationLowerBound: getFirstStringValue([row.lower_bound_estimate]),
    valuationBaseEstimate: getFirstStringValue([row.base_estimate]),
    valuationUpperBound: getFirstStringValue([row.upper_bound_estimate]),
    valuationCurrency: getFirstStringValue([row.currency]),
    investmentIsFavorable: getFirstOptionalBooleanValue([row.is_favorable_indicator]),
    investmentBuyReasoning: getFirstStringValue([row.buy_reasoning]),
    isConsidered: getFirstOptionalBooleanValue([row.isConsidered]) !== false,
    id: getFirstNumberValue([row.id, row.rowId]),
    createdAt: getFirstStringValue([row.createdAt]),
    updatedAt: getFirstStringValue([row.updatedAt]),
  }))
}
