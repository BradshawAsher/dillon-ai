import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectIssueReportIntent } from './DealChatPanel'

describe('DealChatPanel detectIssueReportIntent', () => {
    it('detects bug reports accurately', () => {
        const result1 = detectIssueReportIntent('I found a bug in the document processing pipeline')
        expect(result1.isIssueIntent).toBe(true)
        expect(result1.category).toBe('bug')
        expect(result1.title).toContain('bug')

        const result2 = detectIssueReportIntent('report issue: something is broken with the upload button')
        expect(result2.isIssueIntent).toBe(true)
        expect(result2.category).toBe('ui_improvement') // contains button
    })

    it('detects UI / UX improvement reports accurately', () => {
        const result = detectIssueReportIntent('report a bug with the dark mode layout and visual theme')
        expect(result.isIssueIntent).toBe(true)
        expect(result.category).toBe('ui_improvement')
    })

    it('detects financial data accuracy reports accurately', () => {
        const result = detectIssueReportIntent('file an issue: EBITDA multiple calculation discrepancy in DCF')
        expect(result.isIssueIntent).toBe(true)
        expect(result.category).toBe('data_accuracy')
    })

    it('detects feature requests accurately', () => {
        const result = detectIssueReportIntent('file an issue: can you add support for multi-currency conversions?')
        expect(result.isIssueIntent).toBe(true)
        expect(result.category).toBe('feature_request')
    })

    it('returns false for normal M&A questions', () => {
        expect(detectIssueReportIntent('What is the asking price of this company?').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('Explain the red flags in plain English').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('How do I get started with diligence?').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('Compare all projects').isIssueIntent).toBe(false)
        expect(detectIssueReportIntent('Where is breakeven?').isIssueIntent).toBe(false)
    })
})
