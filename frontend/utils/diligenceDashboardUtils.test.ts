import { describe, expect, it } from 'vitest'

import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'
import {
    createUnusedProjectId,
    formatElapsedDuration,
    getFindingVariant,
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
