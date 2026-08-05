import { Landmark, Search } from 'lucide-react'
import type { ReactNode } from 'react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { calculateIrr } from '../utils/dealMath'
import { buildDerivedEvidence, buildFactEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { CashFlowChart } from './DealCharts'
import InfoTip, { FINANCIAL_TERMS } from './InfoTip'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function Metric({
    label,
    value,
    detail,
    evidence,
    onOpenEvidence,
    infoTerm,
    alignTip = 'center',
    statusBadge,
}: {
    label: string
    value: string
    detail: string
    evidence: EvidenceItem
    onOpenEvidence?: (evidence: EvidenceItem) => void
    infoTerm?: string
    alignTip?: 'center' | 'left' | 'right'
    statusBadge?: ReactNode
}) {
    const handleClick = () => {
        if (onOpenEvidence && evidence) {
            onOpenEvidence(evidence)
        }
    }

    return (
        <div
            onClick={handleClick}
            className={`rounded-xl border border-border bg-background p-3.5 shadow-2xs flex flex-col justify-between transition-all ${onOpenEvidence ? 'cursor-pointer hover:border-primary/60 hover:bg-muted/30 hover:shadow-xs group' : ''}`}
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
                {onOpenEvidence ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary group-hover:underline">
                        <Search className="h-3 w-3" />
                        Calculation
                    </span>
                ) : null}
            </div>
        </div>
    )
}

