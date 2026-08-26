import { describe, expect, it } from 'vitest'

import {
    formatSubmissionStatus,
    hasAiEnrichment,
    isActiveSubmissionStatus,
    isStoppedSubmissionStatus,
    normalizeSubmissionStatus,
    type SubmissionHistoryItem,
} from './submissionHistory'

describe('normalizeSubmissionStatus', () => {
    it('trims and lowercases', () => {
        expect(normalizeSubmissionStatus('  PROCESSING ')).toBe('processing')
    })

    it('coerces null/undefined to an empty string instead of throwing', () => {
        expect(normalizeSubmissionStatus(null as unknown as string)).toBe('')
        expect(normalizeSubmissionStatus(undefined as unknown as string)).toBe('')
        expect(isActiveSubmissionStatus(null as unknown as string)).toBe(false)
        expect(formatSubmissionStatus(null as unknown as string)).toBe('Unknown')
    })
})

describe('isActiveSubmissionStatus', () => {
    it('recognizes in-flight statuses regardless of casing/whitespace', () => {
        expect(isActiveSubmissionStatus('Queued')).toBe(true)
        expect(isActiveSubmissionStatus(' processing ')).toBe(true)
        expect(isActiveSubmissionStatus('submitted')).toBe(true)
    })

    it('returns false for terminal statuses', () => {
        expect(isActiveSubmissionStatus('completed')).toBe(false)
        expect(isActiveSubmissionStatus('failed')).toBe(false)
        expect(isActiveSubmissionStatus('')).toBe(false)
    })
})

describe('isStoppedSubmissionStatus', () => {
    it('recognizes user/system stops', () => {
        expect(isStoppedSubmissionStatus('stopped')).toBe(true)
        expect(isStoppedSubmissionStatus('STOPPED_BY_USER')).toBe(true)
        expect(isStoppedSubmissionStatus('Stopped By User')).toBe(true)
        expect(isStoppedSubmissionStatus('stopped-by-user')).toBe(true)
        expect(isStoppedSubmissionStatus('processing')).toBe(false)
    })
})

describe('formatSubmissionStatus', () => {
    it('title-cases and de-snakes', () => {
        expect(formatSubmissionStatus('needs_human_review')).toBe('Needs Human Review')
        expect(formatSubmissionStatus('in-progress')).toBe('In Progress')
    })

    it('normalizes an all-caps source status to title case', () => {
        expect(formatSubmissionStatus('IN_PROGRESS')).toBe('In Progress')
        expect(formatSubmissionStatus('COMPLETED')).toBe('Completed')
        expect(formatSubmissionStatus('STOPPED_BY_USER')).toBe('Stopped By User')
    })

    it('falls back to Unknown for empty input', () => {
        expect(formatSubmissionStatus('   ')).toBe('Unknown')
    })
})

function makeRow(overrides: Partial<SubmissionHistoryItem> = {}): SubmissionHistoryItem {
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
        ...overrides,
    }
}

describe('hasAiEnrichment', () => {
    it('is false for a bare intake row with no AI output', () => {
        expect(hasAiEnrichment(makeRow())).toBe(false)
    })

    it('is true when any AI/classification field is populated', () => {
        expect(hasAiEnrichment(makeRow({ trafficLight: 'GREEN' }))).toBe(true)
        expect(hasAiEnrichment(makeRow({ aiSummary: 'Looks strong' }))).toBe(true)
        expect(hasAiEnrichment(makeRow({ needsHumanReview: true }))).toBe(true)
    })

    it('does not throw when string columns arrive as null/undefined', () => {
        const nulledRow = makeRow({
            riskLevel: null as unknown as string,
            category: undefined as unknown as string,
            trafficLight: null as unknown as string,
            ebitdaExtracted: null as unknown as string,
            extractedJson: null as unknown as string,
            aiSummary: null as unknown as string,
            aiTargetValue: null as unknown as string,
            aiConfidence: null as unknown as string,
            projectId: null as unknown as string,
            projectStage: null as unknown as string,
            documentType: null as unknown as string,
            valuationLowerBound: null as unknown as string,
            valuationBaseEstimate: null as unknown as string,
            valuationUpperBound: null as unknown as string,
            investmentBuyReasoning: null as unknown as string,
        })
        expect(hasAiEnrichment(nulledRow)).toBe(false)
        expect(hasAiEnrichment({ ...nulledRow, aiSummary: 'Populated' })).toBe(true)
    })
})
