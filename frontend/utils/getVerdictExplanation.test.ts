import { describe, expect, it } from 'vitest'

import { getVerdictExplanation } from '../components/ActionableRecommendationInfoButton'

describe('getVerdictExplanation', () => {
    it('classifies escalate/walk-away as RED', () => {
        expect(getVerdictExplanation('ESCALATE / WALK AWAY', 'RED').posture).toBe('RED')
        expect(getVerdictExplanation('', 'red').posture).toBe('RED')
    })

    it('classifies renegotiate/hold as YELLOW', () => {
        expect(getVerdictExplanation('Renegotiate terms', '').posture).toBe('YELLOW')
        expect(getVerdictExplanation('hold', '').posture).toBe('YELLOW')
    })

    it('does not misfire on positive words that merely contain a trigger substring', () => {
        // "passed"/"surpass" must not read as the walk-away "pass" verdict.
        expect(getVerdictExplanation('Buyer surpassed diligence; proceed', 'GREEN').posture).toBe('GREEN')
    })

    it('does not throw when passed null recommendation or traffic light', () => {
        expect(() => getVerdictExplanation(null as unknown as string, null as unknown as string)).not.toThrow()
        expect(getVerdictExplanation(null as unknown as string, null as unknown as string).posture).toBe('GREEN')
    })
})
