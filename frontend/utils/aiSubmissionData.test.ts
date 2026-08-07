import { describe, expect, it } from 'vitest'

import {
    formatCurrencyValue,
    getAiSubmissionViewModel,
    getSubmissionInsightTone,
    splitReadableText,
} from './aiSubmissionData'
import type { SubmissionHistoryItem } from './submissionHistory'

describe('formatCurrencyValue', () => {
    it('formats a plain numeric string', () => {
        expect(formatCurrencyValue('1200', 'USD')).toContain('1,200')
    })

    it('expands K/M/B abbreviations', () => {
        expect(formatCurrencyValue('1.2M', 'USD')).toContain('1,200,000')
        expect(formatCurrencyValue('500K', 'USD')).toContain('500,000')
        expect(formatCurrencyValue('2B', 'USD')).toContain('2,000,000,000')
    })

    it('handles negative abbreviations (the fix)', () => {
        expect(formatCurrencyValue('-1.2M', 'USD')).toContain('1,200,000')
        expect(formatCurrencyValue('-1.2M', 'USD')).toMatch(/-|\(/) // negative rendering
    })

    it('strips currency symbols and separators', () => {
        expect(formatCurrencyValue('$1,500', 'USD')).toContain('1,500')
    })

    it('falls back to USD for an invalid currency code and never throws', () => {
        expect(() => formatCurrencyValue('1000', '$$$')).not.toThrow()
    })

    it('returns the original text when it is not numeric', () => {
        expect(formatCurrencyValue('not available', 'USD')).toBe('not available')
        expect(formatCurrencyValue('   ', 'USD')).toBe('')
    })
})

describe('getSubmissionInsightTone', () => {
    it('maps traffic-light colors to tones', () => {
        expect(getSubmissionInsightTone('RED')).toBe('destructive')
        expect(getSubmissionInsightTone('yellow')).toBe('warning')
        expect(getSubmissionInsightTone('amber')).toBe('warning')
        expect(getSubmissionInsightTone('green')).toBe('success')
        expect(getSubmissionInsightTone('')).toBe('secondary')
    })
})

describe('splitReadableText', () => {
    it('returns [] for empty input', () => {
        expect(splitReadableText('')).toEqual([])
    })

    it('keeps a short single paragraph intact', () => {
        expect(splitReadableText('One short sentence.')).toEqual(['One short sentence.'])
    })

    it('splits an existing newline/semicolon list into items', () => {
        expect(splitReadableText('First item\nSecond item\nThird item')).toEqual([
            'First item', 'Second item', 'Third item',
        ])
    })

    it('chunks a long single paragraph at sentence boundaries', () => {
        const long = Array.from({ length: 12 }, (_, i) => `Sentence number ${i + 1} is here.`).join(' ')
        const sections = splitReadableText(long, 100)
        expect(sections.length).toBeGreaterThan(1)
        expect(sections.join(' ')).toBe(long)
    })
})

function makeRow(over: Partial<SubmissionHistoryItem> = {}): SubmissionHistoryItem {
    return {
        requestID: '', dealName: '', companyName: '', workstream: '', submissionNotes: '',
        analystName: '', analystEmail: '', projectId: '', projectStage: '', documentType: '',
        submissionBatchId: '', expectedBatchDocumentCount: 0, fileName: '', fileSize: 0, fileType: '',
        triggerTimestamp: '', status: '', environment: '', receivedAt: '', processingStartedAt: '',
        processedAt: '', errorMessage: '', riskLevel: '', category: '', trafficLight: '',
        ebitdaExtracted: '', needsHumanReview: false, extractedJson: '', storageFileId: '',
        storageFileUrl: '', aiSummary: '', aiTargetValue: '', aiVariance: '', aiEscalationReason: '',
        aiIntent: '', aiCitations: '', aiRedFlags: '', aiYellowFlags: '', aiGreenFlags: '',
        aiConfidence: '', valuationLowerBound: '', valuationBaseEstimate: '', valuationUpperBound: '',
        valuationCurrency: '', investmentIsFavorable: null, investmentBuyReasoning: '',
        isConsidered: true, id: 1, createdAt: '', updatedAt: '',
        ...over,
    }
}

describe('getAiSubmissionViewModel', () => {
    it('prefers explicit row columns over parsed JSON', () => {
        const vm = getAiSubmissionViewModel(makeRow({
            aiSummary: 'Direct summary',
            aiConfidence: '0.82',
            aiRedFlags: JSON.stringify(['Concentration risk']),
        }))
        expect(vm.summary).toBe('Direct summary')
        expect(vm.confidencePercent).toBe(82)
        expect(vm.redFlags).toEqual(['Concentration risk'])
    })

    it('falls back to extracted JSON when columns are empty', () => {
        const extracted = JSON.stringify({
            response: { summary: 'From JSON', flags: { red_flags: ['JSON red flag'] } },
            confidence: 0.5,
        })
        const vm = getAiSubmissionViewModel(makeRow({ extractedJson: extracted }))
        expect(vm.summary).toBe('From JSON')
        expect(vm.confidencePercent).toBe(50)
        expect(vm.redFlags).toEqual(['JSON red flag'])
    })
})
