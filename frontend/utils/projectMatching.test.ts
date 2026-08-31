import { describe, it, expect } from 'vitest'
import {
    getProjectKey,
    getTimestampValue,
    isSystemTestProbeFile,
    isRowMatchingProject,
    detectCompanyName,
} from './projectWorkspace'
import type { SubmissionHistoryItem } from './submissionHistory'

// Minimal row factory — only the string fields the matching logic reads need
// realistic defaults; everything else can be an empty string / falsy.
function row(partial: Partial<SubmissionHistoryItem>): SubmissionHistoryItem {
    return {
        projectId: '',
        dealName: '',
        companyName: '',
        fileName: '',
        aiSummary: '',
        requestID: '',
        submissionBatchId: '',
        id: 1,
        ...partial,
    } as SubmissionHistoryItem
}

describe('getProjectKey', () => {
    it('uses an explicit projectId when present', () => {
        expect(getProjectKey(row({ projectId: 'dd-001' }))).toBe('dd-001')
    })

    it('falls back to a dealName::companyName composite when no projectId', () => {
        expect(getProjectKey(row({ dealName: 'Cascadia', companyName: 'Climate' }))).toBe('cascadia::climate')
    })

    it('falls back to requestID when the composite is too short', () => {
        expect(getProjectKey(row({ requestID: 'req-9' }))).toBe('req-9')
    })

    it('falls back to a row-id key when nothing else is available', () => {
        expect(getProjectKey(row({ id: 42 }))).toBe('row-42')
    })
})

describe('isSystemTestProbeFile', () => {
    it('flags known webhook/test probe files', () => {
        expect(isSystemTestProbeFile('Webhook Trigger.docx')).toBe(true)
        expect(isSystemTestProbeFile('test word doc.docx')).toBe(true)
        expect(isSystemTestProbeFile('Test Doc for Webhook')).toBe(true)
    })

    it('does not flag real deal documents', () => {
        expect(isSystemTestProbeFile('Cascadia_PnL_2024.xlsx')).toBe(false)
        expect(isSystemTestProbeFile('')).toBe(false)
    })
})

describe('getTimestampValue', () => {
    it('parses a valid ISO timestamp', () => {
        expect(getTimestampValue('2026-01-15T00:00:00.000Z')).toBe(Date.parse('2026-01-15T00:00:00.000Z'))
    })

    it('treats pending / in-progress markers as "now" so they sort to the top', () => {
        const before = Date.now()
        const value = getTimestampValue('Pending')
        expect(value).toBeGreaterThanOrEqual(before)
        expect(getTimestampValue('In progress')).toBeGreaterThanOrEqual(before)
    })

    it('returns 0 for empty or unparseable values', () => {
        expect(getTimestampValue('')).toBe(0)
        expect(getTimestampValue(null)).toBe(0)
        expect(getTimestampValue('not a date')).toBe(0)
    })
})

describe('isRowMatchingProject', () => {
    it('returns false for an empty target', () => {
        expect(isRowMatchingProject(row({ projectId: 'dd-001' }), '')).toBe(false)
    })

    it('excludes system probe files even when the id matches', () => {
        expect(isRowMatchingProject(row({ projectId: 'dd-001', fileName: 'Webhook Trigger.docx' }), 'dd-001')).toBe(false)
    })

    it('matches on an exact projectId', () => {
        expect(isRowMatchingProject(row({ projectId: 'project-123' }), 'project-123')).toBe(true)
    })

    it('matches on the submission batch id', () => {
        expect(isRowMatchingProject(row({ projectId: 'x', submissionBatchId: 'batch-77' }), 'batch-77')).toBe(true)
    })

    it('matches a dd-code shared between target and filename', () => {
        expect(isRowMatchingProject(row({ projectId: 'raw', fileName: 'dd-005_report.pdf' }), 'dd-005')).toBe(true)
    })

    it('does not match unrelated projects', () => {
        expect(isRowMatchingProject(row({ projectId: 'northstar' }), 'dd-999')).toBe(false)
    })
})

describe('detectCompanyName', () => {
    it('maps a known benchmark deal by filename token', () => {
        expect(detectCompanyName(row({ fileName: 'cascadia_pnl.xlsx' }))).toBe('Cascadia Climate Services, Inc.')
    })

    it('maps a known benchmark deal by dd-code projectId', () => {
        expect(detectCompanyName(row({ projectId: 'dd-015' }))).toBe('Quarry Ridge Plastics, Inc.')
    })

    it('reads a non-generic company_name from extractedJson', () => {
        expect(detectCompanyName(row({ extractedJson: JSON.stringify({ company_name: 'Acme Widgets LLC' }) }))).toBe('Acme Widgets LLC')
    })

    it('rejects generic placeholder company names', () => {
        expect(detectCompanyName(row({ extractedJson: JSON.stringify({ company_name: 'Project-123' }) }))).toBe('')
        expect(detectCompanyName(row({ companyName: 'Unknown' }))).toBe('')
    })

    it('returns an empty string when nothing identifies the company', () => {
        expect(detectCompanyName(row({}))).toBe('')
    })
})
