import { afterEach, describe, expect, it, vi } from 'vitest'

import questionnaireDraftAssistant, { sanitizeQuestionnaireDraftResponse } from '../../backend/diligence/questionnaireDraftAssistant'

afterEach(() => vi.unstubAllGlobals())

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
        userOpenAiApiKey: 'sk-test',
        currentValues: { dealName: 'Apex', ignored: 'nope' },
      },
      user: { fullName: 'Test', email: 'test@example.com' },
    })

    expect(result.fields).toEqual([expect.objectContaining({ field: 'askingPrice', value: 4_800_000, confidence: 1, origin: 'ai' })])
    expect(result.missingRequiredFields).toEqual(['dealName', 'annualRevenue', 'reportedEbitda'])
    expect(rawRequest).toHaveBeenCalledWith(expect.objectContaining({
      path: 'webhook/dd-questionnaire-prefill',
      json: expect.objectContaining({ currentValues: { dealName: 'Apex' }, userOpenAiApiKey: 'sk-test' }),
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
        userOpenAiApiKey: 'sk-test',
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
})
