import { describe, it, expect } from 'vitest'
import { computeDealGrade } from './dealGrade'

const letterAt = (pct: number) => computeDealGrade(pct, 1).letter

describe('computeDealGrade', () => {
    it('assigns letters at the documented percentage cutoffs', () => {
        expect(letterAt(0.85)).toBe('A')
        expect(letterAt(0.70)).toBe('B')
        expect(letterAt(0.55)).toBe('C')
        expect(letterAt(0.40)).toBe('D')
        expect(letterAt(0.39)).toBe('F')
    })

    it('grades just below a boundary one letter lower', () => {
        expect(letterAt(0.849)).toBe('B')
        expect(letterAt(0.699)).toBe('C')
    })

    it('treats a non-positive maxScore as 0% (grade F)', () => {
        expect(computeDealGrade(50, 0).letter).toBe('F')
    })

    it('returns colour and background classes alongside the letter', () => {
        const grade = computeDealGrade(1, 1)
        expect(grade.letter).toBe('A')
        expect(grade.color).toContain('green')
        expect(grade.bg).toContain('green')
    })
})
