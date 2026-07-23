import { Calculator } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'

type DocumentedFact = { value: number | null; period?: string; currency?: string; provenance?: string; status?: string }

function facts(model: DealModel) {
    try {
        return JSON.parse(model.documentedFactsJson || '{}') as Record<string, DocumentedFact>
    } catch {
        return {}
    }
}

function money(value: number, currency = 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

export default function AllCashReturnsCard({ model }: { model: DealModel }) {
    const documented = facts(model)
    const ebitda = documented.ebitda_sde?.status === 'confirmed' ? documented.ebitda_sde.value : null
    const currency = documented.ebitda_sde?.currency || 'USD'
    const purchasePrice = model.purchasePrice ?? model.askingPrice
    const fees = model.transactionFees ?? 0
    const workingCapital = model.workingCapitalRequirement ?? 0
    const taxRate = model.taxRate
    const capex = model.maintenanceCapex ?? 0
    const holdPeriod = model.holdPeriodYears
    const initialInvestment = purchasePrice === null ? null : purchasePrice + fees + workingCapital
    const annualCashFlow = ebitda === null || taxRate === null ? null : ebitda * (1 - taxRate) - capex
    const annualRoi = initialInvestment && annualCashFlow !== null && initialInvestment > 0 ? annualCashFlow / initialInvestment : null
    const paybackYears = initialInvestment && annualCashFlow !== null && annualCashFlow > 0 ? initialInvestment / annualCashFlow : null
    const cumulativeHoldCashFlow = holdPeriod && annualCashFlow !== null ? annualCashFlow * holdPeriod : null
    const moic = initialInvestment && cumulativeHoldCashFlow !== null && initialInvestment > 0 ? cumulativeHoldCashFlow / initialInvestment : null
    const ready = initialInvestment !== null && annualCashFlow !== null

    return <Card className="overflow-hidden border-primary/30"><CardHeader className="border-b border-primary/20 bg-primary/5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><CardTitle className="text-xl">All-cash baseline</CardTitle></div><CardDescription className="mt-1">Deterministic baseline using saved Deal Model inputs. Financing and exit value are intentionally excluded here.</CardDescription></div><Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Inputs available' : 'Inputs needed'}</Badge></div></CardHeader><CardContent className="space-y-5 p-5">{!ready ? <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add a purchase or asking price, documented EBITDA/SDE, and a tax-rate assumption to calculate the all-cash baseline.</div> : <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Initial investment" value={money(initialInvestment!, currency)} detail="purchase price + fees + working capital" /><Metric label="Annual operating cash flow" value={money(annualCashFlow!, currency)} detail="EBITDA/SDE × (1 − tax rate) − capex" /><Metric label="Simple annual ROI" value={annualRoi === null ? 'Not available' : `${(annualRoi * 100).toFixed(1)}%`} detail="annual cash flow ÷ initial investment" /><Metric label="Payback period" value={paybackYears === null ? 'Not available' : `${paybackYears.toFixed(1)} years`} detail="initial investment ÷ annual cash flow" /></div><div className="grid gap-3 sm:grid-cols-2"><Metric label={holdPeriod ? `${holdPeriod}-year cumulative cash flow` : 'Cumulative cash flow'} value={cumulativeHoldCashFlow === null ? 'Add hold period' : money(cumulativeHoldCashFlow, currency)} detail="annual cash flow × hold period" /><Metric label="Cash-flow multiple (MOIC)" value={moic === null ? 'Add hold period' : `${moic.toFixed(2)}x`} detail="cumulative cash flow ÷ initial investment" /></div></>}<p className="text-xs leading-5 text-muted-foreground">EBITDA/SDE is a documented source fact. Tax rate, capex, price, fees, and working capital are editable analyst assumptions unless separately documented. This baseline does not calculate IRR until an exit value is modeled.</p></CardContent></Card>
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
    return <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>
}
