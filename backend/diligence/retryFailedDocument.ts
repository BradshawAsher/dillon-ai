import { supabase } from '../supabaseClient'
import submitDealPacket from './submitDealPacket'

type Params = {
  requestID: string
  environment?: 'production' | 'test'
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
}

export default async function retryFailedDocument(req: { params: Params; user: User }) {
  const requestID = req.params.requestID?.trim()
  if (!requestID) throw new Error('requestID is required')

  const environment = req.params.environment === 'test' ? 'test' : 'production'
  const { data: failedDocument, error: documentError } = await supabase
    .from('documents')
    .select(`
      request_id, status, storage_file_url, file_name, file_size, file_type,
      deal_name, company_name, workstream, submission_notes, project_id,
      project_stage, document_type, submission_batch_id, expected_batch_document_count
    `)
    .eq('request_id', requestID)
    .eq('environment', environment)
    .maybeSingle()

  if (documentError) throw new Error(`Unable to load failed document: ${documentError.message}`)

  const failedStatus = String(failedDocument?.status || '').trim().toLowerCase()
  if (failedStatus === 'upload_failed') {
    if (!failedDocument) throw new Error('The failed document could not be loaded for retry')
    const storageFileUrl = String(failedDocument?.storage_file_url || '').trim()
    if (!storageFileUrl) {
      throw new Error('This upload failed before a reusable file was stored. Re-upload the document to try again.')
    }

    const submissionBatchId = failedDocument.submission_batch_id || failedDocument.project_id || ''
    const expectedBatchDocumentCount = Number(failedDocument.expected_batch_document_count || 1)
    const recovered = await submitDealPacket({
      user: req.user,
      params: {
        environment,
        fileName: failedDocument.file_name || 'document',
        fileSize: Number(failedDocument.file_size || 0),
        fileType: failedDocument.file_type || 'application/octet-stream',
        dealName: failedDocument.deal_name || '',
        companyName: failedDocument.company_name || failedDocument.deal_name || '',
        workstream: failedDocument.workstream || 'General',
        submissionNotes: failedDocument.submission_notes || '',
        projectId: failedDocument.project_id || '',
        projectStage: failedDocument.project_stage || '',
        documentType: failedDocument.document_type || 'auto-detect',
        submissionBatchId,
        expectedBatchDocumentCount,
        storageFileUrl,
        userAnthropicApiKey: req.params.userAnthropicApiKey,
        userOpenAiApiKey: req.params.userOpenAiApiKey,
        userGeminiApiKey: req.params.userGeminiApiKey,
        userDeepseekApiKey: req.params.userDeepseekApiKey,
        userApiKey: req.params.userApiKey,
        userProvider: req.params.userProvider,
        docPrimaryModel: req.params.docPrimaryModel,
        docBackupModel: req.params.docBackupModel,
        synthPrimaryModel: req.params.synthPrimaryModel,
        synthBackupModel: req.params.synthBackupModel,
      },
    })

    return {
      ok: true,
      status: 'retry_queued',
      requestID: recovered.response.requestID,
      originalRequestID: requestID,
      submissionBatchId,
      recoverySource: 'stored_file',
    }
  }

  const path = environment === 'test'
    ? 'webhook-test/dd-retry-failed-document'
    : 'webhook/dd-retry-failed-document'

  const formData: Array<{ key: string; value: string }> = [{ key: 'requestID', value: requestID }]
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

  const response = await n8nFinancialAgent.rawRequest<{ ok?: boolean; requestID?: string; status?: string }>({
    path,
    method: 'POST',
    bodyType: 'form-data',
    formData,
  })

  return response.data
}
