type Params = {
  question?: unknown
  context?: unknown
  sessionId?: unknown
  isDebateMode?: unknown
  userAnthropicApiKey?: unknown
  userOpenAiApiKey?: unknown
  userGeminiApiKey?: unknown
  userDeepseekApiKey?: unknown
}

function boundedText(value: unknown, field: string, maxLength: number, required = false): string {
  const text = typeof value === 'string' ? value.trim() : ''
  if (required && !text) throw new Error(`${field} is required`)
  if (text.length > maxLength) throw new Error(`${field} exceeds the maximum length`)
  return text
}

/**
 * Server-side relay for the n8n chat webhook. It keeps Header Auth out of the
 * browser while preserving the existing n8n payload contract.
 */
export default async function chatAssistant(req: { params: Params; user: User }) {
  const question = boundedText(req.params.question, 'question', 8_000, true)
  const context = boundedText(req.params.context, 'context', 100_000)
  const sessionId = boundedText(req.params.sessionId, 'sessionId', 200)

  const response = await n8nFinancialAgent.rawRequest<{ answer?: string; output?: string; text?: string }>({
    path: 'webhook/dd-chat',
    method: 'POST',
    bodyType: 'json',
    json: {
      question,
      context,
      sessionId,
      isDebateMode: req.params.isDebateMode === true,
      userAnthropicApiKey: boundedText(req.params.userAnthropicApiKey, 'userAnthropicApiKey', 1_000),
      userOpenAiApiKey: boundedText(req.params.userOpenAiApiKey, 'userOpenAiApiKey', 1_000),
      userGeminiApiKey: boundedText(req.params.userGeminiApiKey, 'userGeminiApiKey', 1_000),
      userDeepseekApiKey: boundedText(req.params.userDeepseekApiKey, 'userDeepseekApiKey', 1_000),
    },
  })

  return response.data
}
