import { Calculator, Search } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { computeAllCashReturns, type ResolvedInput } from '../utils/dealMath'
import { buildDerivedEvidence, buildFactEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import AssumptionNotice from './AssumptionNotice'
import { CashFlowChart, CumulativeCashFlowChart } from './DealCharts'

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
    const ebitda = (ebitdaFact?.status === 'confirmed' || ebitdaFact?.status === 'illustrative') && typeof ebitdaFact.value === 'number' ? ebitdaFact.value : null
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

    return <Card className="overflow-hidden border-primary/30"><CardHeader className="border-b border-primary/20 bg-primary/5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><CardTitle className="text-xl">All-cash baseline</CardTitle></div><CardDescription className="mt-1">Deterministic baseline using saved Deal Model inputs and, when set, terminal sale proceeds.</CardDescription></div><Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Inputs available' : 'Inputs needed'}</Badge></div></CardHeader><CardContent className="space-y-5 p-5">{!ready ? <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add a purchase or asking price, documented EBITDA/SDE, and a tax-rate assumption to calculate the all-cash baseline.</div> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Initial investment" value={money(initialInvestment!, currency)} detail="purchase price + fees + working capital" {...evidenceProps('initialInvestment')} /><Metric label="Annual operating cash flow" value={money(annualCashFlow!, currency)} detail="EBITDA/SDE × (1 − tax rate) − capex" {...evidenceProps('annualCashFlow')} /><Metric label="Simple annual ROI" value={annualRoi === null ? 'Not available' : `${(annualRoi * 100).toFixed(1)}%`} detail="annual cash flow ÷ initial investment" {...evidenceProps('annualRoi')} /><Metric label="Payback period" value={paybackYears === null ? 'Not available' : `${paybackYears.toFixed(1)} years`} detail="initial investment ÷ annual cash flow" {...evidenceProps('paybackYears')} /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label={holdPeriod ? `${holdPeriod}-year operating cash flow` : 'Operating cash flow'} value={cumulativeHoldCashFlow === null ? 'Add hold period' : money(cumulativeHoldCashFlow, currency)} detail="annual cash flow × hold period" /><Metric label="Operating cash-flow MOIC" value={operatingMoic === null ? 'Add hold period' : `${operatingMoic.toFixed(2)}x`} detail="operating cash flow ÷ initial investment" /><Metric label="Net exit proceeds" value={netExitProceeds === null ? 'Add exit inputs' : money(netExitProceeds, currency)} detail="EBITDA/SDE × exit multiple − exit costs" {...evidenceProps('netExitProceeds')} /><Metric label="Total MOIC / IRR" value={!exitReady ? 'Add exit inputs' : `${totalMoic?.toFixed(2) ?? '—'}x / ${irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}`} detail="operating cash flow + exit proceeds" {...evidenceProps('totalMoic')} /></div>{exitReady ? <div className="grid gap-5 xl:grid-cols-2"><CashFlowChart title="All-cash cash-flow timeline" data={cashFlowChartData} /><CumulativeCashFlowChart data={paybackChartData} /></div> : null}<AssumptionNotice assumedInputs={assumedInputs} currency={currency} /></>}<p className="text-xs leading-5 text-muted-foreground">EBITDA/SDE is a documented source fact. Tax rate, capex, price, fees, working capital, exit multiple, and exit costs are editable analyst assumptions unless separately documented. The baseline holds EBITDA/SDE constant; use the Growth tab for scenario-based exit values.</p></CardContent></Card>
}

function Metric({ label, value, detail, onEvidence }: { label: string; value: string; detail: string; onEvidence?: () => void }) {
    return (
        <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
            {onEvidence ? (
                <button
                    type="button"
                    onClick={onEvidence}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Show how ${label} was calculated`}
                >
                    <Search className="h-3 w-3" />
                    How this was calculated
                </button>
            ) : null}
        </div>
    )
}
