// Single source of truth for the quantitative deal model.
//
// Every returns/valuation card must use these functions rather than
// re-deriving formulas locally — three separate copies of calculateIrr had
// already drifted into the codebase, which let different tabs disagree about
// the same metric.
//
// Transparency rule: when an input is not documented we still fall back to an
// assumption (so the UI keeps working), but the fallback is RECORDED in
// `assumedInputs`. Callers are expected to surface that, so a payback period
// resting on "capex assumed 0" can never look like a documented fact.

export type ResolvedInput = {
    field: string
    label: string
    value: number
    /** 'provided' = came from the saved deal model; 'assumed' = fallback default. */
    source: 'provided' | 'assumed'
}

export type DealMathInputs = {
    /** Documented EBITDA/SDE. Required — no default, because guessing earnings is never acceptable. */
    ebitda: number | null
    /** Purchase price (or asking price). Required. */
    purchasePrice: number | null
    transactionFees?: number | null
    workingCapital?: number | null
    taxRate?: number | null
    maintenanceCapex?: number | null
    holdPeriodYears?: number | null
    exitMultiple?: number | null
    exitCosts?: number | null
}

/** Fallbacks used when an input is absent. Exported so the UI and tests agree. */
export const DEAL_MATH_DEFAULTS = {
    transactionFees: 0,
    workingCapital: 0,
    taxRate: 0.25,
    maintenanceCapex: 0,
    holdPeriodYears: 5,
    /**
     * Last-resort exit multiple, used only when the entry multiple cannot be
     * derived (no price or no earnings). Prefer `entryMultiple` — see below.
     */
    exitMultiple: 4,
    /** Exit costs default to 2% of exit enterprise value. */
    exitCostRate: 0.02,
    /** Amortization/loan term in years, used when none is saved. */
    loanTermYears: 10,
} as const

/**
 * Entry multiple actually paid: purchase price ÷ earnings.
 * Returns null when it cannot be computed.
 */
export function entryMultiple(purchasePrice: number | null, ebitda: number | null) {
    if (!isNumber(purchasePrice) || !isNumber(ebitda) || ebitda <= 0) {
        return null
    }
    return purchasePrice / ebitda
}

/**
 * Normalizes the saved equity-contribution input to a fraction in (0, 1].
 *
 * The Deal Model input form saves this as a decimal ("Equity contribution
 * (decimal)", default 0.3 = 30%), matching taxRate/interestRate. But a number
 * of cards were written assuming a whole percent (25 = 25%) and divided by 100,
 * which turned a real saved 0.3 into 0.003 — a 100× understatement of equity.
 * This is the single place that resolves the ambiguity:
 *   - values > 1 are treated as a whole percent and divided by 100 (25 → 0.25,
 *     and also 30 → 0.30 if a user typed a percent into the decimal field),
 *   - values in (0, 1] are already fractions and pass through (0.3 → 0.30),
 *   - null / non-finite / non-positive fall back to the 0.3 default.
 * Every consumer should call this rather than reading the raw field.
 */
export function normalizeEquityFraction(value: number | null | undefined): number {
    if (!isNumber(value) || value <= 0) {
        return 0.3
    }
    return value > 1 ? value / 100 : value
}

/**
 * Resolves the loan/amortization term (in years) a card should use.
 *
 * The Deal Model input form only ever saves `amortizationYears` — there is no
 * `loanTermYears` field a user can set. `loanTermYears` is a *derived* field
 * that `withDerivedCapitalStack` backfills from `amortizationYears`, and only
 * when a project already has financing inputs. Cards that read `loanTermYears`
 * alone therefore silently ignored a user's saved amortization term whenever
 * the derived stack had not run, falling back to the default instead.
 *
 * This resolver is the single place that fixes the precedence:
 *   - a saved `amortizationYears` (what the form actually writes) wins,
 *   - then a derived/legacy `loanTermYears`,
 *   - then the shared default.
 * Non-positive / non-finite values are ignored at each step.
 */
export function resolveLoanTermYears(
    amortizationYears: number | null | undefined,
    loanTermYears: number | null | undefined,
): number {
    if (isNumber(amortizationYears) && amortizationYears > 0) {
        return amortizationYears
    }
    if (isNumber(loanTermYears) && loanTermYears > 0) {
        return loanTermYears
    }
    return DEAL_MATH_DEFAULTS.loanTermYears
}

