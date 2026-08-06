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
        expect(isStoppedSubmissionStatus('processing')).toBe(false)
    })
})

describe('formatSubmissionStatus', () => {
    it('title-cases and de-snakes', () => {
        expect(formatSubmissionStatus('needs_human_review')).toBe('Needs Human Review')
        expect(formatSubmissionStatus('in-progress')).toBe('In Progress')
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
})
