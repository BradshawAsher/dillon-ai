import type { DealModel } from '../hooks/backend/diligence'

/**
 * Mock DealModel fixtures for testing quantitative cards.
 * Each represents a distinct scenario so unit/integration tests
 * can exercise the full range of card behaviors.
 */

const baseFacts = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
        revenue: { value: 4_800_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
        ebitda_sde: { value: 1_200_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
        total_assets: { value: 3_500_000, status: 'confirmed', currency: 'USD' },
        total_liabilities: { value: 1_200_000, status: 'confirmed', currency: 'USD' },
        accounts_receivable: { value: 450_000, status: 'confirmed', currency: 'USD' },
        inventory: { value: 320_000, status: 'confirmed', currency: 'USD' },
        cash_equivalents: { value: 280_000, status: 'confirmed', currency: 'USD' },
        real_estate: { value: 1_100_000, status: 'confirmed', currency: 'USD' },
        equipment: { value: 650_000, status: 'confirmed', currency: 'USD' },
        goodwill: { value: 700_000, status: 'estimated', currency: 'USD' },
        ...overrides,
    })

const baseModel: DealModel = {
    projectId: 'fixture-healthy-deal',
    askingPrice: 4_200_000,
    purchasePrice: 3_900_000,
    debtAssumed: 0,
    cashAcquired: 50_000,
    workingCapitalRequirement: 200_000,
    transactionFees: 80_000,
    holdPeriodYears: 5,
    taxRate: 0.25,
    closingCosts: 15_000,
    maintenanceCapex: 120_000,
    exitMultiple: 4.5,
    exitCosts: null,
    equityContributionPercent: 25,
    interestRate: 0.07,
    amortizationYears: 10,
    sellerNoteAmount: 400_000,
    bearRevenueGrowth: 0.0,
    baseRevenueGrowth: 0.05,
    bullRevenueGrowth: 0.10,
    bearEbitdaMargin: 0.20,
    baseEbitdaMargin: 0.25,
    bullEbitdaMargin: 0.30,
    bearExitMultiple: 3.0,
    baseExitMultiple: 4.0,
    bullExitMultiple: 5.5,
    revenueMultiple: null,
    ebitdaMultiple: null,
    assetHaircutPercent: null,
    modelUpdatedAt: '2026-07-27T12:00:00Z',
    modelUpdatedBy: 'fixture',
    documentedFactsJson: baseFacts(),
    documentedFactsStatus: 'confirmed',
}

/** Healthy small business: $4.8M revenue, $1.2M EBITDA, 25% margin, 3.25x entry */
export const FIXTURE_HEALTHY_DEAL: DealModel = { ...baseModel }

/** High-growth SaaS: higher revenue, lower margin, higher asking price */
export const FIXTURE_HIGH_GROWTH: DealModel = {
    ...baseModel,
    projectId: 'fixture-high-growth',
    askingPrice: 12_000_000,
    purchasePrice: 11_000_000,
    holdPeriodYears: 7,
    exitMultiple: 8.0,
    baseRevenueGrowth: 0.20,
    bullRevenueGrowth: 0.35,
    bearRevenueGrowth: 0.08,
    baseEbitdaMargin: 0.15,
    bullEbitdaMargin: 0.22,
    bearEbitdaMargin: 0.10,
    baseExitMultiple: 7.0,
    bullExitMultiple: 10.0,
    bearExitMultiple: 4.0,
    equityContributionPercent: 40,
    interestRate: 0.085,
    sellerNoteAmount: 0,
    documentedFactsJson: baseFacts({
        revenue: { value: 8_500_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
        ebitda_sde: { value: 1_275_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
        total_assets: { value: 2_000_000, status: 'confirmed', currency: 'USD' },
        total_liabilities: { value: 800_000, status: 'confirmed', currency: 'USD' },
        intellectual_property: { value: 1_500_000, status: 'estimated', currency: 'USD' },
    }),
}

/** Distressed / turnaround: low margin, high leverage, negative growth scenario */
export const FIXTURE_DISTRESSED: DealModel = {
    ...baseModel,
    projectId: 'fixture-distressed',
    askingPrice: 2_000_000,
    purchasePrice: 1_600_000,
    holdPeriodYears: 3,
    exitMultiple: 3.0,
    baseRevenueGrowth: -0.02,
    bullRevenueGrowth: 0.03,
    bearRevenueGrowth: -0.10,
    baseEbitdaMargin: 0.08,
    bullEbitdaMargin: 0.12,
    bearEbitdaMargin: 0.03,
    baseExitMultiple: 2.5,
    bullExitMultiple: 3.5,
    bearExitMultiple: 1.5,
    equityContributionPercent: 50,
    interestRate: 0.10,
    amortizationYears: 7,
    sellerNoteAmount: 200_000,
    maintenanceCapex: 200_000,
    documentedFactsJson: baseFacts({
        revenue: { value: 3_200_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
        ebitda_sde: { value: 256_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
        total_assets: { value: 2_800_000, status: 'confirmed', currency: 'USD' },
        total_liabilities: { value: 2_400_000, status: 'confirmed', currency: 'USD' },
    }),
}

/** Minimal data: only asking price and revenue, no EBITDA */
export const FIXTURE_MINIMAL_DATA: DealModel = {
    ...baseModel,
    projectId: 'fixture-minimal',
    askingPrice: 5_000_000,
    purchasePrice: null,
    debtAssumed: null,
    cashAcquired: null,
    workingCapitalRequirement: null,
    transactionFees: null,
    holdPeriodYears: null,
    taxRate: null,
    closingCosts: null,
    maintenanceCapex: null,
    exitMultiple: null,
    exitCosts: null,
    equityContributionPercent: null,
    interestRate: null,
    amortizationYears: null,
    sellerNoteAmount: null,
    bearRevenueGrowth: null,
    baseRevenueGrowth: null,
    bullRevenueGrowth: null,
    bearEbitdaMargin: null,
    baseEbitdaMargin: null,
    bullEbitdaMargin: null,
    bearExitMultiple: null,
    baseExitMultiple: null,
    bullExitMultiple: null,
    revenueMultiple: null,
    ebitdaMultiple: null,
    assetHaircutPercent: null,
    modelUpdatedAt: '2026-07-27T12:00:00Z',
    modelUpdatedBy: 'fixture',
    documentedFactsJson: JSON.stringify({
        revenue: { value: 6_000_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
    }),
    documentedFactsStatus: 'partial',
}

/** Zero EBITDA: revenue exists but business is breakeven */
export const FIXTURE_ZERO_EBITDA: DealModel = {
    ...baseModel,
    projectId: 'fixture-zero-ebitda',
    askingPrice: 3_000_000,
    purchasePrice: 2_800_000,
    documentedFactsJson: baseFacts({
        revenue: { value: 5_000_000, status: 'confirmed', currency: 'USD', period: 'TTM' },
        ebitda_sde: { value: 0, status: 'confirmed', currency: 'USD', period: 'TTM' },
    }),
}

/** All fixtures as an array for iteration in tests */
export const ALL_FIXTURES = [
    FIXTURE_HEALTHY_DEAL,
    FIXTURE_HIGH_GROWTH,
    FIXTURE_DISTRESSED,
    FIXTURE_MINIMAL_DATA,
    FIXTURE_ZERO_EBITDA,
] as const
