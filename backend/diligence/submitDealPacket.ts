import { getSubmitPath, normalizeWebhookResponse, type N8nSubmitResponse } from './submissionPayload'

type Params = {
  environment?: 'production' | 'test'
  fileName: string
  fileSize: number
  fileType: string
  fileBase64: string
  dealName: string
  companyName: string
  workstream: string
  submissionNotes: string
  projectId: string
  projectStage: string
  documentType: string
  submissionBatchId?: string
  expectedBatchDocumentCount?: number
}

export default async function submitDealPacket(req: { params: Params; user: User }) {
  const triggerTimestamp = new Date().toISOString()
  const requestID = crypto.randomUUID()
  const environment = req.params.environment === 'test' ? 'test' : 'production'
  const path = getSubmitPath(environment)
  const payload = {
    fileName: req.params.fileName,
    fileSize: req.params.fileSize,
    fileType: req.params.fileType,
    dealName: req.params.dealName,
    companyName: req.params.companyName,
    workstream: req.params.workstream,
    submissionNotes: req.params.submissionNotes,
    projectId: req.params.projectId,
    projectStage: req.params.projectStage,
    documentType: req.params.documentType,
    submissionBatchId: req.params.submissionBatchId ?? '',
    expectedBatchDocumentCount: req.params.expectedBatchDocumentCount ?? 1,
    analystName: req.user.fullName,
    analystEmail: req.user.email,
    triggerTimestamp,
    requestID,
    environment,
  }

  const formData = [
    { key: 'fileName', value: req.params.fileName },
    { key: 'fileSize', value: String(req.params.fileSize) },
    { key: 'fileType', value: req.params.fileType },
    { key: 'dealName', value: req.params.dealName },
    { key: 'companyName', value: req.params.companyName },
    { key: 'workstream', value: req.params.workstream },
    { key: 'submissionNotes', value: req.params.submissionNotes },
    { key: 'projectId', value: req.params.projectId },
    { key: 'projectStage', value: req.params.projectStage },
    { key: 'documentType', value: req.params.documentType },
    { key: 'submissionBatchId', value: req.params.submissionBatchId ?? '' },
    { key: 'expectedBatchDocumentCount', value: String(req.params.expectedBatchDocumentCount ?? 1) },
    { key: 'analystName', value: req.user.fullName },
    { key: 'analystEmail', value: req.user.email },
    { key: 'triggerTimestamp', value: triggerTimestamp },
    { key: 'requestID', value: requestID },
    { key: 'environment', value: environment },
    { key: 'file', file: req.params.fileBase64, filename: req.params.fileName },
  ]

  const response = await n8nFinancialAgent.rawRequest<N8nSubmitResponse>({
    path,
    method: 'POST',
    bodyType: 'form-data',
    formData,
  })

  const normalizedResponse = normalizeWebhookResponse(response.data, {
    requestID,
    submittedAt: triggerTimestamp,
    environment,
  })

  return {
    status: 'accepted',
    environment,
    target: `https://merge-works.app.n8n.cloud/${path}`,
    method: 'POST' as const,
    submittedAt: triggerTimestamp,
    submittedBy: req.user.email,
    payload,
    response: normalizedResponse,
  }
}
