import { describe, expect, it } from 'vitest'
import {
    extractDollarFromText,
    computeValuationBridge,
    generateValuationBridgeClause,
    generateSpecialEscrowClause,
    generateSpecificRepsClause,
} from './valuationBridge'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'

describe('Valuation Bridge & APA Clause Generator', () => {
    describe('extractDollarFromText', () => {
        it('extracts amounts with magnitude letters', () => {
            expect(extractDollarFromText('Flag #2: $180k undocumented contractor liability')).toBe(180_000)
            expect(extractDollarFromText('Potential $1.5M tax audit exposure')).toBe(1_500_000)
            expect(extractDollarFromText('Discovered $450K deferred capex backlog')).toBe(450_000)
        })

        it('extracts amounts with magnitude words and standard commas', () => {
            expect(extractDollarFromText('Unrecorded liability of $250 thousand')).toBe(250_000)
            expect(extractDollarFromText('Lawsuit settlement estimated at $75,000')).toBe(75_000)
        })

        it('returns null when no dollar amount is mentioned', () => {
            expect(extractDollarFromText('Customer concentration exceeds 40% of revenue')).toBeNull()
            expect(extractDollarFromText('')).toBeNull()
        })
    })

    describe('computeValuationBridge', () => {
        it('computes EBITDA multiple haircut when normalized EBITDA is lower than reported', () => {
            const model = {
                purchasePrice: 10_000_000,
                documentedFactsJson: JSON.stringify({
                    ebitda_sde: {
                        value: 2_000_000,
                        isOverridden: true,
                        originalAiValue: 2_200_000, // $200k disallowed add-backs
                        overrideReason: 'Disallowed owner personal jet and unverified management fees',
                    },
                }),
            } as unknown as DealModel

            const synthesis = {
                redFlags: [
                    'Flag: $180k undocumented contractor liability identified in 1099 filings',
                    'Flag: $120k deferred equipment capex backlog in machine shop',
                ],
            } as unknown as ProjectSynthesisItem

            const bridge = computeValuationBridge(model, synthesis)

            expect(bridge.baselinePurchasePrice).toBe(10_000_000)
            expect(bridge.entryMultiple).toBe(5.0) // $10M / $2.0M = 5.0x
            expect(bridge.totalDisallowedAddbacks).toBe(200_000)

            // Disallowance multiple haircut: $200,000 * 5.0x = $1,000,000 EV deduction
            const ebitdaItem = bridge.items.find((i) => i.category === 'ebitda_haircut')
            expect(ebitdaItem).toBeDefined()
            expect(ebitdaItem?.totalDeduction).toBe(1_000_000)
            expect(ebitdaItem?.handling).toBe('ev_reduction')

            // Contractor liability defaulted to special escrow: $180,000
            const liabilityItem = bridge.items.find((i) => i.title.includes('contractor'))
            expect(liabilityItem).toBeDefined()
            expect(liabilityItem?.totalDeduction).toBe(180_000)
            expect(liabilityItem?.handling).toBe('special_escrow')

            // Capex backlog defaulted to EV deduction: $120,000
            const capexItem = bridge.items.find((i) => i.title.includes('capex'))
            expect(capexItem).toBeDefined()
            expect(capexItem?.totalDeduction).toBe(120_000)
            expect(capexItem?.handling).toBe('ev_reduction')

            // Total EV reduction = $1,000,000 (EBITDA) + $120,000 (Capex) = $1,120,000
            expect(bridge.totalEvDeduction).toBe(1_120_000)
            expect(bridge.totalSpecialEscrow).toBe(180_000)
            expect(bridge.defensibleCounterOffer).toBe(8_880_000) // $10,000,000 - $1,120,000
            expect(bridge.totalSavingsDollars).toBe(1_120_000)
        })

        it('respects user item handling overrides', () => {
            const model = {
                purchasePrice: 5_000_000,
                documentedFactsJson: JSON.stringify({
                    ebitda_sde: { value: 1_000_000 },
                }),
            } as unknown as DealModel

            const synthesis = {
                redFlags: ['Discovered $150k unpaid payroll tax assessment'],
            } as unknown as ProjectSynthesisItem

            // Override default special_escrow to ev_reduction
            const bridge = computeValuationBridge(model, synthesis, {
                'bridge-flag-0': 'ev_reduction',
            })

            expect(bridge.totalEvDeduction).toBe(150_000)
            expect(bridge.totalSpecialEscrow).toBe(0)
            expect(bridge.defensibleCounterOffer).toBe(4_850_000)
        })

        it('does not invent dollar deductions or escrows from narrative-only risks', () => {
            const bridge = computeValuationBridge({
                purchasePrice: 5_000_000,
                documentedFactsJson: JSON.stringify({ ebitda_sde: { value: 1_000_000 } }),
            } as unknown as DealModel, {
                redFlags: ['Customer concentration exceeds 40% and equipment needs maintenance'],
            } as unknown as ProjectSynthesisItem)

            expect(bridge.items).toEqual([])
            expect(bridge.totalEvDeduction).toBe(0)
            expect(bridge.totalSpecialEscrow).toBe(0)
            expect(bridge.totalSavingsDollars).toBe(0)
        })

        it('uses the questionnaire reported EBITDA fact for add-back disallowance', () => {
            const bridge = computeValuationBridge({
                purchasePrice: 4_800_000,
                documentedFactsJson: JSON.stringify({
                    ebitda_sde: { value: 1_110_000 },
                    reported_ebitda: { value: 1_250_000 },
                }),
            } as unknown as DealModel)

            expect(bridge.reportedEbitda).toBe(1_250_000)
            expect(bridge.totalDisallowedAddbacks).toBe(140_000)
            expect(bridge.items[0]?.totalDeduction).toBe(Math.round(140_000 * (4_800_000 / 1_110_000)))
        })
    })

    describe('APA Clause Generators', () => {
        it('generates definitive APA Section 2.3 Valuation Bridge clause', () => {
            const model = {
                purchasePrice: 6_000_000,
                documentedFactsJson: JSON.stringify({
                    ebitda_sde: { value: 1_200_000 },
                }),
            } as unknown as DealModel

            const bridge = computeValuationBridge(model)
            const clause = generateValuationBridgeClause(bridge, 'Acme Corp')

            expect(clause).toContain('SECTION 2.3. Purchase Price Adjustment and Valuation Bridge.')
            expect(clause).toContain('$6,000,000')
            expect(clause).toContain('5.00x')
        })

        it('generates APA Section 8.2(c) Special Indemnity Escrow clause', () => {
            const model = {
                purchasePrice: 4_000_000,
                documentedFactsJson: JSON.stringify({
                    ebitda_sde: { value: 1_000_000 },
                }),
            } as unknown as DealModel

            const synthesis = {
                redFlags: ['Discovered $200k sales tax audit exposure'],
            } as unknown as ProjectSynthesisItem

            const bridge = computeValuationBridge(model, synthesis)
            const clause = generateSpecialEscrowClause(bridge, 'Acme Corp')

            expect(clause).toContain('SECTION 8.2(c). Special Indemnity Escrow Fund.')
            expect(clause).toContain('$200,000')
            expect(clause).toContain('twenty-four (24) months')
        })

        it('generates APA Section 3.14 Specific Contractor & Wage Reps clause', () => {
            const clause = generateSpecificRepsClause('Apex Machining')
            expect(clause).toContain('SECTION 3.14. Specific Representations on Independent Contractors')
            expect(clause).toContain('Apex Machining')
            expect(clause).toContain('Fair Labor Standards Act (FLSA)')
        })
    })
})
