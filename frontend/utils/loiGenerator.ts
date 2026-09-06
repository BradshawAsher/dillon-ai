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
    draftTerms?: Partial<LoiDraftTerms>
}

export type LoiTransactionStructure = 'Asset Purchase' | 'Equity Purchase'

export interface LoiDraftTerms {
    buyerName: string
    buyerEntity: string
    sellerName: string
    authorTitle: string
    offerPrice: number | null
    transactionStructure: LoiTransactionStructure
    offerValidityDays: number
    expirationTime: string
    exclusivityDays: number
    generalEscrowPercent: number
    generalEscrowMonths: number
    nwcTrueUpDays: number
    transitionMonths: number
    transitionIncludedDays: number
    nonCompeteYears: number
    nonCompeteRadiusMiles: number
    governingLaw: string
}

export const DEFAULT_LOI_DRAFT_TERMS: LoiDraftTerms = {
    buyerName: 'Diligence Deal Team',
    buyerEntity: 'MergeWorks Acquisition Partners LLC',
    sellerName: 'The Shareholders / Owners of the Company',
    authorTitle: 'Managing Partner',
    offerPrice: null,
    transactionStructure: 'Asset Purchase',
    offerValidityDays: 14,
    expirationTime: '5:00 PM EST',
    exclusivityDays: 60,
    generalEscrowPercent: 10,
    generalEscrowMonths: 12,
    nwcTrueUpDays: 90,
    transitionMonths: 6,
    transitionIncludedDays: 60,
    nonCompeteYears: 5,
    nonCompeteRadiusMiles: 50,
    governingLaw: 'State of Delaware',
}

export interface LoiTerms {
    isPostLoiDeal: boolean
    askingPrice: number
    preliminaryLoiPrice: number
    offerPrice: number
    revenue: number | null
    ebitda: number | null
    multiple: number | null
    seniorDebt: number
    sellerNote: number
    equityCheck: number
    nwcTarget: number
    generalEscrow: number
    specialEscrow: number
    bridge: ValuationBridgeResult
    draftTerms: LoiDraftTerms
}

function formatMoney(val?: number | null): string {
    if (val == null || !Number.isFinite(val)) return '—'
    return val < 0 ? `-$${Math.abs(Math.round(val)).toLocaleString()}` : `$${Math.round(val).toLocaleString()}`
}

