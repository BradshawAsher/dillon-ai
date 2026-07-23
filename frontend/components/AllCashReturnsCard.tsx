import { Calculator } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'

type DocumentedFact = { value: number | null; period?: string; currency?: string; provenance?: string; status?: string }

function facts(model: DealModel) {
    try { return JSON.parse(model.documentedFactsJson || '{}') as Record<string, DocumentedFact> } catch { return {} }
}

function money(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function calculateIrr(cashFlows: number[]) {
    if (!cashFlows.some((value) => value < 0) || !cashFlows.some((value) => value > 0)) return null
    let rate = 0.1
    for (let iteration = 0; iteration < 100; iteration += 1) {
        const npv = cashFlows.reduce((sum, cashFlow, year) => sum + cashFlow / (1 + rate) ** year, 0)
        const derivative = cashFlows.slice(1).reduce((sum, cashFlow, year) => sum - ((year + 1) * cashFlow) / (1 + rate) ** (year + 2), 0)
        if (!Number.isFinite(npv) || !Number.isFinite(derivative) || Math.abs(derivative) < 1e-9) return null
        const nextRate = rate - npv / derivative
        if (nextRate <= -0.999 || nextRate > 100) return null
        if (Math.abs(nextRate - rate) < 1e-7) return nextRate
        rate = nextRate
    }
    return null
}

export default function AllCashReturnsCard({ model }: { model: DealModel }) {
    const documented = facts(model)
    const ebitda = documented.ebitda_sde?.status === 'confirmed' ? documented.ebitda_sde.value : null
    const currency = documented.ebitda_sde?.currency || 'USD'
    const purchasePrice = model.purchasePrice ?? model.askingPrice
    const fees = model.transactionFees ?? 0
    const workingCapital = model.workingCapitalRequirement ?? 0
    const taxRate = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const holdPeriod = model.holdPeriodYears ?? 5
    const exitMultiple = model.exitMultiple ?? 4
    const exitCosts = model.exitCosts ?? (ebitda === null ? 0 : ebitda * exitMultiple * 0.02)
    const initialInvestment = purchasePrice === null ? null : purchasePrice + fees + workingCapital
    const annualCashFlow = ebitda === null || taxRate === null ? null : ebitda * (1 - taxRate) - capex
    const annualRoi = initialInvestment && annualCashFlow !== null && initialInvestment > 0 ? annualCashFlow / initialInvestment : null
    const paybackYears = initialInvestment && annualCashFlow !== null && annualCashFlow > 0 ? initialInvestment / annualCashFlow : null
    const cumulativeHoldCashFlow = holdPeriod && annualCashFlow !== null ? annualCashFlow * holdPeriod : null
    const operatingMoic = initialInvestment && cumulativeHoldCashFlow !== null && initialInvestment > 0 ? cumulativeHoldCashFlow / initialInvestment : null
    const exitEnterpriseValue = ebitda !== null && exitMultiple !== null && holdPeriod !== null ? ebitda * exitMultiple : null
    const netExitProceeds = exitEnterpriseValue === null ? null : exitEnterpriseValue - exitCosts
    const cashFlows = initialInvestment !== null && annualCashFlow !== null && netExitProceeds !== null && holdPeriod !== null && holdPeriod > 0
        ? [-initialInvestment, ...Array.from({ length: holdPeriod }, (_, year) => annualCashFlow + (year === holdPeriod - 1 ? netExitProceeds : 0))]
        : null
    const totalMoic = initialInvestment && cashFlows ? cashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / initialInvestment : null
    const irr = cashFlows ? calculateIrr(cashFlows) : null
    const ready = initialInvestment !== null && annualCashFlow !== null
    const exitReady = netExitProceeds !== null && cashFlows !== null

    return <Card className="overflow-hidden border-primary/30"><CardHeader className="border-b border-primary/20 bg-primary/5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><CardTitle className="text-xl">All-cash baseline</CardTitle></div><CardDescription className="mt-1">Deterministic baseline using saved Deal Model inputs and, when set, terminal sale proceeds.</CardDescription></div><Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Inputs available' : 'Inputs needed'}</Badge></div></CardHeader><CardContent className="space-y-5 p-5">{!ready ? <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add a purchase or asking price, documented EBITDA/SDE, and a tax-rate assumption to calculate the all-cash baseline.</div> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Initial investment" value={money(initialInvestment!, currency)} detail="purchase price + fees + working capital" /><Metric label="Annual operating cash flow" value={money(annualCashFlow!, currency)} detail="EBITDA/SDE × (1 − tax rate) − capex" /><Metric label="Simple annual ROI" value={annualRoi === null ? 'Not available' : `${(annualRoi * 100).toFixed(1)}%`} detail="annual cash flow ÷ initial investment" /><Metric label="Payback period" value={paybackYears === null ? 'Not available' : `${paybackYears.toFixed(1)} years`} detail="initial investment ÷ annual cash flow" /></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label={holdPeriod ? `${holdPeriod}-year operating cash flow` : 'Operating cash flow'} value={cumulativeHoldCashFlow === null ? 'Add hold period' : money(cumulativeHoldCashFlow, currency)} detail="annual cash flow × hold period" /><Metric label="Operating cash-flow MOIC" value={operatingMoic === null ? 'Add hold period' : `${operatingMoic.toFixed(2)}x`} detail="operating cash flow ÷ initial investment" /><Metric label="Net exit proceeds" value={netExitProceeds === null ? 'Add exit inputs' : money(netExitProceeds, currency)} detail="EBITDA/SDE × exit multiple − exit costs" /><Metric label="Total MOIC / IRR" value={!exitReady ? 'Add exit inputs' : `${totalMoic?.toFixed(2) ?? '—'}x / ${irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}`} detail="operating cash flow + exit proceeds" /></div></>}<p className="text-xs leading-5 text-muted-foreground">EBITDA/SDE is a documented source fact. Tax rate, capex, price, fees, working capital, exit multiple, and exit costs are editable analyst assumptions unless separately documented. The baseline holds EBITDA/SDE constant; use the Growth tab for scenario-based exit values.</p></CardContent></Card>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
}
