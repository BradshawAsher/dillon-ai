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

  const path = req.params.environment === 'test'
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
