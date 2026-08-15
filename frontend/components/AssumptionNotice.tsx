import { Info, HelpCircle } from 'lucide-react'

import type { ResolvedInput } from '../utils/dealMath'
import { safeFormatCurrency } from '../utils/diligenceDashboardUtils'
import InPlaceEvidencePopover from './InPlaceEvidencePopover'

type AssumptionNoticeProps = {
    assumedInputs: ResolvedInput[]
    currency?: string
}

const ASSUMPTION_METADATA: Record<string, { title: string; definition: string; defaultReason: string; typicalRange: string }> = {
    taxRate: {
        title: 'Corporate Tax Rate',
        definition: 'Effective corporate income tax rate applied to pre-tax net income.',
        defaultReason: '25% reflects blended US Federal (21%) and state/local corporate tax rates.',
        typicalRange: '21% - 28%',
    },
    holdPeriodYears: {
        title: 'Hold Period',
        definition: 'Planned duration of ownership from acquisition closing to equity exit/recapitalization.',
        defaultReason: '5 years is the institutional standard hold horizon for PE and Search Funds.',
        typicalRange: '3 - 7 Years',
    },
    exitMultiple: {
        title: 'Exit EBITDA Multiple',
        definition: 'Estimated enterprise value multiple on future EBITDA at the time of company sale.',
        defaultReason: '4.0x maintains conservative multiple parity with lower-middle market acquisition entry multiples.',
        typicalRange: '3.0x - 6.0x',
    },
    capex: {
        title: 'Maintenance Capex',
        definition: 'Annual capital expenditures required to maintain existing productive capacity.',
        defaultReason: 'Defaulted to zero for asset-light SMB models until equipment schedule is provided.',
        typicalRange: '1% - 5% of Revenue',
    },
    workingCapital: {
        title: 'Working Capital Reserve',
        definition: 'Day-one cash buffer required for payroll, inventory, and receivables lag.',
        defaultReason: 'Defaulted to 2% of enterprise value as initial liquidity cushion.',
        typicalRange: '1% - 5% of EV',
    },
    transactionFees: {
        title: 'Transaction & Legal Fees',
        definition: 'Legal counsel, QoE accounting, broker, and closing escrow fees.',
        defaultReason: 'Defaulted to 1% of enterprise value.',
        typicalRange: '1% - 3% of EV',
    },
    interestRate: {
        title: 'Senior Debt Interest Rate',
        definition: 'Annual interest rate charged on senior bank or SBA 7(a) debt.',
        defaultReason: 'Defaulted to 10.0% reflecting prevailing Prime + 1.5% SBA floating rates.',
        typicalRange: '8.5% - 11.5%',
    },
    equity: {
        title: 'Sponsor Equity Contribution',
        definition: 'Percentage of total acquisition capitalization funded with cash equity.',
        defaultReason: 'Defaulted to 30% matching standard commercial bank senior leverage limits (70% LTV).',
        typicalRange: '10% - 35%',
    },
}

function formatAssumedValue(input: ResolvedInput, currency: string) {
    if (input.field === 'taxRate') {
        return `${(input.value * 100).toFixed(0)}%`
    }

    if (input.field === 'holdPeriodYears') {
        return `${input.value} year${input.value === 1 ? '' : 's'}`
    }

    if (input.field === 'exitMultiple') {
        return `${input.value}x`
    }

    if (input.value === 0) {
        return 'zero'
    }

    return safeFormatCurrency(input.value, currency)
}

/**
 * Lists the inputs that fell back to a default. Without this, a payback period
 * resting on "capex assumed zero" is indistinguishable from one backed by
 * documented figures — which would overstate returns silently.
 */
export default function AssumptionNotice({ assumedInputs, currency = 'USD' }: AssumptionNoticeProps) {
    if (assumedInputs.length === 0) {
        return null
    }

    return (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0 text-warning" />
                    <p className="text-sm font-medium text-foreground">
                        {assumedInputs.length} assumed input{assumedInputs.length === 1 ? '' : 's'} — not documented
                    </p>
                </div>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">Hover/click any item for definition & default rationale</span>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                {assumedInputs.map((input) => {
                    const meta = ASSUMPTION_METADATA[input.field] || {
                        title: input.label,
                        definition: `Fallback calculation assumption for ${input.label}.`,
                        defaultReason: 'Industry standard proxy value used until custom inputs are provided.',
                        typicalRange: 'Industry standard',
                    }

                    return (
                        <li key={input.field} className="text-xs text-muted-foreground">
                            <InPlaceEvidencePopover
                                evidence={{
                                    metricName: `${meta.title} (Fallback Assumption)`,
                                    valueFormatted: formatAssumedValue(input, currency),
                                    sourceDoc: 'Standard Industry Heuristics / Deal Math Proxy',
                                    quoteSnippet: `Definition: ${meta.definition}`,
                                    confidence: 'medium',
                                    status: 'estimated',
                                    notes: `Why this starting value was chosen: ${meta.defaultReason} Typical market range: ${meta.typicalRange}.`,
                                }}
                                align="auto"
                            >
                                <span className="inline-flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors group">
                                    <span>{input.label}:</span>
                                    <span className="font-semibold text-foreground underline decoration-warning/50 underline-offset-2">
                                        {formatAssumedValue(input, currency)}
                                    </span>
                                    <HelpCircle className="h-3 w-3 text-warning opacity-70 group-hover:opacity-100" />
                                </span>
                            </InPlaceEvidencePopover>
                        </li>
                    )
                })}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
                These figures rest on defaults, not source documents. Confirm them in the Deal Model before relying on the returns above.
            </p>
        </div>
    )
}
