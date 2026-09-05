import { describe, expect, it } from 'vitest'
import { deriveLoiTerms, generateLoiHtml, generateLoiMarkdown, type LoiParams } from './loiGenerator'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'

describe('LOI Generator (generateLoiMarkdown)', () => {
    const mockModel = {
        askingPrice: 6_800_000,
        purchasePrice: 6_000_000,
        workingCapitalRequirement: 415_000,
        seniorDebtAmount: 3_600_000,
        sellerNoteAmount: 900_000,
        equityAmount: 1_500_000,
        interestRate: 10.5,
        amortizationYears: 10,
        documentedFactsJson: JSON.stringify({
            revenue: { value: 9_200_000, unit: 'USD' },
            ebitda_sde: { value: 1_380_000, unit: 'USD' },
        }),
    } as unknown as DealModel

    const mockSynthesis = {
        projectId: 'project-atlantic-beverage',
        projectName: 'Atlantic Beverage Distribution',
        finalRecommendation: 'Proceed with Renegotiation',
        finalTrafficLight: 'yellow',
        finalJudgmentSummary: 'Strong market position but requires $400k add-back disallowance and $225k escrow for sales tax nexus.',
        redFlags: [
            'Discovered $400k unverified add-backs',
            'Unfiled multi-state sales tax nexus exposure of $225k',
        ],
    } as unknown as ProjectSynthesisItem

    it('generates a complete, institutional LOI with all core sections', () => {
        const markdown = generateLoiMarkdown({
            model: mockModel,
            synthesis: mockSynthesis,
            projectName: 'Atlantic Beverage Distribution',
            projectId: 'project-atlantic-beverage',
            buyerName: 'Bradshaw Asher',
            buyerEntity: 'MergeWorks Capital Partners',
            authorTitle: 'Managing Partner',
            exclusivityDays: 60,
        })

        // Header & Demarcation
        expect(markdown).toContain('NON-BINDING LETTER OF INTENT (LOI)')
        expect(markdown).toContain('Atlantic Beverage Distribution')
        expect(markdown).toContain('MergeWorks Capital Partners')
        expect(markdown).toContain('OFFER EXPIRATION')

        // Section 1: Purchase Price & Asset Purchase
        expect(markdown).toContain('1. Transaction Structure & Purchase Price (Non-Binding)')
        expect(markdown).toContain('Asset Purchase')
        expect(markdown).toContain('Cash-Free, Debt-Free')

        // Section 2: Capital Stack
        expect(markdown).toContain('2. Proposed Sources & Uses of Funds (Non-Binding)')
        expect(markdown).toContain('Senior Secured Debt (SBA 7(a) / Bank)')
        expect(markdown).toContain('Seller Subordinated Promissory Note')
        expect(markdown).toContain('Buyer Cash Equity Check')

        // Section 3: Working Capital Peg
        expect(markdown).toContain('3. Working Capital Target Peg (Non-Binding)')
        expect(markdown).toContain('$415,000')
        expect(markdown).toContain('90 days')

        // Section 4: Indemnity & Special Escrow
        expect(markdown).toContain('4. Indemnification, Escrow & Specific Liabilities (Non-Binding)')
        expect(markdown).toContain('General Indemnity Escrow')

        // Section 5: Transition & Non-Compete
        expect(markdown).toContain('5. Founder Transition & Key Personnel (Non-Binding)')
        expect(markdown).toContain('5-year non-competition')

        // Section 7: Legally Binding Provisions
        expect(markdown).toContain('7. Legally Binding Provisions (Binding Upon Execution)')
        expect(markdown).toContain('7.1 Exclusivity ("No-Shop")')
        expect(markdown).toContain('60 days')
        expect(markdown).toContain('7.2 Confidentiality')
        expect(markdown).toContain('7.3 Access & Information')
        expect(markdown).toContain('7.4 Transaction Expenses')
        expect(markdown).toContain('7.5 Governing Law & Jurisdiction')
        expect(markdown).toContain('State of Delaware')

        // Signature Blocks
        expect(markdown).toContain('FOR BUYER')
        expect(markdown).toContain('FOR SELLER')
        expect(markdown).toContain('Bradshaw Asher')
    })

    it('gracefully handles missing model inputs with sensible fallbacks', () => {
        const emptyModel = {} as unknown as DealModel
        const markdown = generateLoiMarkdown({
            model: emptyModel,
            projectName: 'Generic Target Co',
        })

        expect(markdown).toContain('Generic Target Co')
        expect(markdown).toContain('MergeWorks Acquisition Partners LLC')
        expect(markdown).toContain('Asset Purchase')
        expect(markdown).toContain('Exclusivity ("No-Shop")')
    })

    it('generates Amended & Restated LOI when deal is post-LOI (re-trade counter-proposal)', () => {
        const postLoiSynthesis = {
            ...mockSynthesis,
            letterOfIntentPresent: true,
        } as unknown as ProjectSynthesisItem

        const markdown = generateLoiMarkdown({
            model: mockModel,
            synthesis: postLoiSynthesis,
            projectName: 'Atlantic Beverage Distribution',
        })

        expect(markdown).toContain('AMENDED & RESTATED NON-BINDING LETTER OF INTENT (REVISED COUNTER-OFFER)')
        expect(markdown).toContain('amends, restates, and supersedes in its entirety')
        expect(markdown).toContain('Preliminary agreed LOI purchase price was $6,000,000')
        expect(markdown).toContain('Preliminary LOI vs. Revised Counter-Offer Reconciliation')
    })

    it('generates initial LOI when deal is pre-LOI', () => {
        const preLoiSynthesis = {
            ...mockSynthesis,
            letterOfIntentPresent: false,
        } as unknown as ProjectSynthesisItem

        const markdown = generateLoiMarkdown({
            model: mockModel,
            synthesis: preLoiSynthesis,
            projectName: 'Atlantic Beverage Distribution',
        })

        expect(markdown).toContain('NON-BINDING LETTER OF INTENT (LOI)')
        expect(markdown).not.toContain('AMENDED & RESTATED')
        expect(markdown).toContain('pleased to submit this Letter of Intent')
        expect(markdown).toContain('Asking Price Reconciliation')
    })

    it('uses the asking price when a zero purchase price represents an unset value', () => {
        const model = {
            ...mockModel,
            askingPrice: 6_800_000,
            purchasePrice: 0,
            sellerNoteAmount: 0,
        } as unknown as DealModel
        const terms = deriveLoiTerms({ model, projectName: 'Fallback Price Deal' })
        const markdown = generateLoiMarkdown({ model, projectName: 'Fallback Price Deal' })

        expect(terms.offerPrice).toBeGreaterThan(0)
        expect(terms.sellerNote).toBe(0)
        expect(markdown).toContain('Enterprise Value / Purchase Price**: **$6,800,000**')
    })

    it('generates safe printable LOI HTML instead of an IC memo document', () => {
        const html = generateLoiHtml({
            model: mockModel,
            projectName: '<script>window.opener.stolen=true</script>',
        })

        expect(html).toContain('<title>Letter of Intent - ')
        expect(html).toContain('NON-BINDING LETTER OF INTENT')
        expect(html).toContain('<table>')
        expect(html).toContain('<strong>STRICTLY CONFIDENTIAL</strong>')
        expect(html).not.toContain('# NON-BINDING')
        expect(html).not.toContain('Investment Committee Memo')
        expect(html).not.toContain('<script>window.opener.stolen=true</script>')
        expect(html).toContain('&lt;script&gt;window.opener.stolen=true&lt;/script&gt;')
    })

    it('applies one edited terms object to commercial and binding LOI language', () => {
        const params: LoiParams = {
            model: mockModel,
            synthesis: mockSynthesis,
            projectName: 'Atlantic Beverage Distribution',
            draftTerms: {
                buyerName: 'Avery Buyer',
                buyerEntity: 'Avery Capital LLC',
                sellerName: 'Atlantic Holdings Inc.',
                authorTitle: 'Principal',
                offerPrice: 5_750_000,
                transactionStructure: 'Equity Purchase',
                offerValidityDays: 21,
                expirationTime: '3:00 PM PT',
                exclusivityDays: 45,
                generalEscrowPercent: 7.5,
                generalEscrowMonths: 18,
                nwcTrueUpDays: 75,
                transitionMonths: 9,
                transitionIncludedDays: 30,
                nonCompeteYears: 3,
                nonCompeteRadiusMiles: 25,
                governingLaw: 'State of Washington',
            },
        }
        const terms = deriveLoiTerms(params)
        const markdown = generateLoiMarkdown(params)
        const html = generateLoiHtml(params)

        expect(terms.offerPrice).toBe(5_750_000)
        expect(terms.generalEscrow).toBe(431_250)
        expect(markdown).toContain('**Transaction Structure**: Equity Purchase')
        expect(markdown).toContain('Stock Purchase Agreement ("SPA")')
        expect(markdown).toContain('**45 days**')
        expect(markdown).toContain('(7.5% of purchase price)')
        expect(markdown).toContain('**18 months**')
        expect(markdown).toContain('**75 days**')
        expect(markdown).toContain('up to **9 months**')
        expect(markdown).toContain('**3-year non-competition**')
        expect(markdown).toContain('25-mile geographic radius')
        expect(markdown).toContain('laws of the State of Washington')
        expect(markdown).toContain('Name: Avery Buyer')
        expect(html).toContain('Avery Capital LLC')
    })
})
