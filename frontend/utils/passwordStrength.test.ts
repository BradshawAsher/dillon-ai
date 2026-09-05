import { describe, expect, it } from 'vitest'

import { assessPasswordStrength } from './passwordStrength'

describe('assessPasswordStrength', () => {
    it('flags passwords shorter than the 6-character API minimum', () => {
        expect(assessPasswordStrength('')).toMatchObject({ score: 0, label: 'Too short' })
        expect(assessPasswordStrength('abcde')).toMatchObject({ score: 0, label: 'Too short' })
    })

    it('rates a short lowercase-only password as weak', () => {
        expect(assessPasswordStrength('abcdef')).toMatchObject({ score: 1, label: 'Weak' })
    })

    it('raises the score for length, mixed case, digits, and symbols', () => {
        expect(assessPasswordStrength('Abcdefghij')).toMatchObject({ score: 3, label: 'Good' })
        expect(assessPasswordStrength('Abcdefghij1!')).toMatchObject({ score: 4, label: 'Strong' })
    })

    it('never reports a score outside 0..4', () => {
        const result = assessPasswordStrength('Aa1!Aa1!Aa1!Aa1!')
        expect(result.score).toBe(4)
        expect(result.percent).toBe(100)
        expect(result.label).toBe('Strong')
    })
})
