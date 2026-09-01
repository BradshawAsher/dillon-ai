import { describe, expect, it } from 'vitest'
import {
    DEFAULT_PRESET_COHORTS,
    computeCohortSummary,
    getCohortCellColor,
    getCohortsForProject,
} from './cohortRetention'

describe('cohortRetention utilities', () => {
    describe('computeCohortSummary', () => {
        it('identifies healthy SaaS cohort retention with expanding NRR', () => {
            const summary = computeCohortSummary(DEFAULT_PRESET_COHORTS.saas)

            expect(summary.overallHealth).toBe('healthy')
            expect(summary.averageM12LogoRetention).toBeGreaterThanOrEqual(75)
            expect(summary.averageM12Nrr).toBeGreaterThanOrEqual(105)
            expect(summary.isPriceHikeMaskingChurn).toBe(false)
            expect(summary.alertTitle).toContain('Stable Customer Retention')
        })

        it('detects high-risk price hike masking churn when logos decay but NRR is positive', () => {
            const summary = computeCohortSummary(DEFAULT_PRESET_COHORTS.decay_alert)

            expect(summary.overallHealth).toBe('critical')
            expect(summary.isPriceHikeMaskingChurn).toBe(true)
            expect(summary.averageM12LogoRetention).toBeLessThan(65)
            expect(summary.averageM12Nrr).toBeGreaterThanOrEqual(100)
            expect(summary.alertTitle).toContain('Top-Line Expansion Masking Severe Logo Churn')
        })

        it('handles empty cohort arrays safely', () => {
            const summary = computeCohortSummary([])

            expect(summary.activeCohortsCount).toBe(0)
            expect(summary.overallHealth).toBe('healthy')
        })
    })

    describe('getCohortCellColor', () => {
        it('returns emerald styling for strong logo retention >= 90%', () => {
            const color = getCohortCellColor(94, 'logo')
            expect(color.bgClass).toContain('bg-emerald-500')
        })

        it('returns rose styling for severe logo degradation < 60%', () => {
            const color = getCohortCellColor(48, 'logo')
            expect(color.bgClass).toContain('bg-rose-500')
        })

        it('returns emerald styling for expanding NRR >= 115%', () => {
            const color = getCohortCellColor(122, 'nrr')
            expect(color.bgClass).toContain('bg-emerald-500')
        })

        it('handles null percentages cleanly', () => {
            const color = getCohortCellColor(null, 'logo')
            expect(color.bgClass).toContain('bg-muted/15')
        })
    })

    describe('getCohortsForProject', () => {
        it('returns SaaS preset when company name or summary references SaaS', () => {
            const cohorts = getCohortsForProject({
                id: 1,
                companyName: 'CloudScale B2B SaaS Platform',
                projectName: 'CloudScale',
            } as any)

            expect(cohorts[0].startingCustomers).toBe(120)
        })

        it('defaults to manufacturing preset for standard deals', () => {
            const cohorts = getCohortsForProject({
                id: 2,
                companyName: 'Apex Precision Dynamics',
                projectName: 'Apex Dynamics',
            } as any)

            expect(cohorts[0].startingCustomers).toBe(45)
        })
    })
})
