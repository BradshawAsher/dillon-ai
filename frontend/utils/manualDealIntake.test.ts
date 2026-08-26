import { describe, expect, it } from 'vitest'
import {
    MANUAL_DEAL_PRESETS,
    calculateNormalizedEbitda,
    calculateBalanceSheetTotals,
    buildManualDealModel,
    buildManualProjectSynthesis,
} from './manualDealIntake'

describe('manualDealIntake utilities', () => {
    describe('calculateNormalizedEbitda', () => {
        it('calculates adjusted EBITDA, margin, and multiple correctly', () => {
            const result = calculateNormalizedEbitda({
                ...MANUAL_DEAL_PRESETS.manufacturing.data,
                askingPrice: 5000000,
                annualRevenue: 5000000,
                reportedEbitda: 1200000,
                disallowedAddBacks: 200000,
            })

            expect(result.reportedEbitda).toBe(1200000)
            expect(result.disallowedAddBacks).toBe(200000)
            expect(result.adjustedEbitda).toBe(1000000)
            expect(result.ebitdaMargin).toBe(20.0)
            expect(result.askingMultiple).toBe(5.0)
        })

        it('reports a 0% margin when revenue is blank but EBITDA is present', () => {
            const result = calculateNormalizedEbitda({
                ...MANUAL_DEAL_PRESETS.manufacturing.data,
                annualRevenue: 0,
                reportedEbitda: 1250000,
                disallowedAddBacks: 0,
            })

            expect(result.adjustedEbitda).toBe(1250000)
            // Must not blow up into a millions-of-percent margin against a 1-dollar sentinel.
            expect(result.ebitdaMargin).toBe(0)
        })

        it('handles zero revenue and zero EBITDA safely without NaN', () => {
            const result = calculateNormalizedEbitda({
                ...MANUAL_DEAL_PRESETS.manufacturing.data,
                askingPrice: 0,
                annualRevenue: 0,
                reportedEbitda: 0,
                disallowedAddBacks: 0,
            })

            expect(result.adjustedEbitda).toBe(0)
            expect(result.ebitdaMargin).toBe(0)
            expect(result.askingMultiple).toBe(0)
        })
    })

    describe('calculateBalanceSheetTotals', () => {
        it('computes total assets, total liabilities, and net asset value accurately', () => {
            const result = calculateBalanceSheetTotals({
                ...MANUAL_DEAL_PRESETS.manufacturing.data,
                cashIncluded: 100000,
                accountsReceivable: 200000,
                inventory: 300000,
                equipmentAndVehicles: 400000,
                realEstate: 500000,
                intellectualProperty: 50000,
                otherAssets: 20000,
                accountsPayable: 150000,
                shortTermDebt: 50000,
                longTermDebt: 200000,
                otherLiabilities: 20000,
            })

            expect(result.totalAssets).toBe(1570000)
            expect(result.totalLiabilities).toBe(420000)
            expect(result.netAssetValue).toBe(1150000)
            expect(result.tangibleBookValue).toBe(1100000)
        })
    })

    describe('buildManualDealModel', () => {
        it('produces a complete DealModel with Senior Debt and Equity check', () => {
            const model = buildManualDealModel(MANUAL_DEAL_PRESETS.manufacturing.data, 'project-manual-123')

            expect(model.projectId).toBe('project-manual-123')
            expect(model.askingPrice).toBe(4800000)
            expect(model.purchasePrice).toBe(4800000)
            expect(model.equityContributionPercent).toBe(20)
            expect(model.equityAmount).toBe(960000)
            expect(model.sellerNoteAmount).toBe(500000)
            expect(model.seniorDebtAmount).toBe(4800000 - 960000 - 500000)
            expect(model.documentedFactsStatus).toBe('validated')

            const facts = JSON.parse(model.documentedFactsJson)
            expect(facts.companyName).toBe('Apex Precision Dynamics')
            expect(facts.intakeSource).toBe('manual_questionnaire')
        })

        it('does not leak NaN into price/revenue-scaled fields when inputs are blank', () => {
            const model = buildManualDealModel(
                {
                    ...MANUAL_DEAL_PRESETS.manufacturing.data,
                    askingPrice: NaN as unknown as number,
                    annualRevenue: NaN as unknown as number,
                },
                'project-manual-blank',
            )

            expect(model.transactionFees).toBe(0)
            expect(model.closingCosts).toBe(0)
            expect(model.maintenanceCapex).toBe(0)
            expect(model.workingCapitalRequirement).toBe(0)
            expect(model.revenueMultiple).toBe(0)
            expect(model.seniorDebtAmount).toBe(0)
        })
    })

    describe('buildManualProjectSynthesis', () => {
        it('generates a complete ProjectSynthesisItem with traffic lights and findings', () => {
            const dealModel = buildManualDealModel(MANUAL_DEAL_PRESETS.manufacturing.data, 'project-manual-123')
            const synthesis = buildManualProjectSynthesis(MANUAL_DEAL_PRESETS.manufacturing.data, dealModel, 'project-manual-123')

            expect(synthesis.projectId).toBe('project-manual-123')
            expect(synthesis.projectStatus).toBe('synthesized')
            expect(synthesis.companyName).toBe('Apex Precision Dynamics')
            expect(synthesis.keyTakeaways.length).toBeGreaterThan(0)
            expect(synthesis.structuredFindings.keyTakeaways.length).toBeGreaterThan(0)
            expect(synthesis.valuationBaseEstimate).toBeTruthy()
            expect(synthesis.finalRecommendation).toBeTruthy()
        })

        it('assigns RED traffic light if multiple critical flags exist', () => {
            const highRiskData = {
                ...MANUAL_DEAL_PRESETS.manufacturing.data,
                topCustomerConcentrationPercent: 55, // Critical red flag
                keyPersonRisk: 'high' as const, // Critical red flag
                disallowedAddBacks: 500000,
            }
            const dealModel = buildManualDealModel(highRiskData, 'project-manual-highrisk')
            const synthesis = buildManualProjectSynthesis(highRiskData, dealModel, 'project-manual-highrisk')

            expect(synthesis.finalTrafficLight).toBe('RED')
            expect(synthesis.finalRecommendation).toBe('RENEGOTIATE')
            expect(synthesis.redFlags.length).toBeGreaterThanOrEqual(2)
        })
    })
})
