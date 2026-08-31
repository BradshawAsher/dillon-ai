import { afterEach, describe, expect, it, vi } from 'vitest'
import chatAssistant from '../../backend/diligence/chatAssistant'

afterEach(() => vi.unstubAllGlobals())

describe('chat assistant relay', () => {
  it('forwards the established chat payload through the server-side n8n client', async () => {
    const rawRequest = vi.fn().mockResolvedValue({ data: { answer: 'Secure response' } })
    vi.stubGlobal('n8nFinancialAgent', { rawRequest })

    await expect(chatAssistant({
      params: { question: 'What is the risk?', context: 'Deal context', sessionId: 'session-1', isDebateMode: true },
      user: { fullName: 'Test', email: 'test@example.com' },
    })).resolves.toEqual({ answer: 'Secure response' })

    expect(rawRequest).toHaveBeenCalledWith(expect.objectContaining({
      path: 'webhook/dd-chat',
      method: 'POST',
      bodyType: 'json',
      json: expect.objectContaining({ question: 'What is the risk?', context: 'Deal context', sessionId: 'session-1', isDebateMode: true }),
    }))
  })

  it('rejects an empty question before contacting n8n', async () => {
    const rawRequest = vi.fn()
    vi.stubGlobal('n8nFinancialAgent', { rawRequest })
    await expect(chatAssistant({ params: { question: '   ' }, user: { fullName: 'Test', email: 'test@example.com' } })).rejects.toThrow('question is required')
    expect(rawRequest).not.toHaveBeenCalled()
  })
})
