import { describe, expect, it } from 'vitest'

import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import {
    calculateDocumentCost,
    calculateSynthesisCost,
    createUnusedProjectId,
    formatConfidencePercent,
    formatElapsedDuration,
    getFindingVariant,
    getModelTokenRates,
    getSeverityVariant,
    getSubmissionStatusVariant,
    hasReachedProcessingStage,
    isDuplicateProjectDocument,
    parseIllustrativeFacts,
    safeFormatCurrency,
    sanitizeCurrencyCode,
    withDerivedCapitalStack,
} from './diligenceDashboardUtils'

describe('variant mappers', () => {
    it('maps finding types', () => {
        expect(getFindingVariant('Red Flag')).toBe('destructive')
        expect(getFindingVariant('Green Flag')).toBe('success')
    })

    it('maps severities', () => {
        expect(getSeverityVariant('Critical')).toBe('destructive')
        expect(getSeverityVariant('High')).toBe('warning')
        expect(getSeverityVariant('Medium')).toBe('secondary')
        expect(getSeverityVariant('Low')).toBe('outline')
    })

    it('maps submission statuses, including halted batches', () => {
        expect(getSubmissionStatusVariant('completed')).toBe('success')
        expect(getSubmissionStatusVariant('Processing')).toBe('warning')
        expect(getSubmissionStatusVariant('failed')).toBe('destructive')
        expect(getSubmissionStatusVariant('stopped')).toBe('warning')
        expect(getSubmissionStatusVariant('stopped_by_user')).toBe('warning')
        // Spaced / hyphenated variants must resolve like their underscore form.
        expect(getSubmissionStatusVariant('Stopped By User')).toBe('warning')
        expect(getSubmissionStatusVariant('stopped-by-user')).toBe('warning')
        expect(getSubmissionStatusVariant('human review')).toBe('warning')
        expect(getSubmissionStatusVariant('needs review')).toBe('warning')
        expect(getSubmissionStatusVariant('whatever')).toBe('secondary')
    })
})

describe('currency helpers', () => {
    it('sanitizes currency codes and falls back to USD', () => {
        expect(sanitizeCurrencyCode('eur')).toBe('EUR')
        expect(sanitizeCurrencyCode('not-a-code')).toBe('USD')
        expect(sanitizeCurrencyCode(undefined)).toBe('USD')
    })

    it('formats currency defensively', () => {
        expect(safeFormatCurrency(1500, 'USD')).toContain('1,500')
        // invalid currency should not throw
        expect(() => safeFormatCurrency(1500, '$$$')).not.toThrow()
    })
})

describe('createUnusedProjectId', () => {
    it('produces an id not present in the used set', () => {
        const id = createUnusedProjectId(['project-x'])
        expect(id.startsWith('project-')).toBe(true)
        expect(id).not.toBe('project-x')
    })
})

describe('parseIllustrativeFacts', () => {
    it('returns confirmed numeric facts only', () => {
        const json = JSON.stringify({
            revenue: { value: 1000, status: 'confirmed' },
            ebitda_sde: { value: 200, status: 'illustrative' },
        })
        expect(parseIllustrativeFacts(json)).toEqual({ revenue: 1000, ebitda: null })
    })

    it('is null-safe on malformed JSON', () => {
        expect(parseIllustrativeFacts('{bad')).toEqual({ revenue: null, ebitda: null })
    })
})

describe('hasReachedProcessingStage', () => {
    it('recognizes processing and terminal statuses', () => {
        expect(hasReachedProcessingStage('Processing')).toBe(true)
        expect(hasReachedProcessingStage('completed')).toBe(true)
        expect(hasReachedProcessingStage('draft')).toBe(false)
    })
})

describe('isDuplicateProjectDocument', () => {
    const row = (over: Partial<SubmissionHistoryItem>): SubmissionHistoryItem =>
        ({ projectId: 'p1', fileName: 'a.pdf', fileSize: 100, ...over } as SubmissionHistoryItem)
    const file = { name: 'A.pdf', size: 100 } as File

    it('detects a same project/name/size duplicate (case-insensitive)', () => {
        expect(isDuplicateProjectDocument(file, 'p1', [row({})])).toBe(true)
    })

    it('is not a duplicate when size differs', () => {
        expect(isDuplicateProjectDocument(file, 'p1', [row({ fileSize: 200 })])).toBe(false)
    })
})

describe('formatElapsedDuration', () => {
    it('renders seconds and minutes', () => {
        expect(formatElapsedDuration(45)).toBe('45s')
        expect(formatElapsedDuration(125)).toBe('2m 5s')
    })

    it('renders hours for long durations (was 90m 0s before)', () => {
        expect(formatElapsedDuration(90 * 60)).toBe('1h 30m 0s')
    })

    it('guards negative / NaN input', () => {
        expect(formatElapsedDuration(-5)).toBe('0s')
        expect(formatElapsedDuration(Number.NaN)).toBe('0s')
    })
})

