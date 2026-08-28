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
  let storageFileUrl = String(failedDocument?.storage_file_url || '').trim()

  // If storage_file_url is empty on this row, check sibling documents with matching file_name
  if (!storageFileUrl && failedDocument?.file_name) {
    try {
      const { data: siblingDocs } = await supabase
        .from('documents')
        .select('storage_file_url')
        .eq('file_name', failedDocument.file_name)
        .neq('storage_file_url', '')
        .order('created_at', { ascending: false })
        .limit(1)

      if (siblingDocs?.[0]?.storage_file_url) {
        storageFileUrl = siblingDocs[0].storage_file_url
        // Update document row with the resolved storage URL for future retries
        await supabase
          .from('documents')
          .update({ storage_file_url: storageFileUrl })
          .eq('request_id', requestID)
      }
    } catch {
      // Non-blocking sibling lookup
    }
  }

  if (failedStatus === 'upload_failed' || Boolean(storageFileUrl)) {
    if (!failedDocument) throw new Error('The failed document could not be loaded for retry')
    if (!storageFileUrl) {
      throw new Error('This upload failed before a reusable file was stored. Please re-upload the document to try again.')
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
        skipDuplicateCheck: true,
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
