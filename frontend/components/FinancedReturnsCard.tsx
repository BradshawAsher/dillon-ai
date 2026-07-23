import { Landmark } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { calculateIrr } from '../utils/dealMath'
import { CashFlowChart } from './DealCharts'

function getEbitda(model: DealModel) {
    try { const fact = JSON.parse(model.documentedFactsJson || '{}').ebitda_sde; return fact?.status === 'confirmed' && typeof fact.value === 'number' ? fact.value : null } catch { return null }
}
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value) }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div> }

export default function FinancedReturnsCard({ model }: { model: DealModel }) {
    const ebitda = getEbitda(model); const price = model.purchasePrice ?? model.askingPrice; const tax = model.taxRate ?? 0.25; const equityPct = model.equityContributionPercent ?? 0.3; const rate = model.interestRate ?? 0.1; const amortizationYears = model.amortizationYears ?? 10; const holdPeriod = model.holdPeriodYears ?? 5; const exitMultiple = model.exitMultiple ?? 4; const exitCosts = model.exitCosts ?? (ebitda === null ? 0 : ebitda * exitMultiple * 0.02); const capex = model.maintenanceCapex ?? 0; const fees = model.transactionFees ?? 0; const wc = model.workingCapitalRequirement ?? 0; const sellerNote = model.sellerNoteAmount ?? 0
    const uses = price === null ? null : price + fees + wc
    const debt = uses === null || equityPct === null ? null : Math.max(0, uses * (1 - equityPct) - sellerNote)
    const equity = uses === null || debt === null ? null : uses - debt - sellerNote
    const operatingCashFlow = ebitda === null || tax === null ? null : ebitda * (1 - tax) - capex
    const annualDebtService = debt === null || rate === null || amortizationYears === null || amortizationYears <= 0 ? null : rate === 0 ? debt / amortizationYears : debt * ((rate * (1 + rate) ** amortizationYears) / (((1 + rate) ** amortizationYears) - 1))
    const cashAfterDebt = operatingCashFlow === null || annualDebtService === null ? null : operatingCashFlow - annualDebtService
    const coc = equity && cashAfterDebt !== null && equity > 0 ? cashAfterDebt / equity : null
    const dscr = annualDebtService && operatingCashFlow !== null && annualDebtService > 0 ? operatingCashFlow / annualDebtService : null
    const debtBalanceAtExit = debt === null || rate === null || annualDebtService === null || holdPeriod === null ? null : Math.max(0, rate === 0 ? debt - annualDebtService * Math.min(holdPeriod, amortizationYears ?? holdPeriod) : debt * (1 + rate) ** Math.min(holdPeriod, amortizationYears ?? holdPeriod) - annualDebtService * (((1 + rate) ** Math.min(holdPeriod, amortizationYears ?? holdPeriod) - 1) / rate))
    const exitEnterpriseValue = ebitda !== null && exitMultiple !== null && holdPeriod !== null ? ebitda * exitMultiple : null
    const exitEquityProceeds = exitEnterpriseValue === null || debtBalanceAtExit === null ? null : exitEnterpriseValue - exitCosts - debtBalanceAtExit - sellerNote
    const cashFlows = equity !== null && operatingCashFlow !== null && annualDebtService !== null && holdPeriod !== null && holdPeriod > 0 && exitEquityProceeds !== null && amortizationYears !== null
        ? [-equity, ...Array.from({ length: holdPeriod }, (_, year) => operatingCashFlow - (year < amortizationYears ? annualDebtService : 0) + (year === holdPeriod - 1 ? exitEquityProceeds : 0))]
        : null
    const totalMoic = equity && cashFlows ? cashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / equity : null
    const irr = cashFlows ? calculateIrr(cashFlows) : null
    const ready = cashAfterDebt !== null && equity !== null
    const exitReady = exitEquityProceeds !== null && cashFlows !== null
    const cashFlowChartData = cashFlows?.map((cashFlow, index) => ({ label: index === 0 ? 'Close' : `Year ${index}`, cashFlow })) ?? []

    return <Card className="overflow-hidden border-primary/30"><CardHeader className="border-b border-primary/20 bg-primary/5"><div className="flex flex-col gap-3 sm:flex-row sm:justify-between"><div><div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Financed acquisition scenario</CardTitle></div><CardDescription className="mt-1">Level-payment debt model with optional terminal sale proceeds.</CardDescription></div><Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Inputs available' : 'Inputs needed'}</Badge></div></CardHeader><CardContent className="space-y-4 p-5">{!ready ? <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add documented EBITDA/SDE, price, tax rate, equity contribution, interest rate, and amortization term.</div> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Equity at close" value={money(equity!)} detail="uses − debt − seller note" /><Metric label="Annual debt service" value={money(annualDebtService!)} detail="amortizing loan payment" /><Metric label="Cash after debt service" value={money(cashAfterDebt!)} detail="year-one operating cash flow − debt service" /><Metric label="Cash-on-cash return" value={coc === null ? 'Not available' : `${(coc * 100).toFixed(1)}%`} detail="cash after debt ÷ equity" /><Metric label="Debt-service coverage" value={dscr === null ? 'Not available' : `${dscr.toFixed(2)}x`} detail="operating cash flow ÷ debt service" /><Metric label="Debt balance at exit" value={debtBalanceAtExit === null ? 'Add hold period' : money(debtBalanceAtExit)} detail="remaining amortizing debt at sale" /><Metric label="Net equity proceeds at exit" value={exitEquityProceeds === null ? 'Add exit inputs' : money(exitEquityProceeds)} detail="exit value − costs − debt − seller note" /><Metric label="Total MOIC / IRR" value={!exitReady ? 'Add exit inputs' : `${totalMoic?.toFixed(2) ?? '—'}x / ${irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}`} detail="levered cash flows including sale" /></div>}{exitReady ? <CashFlowChart title="Levered cash-flow timeline" data={cashFlowChartData} /> : null}{dscr !== null && dscr < 1.25 ? <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">Downside warning: DSCR is below 1.25x. Review leverage, operating assumptions, or debt terms.</p> : null}<p className="text-xs leading-5 text-muted-foreground">Price, financing, exit multiple, and exit costs are analyst assumptions unless documented. The seller note is conservatively treated as still payable at exit because no repayment terms are stored. The baseline holds EBITDA/SDE constant; Growth scenarios remain separate.</p></CardContent></Card>
}
