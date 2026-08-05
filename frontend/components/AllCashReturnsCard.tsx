import { Calculator, Search } from 'lucide-react'
import type { ReactNode } from 'react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { computeAllCashReturns, type ResolvedInput } from '../utils/dealMath'
import { buildDerivedEvidence, buildFactEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import AssumptionNotice from './AssumptionNotice'
import { CashFlowChart, CumulativeCashFlowChart } from './DealCharts'
import InfoTip, { FINANCIAL_TERMS } from './InfoTip'

type AllCashReturnsCardProps = {
    model: DealModel
    documents?: SubmissionHistoryItem[]
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

function money(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export default function AllCashReturnsCard({ model, documents = [], onOpenEvidence }: AllCashReturnsCardProps) {
    const documented = parseDocumentedFacts(model.documentedFactsJson)
    const ebitdaFact = documented.ebitda_sde
    const ebitdaIsConfirmed = ebitdaFact?.status === 'confirmed' && typeof ebitdaFact.value === 'number' && ebitdaFact.value > 0
    const ebitda = (ebitdaFact?.status === 'confirmed' || ebitdaFact?.status === 'illustrative') && typeof ebitdaFact.value === 'number' ? ebitdaFact.value : null
    const priceIsConfirmed = model.purchasePrice !== null && model.purchasePrice !== undefined
    const currency = ebitdaFact?.currency || 'USD'

    const returns = computeAllCashReturns({
        ebitda,
        purchasePrice: model.purchasePrice ?? model.askingPrice,
        transactionFees: model.transactionFees,
        workingCapital: model.workingCapitalRequirement,
        taxRate: model.taxRate,
        maintenanceCapex: model.maintenanceCapex,
        holdPeriodYears: model.holdPeriodYears,
        exitMultiple: model.exitMultiple,
        exitCosts: model.exitCosts,
    })

    const {
        initialInvestment,
        annualCashFlow,
        annualRoi,
        paybackYears,
        cumulativeHoldCashFlow,
        operatingMoic,
        netExitProceeds,
        cashFlows,
        totalMoic,
        irr,
        ready,
        exitReady,
        assumedInputs,
    } = returns
    const holdPeriod = model.holdPeriodYears ?? 5
    const cashFlowChartData = cashFlows?.map((cashFlow, index) => ({ label: index === 0 ? 'Close' : `Year ${index}`, cashFlow })) ?? []
    let cumulativeCashFlow = 0
    const paybackChartData = cashFlows?.map((cashFlow, index) => {
        cumulativeCashFlow += cashFlow
        return { label: index === 0 ? 'Close' : `Year ${index}`, cumulativeCashFlow }
    }) ?? []

    const formatAssumed = (input: ResolvedInput) => {
        if (input.field === 'taxRate') return `${(input.value * 100).toFixed(0)}%`
        if (input.field === 'holdPeriodYears') return `${input.value} years`
        if (input.field === 'exitMultiple') return `${input.value.toFixed(1)}x`
        return input.value === 0 ? 'zero' : money(input.value, currency)
    }

    const ebitdaEvidence = buildFactEvidence({
        field: 'ebitda_sde',
        title: 'EBITDA / SDE',
        facts: documented,
        documents,
    })

    /** Only the assumptions that actually feed the given metric. */
    const assumedFor = (fields: string[]) => assumedInputs.filter((input) => fields.includes(input.field))

    const priceInput = { label: 'Purchase price', value: model.purchasePrice !== null && model.purchasePrice !== undefined ? money(model.purchasePrice, currency) : 'From asking price' }
    const ebitdaInput = { label: 'EBITDA / SDE', value: ebitda === null ? 'Not documented' : money(ebitda, currency) }

    const evidenceByMetric: Record<string, EvidenceItem> = {
        initialInvestment: buildDerivedEvidence({
            title: 'Initial investment',
            formula: 'purchase price + transaction fees + working capital',
            analystInputs: [priceInput],
            assumedInputs: assumedFor(['transactionFees', 'workingCapital']),
            formatAssumed,
        }),
        annualCashFlow: buildDerivedEvidence({
            title: 'Annual operating cash flow',
            formula: 'EBITDA/SDE × (1 − tax rate) − maintenance capex',
            documentedInputs: [ebitdaInput],
            assumedInputs: assumedFor(['taxRate', 'maintenanceCapex']),
            formatAssumed,
            primaryFact: ebitdaEvidence,
        }),
        annualRoi: buildDerivedEvidence({
            title: 'Simple annual ROI',
            formula: 'annual operating cash flow ÷ initial investment',
            documentedInputs: [ebitdaInput],
            analystInputs: [priceInput],
            assumedInputs: assumedFor(['taxRate', 'maintenanceCapex', 'transactionFees', 'workingCapital']),
            formatAssumed,
            primaryFact: ebitdaEvidence,
        }),
        paybackYears: buildDerivedEvidence({
            title: 'Payback period',
            formula: 'initial investment ÷ annual operating cash flow',
            documentedInputs: [ebitdaInput],
            analystInputs: [priceInput],
            assumedInputs: assumedFor(['taxRate', 'maintenanceCapex', 'transactionFees', 'workingCapital']),
            formatAssumed,
            primaryFact: ebitdaEvidence,
        }),
        netExitProceeds: buildDerivedEvidence({
            title: 'Net exit proceeds',
            formula: 'EBITDA/SDE × exit multiple − exit costs',
            documentedInputs: [ebitdaInput],
            assumedInputs: assumedFor(['exitMultiple', 'exitCosts']),
            formatAssumed,
            primaryFact: ebitdaEvidence,
        }),
        totalMoic: buildDerivedEvidence({
            title: 'Total MOIC / IRR',
            formula: 'MOIC = (operating cash flow + net exit proceeds) ÷ initial investment; IRR solves NPV = 0',
            documentedInputs: [ebitdaInput],
            analystInputs: [priceInput, { label: 'Hold period', value: `${holdPeriod} years` }],
            assumedInputs: assumedFor(['exitMultiple', 'exitCosts', 'taxRate', 'maintenanceCapex', 'holdPeriodYears']),
            formatAssumed,
            primaryFact: ebitdaEvidence,
        }),
    }

    const evidenceProps = (key: string) => onOpenEvidence
        ? { onEvidence: () => onOpenEvidence(evidenceByMetric[key]) }
        : {}

    return (
        <Card className="overflow-hidden border-primary/30">
            <CardHeader className="border-b border-primary/20 bg-primary/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">All-cash baseline</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                            Deterministic baseline using saved Deal Model inputs and, when set, terminal sale proceeds.
                        </CardDescription>
                    </div>
                    <Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Inputs available' : 'Inputs needed'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
                {!ready ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Add a purchase or asking price, documented EBITDA/SDE, and a tax-rate assumption to calculate the all-cash baseline.
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Metric
                                label="Initial investment"
                                value={money(initialInvestment!, currency)}
                                detail="purchase price + fees + working capital"
                                infoTerm="Initial investment"
                                alignTip="left"
                                statusBadge={priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Confirmed Price</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Price</Badge>}
                                {...evidenceProps('initialInvestment')}
                            />
                            <Metric
                                label="Annual operating cash flow"
                                value={money(annualCashFlow!, currency)}
                                detail="EBITDA/SDE × (1 − tax rate) − capex"
                                infoTerm="Operating cash flow"
                                alignTip="left"
                                statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified EBITDA</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative EBITDA</Badge>}
                                {...evidenceProps('annualCashFlow')}
                            />
                            <Metric
                                label="Simple annual ROI"
                                value={annualRoi === null ? 'Not available' : `${(annualRoi * 100).toFixed(1)}%`}
                                detail="annual cash flow ÷ initial investment"
                                infoTerm="Simple annual ROI"
                                alignTip="center"
                                statusBadge={ebitdaIsConfirmed && priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified ROI</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Model</Badge>}
                                {...evidenceProps('annualRoi')}
                            />
                            <Metric
                                label="Payback period"
                                value={paybackYears === null ? 'Not available' : `${paybackYears.toFixed(1)} years`}
                                detail="initial investment ÷ annual cash flow"
                                infoTerm="Payback period"
                                alignTip="right"
                                statusBadge={ebitdaIsConfirmed && priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified Payback</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Model</Badge>}
                                {...evidenceProps('paybackYears')}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Metric
                                label={holdPeriod ? `${holdPeriod}-year operating cash flow` : 'Operating cash flow'}
                                value={cumulativeHoldCashFlow === null ? 'Add hold period' : money(cumulativeHoldCashFlow, currency)}
                                detail="annual cash flow × hold period"
                                infoTerm="Cumulative cash flow"
                                alignTip="left"
                                statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified Cash Flow</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Model</Badge>}
                            />
                            <Metric
                                label="Operating cash-flow MOIC"
                                value={operatingMoic === null ? 'Add hold period' : `${operatingMoic.toFixed(2)}x`}
                                detail="operating cash flow ÷ initial investment"
                                infoTerm="MOIC"
                                alignTip="left"
                                statusBadge={ebitdaIsConfirmed && priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified MOIC</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Model</Badge>}
                            />
                            <Metric
                                label="Net exit proceeds"
                                value={netExitProceeds === null ? 'Add exit inputs' : money(netExitProceeds, currency)}
                                detail="EBITDA/SDE × exit multiple − exit costs"
                                infoTerm="Net exit proceeds"
                                alignTip="center"
                                statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified EBITDA</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative EBITDA</Badge>}
                                {...evidenceProps('netExitProceeds')}
                            />
                            <Metric
                                label="Total MOIC / IRR"
                                value={!exitReady ? 'Add exit inputs' : `${totalMoic?.toFixed(2) ?? '—'}x / ${irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}`}
                                detail="operating cash flow + exit proceeds"
                                infoTerm="IRR"
                                alignTip="right"
                                statusBadge={ebitdaIsConfirmed && priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified Exit</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Preview</Badge>}
                                {...evidenceProps('totalMoic')}
                            />
                        </div>

                        {exitReady ? (
                            <div className="grid gap-5 xl:grid-cols-2">
                                <CashFlowChart
                                    title="All-cash cash-flow timeline"
                                    data={cashFlowChartData}
                                    isVerified={ebitdaIsConfirmed}
                                    ebitdaLabel={ebitdaIsConfirmed ? `$${ebitda?.toLocaleString('en-US', { maximumFractionDigits: 0 })} (Confirmed Fact)` : 'Illustrative preview ($200k)'}
                                    priceLabel={priceIsConfirmed ? `$${model.purchasePrice?.toLocaleString('en-US', { maximumFractionDigits: 0 })} (Confirmed Price)` : 'Illustrative preview ($1.0M)'}
                                />
                                <CumulativeCashFlowChart
                                    data={paybackChartData}
                                    isVerified={ebitdaIsConfirmed}
                                    ebitdaLabel={ebitdaIsConfirmed ? `$${ebitda?.toLocaleString('en-US', { maximumFractionDigits: 0 })} (Confirmed Fact)` : 'Illustrative preview ($200k)'}
                                    priceLabel={priceIsConfirmed ? `$${model.purchasePrice?.toLocaleString('en-US', { maximumFractionDigits: 0 })} (Confirmed Price)` : 'Illustrative preview ($1.0M)'}
                                />
                            </div>
                        ) : null}

                        <AssumptionNotice assumedInputs={assumedInputs} currency={currency} />
                    </>
                )}
                <p className="text-xs leading-5 text-muted-foreground">
                    EBITDA/SDE is a documented source fact. Tax rate, capex, price, fees, working capital, exit multiple, and exit costs are editable analyst assumptions unless separately documented. The baseline holds EBITDA/SDE constant; use the Growth tab for scenario-based exit values.
                </p>
            </CardContent>
        </Card>
    )
}

