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

    it('expands MM/bn shorthand and spelled-out magnitudes', () => {
        expect(formatCurrencyValue('$1.5MM', 'USD')).toContain('1,500,000')
        expect(formatCurrencyValue('1.5bn', 'USD')).toContain('1,500,000,000')
        expect(formatCurrencyValue('1.5 million', 'USD')).toContain('1,500,000')
        expect(formatCurrencyValue('750 thousand', 'USD')).toContain('750,000')
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

    it('coerces null/undefined to the neutral tone instead of throwing', () => {
        expect(getSubmissionInsightTone(null as unknown as string)).toBe('secondary')
        expect(getSubmissionInsightTone(undefined as unknown as string)).toBe('secondary')
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

    it('parses a confidence written with a percent sign', () => {
        // "85%" previously failed Number() and showed as no confidence.
        expect(getAiSubmissionViewModel(makeRow({ aiConfidence: '85%' })).confidencePercent).toBe(85)
        expect(getAiSubmissionViewModel(makeRow({ aiConfidence: '1%' })).confidencePercent).toBe(1)
    })

    it('groups thousands consistently for integer and decimal metrics', () => {
        const extracted = JSON.stringify({
            response: {
                calculated_metrics: {
                    headcount: 1234567,
                    dscr: 1234567.5,
                },
            },
        })
        const vm = getAiSubmissionViewModel(makeRow({ extractedJson: extracted }))
        const byLabel = Object.fromEntries(vm.displayMetrics.map((m) => [m.label, m.value]))
        expect(byLabel['Headcount']).toBe('1,234,567')
        // Decimals must also be grouped (previously rendered "1234567.50").
        expect(byLabel['Dscr']).toBe('1,234,567.50')
    })

    it('parses structured flag objects with individual confidence scores and citations', () => {
        const row = makeRow({
            aiConfidence: '0.90',
            aiRedFlags: JSON.stringify([
                {
                    description: 'Material EBITDA inconsistency between CIM and tax return.',
                    confidence_score: 0.98,
                    severity: 'critical',
                    citations: [{ source_file: 'Tax_Return_2023.pdf', row_or_cell: 'Page 1, Line 21' }]
                }
            ]),
            aiYellowFlags: JSON.stringify([
                {
                    description: 'Customer concentration above 25% threshold.',
                    confidence_score: 0.74,
                    status: 'investigate'
                }
            ]),
            aiGreenFlags: JSON.stringify([
                'Strong recurring revenue base with 92% retention.'
            ])
        })

        const vm = getAiSubmissionViewModel(row)
        expect(vm.redFlags).toEqual(['Material EBITDA inconsistency between CIM and tax return.'])
        expect(vm.structuredFindings.redFlags).toHaveLength(1)
        expect(vm.structuredFindings.redFlags[0].text).toBe('Material EBITDA inconsistency between CIM and tax return.')
        expect(vm.structuredFindings.redFlags[0].confidence).toBe(0.98)
        expect(vm.structuredFindings.redFlags[0].severity).toBe('critical')
        expect(vm.structuredFindings.redFlags[0].citations).toEqual([
            { sourceFile: 'Tax_Return_2023.pdf', rowOrCell: 'Page 1, Line 21' }
        ])

        expect(vm.yellowFlags).toEqual(['Customer concentration above 25% threshold.'])
        expect(vm.structuredFindings.yellowFlags[0].confidence).toBe(0.74)

        expect(vm.greenFlags).toEqual(['Strong recurring revenue base with 92% retention.'])
        // Falls back to document-level confidence (0.90) for plain string flags
        expect(vm.structuredFindings.greenFlags[0].confidence).toBe(0.90)
    })
})
