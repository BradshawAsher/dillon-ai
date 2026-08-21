import { describe, expect, it } from 'vitest'
import { buildDealEmailDraft, formatDraftMoney } from './dealEmailDraft'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'

describe('dealEmailDraft Generator Utility', () => {
    it('formats currency numbers accurately', () => {
        expect(formatDraftMoney(null)).toBeNull()
        expect(formatDraftMoney(undefined)).toBeNull()
        expect(formatDraftMoney(500)).toBe('$500')
        expect(formatDraftMoney(446000)).toBe('$446K')
        expect(formatDraftMoney(1700000)).toBe('$1.7M')
        expect(formatDraftMoney(12500000)).toBe('$12.5M')
    })

    it('places the sign before the amount for negative values and rejects non-finite input', () => {
        expect(formatDraftMoney(-2000000)).toBe('-$2.0M')
        expect(formatDraftMoney(-446000)).toBe('-$446K')
        expect(formatDraftMoney(-500)).toBe('-$500')
        expect(formatDraftMoney(Infinity)).toBeNull()
        expect(formatDraftMoney(-Infinity)).toBeNull()
        expect(formatDraftMoney(NaN)).toBeNull()
    })

    it('correctly classifies Scenario Communications as RED / ESCALATE even if trafficLight is YELLOW', () => {
        const synthesis: Partial<ProjectSynthesisItem> = {
            projectId: 'project-20260820-scenario-communications',
            projectName: 'Scenario Communications',
            companyName: 'Scenario Communications',
            finalRecommendation: 'ESCALATE',
            finalTrafficLight: 'YELLOW',
            finalRiskLevel: 'YELLOW',
            finalJudgmentSummary: 'ESCALATE pending financial-statement completion and revenue reconciliation.',
            valuationLowerBound: '1500000',
            valuationUpperBound: '2500000',
            valuationBaseEstimate: '2000000',
            redFlags: ['38% customer concentration with key account expiring in Q4', 'Unreconciled payroll variance on 941 filings'],
            negotiationLevers: ['Demand $250k escrow holdback for customer churn risk'],
        }

        const model: Partial<DealModel> = {
            projectId: 'project-20260820-scenario-communications',
            askingPrice: 2000000,
            purchasePrice: 2000000,
            documentedFactsJson: JSON.stringify({
                revenue: { value: 446000, confidence: 'high' },
                ebitda_sde: { value: 1700000, confidence: 'medium' },
            }),
        }

        const draft = buildDealEmailDraft({
            model: model as DealModel,
            synthesis: synthesis as ProjectSynthesisItem,
            projectName: 'Scenario Communications',
            origin: 'https://app.mergeworks.ai',
        })

        expect(draft.posture).toBe('RED')
        expect(draft.subject).toContain('🔴 ESCALATE')
        expect(draft.body).toContain('RED — ESCALATE')
        expect(draft.body).toContain('Freeze LOI execution')
        expect(draft.body).toContain('Escalate file to Senior Investment Committee')
        expect(draft.body).toContain('Revenue: $446K')
        expect(draft.body).toContain('EBITDA/SDE: $1.7M')
        expect(draft.body).toContain('Estimated Valuation Range: $1.5M – $2.5M (Base: $2.0M)')
        expect(draft.valuationRangeFormatted).toBe('$1.5M – $2.5M (Base: $2.0M)')
        expect(draft.body).toContain('Price: $2.0M')
        expect(draft.body).toContain('https://app.mergeworks.ai/?view=dashboard&project=project-20260820-scenario-communications')
    })

    it('generates proper YELLOW conditional proceed email for renegotiation cases', () => {
        const synthesis: Partial<ProjectSynthesisItem> = {
            projectId: 'project-renegotiate-1',
            projectName: 'IronTree Industrial',
            finalRecommendation: 'RENEGOTIATE / REPRICE',
            finalTrafficLight: 'YELLOW',
            finalJudgmentSummary: 'Viable target but requires $350k add-back haircut.',
            redFlags: ['$350k unverified owner personal expenses added back to SDE'],
            negotiationLevers: ['Discount purchase price from $4.5M to $3.8M'],
        }

        const draft = buildDealEmailDraft({
            synthesis: synthesis as ProjectSynthesisItem,
            projectName: 'IronTree Industrial',
            origin: 'https://app.mergeworks.ai',
        })

        expect(draft.posture).toBe('YELLOW')
        expect(draft.subject).toContain('🟡 RENEGOTIATE')
        expect(draft.body).toContain('YELLOW — RENEGOTIATE')
        expect(draft.body).toContain('Formulate purchase price re-trade')
    })

    it('generates clean GREEN proceed to LOI email for low risk targets', () => {
        const synthesis: Partial<ProjectSynthesisItem> = {
            projectId: 'project-green-1',
            projectName: 'Apex Industrial Tech',
            finalRecommendation: 'PROCEED TO LOI',
            finalTrafficLight: 'GREEN',
            finalJudgmentSummary: 'Clean earnings quality and verified tax returns.',
        }

        const draft = buildDealEmailDraft({
            synthesis: synthesis as ProjectSynthesisItem,
            projectName: 'Apex Industrial Tech',
            origin: 'https://app.mergeworks.ai',
        })

        expect(draft.posture).toBe('GREEN')
        expect(draft.subject).toContain('🟢 PROCEED TO LOI')
        expect(draft.body).toContain('GREEN — PROCEED TO LOI')
        expect(draft.body).toContain('Finalize confirmatory diligence checklist')
    })
})
