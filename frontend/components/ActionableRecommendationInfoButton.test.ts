import { describe, expect, it } from 'vitest'
import { getVerdictExplanation } from './ActionableRecommendationInfoButton'

describe('getVerdictExplanation', () => {
    it('correctly classifies RED / ESCALATE / WALK AWAY verdicts', () => {
        const escalate = getVerdictExplanation('ESCALATE', 'RED')
        expect(escalate.posture).toBe('RED')
        expect(escalate.variant).toBe('destructive')
        expect(escalate.summary).toContain('Critical structural deal-breakers')
        expect(escalate.recommendedAction).toContain('Freeze LOI')

        const walkAway = getVerdictExplanation('WALK AWAY / RESTRUCTURE', 'RED')
        expect(walkAway.posture).toBe('RED')
        expect(walkAway.variant).toBe('destructive')

        const redLight = getVerdictExplanation('High risk transaction', 'RED')
        expect(redLight.posture).toBe('RED')
    })

    it('correctly classifies YELLOW / RENEGOTIATE / REPRICE / CAUTION verdicts', () => {
        const renegotiate = getVerdictExplanation('RENEGOTIATE', 'YELLOW')
        expect(renegotiate.posture).toBe('YELLOW')
        expect(renegotiate.variant).toBe('warning')
        expect(renegotiate.summary).toContain('fundamentally viable')
        expect(renegotiate.recommendedAction).toContain('purchase price re-trade')

        const caution = getVerdictExplanation('PROCEED WITH CAUTION', 'YELLOW')
        expect(caution.posture).toBe('YELLOW')
        expect(caution.variant).toBe('warning')

        const reprice = getVerdictExplanation('PROCEED WITH REPRICE', 'YELLOW')
        expect(reprice.posture).toBe('YELLOW')
    })

    it('correctly classifies GREEN / PROCEED TO LOI verdicts', () => {
        const proceed = getVerdictExplanation('PROCEED', 'GREEN')
        expect(proceed.posture).toBe('GREEN')
        expect(proceed.variant).toBe('success')
        expect(proceed.summary).toContain('Earnings quality, tax filings')
        expect(proceed.recommendedAction).toContain('Letter of Intent (LOI) issuance')

        const fallback = getVerdictExplanation()
        expect(fallback.posture).toBe('GREEN')
        expect(fallback.variant).toBe('success')
    })
})
