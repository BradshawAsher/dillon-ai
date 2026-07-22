type Params = { requestID: string; environment?: 'production' | 'test' }

export default async function retryFailedDocument(req: { params: Params; user: User }) {
  const requestID = req.params.requestID?.trim()
  if (!requestID) throw new Error('requestID is required')

  const path = req.params.environment === 'test'
    ? 'webhook-test/dd-retry-failed-document'
    : 'webhook/dd-retry-failed-document'

  const response = await n8nFinancialAgent.rawRequest<{ ok?: boolean; requestID?: string; status?: string }>({
    path,
    method: 'POST',
    bodyType: 'form-data',
    formData: [{ key: 'requestID', value: requestID }],
  })

  return response.data
}
