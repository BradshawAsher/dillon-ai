import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from './evidence'
import { parseMagnitudeMoney } from './documentedFacts'

export type DeductionHandling = 'ev_reduction' | 'special_escrow' | 'earnout_contingent'

export interface BridgeLineItem {
    id: string
    title: string
    category: 'ebitda_haircut' | 'liability' | 'capex' | 'concentration' | 'other'
    baseAmount: number
    multipleImpact?: number
    totalDeduction: number
    handling: DeductionHandling
    rationale: string
    evidenceSource?: string
    apaSectionRef: string
}

export interface ValuationBridgeResult {
    baselinePurchasePrice: number
    entryMultiple: number
    normalizedEbitda: number
    reportedEbitda: number
    totalDisallowedAddbacks: number
    items: BridgeLineItem[]
    totalEvDeduction: number
    totalSpecialEscrow: number
    totalEarnoutContingent: number
    defensibleCounterOffer: number
    totalSavingsDollars: number
    totalSavingsPercent: number
}

/**
 * Extracts numeric dollar amounts from red flag strings.
 * E.g., "Discovered $180k undocumented contractor liability" -> 180,000
 */
export function extractDollarFromText(text: string): number | null {
    if (!text) return null
    const match = text.match(/\$[\d,.]+(?:[kKmMbB]|(?:\s*(?:thousand|million|billion)))?/)
    if (match) {
        return parseMagnitudeMoney(match[0])
    }
    return null
}

/**
 * Computes a defensible Purchase Price Valuation Bridge based on documented facts,
 * analyst overrides, and project synthesis red flags.
 */
