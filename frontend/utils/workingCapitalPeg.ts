import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from './evidence'

export type RollingTimeframe = '6m' | '12m' | '24m'

export type WorkingCapitalMonthPoint = {
    period: string
    revenue: number
    ar: number
    inventory: number
    ap: number
    accruedExpenses: number
    currentAssets: number
    currentLiabilities: number
    nwc: number
    nwcPercentOfRev: number
}

export type NwcPegResult = {
    selectedTimeframe: RollingTimeframe
    averageNwc: number
    targetPeg: number
    minNwc: number
    maxNwc: number
    nwcSwing: number
    volatilityPercent: number
    collarBandPercent: number
    collarLowerLimit: number
    collarUpperLimit: number
    closingEstimatedNwc: number
    adjustmentType: 'surplus_to_seller' | 'deficit_to_buyer' | 'within_collar'
    adjustmentAmount: number
    monthlyData: WorkingCapitalMonthPoint[]
    definitiveAgreementClause: string
    isIllustrative: boolean
    assumedInputs: string[]
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Generates rolling monthly NWC data points anchored around documented balance sheet facts.
 */
export function generateMonthlyNwcSeries(
    baseRevenue: number,
    baseAr: number,
    baseInventory: number,
    baseAp: number,
    baseAccrued: number,
    monthsCount = 24
): WorkingCapitalMonthPoint[] {
    const safeMonths = isFiniteNumber(monthsCount) && monthsCount > 0 ? Math.min(120, Math.floor(monthsCount)) : 0
    const safeRevenue = isFiniteNumber(baseRevenue) && baseRevenue > 0 ? baseRevenue : 0
    if (safeRevenue === 0 || safeMonths === 0) return []
    const safeAr = isFiniteNumber(baseAr) && baseAr >= 0 ? baseAr : Math.round(safeRevenue * 0.08)
    const safeInventory = isFiniteNumber(baseInventory) && baseInventory >= 0 ? baseInventory : Math.round(safeRevenue * 0.04)
    const safeAp = isFiniteNumber(baseAp) && baseAp >= 0 ? baseAp : Math.round(safeRevenue * 0.05)
    const safeAccrued = isFiniteNumber(baseAccrued) && baseAccrued >= 0 ? baseAccrued : Math.round(safeRevenue * 0.02)
    const monthlyRev = Math.max(10000, Math.round(safeRevenue / 12))
    const series: WorkingCapitalMonthPoint[] = []

    // Calendar months ending in the current month. A non-finite or non-positive
    // count returns an empty series so callers never divide by zero or take
    // Math.min/max over an empty list (which yields ±Infinity).
    const now = new Date()
    for (let i = safeMonths - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const period = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        const monthIndex = d.getMonth() // 0 = Jan, 11 = Dec

        // Seasonal variance curve (e.g. Q2/Q3 peak, Q1 trough)
        const seasonalFactor = 1 + 0.12 * Math.sin(((monthIndex - 2) * Math.PI) / 6)
        // Slight monthly noise
        const noiseFactor = 1 + ((i % 5) - 2) * 0.02

        const monthRev = Math.round(monthlyRev * seasonalFactor * noiseFactor)
        const ar = Math.round(safeAr * (monthRev / monthlyRev) * (1 + ((i % 3) - 1) * 0.03))
        const inventory = Math.round(safeInventory * seasonalFactor * (1 + ((i % 4) - 2) * 0.02))
        const ap = Math.round(safeAp * (monthRev / monthlyRev) * (1 + ((i % 3) - 1) * 0.02))
        const accrued = Math.round(safeAccrued * (1 + ((i % 6) - 3) * 0.015))

        const currentAssets = ar + inventory
        const currentLiabilities = ap + accrued
        const nwc = currentAssets - currentLiabilities
        const nwcPercentOfRev = monthRev > 0 ? (nwc / (monthRev * 12)) * 100 : 0

        series.push({
            period,
            revenue: monthRev,
            ar,
            inventory,
            ap,
            accruedExpenses: accrued,
            currentAssets,
            currentLiabilities,
            nwc,
            nwcPercentOfRev: Math.round(nwcPercentOfRev * 10) / 10,
        })
    }

    return series
}

/**
 * Calculates the target NWC peg, collar boundaries, and legal adjustment provisions.
 */
export function calculateWorkingCapitalPeg(
    model: DealModel,
    timeframe: RollingTimeframe = '12m',
    collarPercent = 5,
    customClosingNwc?: number
): NwcPegResult {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const rawRevenue = typeof facts.revenue?.value === 'number' && Number.isFinite(facts.revenue.value)
        ? facts.revenue.value
        : null
    const revenue = rawRevenue && rawRevenue > 0 ? rawRevenue : 0
    const assumedInputs: string[] = []

    const ar = typeof facts.accounts_receivable?.value === 'number' && Number.isFinite(facts.accounts_receivable.value)
        ? facts.accounts_receivable.value
        : (() => { assumedInputs.push('Accounts receivable estimated at 8% of annual revenue'); return Math.round(revenue * 0.08) })()
    const inventory = typeof facts.inventory?.value === 'number' && Number.isFinite(facts.inventory.value)
        ? facts.inventory.value
        : (() => { assumedInputs.push('Inventory estimated at 4% of annual revenue'); return Math.round(revenue * 0.04) })()
    const ap = typeof facts.accounts_payable?.value === 'number' && Number.isFinite(facts.accounts_payable.value)
        ? facts.accounts_payable.value
        : (() => { assumedInputs.push('Accounts payable estimated at 5% of annual revenue'); return Math.round(revenue * 0.05) })()
    const accrued = typeof facts.accrued_expenses?.value === 'number' && Number.isFinite(facts.accrued_expenses.value)
        ? facts.accrued_expenses.value
        : (() => { assumedInputs.push('Accrued expenses estimated at 2% of annual revenue'); return Math.round(revenue * 0.02) })()

    const fullSeries = generateMonthlyNwcSeries(revenue, ar, inventory, ap, accrued, 24)

    const count = timeframe === '6m' ? 6 : timeframe === '12m' ? 12 : 24
    const selectedSlice = fullSeries.slice(-count)

    const nwcValues = selectedSlice.map(p => p.nwc)
    const totalNwc = nwcValues.reduce((sum, v) => sum + v, 0)
    const averageNwc = selectedSlice.length > 0 ? Math.round(totalNwc / selectedSlice.length) : 0
    const minNwc = nwcValues.length > 0 ? nwcValues.reduce((min, v) => (v < min ? v : min), nwcValues[0]) : 0
    const maxNwc = nwcValues.length > 0 ? nwcValues.reduce((max, v) => (v > max ? v : max), nwcValues[0]) : 0
    const nwcSwing = maxNwc - minNwc
    const volatilityPercent = averageNwc > 0 ? Math.round((nwcSwing / averageNwc) * 100) : 0

    const safeCollar = isFiniteNumber(collarPercent) && collarPercent >= 0 ? collarPercent : 5
    const targetPeg = averageNwc
    const collarLowerLimit = Math.round(targetPeg * (1 - safeCollar / 100))
    const collarUpperLimit = Math.round(targetPeg * (1 + safeCollar / 100))

    // Default closing estimated NWC is latest month if not explicitly customized.
    // A NaN custom close would fail every comparison and leak into the clause.
    const latestMonthNwc = selectedSlice[selectedSlice.length - 1]?.nwc ?? targetPeg
    const closingEstimatedNwc = isFiniteNumber(customClosingNwc) ? customClosingNwc : latestMonthNwc

    let adjustmentType: 'surplus_to_seller' | 'deficit_to_buyer' | 'within_collar' = 'within_collar'
    let adjustmentAmount = 0

    if (closingEstimatedNwc > collarUpperLimit) {
        adjustmentType = 'surplus_to_seller'
        adjustmentAmount = closingEstimatedNwc - collarUpperLimit
    } else if (closingEstimatedNwc < collarLowerLimit) {
        adjustmentType = 'deficit_to_buyer'
        adjustmentAmount = collarLowerLimit - closingEstimatedNwc
    }

    const companyName = (model as any).businessName || (model as any).companyName || 'Target Company'
    const timeframeLabel = timeframe === '6m' ? 'trailing six (6) month' : timeframe === '12m' ? 'trailing twelve (12) month' : 'trailing twenty-four (24) month'
    
    const formattedPeg = `$${targetPeg.toLocaleString()}`
    const formattedLower = `$${collarLowerLimit.toLocaleString()}`
    const formattedUpper = `$${collarUpperLimit.toLocaleString()}`

    const definitiveAgreementClause = revenue > 0 ? `[ILLUSTRATIVE DRAFT — REPLACE SYNTHETIC MONTHLY SERIES WITH ACTUAL MONTH-END BALANCES BEFORE USE]
SECTION 2.4 Working Capital Adjustment.
(a) Target Working Capital Peg. Subject to validation against actual monthly ledgers, the Base Purchase Price assumes that Closing Working Capital of ${companyName} shall equal ${formattedPeg} (the "Target Working Capital"), based on an illustrative ${timeframeLabel} series modeled from the available annual snapshot.
(b) Collar Bandwidth. No adjustment shall be made to the Purchase Price if the Closing Working Capital is between ${formattedLower} and ${formattedUpper} (the "Working Capital Collar").
(c) Post-Closing Adjustment. 
  (i) If Closing Working Capital exceeds the Upper Collar Limit (${formattedUpper}), Buyer shall pay to Seller within five (5) Business Days of final determination an amount equal to such excess as an upward purchase price adjustment.
  (ii) If Closing Working Capital is less than the Lower Collar Limit (${formattedLower}), Seller shall pay to Buyer (or Buyer shall be entitled to release from the Indemnity/Working Capital Escrow) within five (5) Business Days of final determination an amount equal to such deficit as a dollar-for-dollar reduction to the Purchase Price.` : ''

    return {
        selectedTimeframe: timeframe,
        averageNwc,
        targetPeg,
        minNwc,
        maxNwc,
        nwcSwing,
        volatilityPercent,
        collarBandPercent: safeCollar,
        collarLowerLimit,
        collarUpperLimit,
        closingEstimatedNwc,
        adjustmentType,
        adjustmentAmount,
        monthlyData: selectedSlice,
        definitiveAgreementClause,
        isIllustrative: true,
        assumedInputs: revenue > 0
            ? ['Monthly history is synthetically modeled from an annual snapshot', ...assumedInputs]
            : ['Annual revenue is missing; no working-capital series was generated'],
    }
}
