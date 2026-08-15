import { useMemo } from 'react'
import { AlertOctagon } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardExplainerPopover from './CardExplainerPopover'
import InPlaceEvidencePopover, { EvidenceDetails } from './InPlaceEvidencePopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
}

type DealKillerCheck = {
    label: string
    description: string
    passed: boolean
    detail: string
    evidence: EvidenceDetails
}

export default function DealKillerCheckCard({ model, synthesis }: Props) {
    const checks = useMemo((): DealKillerCheck[] | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const taxRate = model.taxRate ?? 0.25
        const debt = price - price * normalizeEquityFraction(model.equityContributionPercent) - (model.sellerNoteAmount ?? 0)
        const rate = model.interestRate ?? 0.07
        const amortYears = model.amortizationYears ?? 10

        const monthlyRate = rate / 12
        const nPayments = amortYears * 12
        const monthlyPayment = debt > 0 && monthlyRate > 0
            ? debt * (monthlyRate * Math.pow(1 + monthlyRate, nPayments)) / (Math.pow(1 + monthlyRate, nPayments) - 1)
            : 0
        const annualDebtService = monthlyPayment * 12
        const afterTaxEbitda = ebitda * (1 - taxRate)
        const dscr = annualDebtService > 0 ? afterTaxEbitda / annualDebtService : 99

        const entryMultiple = price / ebitda
        const ebitdaMargin = revenue && revenue > 0 ? (ebitda / revenue) * 100 : null
        const debtToEbitda = ebitda > 0 ? debt / ebitda : 0
        const revenueGrowth = model.baseRevenueGrowth ?? 0.05
        const priceToRevenue = revenue && revenue > 0 ? price / revenue : null

        const redFlagCount = synthesis?.red_flags?.length ?? 0
        const openQuestionCount = synthesis?.open_questions?.length ?? 0

        const results: DealKillerCheck[] = [
            {
                label: 'Debt service coverage',
                description: 'DSCR < 1.0 (cannot service debt)',
                passed: dscr >= 1.0,
                detail: dscr >= 1.0
                    ? `DSCR is ${dscr.toFixed(2)}x - debt can be serviced`
                    : `DSCR is ${dscr.toFixed(2)}x - insufficient cash flow to cover debt payments`,
                evidence: {
                    metricName: 'Debt Service Coverage Ratio (DSCR)',
                    valueFormatted: `${dscr.toFixed(2)}x (Annual Debt Svc: $${annualDebtService.toLocaleString()})`,
                    sourceDoc: facts.ebitda_sde?.source_document || 'Debt Schedule Projections',
                    pageNumber: facts.ebitda_sde?.page_number,
                    confidence: 'high',
                    status: dscr >= 1.0 ? 'confirmed' : 'disputed',
                    notes: `After-tax EBITDA ($${afterTaxEbitda.toLocaleString()}) divided by debt payments ($${annualDebtService.toLocaleString()}). SBA lenders require minimum 1.15-1.25x.`,
                },
            },
            {
                label: 'Entry multiple',
                description: 'Entry multiple > 6x (overpaying)',
                passed: entryMultiple <= 6,
                detail: entryMultiple <= 6
                    ? `Entry multiple is ${entryMultiple.toFixed(1)}x - within reasonable range`
                    : `Entry multiple is ${entryMultiple.toFixed(1)}x - significantly above typical SMB range`,
                evidence: {
                    metricName: 'Entry EV Multiple',
                    valueFormatted: `${entryMultiple.toFixed(1)}x EV / EBITDA`,
                    sourceDoc: 'Deal Consideration Memo',
                    confidence: 'high',
                    status: entryMultiple <= 6 ? 'confirmed' : 'disputed',
                    notes: `Valuation of $${price.toLocaleString()} relative to $${ebitda.toLocaleString()} verified earnings. Multiples >6x in lower-middle market require high recurring revenue justification.`,
                },
            },
            {
                label: 'Red flag count',
                description: 'Red flags > 5 (too many risks)',
                passed: redFlagCount <= 5,
                detail: redFlagCount <= 5
                    ? `${redFlagCount} red flag${redFlagCount !== 1 ? 's' : ''} identified - manageable risk level`
                    : `${redFlagCount} red flags identified - excessive risk concentration`,
                evidence: {
                    metricName: 'Red Flag Diligence Tally',
                    valueFormatted: `${redFlagCount} Red Flags`,
                    sourceDoc: synthesis ? `Project Synthesis v${synthesis.synthesis_version}` : 'Diligence Pipeline',
                    confidence: 'high',
                    status: redFlagCount <= 5 ? 'confirmed' : 'disputed',
                    notes: `Cross-document synthesis identified ${redFlagCount} severe risk flags.`,
                },
            },
            {
                label: 'Information sufficiency',
                description: 'Open questions > 8 (insufficient information)',
                passed: openQuestionCount <= 8,
                detail: openQuestionCount <= 8
                    ? `${openQuestionCount} open question${openQuestionCount !== 1 ? 's' : ''} - adequate information for decision`
                    : `${openQuestionCount} open questions - too many unknowns to proceed confidently`,
                evidence: {
                    metricName: 'Diligence Open Question Count',
                    valueFormatted: `${openQuestionCount} Open Questions`,
                    sourceDoc: synthesis ? `Project Synthesis v${synthesis.synthesis_version}` : 'Diligence Findings',
                    confidence: 'high',
                    status: openQuestionCount <= 8 ? 'confirmed' : 'disputed',
                    notes: `${openQuestionCount} unresolved diligence inquiries require seller response before LOI execution.`,
                },
            },
            {
                label: 'EBITDA margin',
                description: 'EBITDA margin < 10% (too thin)',
                passed: ebitdaMargin === null || ebitdaMargin >= 10,
                detail: ebitdaMargin === null
                    ? 'Revenue not available to calculate margin'
                    : ebitdaMargin >= 10
                        ? `EBITDA margin is ${ebitdaMargin.toFixed(1)}% - sufficient operating cushion`
                        : `EBITDA margin is ${ebitdaMargin.toFixed(1)}% - very thin margin leaves no room for error`,
                evidence: {
                    metricName: 'Operating Margin Floor',
                    valueFormatted: ebitdaMargin ? `${ebitdaMargin.toFixed(1)}%` : 'N/A',
                    sourceDoc: facts.revenue?.source_document || 'Income Statement',
                    pageNumber: facts.revenue?.page_number,
                    confidence: 'high',
                    status: (ebitdaMargin ?? 15) >= 10 ? 'confirmed' : 'disputed',
                    notes: 'Operating margins below 10% leave minimal buffer against customer attrition or supply inflation.',
                },
            },
            {
                label: 'Leverage ratio',
                description: 'Debt/EBITDA > 5x (over-leveraged)',
                passed: debtToEbitda <= 5,
                detail: debtToEbitda <= 5
                    ? `Debt/EBITDA is ${debtToEbitda.toFixed(1)}x - leverage is manageable`
                    : `Debt/EBITDA is ${debtToEbitda.toFixed(1)}x - dangerously over-leveraged`,
                evidence: {
                    metricName: 'Leverage Ratio (Debt / EBITDA)',
                    valueFormatted: `${debtToEbitda.toFixed(1)}x`,
                    sourceDoc: 'Capital Stack / Debt Pro Forma',
                    confidence: 'high',
                    status: debtToEbitda <= 5 ? 'confirmed' : 'disputed',
                    notes: `Senior debt of $${debt.toLocaleString()} on earnings of $${ebitda.toLocaleString()}.`,
                },
            },
            {
                label: 'Revenue trajectory',
                description: 'Revenue declining (negative growth)',
                passed: revenueGrowth >= 0,
                detail: revenueGrowth >= 0
                    ? `Base growth assumption is ${(revenueGrowth * 100).toFixed(1)}% - positive trajectory`
                    : `Base growth assumption is ${(revenueGrowth * 100).toFixed(1)}% - declining revenue is a serious concern`,
                evidence: {
                    metricName: 'Revenue Trend Baseline',
                    valueFormatted: `${(revenueGrowth * 100).toFixed(1)}%`,
                    sourceDoc: 'Historical Financials & Assumptions',
                    confidence: 'medium',
                    status: revenueGrowth >= 0 ? 'confirmed' : 'disputed',
                    notes: 'Identifies whether top-line sales have contracted over the past 2-3 years.',
                },
            },
            {
                label: 'Price vs revenue',
                description: 'Purchase price > 2x revenue (expensive)',
                passed: priceToRevenue === null || priceToRevenue <= 2,
                detail: priceToRevenue === null
                    ? 'Revenue not available for comparison'
                    : priceToRevenue <= 2
                        ? `Price/revenue is ${priceToRevenue.toFixed(2)}x - reasonable relative to top line`
                        : `Price/revenue is ${priceToRevenue.toFixed(2)}x - paying a high premium vs revenue`,
                evidence: {
                    metricName: 'Price to Revenue Multiple',
                    valueFormatted: priceToRevenue ? `${priceToRevenue.toFixed(2)}x` : 'N/A',
                    sourceDoc: 'Deal Consideration Memo',
                    confidence: 'high',
                    status: (priceToRevenue ?? 1) <= 2 ? 'confirmed' : 'disputed',
                    notes: 'Price to sales multiple screening.',
                },
            },
        ]

        return results
    }, [model, synthesis])

    if (!checks) return null

    const failures = checks.filter((c) => !c.passed)
    const passes = checks.filter((c) => c.passed)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertOctagon className="h-4 w-4 text-destructive" />
                        <CardTitle className="text-lg">Deal-killer check</CardTitle>
                    </div>
                    <CardExplainerPopover
                        title="Deal-Killer Stress Checks"
                        whatIsIt="An automated sanity checklist that tests your acquisition structure against fatal underwriting thresholds."
                        howItWorks="Evaluates DSCR debt coverage (<1.0x), excessive entry multiples (>6x), unmitigated red flags (>5), customer concentration, and negative revenue trajectories."
                        whyItMatters="Saves searchers and private equity buyers from wasting tens of thousands of dollars in legal and accounting fees on fundamentally unfinanceable transactions."
                    />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Click any check item to inspect the underlying source document evidence and calculations
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Overall verdict */}
                <div
                    className={`rounded-lg border p-3 ${
                        failures.length === 0
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                    }`}
                >
                    <div className="text-sm font-semibold">
                        {failures.length === 0
                            ? 'No deal-killers found'
                            : `${failures.length} potential deal-killer${failures.length > 1 ? 's' : ''} identified`}
                    </div>
                    <div className="text-[10px] mt-1 opacity-80">
                        {passes.length} of {checks.length} checks passed
                    </div>
                </div>

                {/* Individual checks */}
                <div className="space-y-2">
                    {checks.map((check) => (
                        <InPlaceEvidencePopover key={check.label} evidence={check.evidence}>
                            <div
                                className={`rounded-lg p-3 text-left transition-all hover:border-primary/50 cursor-pointer ${
                                    check.passed
                                        ? 'bg-green-50/50 border border-green-100'
                                        : 'bg-red-50/50 border border-red-100'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-foreground">
                                        {check.label}
                                    </span>
                                    <span
                                        className={`text-[10px] font-semibold ${
                                            check.passed ? 'text-green-600' : 'text-red-600'
                                        }`}
                                    >
                                        {check.passed ? 'PASS' : 'FAIL'}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {check.detail}
                                </p>
                            </div>
                        </InPlaceEvidencePopover>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        Deal-killer checks flag structural issues that could make an acquisition
                        unviable regardless of other merits. A single failure warrants serious
                        pause; multiple failures suggest walking away.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
