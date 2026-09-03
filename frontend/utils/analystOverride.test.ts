import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
    applyFactOverride,
    revertFactOverride,
    getOverriddenFacts,
} from './documentedFacts'
import { hydrateModelFactsFromDocuments } from './diligenceDashboardUtils'
import {
    recordAnalystOverride,
    getProjectAuditTrail,
    OVERRIDE_CATEGORY_LABELS,
} from '../services/analystFeedbackService'
import type { DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from './submissionHistory'

vi.mock('../services/slackAlertService', () => ({
    sendIssueReportSlackAlert: vi.fn().mockResolvedValue(undefined),
}))

describe('Analyst Override Full Lifecycle & Model Hydration', () => {
    const mockStorage: Record<string, string> = {}

    beforeEach(() => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => mockStorage[key] || null,
            setItem: (key: string, val: string) => {
                mockStorage[key] = val
            },
            removeItem: (key: string) => {
                delete mockStorage[key]
            },
            clear: () => {
                Object.keys(mockStorage).forEach((k) => delete mockStorage[k])
            },
        })
    })

    it('has descriptive human labels for all override categories', () => {
        expect(OVERRIDE_CATEGORY_LABELS.disallowed_addback.label).toContain('Disallowed')
        expect(OVERRIDE_CATEGORY_LABELS.timing_difference.label).toContain('Timing')
        expect(OVERRIDE_CATEGORY_LABELS.intercompany.label).toContain('Intercompany')
        expect(OVERRIDE_CATEGORY_LABELS.false_positive.label).toContain('False Positive')
        expect(OVERRIDE_CATEGORY_LABELS.ocr_error.label).toContain('OCR')
    })

    it('records an analyst override in the audit trail cache and returns it', async () => {
        await recordAnalystOverride({
            projectId: 'proj-123',
            targetField: 'ebitda_sde',
            originalAiValue: 1500000,
            overrideValue: 1250000,
            reasonCategory: 'disallowed_addback',
            reasonNotes: 'Disallowed owner personal expenses and unverified consulting fee',
            analystEmail: 'lead@mergeworks.io',
        })

        const trail = getProjectAuditTrail('proj-123')
        expect(trail.length).toBe(1)
        expect(trail[0].targetField).toBe('ebitda_sde')
        expect(trail[0].originalAiValue).toBe(1500000)
        expect(trail[0].overrideValue).toBe(1250000)
        expect(trail[0].reasonCategory).toBe('disallowed_addback')
        expect(trail[0].analystEmail).toBe('lead@mergeworks.io')
    })

    it('hydrateModelFactsFromDocuments preserves analyst-overridden facts when raw documents are rehydrated', () => {
        // Step 1: Initial model with an overridden EBITDA
        const overriddenJson = applyFactOverride('', {
            field: 'ebitda_sde',
            value: 1200000,
            category: 'disallowed_addback',
            reason: 'Haircut on add-backs',
        })

        const model = {
            documentedFactsJson: overriddenJson,
            purchasePrice: 5000000,
        } as unknown as DealModel

        // Step 2: New documents come in from OCR extraction claiming EBITDA is 1,800,000
        const newDocuments: SubmissionHistoryItem[] = [
            {
                id: 'doc-1',
                fileName: 'broker_teaser.pdf',
                financialFactsJson: JSON.stringify([
                    {
                        metric: 'ebitda_sde',
                        normalized_value: 1800000,
                        period: '2024',
                        status: 'reported',
                    },
                    {
                        metric: 'revenue',
                        normalized_value: 6000000,
                        period: '2024',
                        status: 'reported',
                    },
                ]),
            } as unknown as SubmissionHistoryItem,
        ]

        const hydrated = hydrateModelFactsFromDocuments(model, newDocuments)
        const parsed = JSON.parse(hydrated.documentedFactsJson || '{}')

        // EBITDA must NOT be overwritten by the 1,800,000 from the document!
        expect(parsed.ebitda_sde.value).toBe(1200000)
        expect(parsed.ebitda_sde.isOverridden).toBe(true)
        expect(parsed.ebitda_sde.overrideReason).toBe('Haircut on add-backs')

        // But non-overridden metrics like revenue ARE safely populated from the documents
        expect(parsed.revenue.value).toBe(6000000)
    })
})
