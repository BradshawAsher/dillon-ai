import { describe, expect, it } from 'vitest'
import { calculateCapacityTelemetry, type CapacityDocumentRow } from '../../backend/diligence/getCapacityTelemetry'

const now = new Date('2026-09-04T12:00:00.000Z')

function row(overrides: CapacityDocumentRow): CapacityDocumentRow {
    return {
        id: crypto.randomUUID(),
        project_id: 'project-a',
        submission_batch_id: 'batch-a',
        status: 'completed',
        created_at: '2026-09-04T11:00:00.000Z',
        updated_at: '2026-09-04T11:01:00.000Z',
        processing_started_at: '2026-09-04T11:00:00.000Z',
        processed_at: '2026-09-04T11:01:00.000Z',
        input_tokens: 1000,
        total_tokens: 1200,
        model_used: 'OpenAI primary',
        ...overrides,
    }
}

describe('calculateCapacityTelemetry', () => {
    it('calculates document and unique-batch overlap from half-open processing windows', () => {
        const telemetry = calculateCapacityTelemetry([
            row({ id: '1', processing_started_at: '2026-09-04T11:00:00Z', processed_at: '2026-09-04T11:01:00Z' }),
            row({ id: '2', processing_started_at: '2026-09-04T11:00:20Z', processed_at: '2026-09-04T11:01:20Z' }),
            row({ id: '3', submission_batch_id: 'batch-b', project_id: 'project-b', processing_started_at: '2026-09-04T11:00:30Z', processed_at: '2026-09-04T11:00:50Z' }),
            row({ id: '4', submission_batch_id: 'batch-c', processing_started_at: '2026-09-04T11:01:20Z', processed_at: '2026-09-04T11:02:00Z' }),
        ], { now })

        expect(telemetry.observed.peakConcurrentDocuments).toBe(3)
        expect(telemetry.observed.peakConcurrentBatches).toBe(2)
        expect(telemetry.observed.peakAt).toBe('2026-09-04T11:00:30.000Z')
        expect(telemetry.recentBatches.find((batch) => batch.batchId === 'batch-a')?.peakConcurrentDocuments).toBe(2)
    })

    it('separates fresh processing and queued rows from stale active rows', () => {
        const telemetry = calculateCapacityTelemetry([
            row({ id: 'processing', status: 'processing', processed_at: null, updated_at: '2026-09-04T11:58:00Z' }),
            row({ id: 'queued', submission_batch_id: 'batch-b', status: 'queued', processing_started_at: null, processed_at: null, updated_at: '2026-09-04T11:59:00Z' }),
            row({ id: 'stale', status: 'running', processed_at: null, updated_at: '2026-09-04T10:00:00Z' }),
        ], { now })

        expect(telemetry.current).toEqual({
            processingDocuments: 1,
            queuedDocuments: 1,
            activeBatches: 2,
            staleActiveDocuments: 1,
        })
    })

    it('reports percentile, failure, rate-limit, and model observations', () => {
        const telemetry = calculateCapacityTelemetry([
            row({ id: '1', input_tokens: 1000, total_tokens: 1200, model_used: 'Primary' }),
            row({ id: '2', input_tokens: 3000, total_tokens: 3600, model_used: 'Primary' }),
            row({ id: '3', status: 'failed', error_message: '429 rate limit exceeded', input_tokens: 5000, total_tokens: 6000, model_used: 'Fallback' }),
        ], { now })

        expect(telemetry.observed.inputTokensP50).toBe(3000)
        expect(telemetry.observed.totalTokensP95).toBe(5760)
        expect(telemetry.reliability).toEqual({ failedDocuments: 1, failureRate: 33.33, rateLimitSignals: 1 })
        expect(telemetry.modelMix[0]).toEqual({ model: 'Primary', documents: 2 })
    })
})
