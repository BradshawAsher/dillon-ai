import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BatchProgressCard } from '../components/dashboard/BatchProgressCard'
import { deriveBatchState } from './batchState'
import type { SubmissionHistoryItem } from './submissionHistory'

const batch = { id: 'batch', environment: 'production' as const, expectedDocumentCount: 3, startedAt: 1000 }
const noop = () => undefined
function render(statuses: string[], submitting = false) {
    const rows = statuses.map((status, index) => ({ requestID: String(index), fileName: `doc-${index}`, status, expectedBatchDocumentCount: 3, errorMessage: status === 'failed' ? 'Upload failed' : '' } as SubmissionHistoryItem))
    const state = deriveBatchState(batch, rows, submitting)
    return renderToStaticMarkup(<BatchProgressCard activeSubmissionBatch={batch} activeBatchFinishedCount={state.finishedCount} activeBatchExpectedCount={state.expectedCount} activeBatchFailedCount={state.failedCount} activeBatchCompletedCount={state.completedCount} activeBatchProcessingCount={state.processingCount} isStoppingBatch={false} isSubmitting={submitting} isInterrupted={state.isInterrupted} handleStopBatch={noop} activeBatchProcessingPercent={0} activeBatchProgressPercent={0} batchElapsedSeconds={60} activeBatchImpact={null} activeBatchStuckRows={[]} activeBatchErrors={state.errors} activeBatchAdvisories={[]} handleRetryFailedDocument={noop} handleOpenProjectSynthesis={noop} />)
}
describe('batch progress UI', () => {
    it('shows 2/3 and Incomplete for the reported scenario, never Complete', () => {
        const html = render(['completed', 'failed'])
        expect(html).toContain('2 / 3 finished')
        expect(html).toContain('Incomplete')
        expect(html).not.toContain('>Complete<')
    })
    it('distinguishes finished-with-errors from successful completion', () => {
        expect(render(['completed', 'failed', 'completed'])).toContain('Finished with errors')
        expect(render(['completed', 'completed', 'completed'])).toContain('>Complete<')
    })
    it('does not report complete while submission requests are still pending', () => {
        expect(render(['completed', 'completed', 'completed'], true)).not.toContain('>Complete<')
    })
})
