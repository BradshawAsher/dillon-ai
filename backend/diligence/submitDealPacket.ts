import { getSubmitPath, normalizeWebhookResponse, type N8nSubmitResponse } from './submissionPayload'
import { supabase } from '../supabaseClient'
import { validateDocumentStorageUrl } from './storedFileMultipart'

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

  // Require a durable history record before dispatch. Otherwise a successful
  // workflow can become an invisible document that the batch cannot reconcile.
  try {
    const { error } = await supabase.from('documents').upsert(
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
    if (error) throw new Error(error.message)
  } catch (error) {
    throw new Error(`Document could not be registered for processing: ${error instanceof Error ? error.message : 'database unavailable'}. The workflow was not started; retry the upload.`)
  }

  const formData: RetoolFormDataEntry[] = [
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

  let response: { data: N8nSubmitResponse }
  try {
    if (req.params.storageFileUrl) {
      formData.push({ key: 'file', fileUrl: validateDocumentStorageUrl(req.params.storageFileUrl), filename: req.params.fileName, fileSize: req.params.fileSize, contentType: req.params.fileType })
    } else if (req.params.fileBase64) {
      if (Buffer.byteLength(req.params.fileBase64, 'base64') > 3 * 1024 * 1024) throw new Error('Large documents must be uploaded directly to storage, not sent inline.')
      formData.push({ key: 'file', file: req.params.fileBase64, filename: req.params.fileName })
    } else {
      throw new Error('No uploaded document is available. Re-select the file and upload it again.')
    }
    response = await n8nFinancialAgent.rawRequest<N8nSubmitResponse>({ path, method: 'POST', bodyType: 'form-data', formData })
    const acknowledgment = response.data as (N8nSubmitResponse & { error?: string; ok?: boolean }) | null
    if (!acknowledgment || acknowledgment.error || acknowledgment.ok === false || !['queued', 'accepted', 'received', 'processing', 'completed', 'duplicate'].includes(String(acknowledgment.status || '').toLowerCase())) {
      throw new Error(acknowledgment?.error || 'n8n did not confirm document acceptance. Check history before retrying.')
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Submission could not be confirmed.'
    // A rejected dispatch must not leave an eternal queued row. Do not overwrite
    // a workflow that has already advanced to processing/completed meanwhile.
    try {
      const { error: saveError } = await supabase.from('documents').update({
        status: 'upload_failed', error_message: message,
        processed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq('request_id', requestID).eq('project_id', normalizedProjectId).eq('environment', environment).eq('status', 'queued')
      if (saveError) console.warn('[submitDealPacket] Could not save dispatch failure', { requestID, code: saveError.code })
    } catch {
      console.warn('[submitDealPacket] Could not save dispatch failure', { requestID })
    }
    throw error
  }

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