function firstPositive(...values: Array<number | null | undefined>): number {
    return values.find((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0) ?? 0
}

function nonNegativeOrFallback(value: number | null | undefined, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function boundedNumber(value: unknown, fallback: number, min: number, max: number): number {
    const number = Number(value)
    return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function cleanText(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

export function resolveLoiDraftTerms(params: LoiParams): LoiDraftTerms {
    const draft = params.draftTerms ?? {}
    const legacyExclusivity = params.exclusivityDays ?? DEFAULT_LOI_DRAFT_TERMS.exclusivityDays
    return {
        buyerName: cleanText(draft.buyerName ?? params.buyerName, DEFAULT_LOI_DRAFT_TERMS.buyerName),
        buyerEntity: cleanText(draft.buyerEntity ?? params.buyerEntity, DEFAULT_LOI_DRAFT_TERMS.buyerEntity),
        sellerName: cleanText(draft.sellerName ?? params.sellerName, DEFAULT_LOI_DRAFT_TERMS.sellerName),
        authorTitle: cleanText(draft.authorTitle ?? params.authorTitle, DEFAULT_LOI_DRAFT_TERMS.authorTitle),
        offerPrice: asPositiveOffer(draft.offerPrice),
        transactionStructure: draft.transactionStructure === 'Equity Purchase' ? 'Equity Purchase' : 'Asset Purchase',
        offerValidityDays: Math.round(boundedNumber(draft.offerValidityDays, DEFAULT_LOI_DRAFT_TERMS.offerValidityDays, 1, 120)),
        expirationTime: cleanText(draft.expirationTime, DEFAULT_LOI_DRAFT_TERMS.expirationTime),
        exclusivityDays: Math.round(boundedNumber(draft.exclusivityDays, legacyExclusivity, 1, 365)),
        generalEscrowPercent: boundedNumber(draft.generalEscrowPercent, DEFAULT_LOI_DRAFT_TERMS.generalEscrowPercent, 0, 100),
        generalEscrowMonths: Math.round(boundedNumber(draft.generalEscrowMonths, DEFAULT_LOI_DRAFT_TERMS.generalEscrowMonths, 0, 60)),
        nwcTrueUpDays: Math.round(boundedNumber(draft.nwcTrueUpDays, DEFAULT_LOI_DRAFT_TERMS.nwcTrueUpDays, 1, 365)),
        transitionMonths: Math.round(boundedNumber(draft.transitionMonths, DEFAULT_LOI_DRAFT_TERMS.transitionMonths, 0, 36)),
        transitionIncludedDays: Math.round(boundedNumber(draft.transitionIncludedDays, DEFAULT_LOI_DRAFT_TERMS.transitionIncludedDays, 0, 365)),
        nonCompeteYears: Math.round(boundedNumber(draft.nonCompeteYears, DEFAULT_LOI_DRAFT_TERMS.nonCompeteYears, 0, 10)),
        nonCompeteRadiusMiles: Math.round(boundedNumber(draft.nonCompeteRadiusMiles, DEFAULT_LOI_DRAFT_TERMS.nonCompeteRadiusMiles, 0, 500)),
        governingLaw: cleanText(draft.governingLaw, DEFAULT_LOI_DRAFT_TERMS.governingLaw),
    }
}

function asPositiveOffer(value: unknown): number | null {
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : null
}

export function deriveLoiTerms(params: LoiParams): LoiTerms {
    const { model, synthesis } = params
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const bridge = computeValuationBridge(model, synthesis)
    const draftTerms = resolveLoiDraftTerms(params)
    const askingPrice = firstPositive(model.askingPrice, model.purchasePrice)
    const preliminaryLoiPrice = firstPositive(model.purchasePrice, askingPrice)
    const offerPrice = firstPositive(draftTerms.offerPrice, bridge.defensibleCounterOffer, model.purchasePrice, askingPrice)
    const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const seniorDebt = nonNegativeOrFallback(model.seniorDebtAmount, Math.round(offerPrice * 0.60))
    const sellerNote = nonNegativeOrFallback(model.sellerNoteAmount, Math.round(offerPrice * 0.15))

    return {
        isPostLoiDeal: params.isPostLoi ?? Boolean(synthesis?.letterOfIntentPresent),
        askingPrice,
        preliminaryLoiPrice,
        offerPrice,
        revenue,
        ebitda,
        multiple: entryMultiple(offerPrice, ebitda),
        seniorDebt,
        sellerNote,
        equityCheck: Math.max(0, offerPrice - seniorDebt - sellerNote),
        nwcTarget: nonNegativeOrFallback(model.workingCapitalRequirement, 0),
        generalEscrow: Math.round(offerPrice * (draftTerms.generalEscrowPercent / 100)),
        specialEscrow: bridge.totalSpecialEscrow ?? 0,
        bridge,
        draftTerms,
    }
}

/**
 * Generates an institutional, legal-grade Letter of Intent (LOI) in Markdown.
 * Demarcates legally binding terms (Exclusivity, Confidentiality, Governing Law)
 * from non-binding commercial terms (Valuation, NWC Peg, Escrow, Financing).
 * Automatically formats as an Amended & Restated LOI when deal is post-LOI or
 * when preliminary LOI is being renegotiated post-diligence.
 */
export function generateLoiMarkdown(params: LoiParams): string {
    const { synthesis, projectName, projectId = 'PROJ-MAIN' } = params

    const terms = deriveLoiTerms(params)
    const {
        isPostLoiDeal,
        askingPrice,
        preliminaryLoiPrice,
        offerPrice,
        revenue: rev,
        ebitda,
        multiple,
        seniorDebt,
        sellerNote,
        equityCheck,
        nwcTarget,
        generalEscrow,
        specialEscrow,
        bridge,
        draftTerms,
    } = terms
    const {
        buyerName,
        buyerEntity,
        sellerName,
        authorTitle,
        transactionStructure,
        offerValidityDays,
        expirationTime,
        exclusivityDays,
        generalEscrowPercent,
        generalEscrowMonths,
        nwcTrueUpDays,
        transitionMonths,
        transitionIncludedDays,
        nonCompeteYears,
        nonCompeteRadiusMiles,
        governingLaw,
    } = draftTerms
    const sectorKey = detectSector((synthesis as any)?.industry || projectName)
    const sector = getSectorProfile(sectorKey)
    const sectorName = sector.shortCategory || sector.displayName || 'General Commercial'

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const expirationDate = new Date(Date.now() + offerValidityDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const lines: string[] = []

    lines.push(isPostLoiDeal
        ? `# AMENDED & RESTATED NON-BINDING LETTER OF INTENT (REVISED COUNTER-OFFER)`
        : `# NON-BINDING LETTER OF INTENT (LOI)`)
    lines.push(`**STRICTLY CONFIDENTIAL**`)
    lines.push('')
    lines.push(`**DATE**: ${dateStr}`)
    lines.push(`**OFFER EXPIRATION**: ${expirationDate} (${expirationTime})`)
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
    lines.push(`- **Transaction Structure**: ${transactionStructure} of ${transactionStructure === 'Asset Purchase' ? 'substantially all operating assets, customer relationships, contracts, intellectual property, and goodwill, free and clear of all liens and encumbrances. Buyer shall assume only designated operating liabilities' : 'all issued and outstanding equity interests of the Company, subject to mutually agreed debt, cash, working-capital, and liability adjustments'}.`)
    lines.push(`- **Enterprise Value / Purchase Price**: **${formatMoney(offerPrice)}** (${offerPrice > 0 && ebitda && multiple !== null ? `${multiple.toFixed(2)}x Adjusted EBITDA` : 'Cash-free, debt-free basis'}).`)
    if (isPostLoiDeal) {
        lines.push(`- **Preliminary LOI vs. Revised Counter-Offer Reconciliation**: Preliminary agreed LOI purchase price was ${formatMoney(preliminaryLoiPrice)}. Buyer's revised post-diligence counter-offer of ${formatMoney(offerPrice)} reflects empirical Quality of Earnings (QoE) add-back disallowances totaling ${formatMoney(bridge.totalDisallowedAddbacks)}, special indemnity holdbacks of ${formatMoney(specialEscrow)}, and industry margin parity adjustments.`)
    } else if (askingPrice > 0 && offerPrice !== askingPrice) {
        lines.push(`- **Asking Price Reconciliation**: Original broker asking price was ${formatMoney(askingPrice)}. Buyer's formal counter-offer of ${formatMoney(offerPrice)} reflects empirical forensic QoE add-back disallowances totaling ${formatMoney(bridge.totalDisallowedAddbacks)} and industry margin parity adjustments.`)
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
    lines.push(`- **Post-Closing True-Up Mechanism**: Net Working Capital shall be measured as Current Assets (excluding cash) minus Current Liabilities (excluding debt and income tax payables). At closing, an estimated NWC balance will be delivered. Within **${nwcTrueUpDays} days** post-closing, Buyer will deliver a final closing balance sheet with a dollar-for-dollar cash true-up adjustment.`)
    lines.push('')

    // SECTION 4: INDEMNITY ESCROW & SPECIAL HOLDBACKS
    lines.push(`## 4. Indemnification, Escrow & Specific Liabilities (Non-Binding)`)
    lines.push(`- **General Indemnity Escrow**: **${formatMoney(generalEscrow)}** (${generalEscrowPercent}% of purchase price) held in third-party escrow for **${generalEscrowMonths} months** post-closing to secure customary representations, warranties, and post-closing covenants.`)
    if (specialEscrow > 0) {
        lines.push(`- **Special Specific Indemnity Escrow**: **${formatMoney(specialEscrow)}** held in dedicated indemnity escrow for identified diligence liabilities (e.g. state sales tax nexus contingencies, environmental remediation, or key customer renewal obligations).`)
        lines.push(`  - *Escrow Release*: Released upon receipt of official state clearance certificate or milestone satisfaction.`)
    }
    lines.push(`- **Indemnification Basket & Cap**: Customary tipping basket equal to 0.50% of purchase price, with general representation survival capped at the general indemnity escrow amount (fundamental representations survive for the statutory period).`)
    lines.push('')

    // SECTION 5: MANAGEMENT TRANSITION & EMPLOYMENT
    lines.push(`## 5. Founder Transition & Key Personnel (Non-Binding)`)
    lines.push(`- **Seller Transition Consulting**: Existing leadership shall provide transitional consulting for a period of up to **${transitionMonths} months** post-closing (first ${transitionIncludedDays} days included; thereafter at agreed market consulting rate).`)
    lines.push(`- **Key Employee Retention**: Buyer intends to offer continued employment to all active operational personnel on substantially similar terms, preserving company culture and operating continuity.`)
    lines.push(`- **Non-Competition & Non-Solicitation**: Sellers and key executives shall execute customary **${nonCompeteYears}-year non-competition** and **non-solicitation** agreements within a ${nonCompeteRadiusMiles}-mile geographic radius covering all current product/service territories.`)
    lines.push('')

    // SECTION 6: CONDITIONS PRECEDENT & DEFINITIVE AGREEMENT
    lines.push(`## 6. Conditions Precedent to Closing (Non-Binding)`)
    lines.push(`Closing of the acquisition shall be subject to the following standard conditions:`)
    lines.push(`1. Execution of a mutually acceptable definitive ${transactionStructure === 'Asset Purchase' ? 'Asset Purchase Agreement ("APA")' : 'Stock Purchase Agreement ("SPA")'} containing customary representations, warranties, covenants, and indemnities.`)
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
    lines.push(`This LOI and all related disputes shall be governed by and construed in accordance with the laws of the ${governingLaw}, without regard to conflicts of law principles.`)
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

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
}

function renderInlineMarkdown(value: string): string {
    return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}

function renderMarkdownForPrint(markdown: string): string {
    const lines = markdown.split('\n')
    const html: string[] = []

    for (let index = 0; index < lines.length;) {
        const line = lines[index]
        if (!line.trim()) {
            index += 1
            continue
        }

        if (line.startsWith('|') && index + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[index + 1])) {
            const parseCells = (row: string) => row.slice(1, -1).split('|').map((cell) => cell.trim())
            const headers = parseCells(line)
            index += 2
            const rows: string[][] = []
            while (index < lines.length && lines[index].startsWith('|')) {
                rows.push(parseCells(lines[index]))
                index += 1
            }
            html.push('<table><thead><tr>')
            headers.forEach((header) => html.push(`<th>${renderInlineMarkdown(header)}</th>`))
            html.push('</tr></thead><tbody>')
            rows.forEach((row) => {
                html.push('<tr>')
                row.forEach((cell) => html.push(`<td>${renderInlineMarkdown(cell)}</td>`))
                html.push('</tr>')
            })
            html.push('</tbody></table>')
            continue
        }

        if (line.startsWith('- ')) {
            html.push('<ul>')
            while (index < lines.length && lines[index].startsWith('- ')) {
                html.push(`<li>${renderInlineMarkdown(lines[index].slice(2))}</li>`)
                index += 1
            }
            html.push('</ul>')
            continue
        }

        if (/^\d+\. /.test(line)) {
            html.push('<ol>')
            while (index < lines.length && /^\d+\. /.test(lines[index])) {
                html.push(`<li>${renderInlineMarkdown(lines[index].replace(/^\d+\. /, ''))}</li>`)
                index += 1
            }
            html.push('</ol>')
            continue
        }

        if (line === '---') html.push('<hr>')
        else if (line.startsWith('### ')) html.push(`<h3>${renderInlineMarkdown(line.slice(4))}</h3>`)
        else if (line.startsWith('## ')) html.push(`<h2>${renderInlineMarkdown(line.slice(3))}</h2>`)
        else if (line.startsWith('# ')) html.push(`<h1>${renderInlineMarkdown(line.slice(2))}</h1>`)
        else html.push(`<p>${renderInlineMarkdown(line)}</p>`)
        index += 1
    }

    return html.join('\n')
}

/** Builds a safe, print-ready representation of the exact generated LOI. */
export function generateLoiHtml(params: LoiParams): string {
    const documentHtml = renderMarkdownForPrint(generateLoiMarkdown(params))
    const title = escapeHtml(params.projectName || 'Target Company')

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Letter of Intent - ${title}</title>
    <style>
        @page { size: letter; margin: 0.6in; }
        body { margin: 0; color: #0f172a; background: #fff; font: 10.5pt/1.5 Georgia, "Times New Roman", serif; }
        .document { max-width: 8in; margin: 0 auto; }
        h1 { margin: 0 0 8px; text-align: center; font: 700 16pt/1.25 Arial, sans-serif; letter-spacing: 0.02em; }
        h2 { margin: 18px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #94a3b8; font: 700 11.5pt/1.3 Arial, sans-serif; }
        h3 { margin: 12px 0 4px; font: 700 10.5pt/1.3 Arial, sans-serif; }
        p { margin: 5px 0; overflow-wrap: anywhere; }
        ul, ol { margin: 5px 0 8px; padding-left: 24px; }
        li { margin: 3px 0; }
        hr { margin: 14px 0; border: 0; border-top: 1px solid #cbd5e1; }
        table { width: 100%; margin: 8px 0 14px; border-collapse: collapse; font-size: 8.8pt; }
        th, td { padding: 5px 6px; border: 1px solid #cbd5e1; vertical-align: top; text-align: left; }
        th { background: #f1f5f9; font-family: Arial, sans-serif; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
    </style>
</head>
<body><main class="document">${documentHtml}</main></body>
</html>`
}
