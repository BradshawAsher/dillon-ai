import { describe, it, expect } from 'vitest'
import { createProjectSummaries } from './projectWorkspace'
import type { SubmissionHistoryItem } from './submissionHistory'

// Factory supplying the string fields createProjectSummaries reads without
// optional chaining (documentType, fileType, trafficLight, riskLevel, ...), so
// the aggregation runs against a realistic-but-minimal row.
function row(partial: Partial<SubmissionHistoryItem>): SubmissionHistoryItem {
    return {
        projectId: 'acme-1',
        dealName: 'Acme Holdings',
        companyName: '',
        fileName: 'doc.pdf',
        aiSummary: '',
        status: 'completed',
        isConsidered: true,
        needsHumanReview: false,
        trafficLight: 'green',
        riskLevel: 'low',
        documentType: 'auto-detect',
        fileType: 'pdf',
        projectStage: 'post-loi',
        workstream: '',
        requestID: '',
        processedAt: '2026-01-01T00:00:00.000Z',
        id: Math.floor(Math.random() * 1e6),
        ...partial,
    } as SubmissionHistoryItem
}

describe('createProjectSummaries', () => {
    it('groups rows by project and tallies considered documents', () => {
        const summaries = createProjectSummaries([
            row({ fileName: 'a.pdf', status: 'completed' }),
            row({ fileName: 'b.pdf', status: 'failed' }),
        ])
        expect(summaries).toHaveLength(1)
        const summary = summaries[0]
        expect(summary.projectId).toBe('acme-1')
        expect(summary.documentCount).toBe(2)
        expect(summary.completedCount).toBe(1)
        expect(summary.failedCount).toBe(1)
        expect(summary.isFailedAbandoned).toBe(false)
        expect(summary.statusLabel).toBe('Needs triage')
    })

    it('marks a project failed/abandoned when every considered doc failed', () => {
        const summaries = createProjectSummaries([
            row({ fileName: 'a.pdf', status: 'failed' }),
            row({ fileName: 'b.pdf', status: 'error' }),
        ])
        expect(summaries[0].isFailedAbandoned).toBe(true)
        expect(summaries[0].statusLabel).toBe('Failed / Abandoned')
    })

    it('separates rows belonging to different projects', () => {
        const summaries = createProjectSummaries([
            row({ projectId: 'acme-1', fileName: 'a.pdf' }),
            row({ projectId: 'beta-2', fileName: 'b.pdf', dealName: 'Beta Corp' }),
        ])
        expect(summaries).toHaveLength(2)
        expect(summaries.map((s) => s.projectId).sort()).toEqual(['acme-1', 'beta-2'])
    })

    it('excludes rows not marked as considered from the document count', () => {
        const summaries = createProjectSummaries([
            row({ fileName: 'a.pdf', isConsidered: true }),
            row({ fileName: 'b.pdf', isConsidered: false }),
        ])
        expect(summaries[0].documentCount).toBe(1)
    })

    it('returns an empty list for no rows', () => {
        expect(createProjectSummaries([])).toEqual([])
    })
})
