import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from './evidence'
import { entryMultiple } from './dealMath'
import {
    computeValuationBridge,
    type ValuationBridgeResult,
} from './valuationBridge'
import { detectSector, getSectorProfile } from './verticalBenchmarks'

export interface LoiParams {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
    projectId?: string
    buyerName?: string
    buyerEntity?: string
    sellerName?: string
    authorTitle?: string
    exclusivityDays?: number
    isPostLoi?: boolean
}

function formatMoney(val?: number | null): string {
    if (val == null || !Number.isFinite(val)) return '—'
    return val < 0 ? `-$${Math.abs(Math.round(val)).toLocaleString()}` : `$${Math.round(val).toLocaleString()}`
}

/**
 * Generates an institutional, legal-grade Letter of Intent (LOI) in Markdown.
 * Demarcates legally binding terms (Exclusivity, Confidentiality, Governing Law)
 * from non-binding commercial terms (Valuation, NWC Peg, Escrow, Financing).
 * Automatically formats as an Amended & Restated LOI when deal is post-LOI or
 * when preliminary LOI is being renegotiated post-diligence.
 */
export function generateLoiMarkdown(params: LoiParams): string {
    const {
        model,
        synthesis,
        projectName,
        projectId = 'PROJ-MAIN',
        buyerName = 'Diligence Deal Team',
        buyerEntity = 'MergeWorks Acquisition Partners LLC',
        sellerName = 'The Shareholders / Owners of the Company',
        authorTitle = 'Managing Partner',
        exclusivityDays = 60,
    } = params

    const isPostLoiDeal = params.isPostLoi ?? Boolean(synthesis?.letterOfIntentPresent)
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const bridge: ValuationBridgeResult = computeValuationBridge(model, synthesis)
    const sectorKey = detectSector((synthesis as any)?.industry || projectName)
    const sector = getSectorProfile(sectorKey)
    const sectorName = sector.shortCategory || sector.displayName || 'General Commercial'

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const expirationDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const askingPrice = model.askingPrice ?? model.purchasePrice ?? 0
    const offerPrice = bridge.defensibleCounterOffer > 0 ? bridge.defensibleCounterOffer : (model.purchasePrice ?? askingPrice)
    const rev = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const multiple = entryMultiple(offerPrice, ebitda)

    // Capital stack components
    const seniorDebt = model.seniorDebtAmount ?? Math.round(offerPrice * 0.60)
    const sellerNote = model.sellerNoteAmount ?? Math.round(offerPrice * 0.15)
    const equityCheck = Math.max(0, offerPrice - seniorDebt - sellerNote)
    const nwcTarget = model.workingCapitalRequirement ?? Math.round((rev || 2_000_000) * 0.10)
    const generalEscrow = Math.round(offerPrice * 0.10)
    const specialEscrow = bridge.totalSpecialEscrow ?? 0

    const lines: string[] = []

    lines.push(isPostLoiDeal
        ? `# AMENDED & RESTATED NON-BINDING LETTER OF INTENT (REVISED COUNTER-OFFER)`
        : `# NON-BINDING LETTER OF INTENT (LOI)`)
    lines.push(`**STRICTLY CONFIDENTIAL**`)
    lines.push('')
    lines.push(`**DATE**: ${dateStr}`)
    lines.push(`**OFFER EXPIRATION**: ${expirationDate} (5:00 PM EST)`)
    lines.push(`**TARGET COMPANY**: ${projectName} (Project Reference: ${projectId})`)
    lines.push(`**ACQUIRING ENTITY**: ${buyerEntity} ("Buyer")`)
    lines.push(`**SELLER(S)**: ${sellerName} ("Seller")`)
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(`Dear Ownership and Management of ${projectName},`)
    lines.push('')
    if (isPostLoiDeal) {
        lines.push(`${buyerEntity} submits this Amended and Restated Letter of Intent ("Revised LOI"), which amends, restates, and supersedes in its entirety that certain preliminary Letter of Intent previously executed between Buyer and Seller with respect to the proposed acquisition of **${projectName}** ("Company").`)
        lines.push('')
        lines.push(`Following our confirmatory Quality of Earnings (QoE), operational, and legal due diligence review across ${sectorName} industry benchmarks, we have structured this formal counter-offer to reflect empirical valuation bridge findings, specific indemnity holdbacks, and mutually protective closing conditions.`)
    } else {
        lines.push(`${buyerEntity} is pleased to submit this Letter of Intent ("LOI") regarding the proposed acquisition of substantially all of the assets and business operations of **${projectName}** ("Company").`)
        lines.push('')
        lines.push(`Based upon our preliminary diligence review, forensic financial analysis across ${sectorName} industry benchmarks, and operational evaluation, we have structured an institutional offer designed to deliver compelling valuation certainty, seamless founder transition, and tax-efficient closing structure.`)
    }
    lines.push('')
    lines.push('---')
    lines.push('')

    // SECTION 1: TRANSACTION STRUCTURE & PURCHASE PRICE
    lines.push(`## 1. Transaction Structure & Purchase Price (Non-Binding)`)
    lines.push(`- **Transaction Structure**: Asset Purchase of substantially all operating assets, customer relationships, contracts, intellectual property, and goodwill, free and clear of all liens and encumbrances. Buyer shall assume only designated operating liabilities.`)
    lines.push(`- **Enterprise Value / Purchase Price**: **${formatMoney(offerPrice)}** (${offerPrice > 0 && ebitda && multiple !== null ? `${multiple.toFixed(2)}x Adjusted EBITDA` : 'Cash-free, debt-free basis'}).`)
    if (askingPrice > 0 && offerPrice !== askingPrice) {
        if (isPostLoiDeal) {
            lines.push(`- **Preliminary LOI vs. Revised Counter-Offer Reconciliation**: Preliminary agreed LOI purchase price was ${formatMoney(askingPrice)}. Buyer's revised post-diligence counter-offer of ${formatMoney(offerPrice)} reflects empirical Quality of Earnings (QoE) add-back disallowances totaling ${formatMoney(bridge.totalDisallowedAddbacks)}, special indemnity holdbacks of ${formatMoney(specialEscrow)}, and industry margin parity adjustments.`)
        } else {
            lines.push(`- **Asking Price Reconciliation**: Original broker asking price was ${formatMoney(askingPrice)}. Buyer's formal counter-offer of ${formatMoney(offerPrice)} reflects empirical forensic QoE add-back disallowances totaling ${formatMoney(bridge.totalDisallowedAddbacks)} and industry margin parity adjustments.`)
        }
    }
    lines.push(`- **Cash-Free, Debt-Free**: The transaction is structured on a cash-free, debt-free basis. All existing funded indebtedness, shareholder loans, and transaction expenses shall be extinguished by Seller at closing.`)
    lines.push('')

    // SECTION 2: PROPOSED FINANCING & CAPITAL STACK
    lines.push(`## 2. Proposed Sources & Uses of Funds (Non-Binding)`)
    lines.push(`Buyer anticipates funding the ${formatMoney(offerPrice)} purchase price through the following institutional capital stack:`)
    lines.push('')
    lines.push(`| Financing Component | Amount ($) | % of Total | Terms & Structure |`)
    lines.push(`| :--- | :--- | :--- | :--- |`)
    lines.push(`| **Senior Secured Debt (SBA 7(a) / Bank)** | ${formatMoney(seniorDebt)} | ${Math.round((seniorDebt / (offerPrice || 1)) * 100)}% | 10-year fully amortizing term loan; customary lender covenants |`)
    lines.push(`| **Seller Subordinated Promissory Note** | ${formatMoney(sellerNote)} | ${Math.round((sellerNote / (offerPrice || 1)) * 100)}% | 5-year term, 6.0%–8.0% interest; on standby or amortizing pursuant to senior debt requirements |`)
    lines.push(`| **Buyer Cash Equity Check** | ${formatMoney(equityCheck)} | ${Math.round((equityCheck / (offerPrice || 1)) * 100)}% | 100% committed sponsor equity from ${buyerEntity} |`)
    lines.push(`| **Total Consideration** | **${formatMoney(offerPrice)}** | **100%** | **Fully Funded Capital Stack** |`)
    lines.push('')

    // SECTION 3: WORKING CAPITAL TARGET & ADJUSTMENT MECHANISM
    lines.push(`## 3. Working Capital Target Peg (Non-Binding)`)
    lines.push(`- **Target Net Working Capital (NWC Peg)**: **${formatMoney(nwcTarget)}** (subject to mutual review of 12-month trailing monthly balance sheet averages).`)
    lines.push(`- **Post-Closing True-Up Mechanism**: Net Working Capital shall be measured as Current Assets (excluding cash) minus Current Liabilities (excluding debt and income tax payables). At closing, an estimated NWC balance will be delivered. Within **90 days** post-closing, Buyer will deliver a final closing balance sheet with a dollar-for-dollar cash true-up adjustment.`)
    lines.push('')

    // SECTION 4: INDEMNITY ESCROW & SPECIAL HOLDBACKS
    lines.push(`## 4. Indemnification, Escrow & Specific Liabilities (Non-Binding)`)
    lines.push(`- **General Indemnity Escrow**: **${formatMoney(generalEscrow)}** (10% of purchase price) held in third-party escrow for **12 months** post-closing to secure customary representations, warranties, and post-closing covenants.`)
    if (specialEscrow > 0) {
        lines.push(`- **Special Specific Indemnity Escrow**: **${formatMoney(specialEscrow)}** held in dedicated indemnity escrow for identified diligence liabilities (e.g. state sales tax nexus contingencies, environmental remediation, or key customer renewal obligations).`)
        lines.push(`  - *Escrow Release*: Released upon receipt of official state clearance certificate or milestone satisfaction.`)
    }
    lines.push(`- **Indemnification Basket & Cap**: Customary tipping basket equal to 0.50% of purchase price, with general representation survival capped at the general indemnity escrow amount (fundamental representations survive for the statutory period).`)
    lines.push('')

    // SECTION 5: MANAGEMENT TRANSITION & EMPLOYMENT
    lines.push(`## 5. Founder Transition & Key Personnel (Non-Binding)`)
    lines.push(`- **Seller Transition Consulting**: Existing leadership shall provide transitional consulting for a period of **3 to 6 months** post-closing (first 60 days included; thereafter at agreed market consulting rate).`)
    lines.push(`- **Key Employee Retention**: Buyer intends to offer continued employment to all active operational personnel on substantially similar terms, preserving company culture and operating continuity.`)
    lines.push(`- **Non-Competition & Non-Solicitation**: Sellers and key executives shall execute customary **5-year non-competition** and **non-solicitation** agreements within a 50-mile geographic radius covering all current product/service territories.`)
    lines.push('')

    // SECTION 6: CONDITIONS PRECEDENT & DEFINITIVE AGREEMENT
    lines.push(`## 6. Conditions Precedent to Closing (Non-Binding)`)
    lines.push(`Closing of the acquisition shall be subject to the following standard conditions:`)
    lines.push(`1. Execution of a mutually acceptable definitive Asset Purchase Agreement ("APA") containing customary representations, warranties, covenants, and indemnities.`)
    lines.push(`2. Satisfactory completion of confirmatory financial, tax, Quality of Earnings (QoE), legal, environmental, and insurance due diligence.`)
    lines.push(`3. Receipt of formal senior debt financing commitment on terms acceptable to Buyer.`)
    lines.push(`4. Receipt of all necessary landlord consents, key customer contract assignments, and governmental permits.`)
    lines.push(`5. Absence of any Material Adverse Change ("MAC") in the business, financial condition, or prospects of the Company prior to closing.`)
    lines.push('')

    // SECTION 7: LEGALLY BINDING TERMS
    lines.push(`## 7. Legally Binding Provisions (Binding Upon Execution)`)
    lines.push(`Notwithstanding the non-binding nature of Sections 1 through 6, upon execution by both Buyer and Seller, the following provisions shall constitute legally binding and enforceable obligations:`)
    lines.push('')
    lines.push(`### 7.1 Exclusivity ("No-Shop")`)
    lines.push(`In consideration of the significant time, legal expense, and accounting costs to be incurred by Buyer in conducting due diligence, Seller agrees that for a period of **${exclusivityDays} days** following the date of execution of this LOI ("Exclusivity Period"):`)
    lines.push(`- Seller, the Company, and their respective shareholders, directors, officers, agents, and brokers shall NOT solicit, initiate, encourage, participate in discussions, or enter into any agreement regarding any sale of assets, equity, merger, recapitalization, or other extraordinary corporate transaction.`)
    lines.push(`- Seller shall immediately terminate any active discussions or data room access with other prospective purchasers.`)
    lines.push('')
    lines.push(`### 7.2 Confidentiality`)
    lines.push(`The terms of this LOI, the existence of discussions between the parties, and all non-public diligence information exchanged shall remain strictly confidential, subject to the non-disclosure agreement ("NDA") previously executed by the parties.`)
    lines.push('')
    lines.push(`### 7.3 Access & Information`)
    lines.push(`During the Exclusivity Period, Seller shall grant Buyer, its lenders, forensic accountants, and legal counsel full and prompt access to the Company's books, records, contracts, management personnel, facilities, and financial advisors during regular business hours.`)
    lines.push('')
    lines.push(`### 7.4 Transaction Expenses`)
    lines.push(`Each party shall bear its own legal, accounting, tax advisory, and transaction fees and expenses incurred in connection with the negotiation, diligence, and closing of the proposed transaction.`)
    lines.push('')
    lines.push(`### 7.5 Governing Law & Jurisdiction`)
    lines.push(`This LOI and all related disputes shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflicts of law principles.`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // SIGNATURE BLOCKS
    lines.push(`## 8. Acceptance & Execution`)
    lines.push(`If the terms outlined above are acceptable, please countersign and return a copy of this Letter of Intent on or before **${expirationDate}**, at which time this offer shall expire if unexecuted.`)
    lines.push('')
    lines.push(`**ACCEPTED AND AGREED:**`)
    lines.push('')
    lines.push(`| **FOR BUYER**: | **FOR SELLER**: |`)
    lines.push(`| :--- | :--- |`)
    lines.push(`| **${buyerEntity}** | **${projectName}** |`)
    lines.push(`| By: ________________________________ | By: ________________________________ |`)
    lines.push(`| Name: ${buyerName} | Name: ________________________________ |`)
    lines.push(`| Title: ${authorTitle} | Title: ________________________________ |`)
    lines.push(`| Date: ______________________________ | Date: ______________________________ |`)
    lines.push('')
    lines.push('---')
    lines.push(`*Generated by Dillon AI M&A Diligence Engine — MergeWorks Institutional Advisory*`)

    return lines.join('\n')
}
