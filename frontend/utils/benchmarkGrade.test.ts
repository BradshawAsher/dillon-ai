import { describe, it, expect } from 'vitest'
import { gradeAgainstBenchmark } from './benchmarkGrade'

const band = { low: 10, median: 20, high: 30 }

describe('gradeAgainstBenchmark', () => {
    it('returns an em dash when the value is missing', () => {
        expect(gradeAgainstBenchmark({ value: null, benchmark: band, higherIsBetter: true }).label).toBe('—')
    })

    describe('higher-is-better metrics', () => {
        it('grades at or above each band edge', () => {
            expect(gradeAgainstBenchmark({ value: 30, benchmark: band, higherIsBetter: true }).label).toBe('Excellent')
            expect(gradeAgainstBenchmark({ value: 20, benchmark: band, higherIsBetter: true }).label).toBe('Good')
            expect(gradeAgainstBenchmark({ value: 10, benchmark: band, higherIsBetter: true }).label).toBe('Below avg')
            expect(gradeAgainstBenchmark({ value: 9, benchmark: band, higherIsBetter: true }).label).toBe('Poor')
        })
    })

    describe('lower-is-better metrics', () => {
        it('inverts the direction so small values grade best', () => {
            expect(gradeAgainstBenchmark({ value: 10, benchmark: band, higherIsBetter: false }).label).toBe('Excellent')
            expect(gradeAgainstBenchmark({ value: 20, benchmark: band, higherIsBetter: false }).label).toBe('Good')
            expect(gradeAgainstBenchmark({ value: 30, benchmark: band, higherIsBetter: false }).label).toBe('Below avg')
            expect(gradeAgainstBenchmark({ value: 31, benchmark: band, higherIsBetter: false }).label).toBe('Poor')
        })
    })
})