function Metric({
    label,
    value,
    detail,
    onEvidence,
    infoTerm,
    alignTip = 'center',
    statusBadge,
}: {
    label: string
    value: string
    detail: string
    onEvidence?: () => void
    infoTerm?: string
    alignTip?: 'center' | 'left' | 'right'
    statusBadge?: ReactNode
}) {
    return (
        <div
            onClick={onEvidence}
            className={`rounded-xl border border-border bg-background p-3.5 shadow-2xs flex flex-col justify-between transition-all ${onEvidence ? 'cursor-pointer hover:border-primary/60 hover:bg-muted/30 hover:shadow-xs group' : ''}`}
        >
            <div>
                <div className="flex items-center justify-between gap-1 text-muted-foreground mb-1">
                    <span className="text-xs font-semibold">{label}</span>
                    {infoTerm && FINANCIAL_TERMS[infoTerm] ? (
                        <span onClick={(e) => e.stopPropagation()}>
                            <InfoTip term={infoTerm} definition={FINANCIAL_TERMS[infoTerm]} align={alignTip} />
                        </span>
                    ) : null}
                </div>
                <p className="mt-1 text-xl font-extrabold text-foreground tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            </div>
            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                {statusBadge}
                {onEvidence ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                        <Search className="h-3 w-3" />
                        Calculation
                    </span>
                ) : null}
            </div>
        </div>
    )
}

