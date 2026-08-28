import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import LatestSubmissionSection from '../components/dashboard/LatestSubmissionSection'
import { mergeBatchUploadAttempts } from './batchState'
import { mergeDocumentCarouselRows } from './documentCarousel'
import type { SubmissionHistoryItem } from './submissionHistory'

const row = (name: string, status = 'completed') => ({ requestID: name, fileName: name, fileSize: 100, status, projectId: 'p', updatedAt: '2026-08-28T20:00:00Z' } as SubmissionHistoryItem)
const batch = { id: 'b', projectId: 'p', environment: 'production' as const, expectedDocumentCount: 3, startedAt: Date.parse('2026-08-28T19:00:00Z'), uploadAttempts: [{ fileName: 'large.pdf', fileSize: 18_747_545, fileType: 'application/pdf', status: 'upload_failed' as const, updatedAt: '2026-08-28T20:01:00Z', errorMessage: 'Storage connection failed' }] }

function render(rows: SubmissionHistoryItem[], index: number) {
    const selected = rows[index]
    return renderToStaticMarkup(<LatestSubmissionSection displayedSubmissionRow={selected} displayedSubmitStatus={selected.status} submitEnvironment="production" latestBatchRows={rows} safeBatchDocIndex={index} setSelectedBatchDocIndex={() => undefined} handleOpenProjectSynthesis={() => undefined} projectId="p" submitResponse={{ payload: { fileName: 'wrong-file.pdf' } }} webhookResponse={{ requestID: 'wrong-request' }} />)
}

describe('document carousel failure recovery', () => {
    it('keeps the third failed upload and its filename in the carousel after session restoration', () => {
        const projectRows = [row('pnl.xlsx'), row('prequal.pdf', 'failed')]
        const attempts = mergeBatchUploadAttempts(JSON.parse(JSON.stringify(batch)), projectRows)
        const rows = mergeDocumentCarouselRows(projectRows, attempts)
        expect(rows).toHaveLength(3)
        const html = render(rows, 2)
        expect(html).toContain('Doc 3 of 3')
        expect(html).toContain('large.pdf')
        expect(html).toContain('Document failed')
        expect(html).toContain('Unavailable — missing analysis')
        expect(html).toContain('Re-select and upload this file')
        expect(html).not.toContain('Still processing')
        expect(html).not.toContain('Est. ~1 min remaining')
        expect(html).not.toContain('wrong-file.pdf')
        expect(html).not.toContain('wrong-request')
        expect(html).not.toContain('Insufficient Narrative Data')
    })
    it('preserves partial returned results while showing failure and missing fields', () => {
        const failed = { ...row('partial.pdf', 'processing_failed'), aiSummary: 'Verified revenue remains available.', ebitdaExtracted: '12345', errorMessage: 'Analysis interrupted' }
        const html = render([failed], 0)
        expect(html).toContain('Verified revenue remains available.')
        expect(html).toContain('12345')
        expect(html).toContain('Document failed')
        expect(html).toContain('Unavailable — missing analysis')
    })
    it('replaces a failed attempt with a newer server result without adding another card', () => {
        const failed = mergeBatchUploadAttempts(batch, [])[0]
        const completed = { ...failed, requestID: 'new-request', status: 'completed', updatedAt: '2026-08-28T20:02:00Z', aiSummary: 'Completed analysis' }
        const rows = mergeDocumentCarouselRows([completed], [failed])
        expect(rows).toEqual([completed])
    })
    it('does not collapse same-name documents of different sizes', () => {
        expect(mergeDocumentCarouselRows([row('same.pdf')], [{ ...row('same.pdf'), fileSize: 200 }])).toHaveLength(2)
    })
})
