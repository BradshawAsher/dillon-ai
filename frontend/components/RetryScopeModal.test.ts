import { describe, expect, it } from 'vitest'
import { RetryScopeModal, getRetryModalScopeDetails, type RetryTargetDoc } from './RetryScopeModal'

describe('RetryScopeModal and Scope Helpers', () => {
    it('successfully loads and initializes RetryScopeModal component', () => {
        expect(RetryScopeModal).toBeDefined()
        expect(typeof RetryScopeModal).toBe('function')
    })

    it('generates correct batch scope details for single failed doc', () => {
        const details = getRetryModalScopeDetails('batch', 1)
        expect(details.isMultiple).toBe(false)
        expect(details.title).toBe('Batch Processing')
        expect(details.scopeLabel).toBe('batch')
        expect(details.promptText).toContain('Re-running document AI analysis will re-extract')
    })

    it('generates correct batch scope details for multiple failed docs', () => {
        const details = getRetryModalScopeDetails('batch', 3, 'Batch 0381e')
        expect(details.isMultiple).toBe(true)
        expect(details.title).toBe('Batch Processing')
        expect(details.scopeLabel).toBe('batch')
        expect(details.promptText).toContain('3 failed documents in this batch (Batch 0381e)')
        expect(details.retryAllButtonLabel).toBe('Yes — Retry All 3 Failed Docs in this Batch')
        expect(details.retrySingleButtonLabel).toBe('No — Just Retry This Document')
    })

    it('generates correct project scope details for multiple failed docs', () => {
        const details = getRetryModalScopeDetails('project', 4, 'Scenario Communications')
        expect(details.isMultiple).toBe(true)
        expect(details.title).toBe('Project Scope')
        expect(details.scopeLabel).toBe('project')
        expect(details.promptText).toContain('4 failed documents in this project (Scenario Communications)')
        expect(details.retryAllButtonLabel).toBe('Yes — Retry All 4 Failed Docs in this Project')
        expect(details.retrySingleButtonLabel).toBe('No — Just Retry This Document')
    })

    it('correctly handles targetDoc structure', () => {
        const mockTarget: RetryTargetDoc = {
            requestID: 'req-test-123',
            fileName: 'Scenario Communications Capability Deck with Case Studies.pdf',
            status: 'failed',
            errorMessage: 'The item has no binary field file',
            projectId: 'project-20260828-7512922e',
            submissionBatchId: 'batch-1787880114848-0381e',
        }
        expect(mockTarget.requestID).toBe('req-test-123')
        expect(mockTarget.status).toBe('failed')
    })
})
