import { describe, expect, it } from 'vitest'
import {
    detectSector,
    getSectorProfile,
    SECTOR_BENCHMARKS,
    SECTOR_LIST,
} from './verticalBenchmarks'
import { gradeAgainstBenchmark } from './benchmarkGrade'

describe('verticalBenchmarks', () => {
    describe('detectSector', () => {
        it('detects HVAC and MEP mechanical companies', () => {
            expect(detectSector('Commercial HVAC & Mechanical Services')).toBe('hvac_mep')
            expect(detectSector('Residential plumbing and heating contractor')).toBe('hvac_mep')
        })

        it('detects B2B SaaS software companies', () => {
            expect(detectSector('Supply chain management cloud SaaS')).toBe('b2b_saas')
            expect(detectSector('Proprietary subscription software ARR')).toBe('b2b_saas')
        })

        it('detects Precision Machining & CNC', () => {
            expect(detectSector('Aerospace precision CNC machining job shop')).toBe('precision_mfg')
            expect(detectSector('Custom metal fabrication')).toBe('precision_mfg')
        })

        it('detects Dental and Healthcare practices', () => {
            expect(detectSector('Multi-location private dental practice')).toBe('healthcare_dental')
            expect(detectSector('Orthodontics & physical therapy clinic')).toBe('healthcare_dental')
        })

        it('detects Logistics and Freight companies', () => {
            expect(detectSector('Non-asset freight brokerage and regional trucking')).toBe('logistics_freight')
            expect(detectSector('3PL fulfillment and warehousing')).toBe('logistics_freight')
        })

        it('detects Managed IT / MSP', () => {
            expect(detectSector('Managed service provider (MSP) and cybersecurity')).toBe('it_msp')
        })

        it('falls back to generic_smb for empty or unknown industries', () => {
            expect(detectSector('')).toBe('generic_smb')
            expect(detectSector(null)).toBe('generic_smb')
            expect(detectSector('Quantum satellite communications')).toBe('generic_smb')
        })
    })

    describe('getSectorProfile', () => {
        it('retrieves specific sector profile', () => {
            const profile = getSectorProfile('b2b_saas')
            expect(profile.key).toBe('b2b_saas')
            expect(profile.displayName).toContain('B2B SaaS')
            expect(profile.metrics.grossMargin.median).toBe(0.78)
            expect(profile.metrics.entryMultiple.median).toBe(6.5)
        })

        it('falls back to generic_smb for invalid sector key', () => {
            const profile = getSectorProfile('nonexistent_sector')
            expect(profile.key).toBe('generic_smb')
            expect(profile.metrics.entryMultiple.median).toBe(3.5)
        })
    })

    describe('Sector metrics consistency', () => {
        it('validates that all sectors have low < median < high for every metric', () => {
            for (const sector of SECTOR_LIST) {
                const m = sector.metrics
                expect(m.entryMultiple.low).toBeLessThan(m.entryMultiple.median)
                expect(m.entryMultiple.median).toBeLessThan(m.entryMultiple.high)

                expect(m.grossMargin.low).toBeLessThan(m.grossMargin.median)
                expect(m.grossMargin.median).toBeLessThan(m.grossMargin.high)

                expect(m.ebitdaMargin.low).toBeLessThan(m.ebitdaMargin.median)
                expect(m.ebitdaMargin.median).toBeLessThan(m.ebitdaMargin.high)

                expect(m.dscr.low).toBeLessThan(m.dscr.median)
                expect(m.dscr.median).toBeLessThan(m.dscr.high)
            }
        })

        it('grades a 5.5x multiple properly between sectors', () => {
            // A 5.5x multiple is:
            // - Poor for precision manufacturing (median: 3.8x, high: 4.8x)
            // - Good / Excellent for B2B SaaS (median: 6.5x, low: 4.5x)
            const mfgMultipleBand = SECTOR_BENCHMARKS.precision_mfg.metrics.entryMultiple
            const saasMultipleBand = SECTOR_BENCHMARKS.b2b_saas.metrics.entryMultiple

            const mfgGrade = gradeAgainstBenchmark({
                value: 5.5,
                benchmark: mfgMultipleBand,
                higherIsBetter: false,
            })
            expect(mfgGrade.label).toBe('Poor')

            const saasGrade = gradeAgainstBenchmark({
                value: 5.5,
                benchmark: saasMultipleBand,
                higherIsBetter: false,
            })
            expect(saasGrade.label).toBe('Good')
        })
    })
})
