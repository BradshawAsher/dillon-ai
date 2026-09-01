import { describe, it, expect } from 'vitest'
import { getEbitdaQualityGrade } from './ebitdaQualityGrade'

const gradeAt = (pct: number) => getEbitdaQualityGrade(pct, 1).grade

describe('getEbitdaQualityGrade', () => {
    it('returns N/A when the max score is unknown', () => {
        expect(getEbitdaQualityGrade(5, 0).grade).toBe('N/A')
        expect(getEbitdaQualityGrade(5, -1).grade).toBe('N/A')
    })

    it('assigns letters at the 80 / 60 / 40 percent cutoffs', () => {
        expect(gradeAt(0.8)).toBe('A')
        expect(gradeAt(0.6)).toBe('B')
        expect(gradeAt(0.4)).toBe('C')
        expect(gradeAt(0.39)).toBe('D')
    })

    it('grades just below a boundary one letter lower', () => {
        expect(gradeAt(0.79)).toBe('B')
        expect(gradeAt(0.59)).toBe('C')
    })

    it('returns a colour class alongside the grade', () => {
        expect(getEbitdaQualityGrade(1, 1).color).toContain('green')
    })
})
