export type SubmitEnvironment = 'production' | 'test'

export type N8nSubmitResponse = {
  requestID?: string
  status?: string
  receivedAt?: string
  id?: number
  createdAt?: string
  updatedAt?: string
  rowId?: number
  environment?: string
}

export function getSubmitPath(environment: SubmitEnvironment) {
  return environment === 'test'
    ? 'webhook-test/d6884691-1689-479d-b1b3-ee7a8bca7380'
    : 'webhook/d6884691-1689-479d-b1b3-ee7a8bca7380'
}

export function normalizeSubmitEnvironment(environment?: string): SubmitEnvironment {
  return environment === 'test' ? 'test' : 'production'
}

export function normalizeWebhookResponse(
  response: N8nSubmitResponse | null | undefined,
  fallback: {
    requestID: string
    submittedAt: string
    environment: SubmitEnvironment
  }
) {
  return {
    requestID: response?.requestID ?? fallback.requestID,
    status: response?.status ?? 'queued',
    receivedAt: response?.receivedAt ?? fallback.submittedAt,
    id: response?.id ?? response?.rowId,
    createdAt: response?.createdAt ?? fallback.submittedAt,
    updatedAt: response?.updatedAt ?? fallback.submittedAt,
    environment: response?.environment ? normalizeSubmitEnvironment(response.environment) : fallback.environment,
  }
}
