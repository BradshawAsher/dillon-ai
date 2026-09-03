import { afterEach, describe, expect, it, vi } from 'vitest'

const db = vi.hoisted(() => ({
  draftRows: new Map<string, any>(),
}))

vi.mock('../../backend/supabaseClient', () => ({
  supabase: {
    from: () => ({
      upsert: async (row: any) => {
        db.draftRows.set(row.id, row)
        return { error: null }
      },
      update: (patch: any) => ({
        eq: (key: string, val: string) => {
          const existing = db.draftRows.get(val) || {}
          db.draftRows.set(val, { ...existing, ...patch })
          return Promise.resolve({ error: null })
        },
      }),
      select: () => ({
        eq: (key: string, val: string) => ({
          maybeSingle: async () => ({
            data: db.draftRows.get(val) || null,
            error: null,
          }),
        }),
      }),
    }),
  },
}))

import questionnaireDraftAssistant, {
  getQuestionnaireDraft,
  sanitizeQuestionnaireDraftResponse,
} from '../../backend/diligence/questionnaireDraftAssistant'

afterEach(() => {
  vi.unstubAllGlobals()
  db.draftRows.clear()
})

describe('questionnaire AI draft relay', () => {
  it('forwards a bounded image request and sanitizes the proposed patch', async () => {
    const rawRequest = vi.fn().mockResolvedValue({
      data: {
        fields: [
          { field: 'askingPrice', value: '4800000', confidence: 1.5, source: 'Broker screenshot', kind: 'extracted' },
          { field: 'unsupportedField', value: 'ignore me', confidence: 1, source: 'bad' },
        ],
        warnings: ['Verify the reporting period.'],
      },
    })
    vi.stubGlobal('n8nFinancialAgent', { rawRequest })

    const result = await questionnaireDraftAssistant({
      params: {
        requestId: 'draft-1',
        sourceType: 'image',
        fileName: 'broker-summary.png',
        imageDataUrl: 'data:image/png;base64,aGVsbG8=',
        currentValues: { dealName: 'Apex', ignored: 'nope' },
        userProvider: 'anthropic',
        userApiKey: 'sk-ant-questionnaire-test',
        docPrimaryModel: 'Claude Sonnet 5',
        docBackupModel: 'Claude Opus 5',
      },
      user: { fullName: 'Test', email: 'test@example.com' },
    })

    if (!('fields' in result)) throw new Error('Expected draft result with fields')
    expect(result.fields).toEqual([expect.objectContaining({ field: 'askingPrice', value: 4_800_000, confidence: 1, origin: 'ai' })])
    expect(result.missingRequiredFields).toEqual(['dealName', 'annualRevenue', 'reportedEbitda'])
    expect(rawRequest).toHaveBeenCalledWith(expect.objectContaining({
      path: 'webhook/dd-questionnaire-prefill',
      json: expect.objectContaining({
        currentValues: { dealName: 'Apex' },
        userProvider: 'anthropic',
        userApiKey: 'sk-ant-questionnaire-test',
        docPrimaryModel: 'Claude Sonnet 5',
        docBackupModel: 'Claude Opus 5',
      }),
    }))
  })

  it('does not forward a key when no supported provider is selected', async () => {
    const rawRequest = vi.fn().mockResolvedValue({ data: { fields: [], warnings: [] } })
    vi.stubGlobal('n8nFinancialAgent', { rawRequest })

    await questionnaireDraftAssistant({
      params: {
        requestId: 'draft-managed',
        sourceType: 'text',
        sourceText: 'Revenue: $4,000,000',
        userProvider: 'unsupported',
        userApiKey: 'must-not-be-forwarded',
      },
      user: { fullName: 'Test', email: 'test@example.com' },
    })

    expect(rawRequest.mock.calls[0][0].json).toEqual(expect.objectContaining({
      userProvider: '',
      userApiKey: '',
    }))
  })

  it('rejects an invalid image before contacting n8n', async () => {
    const rawRequest = vi.fn()
    vi.stubGlobal('n8nFinancialAgent', { rawRequest })

    await expect(questionnaireDraftAssistant({
      params: {
        requestId: 'draft-2',
        sourceType: 'image',
        imageDataUrl: 'https://example.com/image.png',
      },
      user: { fullName: 'Test', email: 'test@example.com' },
    })).rejects.toThrow('imageDataUrl must be')
    expect(rawRequest).not.toHaveBeenCalled()
  })

  it('deduplicates fields and drops invalid values from workflow output', () => {
    const result = sanitizeQuestionnaireDraftResponse({
      output: {
        fields: [
          { field: 'annualRevenue', value: 5_200_000, confidence: 0.9, source: 'Revenue row' },
          { field: 'annualRevenue', value: 1, confidence: 0.2, source: 'duplicate' },
          { field: 'grossMarginPercent', value: -2, confidence: 0.8, source: 'invalid' },
          { field: 'keyPersonRisk', value: 'extreme', confidence: 0.8, source: 'invalid enum' },
        ],
      },
    }, 'draft-3')

    expect(result.fields).toHaveLength(1)
    expect(result.fields[0].field).toBe('annualRevenue')
  })

  it('handles async dispatch returning queued status without waiting for n8n', async () => {
    const rawRequest = vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
    vi.stubGlobal('n8nFinancialAgent', { rawRequest })

    const result = await questionnaireDraftAssistant({
      params: {
        requestId: 'async-draft-1',
        sourceType: 'text',
        sourceText: 'Asking price: $2,500,000. Revenue: $4,000,000.',
        dispatchAsync: true,
      },
      user: { fullName: 'Test', email: 'test@example.com' },
    })

    expect(result).toEqual({ status: 'queued', requestId: 'async-draft-1' })
    expect(rawRequest).toHaveBeenCalledWith(expect.objectContaining({
      path: 'webhook/dd-questionnaire-prefill',
      method: 'POST',
    }))
  })

  it('polls getQuestionnaireDraft and returns processing when row not yet completed', async () => {
    const status = await getQuestionnaireDraft({
      params: { requestId: 'poll-req-1' },
      user: { fullName: 'Test', email: 'test@example.com' },
    })
    expect(status).toEqual({ status: 'processing', requestId: 'poll-req-1' })
  })

  it('polls getQuestionnaireDraft and returns completed draft when fields exist', async () => {
    db.draftRows.set('poll-req-2', {
      id: 'poll-req-2',
      session_id: 'draft_poll-req-2',
      status: 'completed',
      extracted_fields_json: [
        { field: 'askingPrice', value: 3_200_000, confidence: 0.95, source: 'Teaser' },
        { field: 'annualRevenue', value: 5_000_000, confidence: 0.9, source: 'Teaser' },
      ],
      warnings_json: ['Verify add-backs'],
    })

    const status = await getQuestionnaireDraft({
      params: { requestId: 'poll-req-2' },
      user: { fullName: 'Test', email: 'test@example.com' },
    })

    expect(status.status).toBe('completed')
    if (status.status === 'completed' && 'fields' in status) {
      expect(status.fields).toHaveLength(2)
      expect(status.warnings).toEqual(['Verify add-backs'])
    }
  })

  it('polls getQuestionnaireDraft and returns failed error when status is failed', async () => {
    db.draftRows.set('poll-req-3', {
      id: 'poll-req-3',
      session_id: 'draft_poll-req-3',
      status: 'failed',
      extracted_fields_json: [],
      warnings_json: ['Model context window exceeded'],
    })

    const status = await getQuestionnaireDraft({
      params: { requestId: 'poll-req-3' },
      user: { fullName: 'Test', email: 'test@example.com' },
    })

    expect(status).toEqual({
      status: 'failed',
      requestId: 'poll-req-3',
      error: 'Model context window exceeded',
    })
  })
})
