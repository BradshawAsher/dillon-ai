import { describe, expect, it } from 'vitest'
import {
    classifyAddBackCategory,
    getTaxonomyBadge,
    recalculateAdjustedEbitdaWithDisallowances,
} from './addBackTaxonomy'

describe('addBackTaxonomy utilities', () => {
    describe('classifyAddBackCategory', () => {
        it('classifies personal vehicle leases as disallowed', () => {
            expect(classifyAddBackCategory('Owner 2023 Porsche 911 vehicle lease and personal insurance')).toBe('disallowed')
            expect(classifyAddBackCategory('Country club membership & golf dues')).toBe('disallowed')
            expect(classifyAddBackCategory('Owner family vacation travel')).toBe('disallowed')
        })

        it('classifies replacement GM underpaid salary as management_deficit', () => {
            expect(classifyAddBackCategory('Owner below-market wage gap vs replacement GM salary')).toBe('management_deficit')
        })

        it('classifies non-standard family consulting as aggressive', () => {
            expect(classifyAddBackCategory('Owner spouse advisory fee')).toBe('aggressive')
        })

        it('classifies legitimate one-time facility move as defensible', () => {
            expect(classifyAddBackCategory('One-time manufacturing plant facility relocation')).toBe('defensible')
            expect(classifyAddBackCategory('Non-recurring trademark dispute legal defense')).toBe('defensible')
        })
    })

    describe('getTaxonomyBadge', () => {
        it('returns proper styling and SBA disallowed labels', () => {
            const badge = getTaxonomyBadge('disallowed')
            expect(badge.label).toBe('SBA / Lender Disallowed')
            expect(badge.bgClass).toContain('bg-rose-500')
        })

        it('returns proper styling for defensible items', () => {
            const badge = getTaxonomyBadge('defensible')
            expect(badge.label).toBe('Defensible One-Time')
            expect(badge.bgClass).toContain('bg-emerald-500')
        })
    })

    describe('recalculateAdjustedEbitdaWithDisallowances', () => {
        it('recalculates adjusted EBITDA and purchase price reduction accurately', () => {
            const result = recalculateAdjustedEbitdaWithDisallowances(
                1000000, // $1M baseline
                [
                    { amount: 50000, isDisallowed: false }, // $50K approved
                    { amount: 150000, isDisallowed: true },  // $150K disallowed
                ],
                4.5 // 4.5x multiple
            )

            expect(result.totalAddBacksAmount).toBe(200000)
            expect(result.disallowedAmount).toBe(150000)
            expect(result.approvedAddBacksAmount).toBe(50000)
            expect(result.adjustedEbitda).toBe(1050000) // $1M + $50K
            expect(result.baseValuation).toBe(5400000)  // ($1M + $200K) * 4.5 = $5.4M
            expect(result.adjustedValuation).toBe(4725000) // ($1.05M) * 4.5 = $4.725M
            expect(result.purchasePriceReduction).toBe(675000) // $150K * 4.5 = $675K
        })

        it('handles all add-backs approved with zero purchase price reduction', () => {
            const result = recalculateAdjustedEbitdaWithDisallowances(
                1000000,
                [{ amount: 100000, isDisallowed: false }],
                5.0
            )

            expect(result.disallowedAmount).toBe(0)
            expect(result.purchasePriceReduction).toBe(0)
            expect(result.adjustedEbitda).toBe(1100000)
        })
    })
})