const INPUT_LABELS: Record<string, string> = {
    transactionFees: 'Transaction fees',
    workingCapital: 'Working capital requirement',
    taxRate: 'Tax rate',
    maintenanceCapex: 'Maintenance capex',
    holdPeriodYears: 'Hold period',
    exitMultiple: 'Exit multiple',
    exitCosts: 'Exit costs',
}

export type AllCashReturns = {
    initialInvestment: number | null
    annualCashFlow: number | null
    annualRoi: number | null
    paybackYears: number | null
    cumulativeHoldCashFlow: number | null
    operatingMoic: number | null
    exitEnterpriseValue: number | null
    netExitProceeds: number | null
    cashFlows: number[] | null
    totalMoic: number | null
    irr: number | null
    /** Core operating metrics can be computed. */
    ready: boolean
    /** Exit-dependent metrics (MOIC/IRR) can be computed. */
    exitReady: boolean
    /** Inputs that fell back to a default — surface these next to the numbers. */
    assumedInputs: ResolvedInput[]
    /** Required inputs with no value and no safe default. */
    missingInputs: string[]
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Internal rate of return via Newton-Raphson.
 *
 * Returns null when IRR is undefined or cannot be trusted: a series with no
 * sign change has no IRR, and non-convergence must not be reported as a number.
 */
export function calculateIrr(cashFlows: number[]): number | null {
    if (!cashFlows.some((value) => value < 0) || !cashFlows.some((value) => value > 0)) {
        return null
    }

    let rate = 0.1

    for (let iteration = 0; iteration < 100; iteration += 1) {
        const npv = cashFlows.reduce((sum, cashFlow, year) => sum + cashFlow / (1 + rate) ** year, 0)
        // d(NPV)/dr = sum over t>=1 of -t * CF_t / (1+r)^(t+1)
        const derivative = cashFlows
            .slice(1)
            .reduce((sum, cashFlow, year) => sum - ((year + 1) * cashFlow) / (1 + rate) ** (year + 2), 0)

        if (!Number.isFinite(npv) || !Number.isFinite(derivative) || Math.abs(derivative) < 1e-9) {
            return null
        }

        const nextRate = rate - npv / derivative

        if (nextRate <= -0.999 || nextRate > 100) {
            return null
        }

        if (Math.abs(nextRate - rate) < 1e-7) {
            return nextRate
        }

        rate = nextRate
    }

    return null
}

/** Net present value of a cash-flow series at a given discount rate. */
export function calculateNpv(cashFlows: number[], discountRate: number): number | null {
    if (discountRate <= -1) {
        return null
    }

    const npv = cashFlows.reduce((sum, cashFlow, year) => sum + cashFlow / (1 + discountRate) ** year, 0)
    return Number.isFinite(npv) ? npv : null
}

/**
 * Resolves the full all-cash returns model, recording which inputs were
 * assumed rather than documented.
 */
export function computeAllCashReturns(inputs: DealMathInputs): AllCashReturns {
    const assumedInputs: ResolvedInput[] = []
    const missingInputs: string[] = []

    const resolve = (field: keyof typeof INPUT_LABELS, provided: number | null | undefined, fallback: number) => {
        if (isNumber(provided)) {
            return provided
        }
        assumedInputs.push({ field, label: INPUT_LABELS[field], value: fallback, source: 'assumed' })
        return fallback
    }

    const ebitda = isNumber(inputs.ebitda) ? inputs.ebitda : null
    const purchasePrice = isNumber(inputs.purchasePrice) ? inputs.purchasePrice : null

    if (ebitda === null) {
        missingInputs.push('Documented EBITDA/SDE')
    }
    if (purchasePrice === null) {
        missingInputs.push('Purchase or asking price')
    }

    const fees = resolve('transactionFees', inputs.transactionFees, DEAL_MATH_DEFAULTS.transactionFees)
    const workingCapital = resolve('workingCapital', inputs.workingCapital, DEAL_MATH_DEFAULTS.workingCapital)
    const taxRate = resolve('taxRate', inputs.taxRate, DEAL_MATH_DEFAULTS.taxRate)
    const capex = resolve('maintenanceCapex', inputs.maintenanceCapex, DEAL_MATH_DEFAULTS.maintenanceCapex)
    const holdPeriodYears = resolve('holdPeriodYears', inputs.holdPeriodYears, DEAL_MATH_DEFAULTS.holdPeriodYears)
    // Default to a flat multiple — exit at what you paid. Inventing an
    // unrelated constant here is what turns an ordinary deal into a fake
    // catastrophe (an 8.7x entry "exiting" at 4x can only lose money).
    const impliedExitMultiple = entryMultiple(purchasePrice, ebitda) ?? DEAL_MATH_DEFAULTS.exitMultiple
    const exitMultiple = resolve('exitMultiple', inputs.exitMultiple, impliedExitMultiple)

    const initialInvestment = purchasePrice === null ? null : purchasePrice + fees + workingCapital
    const annualCashFlow = ebitda === null ? null : ebitda * (1 - taxRate) - capex

    const annualRoi = initialInvestment !== null && initialInvestment > 0 && annualCashFlow !== null
        ? annualCashFlow / initialInvestment
        : null

    const paybackYears = initialInvestment !== null && annualCashFlow !== null && annualCashFlow > 0
        ? initialInvestment / annualCashFlow
        : null

    const cumulativeHoldCashFlow = annualCashFlow !== null ? annualCashFlow * holdPeriodYears : null

    const operatingMoic = initialInvestment !== null && initialInvestment > 0 && cumulativeHoldCashFlow !== null
        ? cumulativeHoldCashFlow / initialInvestment
        : null

    const exitEnterpriseValue = ebitda === null ? null : ebitda * exitMultiple

    const defaultExitCosts = exitEnterpriseValue === null ? 0 : exitEnterpriseValue * DEAL_MATH_DEFAULTS.exitCostRate
    const exitCosts = isNumber(inputs.exitCosts)
        ? inputs.exitCosts
        : (() => {
            assumedInputs.push({
                field: 'exitCosts',
                label: INPUT_LABELS.exitCosts,
                value: defaultExitCosts,
                source: 'assumed',
            })
            return defaultExitCosts
        })()

    const netExitProceeds = exitEnterpriseValue === null ? null : exitEnterpriseValue - exitCosts

    const cashFlows = initialInvestment !== null
        && annualCashFlow !== null
        && netExitProceeds !== null
        && holdPeriodYears > 0
        ? [
            -initialInvestment,
            ...Array.from(
                { length: holdPeriodYears },
                (_, year) => annualCashFlow + (year === holdPeriodYears - 1 ? netExitProceeds : 0)
            ),
        ]
        : null

    const totalMoic = initialInvestment !== null && initialInvestment > 0 && cashFlows !== null
        ? cashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / initialInvestment
        : null

    const irr = cashFlows ? calculateIrr(cashFlows) : null

    return {
        initialInvestment,
        annualCashFlow,
        annualRoi,
        paybackYears,
        cumulativeHoldCashFlow,
        operatingMoic,
        exitEnterpriseValue,
        netExitProceeds,
        cashFlows,
        totalMoic,
        irr,
        ready: initialInvestment !== null && annualCashFlow !== null,
        exitReady: netExitProceeds !== null && cashFlows !== null,
        assumedInputs,
        missingInputs,
    }
}

// ---------------------------------------------------------------------------
// Ratio helpers — shared so Overview and Valuation can never disagree.
// ---------------------------------------------------------------------------

/** Safe division that returns null instead of Infinity/NaN. */
export function ratio(numerator: number | null, denominator: number | null): number | null {
    if (!isNumber(numerator) || !isNumber(denominator) || denominator === 0) {
        return null
    }
    const result = numerator / denominator
    return Number.isFinite(result) ? result : null
}

export function ebitdaMargin(ebitda: number | null, revenue: number | null) {
    return revenue !== null && revenue > 0 ? ratio(ebitda, revenue) : null
}

export function debtToAssets(debt: number | null, totalAssets: number | null) {
    return totalAssets !== null && totalAssets > 0 ? ratio(debt, totalAssets) : null
}

export function revenuePerEmployee(revenue: number | null, employeeCount: number | null) {
    return employeeCount !== null && employeeCount > 0 ? ratio(revenue, employeeCount) : null
}

/** Premium (+) or discount (−) of asking price against a supported valuation. */
export function priceGapPercent(askingPrice: number | null, baseValuation: number | null) {
    if (!isNumber(askingPrice) || !isNumber(baseValuation) || baseValuation <= 0) {
        return null
    }
    return ((askingPrice - baseValuation) / baseValuation) * 100
}
