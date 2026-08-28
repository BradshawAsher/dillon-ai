import { getSubmitPath, normalizeWebhookResponse, type N8nSubmitResponse } from './submissionPayload'
import { supabase } from '../supabaseClient'

type Params = {
  environment?: 'production' | 'test'
  fileName: string
  fileSize: number
  fileType: string
  fileBase64?: string
  dealName: string
  companyName: string
  workstream: string
  submissionNotes: string
  projectId: string
  projectStage: string
  documentType: string
  submissionBatchId?: string
  expectedBatchDocumentCount?: number
  storageFileUrl?: string
  storagePath?: string
  userAnthropicApiKey?: string
  userOpenAiApiKey?: string
  userGeminiApiKey?: string
  userDeepseekApiKey?: string
  userApiKey?: string
  userProvider?: string
  docPrimaryModel?: string
  docBackupModel?: string
  synthPrimaryModel?: string
  synthBackupModel?: string
  skipDuplicateCheck?: boolean
}

export default async function submitDealPacket(req: { params: Params; user: User }) {
  const triggerTimestamp = new Date().toISOString()
  const requestID = crypto.randomUUID()
  const environment = req.params.environment === 'test' ? 'test' : 'production'
  const normalizedProjectId = req.params.projectId.trim().toLowerCase()
  const normalizedFileName = req.params.fileName.trim().toLowerCase()

  // Fast targeted duplicate check directly via Supabase rather than loading
  // full submission history and syncing data tables (which adds 2-4s latency).
  if (!req.params.skipDuplicateCheck) {
    try {
      const { data: duplicateDocs } = await supabase
        .from('documents')
        .select('id, request_id, created_at, updated_at, status')
        .ilike('project_id', normalizedProjectId)
        .ilike('file_name', normalizedFileName)
        .eq('file_size', req.params.fileSize)
        .eq('status', 'completed')
        .limit(1)

      if (duplicateDocs && duplicateDocs.length > 0) {
        const existingDocument = duplicateDocs[0]
        return {
          status: 'duplicate',
          environment,
          target: 'duplicate-check',
          method: 'POST' as const,
          submittedAt: triggerTimestamp,
          submittedBy: req.user.email,
          payload: {
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
          },
          response: {
            requestID: existingDocument.request_id || requestID,
            status: 'duplicate',
            receivedAt: existingDocument.created_at || triggerTimestamp,
            id: existingDocument.id,
            createdAt: existingDocument.created_at || triggerTimestamp,
            updatedAt: existingDocument.updated_at || triggerTimestamp,
            environment,
          },
        }
      }
    } catch {
      // If Supabase check fails (e.g. offline/table not configured), proceed to submission
    }
  }

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
    storageFileUrl: req.params.storageFileUrl ?? '',
    storagePath: req.params.storagePath ?? '',
  }

  // Pre-insert queued document row to Supabase so it immediately appears in history
  try {
    await supabase.from('documents').upsert(
      {
        request_id: requestID,
        project_id: normalizedProjectId,
        deal_name: req.params.dealName,
        company_name: req.params.companyName,
        workstream: req.params.workstream,
        submission_notes: req.params.submissionNotes,
        analyst_name: req.user.fullName,
        analyst_email: req.user.email,
        project_stage: req.params.projectStage,
        document_type: req.params.documentType,
        file_name: req.params.fileName,
        file_size: req.params.fileSize,
        file_type: req.params.fileType,
        trigger_timestamp: triggerTimestamp,
        received_at: triggerTimestamp,
        status: 'queued',
        environment,
        storage_file_url: req.params.storageFileUrl || '',
        submission_batch_id: req.params.submissionBatchId || '',
        expected_batch_document_count: req.params.expectedBatchDocumentCount ?? 1,
      },
      { onConflict: 'request_id' }
    )
  } catch {
    // Non-blocking if table is syncing
  }

  const formData: Array<{ key: string; value: string } | { key: string; file: string; filename: string }> = [
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
  ]

  if (req.params.storageFileUrl) {
    formData.push({ key: 'storageFileUrl', value: req.params.storageFileUrl })
  }
  if (req.params.storagePath) {
    formData.push({ key: 'storagePath', value: req.params.storagePath })
  }
  if (req.params.fileBase64) {
    formData.push({ key: 'file', file: req.params.fileBase64, filename: req.params.fileName })
  } else if (req.params.storageFileUrl) {
    try {
      const fileRes = await fetch(req.params.storageFileUrl)
      if (fileRes.ok) {
        const arrayBuf = await fileRes.arrayBuffer()
        const base64 = Buffer.from(arrayBuf).toString('base64')
        formData.push({ key: 'file', file: base64, filename: req.params.fileName })
      }
    } catch (fetchErr) {
      console.warn('[submitDealPacket] Failed to fetch binary from storageFileUrl:', fetchErr)
    }
  }
  if (req.params.userAnthropicApiKey) {
    formData.push({ key: 'userAnthropicApiKey', value: req.params.userAnthropicApiKey })
  }
  if (req.params.userOpenAiApiKey) {
    formData.push({ key: 'userOpenAiApiKey', value: req.params.userOpenAiApiKey })
  }
  if (req.params.userGeminiApiKey) {
    formData.push({ key: 'userGeminiApiKey', value: req.params.userGeminiApiKey })
  }
  if (req.params.userDeepseekApiKey) {
    formData.push({ key: 'userDeepseekApiKey', value: req.params.userDeepseekApiKey })
  }
  if (req.params.userApiKey) {
    formData.push({ key: 'userApiKey', value: req.params.userApiKey })
  }
  if (req.params.userProvider) {
    formData.push({ key: 'userProvider', value: req.params.userProvider })
  }
  if (req.params.docPrimaryModel) {
    formData.push({ key: 'docPrimaryModel', value: req.params.docPrimaryModel })
  }
  if (req.params.docBackupModel) {
    formData.push({ key: 'docBackupModel', value: req.params.docBackupModel })
  }
  if (req.params.synthPrimaryModel) {
    formData.push({ key: 'synthPrimaryModel', value: req.params.synthPrimaryModel })
  }
  if (req.params.synthBackupModel) {
    formData.push({ key: 'synthBackupModel', value: req.params.synthBackupModel })
  }

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
