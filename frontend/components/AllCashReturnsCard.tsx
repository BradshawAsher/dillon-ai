import { Calculator } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { computeAllCashReturns } from '../utils/dealMath'
import AssumptionNotice from './AssumptionNotice'
import { CashFlowChart } from './DealCharts'

type DocumentedFact = { value: number | null; period?: string; currency?: string; provenance?: string; status?: string }

function facts(model: DealModel) {
    try { return JSON.parse(model.documentedFactsJson || '{}') as Record<string, DocumentedFact> } catch { return {} }
}

function money(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export default function AllCashReturnsCard({ model }: { model: DealModel }) {
    const documented = facts(model)
    const ebitda = documented.ebitda_sde?.status === 'confirmed' ? documented.ebitda_sde.value : null
    const currency = documented.ebitda_sde?.currency || 'USD'

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

    return <Card className="overflow-hidden border-primary/30"><CardHeader className="border-b border-primary/20 bg-primary/5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><CardTitle className="text-xl">All-cash baseline</CardTitle></div><CardDescription className="mt-1">Deterministic baseline using saved Deal Model inputs and, when set, terminal sale proceeds.</CardDescription></div><Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Inputs available' : 'Inputs needed'}</Badge></div></CardHeader><CardContent className="space-y-5 p-5">{!ready ? <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add a purchase or asking price, documented EBITDA/SDE, and a tax-rate assumption to calculate the all-cash baseline.</div> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Initial investment" value={money(initialInvestment!, currency)} detail="purchase price + fees + working capital" /><Metric label="Annual operating cash flow" value={money(annualCashFlow!, currency)} detail="EBITDA/SDE × (1 − tax rate) − capex" /><Metric label="Simple annual ROI" value={annualRoi === null ? 'Not available' : `${(annualRoi * 100).toFixed(1)}%`} detail="annual cash flow ÷ initial investment" /><Metric label="Payback period" value={paybackYears === null ? 'Not available' : `${paybackYears.toFixed(1)} years`} detail="initial investment ÷ annual cash flow" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label={holdPeriod ? `${holdPeriod}-year operating cash flow` : 'Operating cash flow'} value={cumulativeHoldCashFlow === null ? 'Add hold period' : money(cumulativeHoldCashFlow, currency)} detail="annual cash flow × hold period" /><Metric label="Operating cash-flow MOIC" value={operatingMoic === null ? 'Add hold period' : `${operatingMoic.toFixed(2)}x`} detail="operating cash flow ÷ initial investment" /><Metric label="Net exit proceeds" value={netExitProceeds === null ? 'Add exit inputs' : money(netExitProceeds, currency)} detail="EBITDA/SDE × exit multiple − exit costs" /><Metric label="Total MOIC / IRR" value={!exitReady ? 'Add exit inputs' : `${totalMoic?.toFixed(2) ?? '—'}x / ${irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}`} detail="operating cash flow + exit proceeds" /></div>{exitReady ? <CashFlowChart title="All-cash cash-flow timeline" data={cashFlowChartData} /> : null}<AssumptionNotice assumedInputs={assumedInputs} currency={currency} /></>}<p className="text-xs leading-5 text-muted-foreground">EBITDA/SDE is a documented source fact. Tax rate, capex, price, fees, working capital, exit multiple, and exit costs are editable analyst assumptions unless separately documented. The baseline holds EBITDA/SDE constant; use the Growth tab for scenario-based exit values.</p></CardContent></Card>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
}