export function computeValuationBridge(
    model: DealModel,
    synthesis?: ProjectSynthesisItem | null,
    itemHandlingOverrides: Record<string, DeductionHandling> = {}
): ValuationBridgeResult {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const baselinePrice = model.purchasePrice ?? model.askingPrice ?? 0
    const normalizedEbitda = typeof facts.ebitda_sde?.value === 'number' && facts.ebitda_sde.value > 0
        ? facts.ebitda_sde.value
        : 0

    // Original AI or reported EBITDA before analyst overrides
    const reportedEbitda = typeof facts.reported_ebitda?.value === 'number' && facts.reported_ebitda.value >= normalizedEbitda
        ? facts.reported_ebitda.value
        : facts.ebitda_sde?.isOverridden && typeof facts.ebitda_sde.originalAiValue === 'number'
            ? facts.ebitda_sde.originalAiValue
            : normalizedEbitda

    const entryMultiple = baselinePrice > 0 && normalizedEbitda > 0
        ? baselinePrice / normalizedEbitda
        : 0

    const items: BridgeLineItem[] = []

    // 1. EBITDA Disallowance / Normalization Multiple Haircut
    const disallowedAddbacks = Math.max(0, reportedEbitda - normalizedEbitda)
    if (disallowedAddbacks > 0) {
        const multipleHaircut = Math.round(disallowedAddbacks * entryMultiple)
        const id = 'bridge-ebitda-disallowance'
        const handling = itemHandlingOverrides[id] || 'ev_reduction'
        items.push({
            id,
            title: 'Disallowed Owner Add-Backs & Perks',
            category: 'ebitda_haircut',
            baseAmount: disallowedAddbacks,
            multipleImpact: entryMultiple,
            totalDeduction: multipleHaircut,
            handling,
            rationale: facts.ebitda_sde?.overrideReason || `Disallowed $${disallowedAddbacks.toLocaleString()} in non-essential perks; capitalized at ${entryMultiple.toFixed(1)}x entry multiple.`,
            evidenceSource: 'Quality of Earnings / Fact Calibration',
            apaSectionRef: 'Section 2.3(a)',
        })
    }

    // 2. Synthesize Line Items from Discovered Red Flags
    if (synthesis?.redFlags && synthesis.redFlags.length > 0) {
        synthesis.redFlags.forEach((flag, idx) => {
            const lower = flag.toLowerCase()
            const extractedDollar = extractDollarFromText(flag)

            // Categorize flag
            let category: BridgeLineItem['category'] = 'other'
            let baseAmount = extractedDollar || 0
            let apaRef = 'Section 8.2(c)'
            let defaultHandling: DeductionHandling = 'special_escrow'

            if (lower.includes('contractor') || lower.includes('1099') || lower.includes('tax') || lower.includes('payroll')) {
                category = 'liability'
                baseAmount = extractedDollar || 0
                apaRef = 'Section 8.2(c)(i) & Section 3.14'
                defaultHandling = 'special_escrow'
            } else if (lower.includes('capex') || lower.includes('equipment') || lower.includes('deferred maintenance')) {
                category = 'capex'
                baseAmount = extractedDollar || 0
                apaRef = 'Section 2.3(b)'
                defaultHandling = 'ev_reduction'
            } else if (lower.includes('concentration') || lower.includes('customer') || lower.includes('churn')) {
                category = 'concentration'
                baseAmount = extractedDollar || 0
                apaRef = 'Section 2.6 & Exhibit B'
                defaultHandling = 'earnout_contingent'
            } else if (lower.includes('inventory') || lower.includes('obsolete') || lower.includes('write-down')) {
                category = 'liability'
                baseAmount = extractedDollar || 0
                apaRef = 'Section 2.4(c)'
                defaultHandling = 'ev_reduction'
            } else if (extractedDollar && extractedDollar > 0) {
                category = 'liability'
                baseAmount = extractedDollar
                apaRef = 'Section 8.2(c)'
                defaultHandling = 'special_escrow'
            } else {
                // If no dollar can be inferred, skip generating an arbitrary deduction
                return
            }

            // Narrative risk flags cannot support a dollar adjustment on their
            // own. Require an explicit extracted amount rather than inventing
            // category-specific $75k-$150k deductions.
            if (baseAmount <= 0) return

            const id = `bridge-flag-${idx}`
            const handling = itemHandlingOverrides[id] || defaultHandling

            items.push({
                id,
                title: flag.length > 70 ? `${flag.slice(0, 67)}...` : flag,
                category,
                baseAmount,
                totalDeduction: baseAmount,
                handling,
                rationale: flag,
                evidenceSource: 'VDR Synthesis Findings',
                apaSectionRef: apaRef,
            })
        })
    }

    // Calculate aggregated totals
    let totalEvDeduction = 0
    let totalSpecialEscrow = 0
    let totalEarnoutContingent = 0

    items.forEach((item) => {
        if (item.handling === 'ev_reduction') {
            totalEvDeduction += item.totalDeduction
        } else if (item.handling === 'special_escrow') {
            totalSpecialEscrow += item.totalDeduction
        } else if (item.handling === 'earnout_contingent') {
            totalEarnoutContingent += item.totalDeduction
        }
    })

    const defensibleCounterOffer = Math.max(0, baselinePrice - totalEvDeduction)
    // Escrow and earnout amounts are contingent protections, not guaranteed
    // purchase-price savings. Only an EV reduction lowers consideration.
    const totalSavingsDollars = totalEvDeduction
    const totalSavingsPercent = baselinePrice > 0 ? (totalSavingsDollars / baselinePrice) * 100 : 0

    return {
        baselinePurchasePrice: baselinePrice,
        entryMultiple,
        normalizedEbitda,
        reportedEbitda,
        totalDisallowedAddbacks: disallowedAddbacks,
        items,
        totalEvDeduction,
        totalSpecialEscrow,
        totalEarnoutContingent,
        defensibleCounterOffer,
        totalSavingsDollars,
        totalSavingsPercent,
    }
}

/**
 * Generates definitive APA legal clause for Section 2.3 (Valuation & Purchase Price Adjustment Schedule).
 */
