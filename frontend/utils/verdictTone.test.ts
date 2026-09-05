import { describe, expect, it } from 'vitest'

import { classifyVerdictTone } from './verdictTone'

describe('classifyVerdictTone', () => {
    it('flags caution/hold language as warning', () => {
        expect(classifyVerdictTone('Renegotiate terms')).toBe('warning')
        expect(classifyVerdictTone('Proceed with caution')).toBe('warning')
        expect(classifyVerdictTone('Hold for now')).toBe('warning')
    })

    it('flags abort/pass/risk language as destructive', () => {
        expect(classifyVerdictTone('Abort the deal')).toBe('destructive')
        expect(classifyVerdictTone('Pass')).toBe('destructive')
        expect(classifyVerdictTone('Significant risk identified')).toBe('destructive')
    })

    it('flags proceed/buy language as success', () => {
        expect(classifyVerdictTone('Proceed to LOI')).toBe('success')
        expect(classifyVerdictTone('Acquire')).toBe('success')
    })

    it('falls back to neutral for unknown text', () => {
        expect(classifyVerdictTone('Under review')).toBe('neutral')
        expect(classifyVerdictTone(undefined)).toBe('neutral')
        expect(classifyVerdictTone('')).toBe('neutral')
    })

    it('uses the traffic light when recommendation is empty', () => {
        expect(classifyVerdictTone(undefined, 'yellow')).toBe('warning')
        expect(classifyVerdictTone(undefined, 'RED')).toBe('destructive')
        expect(classifyVerdictTone(undefined, 'green')).toBe('success')
    })

    it('lets warning precedence win over red-flag words', () => {
        // "caution" is checked before "risk", so a caution+risk verdict is warning.
        expect(classifyVerdictTone('Caution: some risk')).toBe('warning')
    })

    it('does not treat substring lookalikes as verdict language', () => {
        // "pass" is a substring of "bypass" / "compass"; "hold" of "shareholder"
        // / "threshold"; "warn" of "warranty"; "buy" of "buyer".
        expect(classifyVerdictTone('Bypass concentration via earnout')).toBe('neutral')
        expect(classifyVerdictTone('Shareholder approval required')).toBe('neutral')
        expect(classifyVerdictTone('Warranty coverage is adequate')).toBe('neutral')
        expect(classifyVerdictTone('Buyer due diligence incomplete')).toBe('neutral')
        expect(classifyVerdictTone('Compass check under review')).toBe('neutral')
        expect(classifyVerdictTone('Threshold analysis pending')).toBe('neutral')
    })

    it('still matches stemmed verdict verbs as whole words', () => {
        expect(classifyVerdictTone('Renegotiation recommended')).toBe('warning')
        expect(classifyVerdictTone('Escalate to IC')).toBe('destructive')
        expect(classifyVerdictTone('Acquisition recommended')).toBe('success')
    })
})
