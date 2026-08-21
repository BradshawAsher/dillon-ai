import { describe, expect, it } from 'vitest'

import { classifyError } from './errorClassifier'

describe('classifyError', () => {
    it('classifies rate-limit / quota errors', () => {
        expect(classifyError('HTTP 429 Too Many Requests').category).toBe('RATE_LIMIT')
        expect(classifyError('Rate limit reached for this model').category).toBe('RATE_LIMIT')
        expect(classifyError('rate-limited, retry later').category).toBe('RATE_LIMIT')
        expect(classifyError('Quota exceeded').category).toBe('RATE_LIMIT')
        expect(classifyError('Provider overloaded').category).toBe('RATE_LIMIT')
    })

    it('does not treat words that merely contain "rate" as a rate limit', () => {
        // "generate" and "moderate" contain "rate" but are not throttling errors.
        expect(classifyError('Failed to generate response').category).toBe('SYSTEM_GENERAL')
        expect(classifyError('Could not moderate the content').category).toBe('SYSTEM_GENERAL')
    })

    it('classifies auth / credential errors', () => {
        expect(classifyError('HTTP 401 Unauthorized').category).toBe('AUTH_CREDENTIAL')
        expect(classifyError('Invalid API key').category).toBe('AUTH_CREDENTIAL')
        expect(classifyError('Forbidden').category).toBe('AUTH_CREDENTIAL')
        expect(classifyError('HTTP 401 Unauthorized').isRetryable).toBe(false)
        expect(classifyError('API key not found').category).toBe('AUTH_CREDENTIAL')
    })

    it('does not treat a generic "not found" or "header" as an auth error', () => {
        // A missing workflow/model is a system error (retryable), not a credential
        // problem, and a CSV header issue is not an auth failure.
        expect(classifyError('Workflow not found').category).toBe('SYSTEM_GENERAL')
        expect(classifyError('Model not found').category).toBe('SYSTEM_GENERAL')
        expect(classifyError('CSV header row missing').category).toBe('SYSTEM_GENERAL')
    })

    it('classifies schema / parsing errors', () => {
        expect(classifyError('JSON parse error at position 12').category).toBe('SCHEMA_PARSING')
        expect(classifyError('Model returned invalid structured output').category).toBe('SCHEMA_PARSING')
    })

    it('falls back to a general system error for unknown or empty input', () => {
        expect(classifyError('Something unexpected happened').category).toBe('SYSTEM_GENERAL')
        expect(classifyError('').category).toBe('SYSTEM_GENERAL')
        expect(classifyError(null).category).toBe('SYSTEM_GENERAL')
        expect(classifyError(undefined).category).toBe('SYSTEM_GENERAL')
    })

    it('echoes the original message into the description when present', () => {
        expect(classifyError('HTTP 429 slow down').description).toBe('HTTP 429 slow down')
    })
})