export function generateValuationBridgeClause(bridge: ValuationBridgeResult, companyName: string): string {
    const lines = bridge.items.filter((i) => i.handling === 'ev_reduction')
    const itemizedText = lines.map((item, idx) => 
        `        (${String.fromCharCode(97 + idx)}) an amount equal to $${item.totalDeduction.toLocaleString()} in respect of ${item.title} (${item.rationale});`
    ).join('\n')

    return `SECTION 2.3. Purchase Price Adjustment and Valuation Bridge.
(a) The Base Purchase Price of $${bridge.baselinePurchasePrice.toLocaleString()} has been mutually agreed based upon Target's normalized Trailing Twelve Months (TTM) EBITDA of $${bridge.normalizedEbitda.toLocaleString()} and an implied transaction multiple of ${bridge.entryMultiple.toFixed(2)}x.
(b) The Base Purchase Price shall be reduced at Closing, on a dollar-for-dollar basis, by the aggregate sum of $${bridge.totalEvDeduction.toLocaleString()} (the "Forensic Diligence Reductions"), comprising:
${itemizedText || '        (a) None;'}
(c) Accordingly, the Net Cash Consideration payable by Buyer to Seller at Closing pursuant to Section 2.2(a) shall be adjusted to $${bridge.defensibleCounterOffer.toLocaleString()}, subject to the post-closing Working Capital adjustments under Section 2.4 and the Escrow holdbacks under Section 8.2.`
}

/**
 * Generates definitive APA legal clause for Section 8.2(c) (Special Indemnity Escrow).
 */
export function generateSpecialEscrowClause(bridge: ValuationBridgeResult, companyName: string): string {
    const escrowItems = bridge.items.filter((i) => i.handling === 'special_escrow')
    const totalEscrow = bridge.totalSpecialEscrow

    return `SECTION 8.2(c). Special Indemnity Escrow Fund.
(a) At the Closing, Buyer shall deposit, or cause to be deposited, with the Escrow Agent the aggregate sum of $${totalEscrow.toLocaleString()} (the "Special Indemnity Escrow Amount") into a segregated, interest-bearing escrow account governed by the Escrow Agreement.
(b) The Special Indemnity Escrow Amount shall serve as the exclusive, immediate source of recovery for Buyer Indemnified Parties with respect to any Losses arising out of, relating to, or resulting from:
    (i) any misclassification of independent contractors, consultants, or temporary workers under applicable federal, state, or local labor and tax laws;
    (ii) any undisclosed tax liabilities, payroll audit assessments, or unremitted sales and use taxes for any Pre-Closing Tax Period; and
    (iii) any specific pending or threatened disputes identified in Disclosure Schedule 8.2(c).
(c) Survival and Release. The Special Indemnity Escrow Fund shall survive Closing for a period of twenty-four (24) months (the "Special Escrow Release Date"). On the Special Escrow Release Date, the Escrow Agent shall disburse to Seller the remaining balance, minus the aggregate amount of all bona fide unresolved claims previously asserted in good faith by Buyer.`
}

/**
 * Generates definitive APA legal clause for Section 3.14 (Specific Contractor & Tax Representations).
 */
export function generateSpecificRepsClause(companyName: string): string {
    return `SECTION 3.14. Specific Representations on Independent Contractors and Wage Compliance.
(a) Except as set forth on Schedule 3.14, ${companyName || 'Target Company'} has properly classified all individuals who have performed services for the Company as independent contractors, consultants, or employees in accordance with the Fair Labor Standards Act (FLSA), Internal Revenue Code Section 3508, and all applicable state wage and hour laws.
(b) The Company has no liability for any unpaid wages, overtime compensation, employee benefits, workers' compensation premiums, or payroll taxes (including FICA, FUTA, and state unemployment insurance) arising from the misclassification of any service provider.
(c) No audit, examination, inquiry, or proceeding is currently pending, or to Seller's Knowledge, threatened by the Department of Labor, the Internal Revenue Service, or any state taxing authority with respect to the Company's classification practices.`
}
