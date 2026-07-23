type Params = { requestID: string; action: 'nonconsidered' | 'considered'; environment?: 'production' | 'test' }

export default async function updateSubmissionRow(req: { params: Params; user: User }) {
  const requestID = req.params.requestID?.trim()
  if (!requestID) throw new Error('requestID is required')
  if (!['nonconsidered', 'considered'].includes(req.params.action)) throw new Error('action must be nonconsidered or considered')
  const path = req.params.environment === 'test' ? 'webhook-test/dd-document-consideration' : 'webhook/dd-document-consideration'
  const response = await n8nFinancialAgent.rawRequest<{ ok?: boolean }>({
    path,
    method: 'POST',
    bodyType: 'form-data',
    formData: [{ key: 'requestID', value: requestID }, { key: 'action', value: req.params.action }],
  })
  return response.data
}