describe('withDerivedCapitalStack', () => {
    const base = { purchasePrice: 1_000_000, equityContributionPercent: 0.3, sellerNoteAmount: 100_000 } as DealModel

    it('derives equity and senior debt from price and financing inputs', () => {
        const out = withDerivedCapitalStack(base)
        expect(out.equityAmount).toBe(300_000)
        expect(out.seniorDebtAmount).toBe(600_000) // 1,000,000 - 300,000 equity - 100,000 seller note
    })

    it('leaves the model untouched when there are no financing inputs', () => {
        const noFinancing = { purchasePrice: 1_000_000 } as DealModel
        expect(withDerivedCapitalStack(noFinancing)).toBe(noFinancing)
    })
})

describe('formatConfidencePercent', () => {
    it('scales a bare fraction up to a percentage', () => {
        expect(formatConfidencePercent(0.87)).toBe('87%')
        expect(formatConfidencePercent('0.5')).toBe('50%')
        expect(formatConfidencePercent(1)).toBe('100%')
    })

    it('leaves an already-percentage value alone', () => {
        expect(formatConfidencePercent(85)).toBe('85%')
        expect(formatConfidencePercent('85%')).toBe('85%')
    })

    it('honors an explicit percent sign instead of rescaling it', () => {
        // "1%" is one percent, not a 1.0 fraction that should become 100%.
        expect(formatConfidencePercent('1%')).toBe('1%')
        expect(formatConfidencePercent('0.5%')).toBe('1%') // rounds to nearest whole percent
    })

    it('returns Pending for missing input and passes through non-numeric text', () => {
        expect(formatConfidencePercent(null)).toBe('Pending')
        expect(formatConfidencePercent('')).toBe('Pending')
        expect(formatConfidencePercent('high')).toBe('high')
    })
})

describe('getModelTokenRates', () => {
    it('maps each benchmark model family to its per-token rate', () => {
        expect(getModelTokenRates('openai-5-6-sol')).toEqual({ inputRate: 0.000005, outputRate: 0.000030 })
        expect(getModelTokenRates('opus-5')).toEqual({ inputRate: 0.000005, outputRate: 0.000025 })
        expect(getModelTokenRates('sonnet-5')).toEqual({ inputRate: 0.000002, outputRate: 0.000010 })
        expect(getModelTokenRates('gemini-3-1-flash-lite')).toEqual({ inputRate: 0.00000025, outputRate: 0.0000015 })
    })

    it('defaults to Terra rates for Terra, unknown, or missing model ids', () => {
        const terra = { inputRate: 0.000002, outputRate: 0.000012 }
        expect(getModelTokenRates('openai-5-6-terra')).toEqual(terra)
        expect(getModelTokenRates('something-unrecognized')).toEqual(terra)
        expect(getModelTokenRates(undefined)).toEqual(terra)
        expect(getModelTokenRates(null)).toEqual(terra)
        expect(getModelTokenRates('')).toEqual(terra)
    })
})

describe('calculateDocumentCost', () => {
    it('prefers a logged costUsd over any estimate', () => {
        expect(calculateDocumentCost({ costUsd: 0.5, inputTokens: 1000, outputTokens: 1000 })).toBe(0.5)
    })

    it('prices measured tokens using the document model rate', () => {
        // Opus 5: 100k in * $5/MTok + 50k out * $25/MTok = 0.5 + 1.25.
        expect(calculateDocumentCost({ inputTokens: 100_000, outputTokens: 50_000, modelUsed: 'opus-5' })).toBeCloseTo(1.75, 4)
        // Sonnet 5 intro rate on the same tokens: 0.2 + 0.5.
        expect(calculateDocumentCost({ inputTokens: 100_000, outputTokens: 50_000, modelUsed: 'sonnet-5' })).toBeCloseTo(0.7, 4)
    })

    it('honours the snake_case model_used alias', () => {
        expect(calculateDocumentCost({ inputTokens: 100_000, outputTokens: 50_000, model_used: 'opus-5' })).toBeCloseTo(1.75, 4)
    })
})

describe('calculateSynthesisCost', () => {
    it('prefers a logged costUsd when present', () => {
        expect(calculateSynthesisCost({ costUsd: 0.5 })).toBe(0.5)
    })

    it('factors finalJudgmentJson length into the content-based estimate', () => {
        // Without the fix this field was read under a non-existent name, so the
        // synthesis body never influenced the estimate.
        const small = calculateSynthesisCost({ finalJudgmentJson: '{}' })
        const large = calculateSynthesisCost({ finalJudgmentJson: 'x'.repeat(40_000) })
        expect(large).toBeGreaterThan(small)
    })
})