export default function FinancedReturnsCard({ model, documents = [], onOpenEvidence }: { model: DealModel; documents?: SubmissionHistoryItem[]; onOpenEvidence?: (evidence: EvidenceItem) => void }) {
    const documentedFacts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitdaFact = documentedFacts.ebitda_sde
    const ebitdaIsConfirmed = ebitdaFact?.status === 'confirmed' && typeof ebitdaFact.value === 'number' && ebitdaFact.value > 0
    const ebitda = (ebitdaFact?.status === 'confirmed' || ebitdaFact?.status === 'illustrative') && typeof ebitdaFact.value === 'number' ? ebitdaFact.value : null
    const priceIsConfirmed = model.purchasePrice !== null && model.purchasePrice !== undefined
    const price = model.purchasePrice ?? model.askingPrice
    const tax = model.taxRate ?? 0.25
    const equityPct = model.equityContributionPercent ?? 0.3
    const rate = model.interestRate ?? 0.1
    const amortizationYears = model.amortizationYears ?? 10
    const holdPeriod = model.holdPeriodYears ?? 5
    const exitMultiple = model.exitMultiple ?? 4
    const exitCosts = model.exitCosts ?? (ebitda === null ? 0 : ebitda * exitMultiple * 0.02)
    const capex = model.maintenanceCapex ?? 0
    const fees = model.transactionFees ?? 0
    const wc = model.workingCapitalRequirement ?? 0
    const sellerNote = model.sellerNoteAmount ?? 0
    const uses = price === null ? null : price + fees + wc
    const debt = uses === null ? null : Math.max(0, uses * (1 - equityPct) - sellerNote)
    const equity = uses === null || debt === null ? null : uses - debt - sellerNote
    const operatingCashFlow = ebitda === null ? null : ebitda * (1 - tax) - capex
    const annualDebtService = debt === null || amortizationYears <= 0 ? null : rate === 0 ? debt / amortizationYears : debt * ((rate * (1 + rate) ** amortizationYears) / (((1 + rate) ** amortizationYears) - 1))
    const cashAfterDebt = operatingCashFlow === null || annualDebtService === null ? null : operatingCashFlow - annualDebtService
    const coc = equity && cashAfterDebt !== null && equity > 0 ? cashAfterDebt / equity : null
    const dscr = annualDebtService && operatingCashFlow !== null && annualDebtService > 0 ? operatingCashFlow / annualDebtService : null
    const debtBalanceAtExit = debt === null || annualDebtService === null ? null : Math.max(0, rate === 0 ? debt - annualDebtService * Math.min(holdPeriod, amortizationYears) : debt * (1 + rate) ** Math.min(holdPeriod, amortizationYears) - annualDebtService * (((1 + rate) ** Math.min(holdPeriod, amortizationYears) - 1) / rate))
    const exitEnterpriseValue = ebitda === null ? null : ebitda * exitMultiple
    const exitEquityProceeds = exitEnterpriseValue === null || debtBalanceAtExit === null ? null : exitEnterpriseValue - exitCosts - debtBalanceAtExit - sellerNote
    const cashFlows = equity !== null && operatingCashFlow !== null && annualDebtService !== null && exitEquityProceeds !== null
        ? [-equity, ...Array.from({ length: holdPeriod }, (_, year) => operatingCashFlow - (year < amortizationYears ? annualDebtService : 0) + (year === holdPeriod - 1 ? exitEquityProceeds : 0))]
        : null
    const totalMoic = equity && cashFlows ? cashFlows.slice(1).reduce((sum, cashFlow) => sum + cashFlow, 0) / equity : null
    const irr = cashFlows ? calculateIrr(cashFlows) : null
    const ready = cashAfterDebt !== null && equity !== null
    const exitReady = exitEquityProceeds !== null && cashFlows !== null
    const cashFlowChartData = cashFlows?.map((cashFlow, index) => ({ label: index === 0 ? 'Close' : `Year ${index}`, cashFlow })) ?? []
    const ebitdaEvidence = buildFactEvidence({ field: 'ebitda_sde', title: 'EBITDA / SDE evidence', facts: documentedFacts, documents })
    const documentedInputs = [
        ...(ebitdaIsConfirmed ? [{ label: 'EBITDA / SDE', value: money(ebitda!) }] : []),
        ...(priceIsConfirmed ? [{ label: 'Purchase price', value: money(model.purchasePrice!) }] : []),
    ]
    const modelAssumptions = [
        ...(!ebitdaIsConfirmed ? [{ label: 'EBITDA / SDE', value: ebitda === null ? 'Not documented' : `${money(ebitda)} (Illustrative preview)` }] : []),
        ...(!priceIsConfirmed ? [{ label: 'Purchase / asking price', value: price === null ? 'Not set' : `${money(price)} (From asking price)` }] : []),
        { label: 'Equity contribution', value: `${(equityPct * 100).toFixed(0)}%` },
        { label: 'Senior debt interest rate', value: `${(rate * 100).toFixed(1)}%` },
        { label: 'Loan amortization', value: `${amortizationYears} years` },
        { label: 'Effective tax rate', value: `${(tax * 100).toFixed(1)}%` },
        { label: 'Hold period', value: `${holdPeriod} years` },
        { label: 'Terminal exit multiple', value: `${exitMultiple}x` },
        { label: 'Terminal exit costs', value: money(exitCosts) },
        { label: 'Maintenance capex', value: money(capex) },
        { label: 'Transaction fees', value: money(fees) },
        { label: 'Working capital reserve', value: money(wc) },
        { label: 'Seller note', value: money(sellerNote) },
    ]
    const evidence = (title: string, formula: string, isConfirmed = false) => buildDerivedEvidence({
        title,
        formula,
        documentedInputs,
        modelAssumptions,
        primaryFact: ebitdaEvidence,
        isConfirmed,
    })

    return (
        <Card className="overflow-hidden border-primary/30">
            <CardHeader className="border-b border-primary/20 bg-primary/5">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Landmark className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Financed acquisition scenario</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                            Level-payment debt model with optional terminal sale proceeds.
                        </CardDescription>
                    </div>
                    <Badge variant={ready ? 'success' : 'secondary'}>{ready ? 'Inputs available' : 'Inputs needed'}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
                    <p className="text-sm font-semibold">Quick read</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {!ready ? 'Add price and EBITDA/SDE to see how much equity the buyer needs and whether operating cash flow can carry the debt.' : <>The buyer contributes {money(equity!)} at close and retains {money(cashAfterDebt!)} after annual debt service. {dscr !== null ? `Debt coverage is ${dscr.toFixed(2)}x${dscr < 1.25 ? ', which is below the usual 1.25x screening threshold' : ', indicating operating cash flow covers scheduled debt service'}.` : ''}{exitReady && totalMoic !== null ? ` The modeled exit produces ${totalMoic.toFixed(2)}x on equity.` : ''}</>}
                    </p>
                </div>
                {!ready ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                        Add documented EBITDA/SDE, price, tax rate, equity contribution, interest rate, and amortization term.
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Metric
                            label="Equity at close"
                            value={money(equity!)}
                            detail="uses − debt − seller note"
                            evidence={evidence('Equity at close', 'equity = total uses − senior debt − seller note', priceIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="Equity contribution"
                            alignTip="left"
                            statusBadge={priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Confirmed Price</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Price</Badge>}
                        />
                        <Metric
                            label="Annual debt service"
                            value={money(annualDebtService!)}
                            detail="amortizing loan payment"
                            evidence={evidence('Annual debt service', 'annual debt service is the level payment calculated from senior debt, interest rate, and amortization term', priceIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="Amortization"
                            alignTip="left"
                            statusBadge={priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Confirmed Debt</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Model Assumption</Badge>}
                        />
                        <Metric
                            label="Cash after debt service"
                            value={money(cashAfterDebt!)}
                            detail="year-one operating cash flow − debt service"
                            evidence={evidence('Cash after debt service', 'cash after debt service = EBITDA/SDE × (1 − tax rate) − maintenance capex − annual debt service', ebitdaIsConfirmed && priceIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="Levered cash flow"
                            alignTip="center"
                            statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified EBITDA</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative EBITDA</Badge>}
                        />
                        <Metric
                            label="Cash-on-cash return"
                            value={coc === null ? 'Not available' : `${(coc * 100).toFixed(1)}%`}
                            detail="cash after debt ÷ equity"
                            evidence={evidence('Cash-on-cash return', 'cash-on-cash return = cash after debt service ÷ equity at close', ebitdaIsConfirmed && priceIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="Cash-on-cash"
                            alignTip="right"
                            statusBadge={ebitdaIsConfirmed && priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified CoC</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Model</Badge>}
                        />
                        <Metric
                            label="Debt-service coverage (DSCR)"
                            value={dscr === null ? 'Not available' : `${dscr.toFixed(2)}x`}
                            detail="operating cash flow ÷ debt service"
                            evidence={evidence('Debt-service coverage ratio', 'DSCR = operating cash flow ÷ annual debt service', ebitdaIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="DSCR"
                            alignTip="left"
                            statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified DSCR</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative EBITDA</Badge>}
                        />
                        <Metric
                            label="Debt balance at exit"
                            value={debtBalanceAtExit === null ? 'Add hold period' : money(debtBalanceAtExit)}
                            detail="remaining amortizing debt at sale"
                            evidence={evidence('Debt balance at exit', 'remaining debt is calculated after scheduled level payments through the hold period', priceIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="Debt balance"
                            alignTip="left"
                            statusBadge={priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Confirmed Debt</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Model Assumption</Badge>}
                        />
                        <Metric
                            label="Net equity proceeds at exit"
                            value={exitEquityProceeds === null ? 'Add exit inputs' : money(exitEquityProceeds)}
                            detail="exit value − costs − debt − seller note"
                            evidence={evidence('Net equity proceeds at exit', 'net exit proceeds = EBITDA/SDE × exit multiple − exit costs − debt balance − seller note', ebitdaIsConfirmed && priceIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="Net exit proceeds"
                            alignTip="center"
                            statusBadge={ebitdaIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified EBITDA</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative EBITDA</Badge>}
                        />
                        <Metric
                            label="Total MOIC / IRR"
                            value={!exitReady ? 'Add exit inputs' : `${totalMoic?.toFixed(2) ?? '—'}x / ${irr === null ? 'Not available' : `${(irr * 100).toFixed(1)}%`}`}
                            detail="levered cash flows including sale"
                            evidence={evidence('Levered MOIC and IRR', 'MOIC is total post-close levered cash flows ÷ initial equity; IRR is solved from the full cash-flow timeline', ebitdaIsConfirmed && priceIsConfirmed)}
                            onOpenEvidence={onOpenEvidence}
                            infoTerm="MOIC"
                            alignTip="right"
                            statusBadge={ebitdaIsConfirmed && priceIsConfirmed ? <Badge variant="success" className="text-[10px] px-1.5 py-0">✓ Verified Exit</Badge> : <Badge variant="warning" className="text-[10px] px-1.5 py-0">⚠ Illustrative Preview</Badge>}
                        />
                    </div>
                )}
                {exitReady ? (
                    <CashFlowChart
                        title="Levered cash-flow timeline"
                        data={cashFlowChartData}
                        isVerified={ebitdaIsConfirmed}
                        ebitdaLabel={ebitdaIsConfirmed ? `$${ebitda?.toLocaleString('en-US', { maximumFractionDigits: 0 })} (Confirmed Fact)` : 'Illustrative preview ($200k)'}
                        priceLabel={priceIsConfirmed ? `$${model.purchasePrice?.toLocaleString('en-US', { maximumFractionDigits: 0 })} (Confirmed Price)` : 'Illustrative preview ($1.0M)'}
                    />
                ) : null}
                {dscr !== null && dscr < 1.25 ? (
                    <p className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">
                        Downside warning: DSCR is below 1.25x. Review leverage, operating assumptions, or debt terms.
                    </p>
                ) : null}
                <p className="text-xs leading-5 text-muted-foreground">
                    Price, financing, exit multiple, and exit costs are analyst assumptions unless documented. The seller note is conservatively treated as still payable at exit because no repayment terms are stored. The baseline holds EBITDA/SDE constant; Growth scenarios remain separate.
                </p>
            </CardContent>
        </Card>
    )
}

