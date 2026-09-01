import { describe, it, expect } from 'vitest'
import {
    getProjectKey,
    getTimestampValue,
    getDisplayTimestamp,
    getProjectName,
    getCompanyName,
    isSystemTestProbeFile,
    isRowMatchingProject,
    detectCompanyName,
    formatProjectDisplayName,
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

describe('getDisplayTimestamp', () => {
    it('prefers processedAt over earlier lifecycle timestamps', () => {
        expect(getDisplayTimestamp(row({
            processedAt: '2026-03-01',
            processingStartedAt: '2026-02-01',
            receivedAt: '2026-01-01',
        }))).toBe('2026-03-01')
    })

    it('falls back through the lifecycle chain when later stamps are absent', () => {
        expect(getDisplayTimestamp(row({ receivedAt: '2026-01-01' }))).toBe('2026-01-01')
        expect(getDisplayTimestamp(row({ triggerTimestamp: '2026-01-05' }))).toBe('2026-01-05')
    })

    it('returns an empty string when no timestamp exists', () => {
        expect(getDisplayTimestamp(row({}))).toBe('')
    })
})

describe('getProjectName / getCompanyName', () => {
    it('resolves a detected benchmark company from the row', () => {
        expect(getProjectName(row({ fileName: 'northstar_cim.pdf' }))).toBe('Northstar Industrial Supply, LLC')
        expect(getCompanyName(row({ projectId: 'dd-006' }))).toBe('Harborview Dental Partners, LLC')
    })

    it('prefers a detected company from any row in the project set', () => {
        const rows = [row({ fileName: 'unrelated.pdf' }), row({ fileName: 'summit_pnl.xlsx' })]
        expect(getProjectName(row({}), rows)).toBe('Summit Managed Services, Inc.')
    })

    it('falls back to the raw deal name when no benchmark matches', () => {
        expect(getProjectName(row({ dealName: 'Acme Holdings' }))).toBe('Acme Holdings')
    })

    it('uses the safe default when nothing identifies the project', () => {
        expect(getProjectName(row({}))).toBe('Cascadia Climate Services, Inc.')
        expect(getCompanyName(row({}))).toBe('Cascadia Climate Services, Inc.')
    })
})

describe('formatProjectDisplayName', () => {
    const p = (o: Partial<{ companyName: string; projectName: string; projectId: string; projectKey: string }>) => ({
        companyName: '', projectName: '', projectId: '', projectKey: '', ...o,
    })

    it('prefers the company name when present', () => {
        expect(formatProjectDisplayName(p({ companyName: 'Acme Inc', projectName: 'Deal' }))).toBe('Acme Inc')
    })

    it('falls back to project name, then id, then key', () => {
        expect(formatProjectDisplayName(p({ projectName: 'Project Falcon' }))).toBe('Project Falcon')
        expect(formatProjectDisplayName(p({ projectId: 'dd-001' }))).toBe('dd-001')
        expect(formatProjectDisplayName(p({ projectKey: 'acme::x' }))).toBe('acme::x')
    })

    it('ignores whitespace-only company and project names', () => {
        expect(formatProjectDisplayName(p({ companyName: '   ', projectName: '  ', projectId: 'pid' }))).toBe('pid')
    })
})
