import { TriangleAlert, WalletCards } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { buildDerivedEvidence, type EvidenceItem } from '../utils/evidence'
import { parseDocumentedFacts } from '../utils/evidence'
import { MoneyBarChart } from './DealCharts'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function DealStructureVisualCard({ model, onOpenEvidence }: { model: DealModel; onOpenEvidence?: (evidence: EvidenceItem) => void }) {
    const savedPrice = model.purchasePrice ?? model.askingPrice
    const isIllustrativePreview = savedPrice === null
    // Preview-only fallbacks keep the workspace legible before the live facts
    // bridge has delivered an asking price or purchase price. They are never
    // saved to the project.
    const price = savedPrice ?? 1_000_000
    const fees = model.transactionFees ?? (isIllustrativePreview ? 10_000 : 0)
    const workingCapital = model.workingCapitalRequirement ?? (isIllustrativePreview ? 20_000 : 0)
    const sellerNote = model.sellerNoteAmount ?? 0
    const equityPercent = model.equityContributionPercent ?? 0.3
    const uses = price + fees + workingCapital
    const equity = uses * equityPercent
    const seniorDebt = Math.max(0, uses - equity - sellerNote)
    const usesData = [
        { label: isIllustrativePreview ? 'Illustrative purchase price' : 'Purchase price', value: price },
        { label: 'Fees + working capital', value: fees + workingCapital },
    ]
    const sourcesData = [
        { label: 'Senior debt', value: seniorDebt },
        { label: 'Equity', value: equity },
        ...(sellerNote > 0 ? [{ label: 'Seller note', value: sellerNote }] : []),
    ]
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null
    const leverage = ebitda !== null && ebitda > 0 ? seniorDebt / ebitda : null
    const taxRate = model.taxRate ?? 0.25
    const capex = model.maintenanceCapex ?? 0
    const interestRate = model.interestRate ?? 0.1
    const amortizationYears = Math.max(1, model.amortizationYears ?? 10)
    const annualDebtService = seniorDebt === 0 ? 0 : interestRate === 0 ? seniorDebt / amortizationYears : seniorDebt * ((interestRate * (1 + interestRate) ** amortizationYears) / ((1 + interestRate) ** amortizationYears - 1))
    const operatingCashFlow = ebitda === null ? null : ebitda * (1 - taxRate) - capex
    const dscr = operatingCashFlow !== null && annualDebtService > 0 ? operatingCashFlow / annualDebtService : null
    const hasIllustrativeFinancing = isIllustrativePreview || model.interestRate === null || model.interestRate === undefined || model.amortizationYears === null || model.amortizationYears === undefined
    const capitalStackEvidence = buildDerivedEvidence({
        title: 'Illustrative capital stack',
        formula: 'total uses = purchase price + transaction fees + working-capital requirement; equity = total uses × equity contribution; senior debt = total uses − equity − seller note',
        analystInputs: [
            { label: isIllustrativePreview ? 'Illustrative purchase price' : 'Purchase / asking price', value: money(price) },
            { label: 'Transaction fees', value: money(fees) },
            { label: 'Working-capital requirement', value: money(workingCapital) },
            { label: 'Equity contribution', value: `${(equityPercent * 100).toFixed(0)}%` },
            { label: 'Seller note', value: money(sellerNote) },
        ],
    })

    return <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-card/80">
            <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Sources and uses</CardTitle>{isIllustrativePreview ? <Badge variant="warning">Illustrative preview</Badge> : null}</div>
            <CardDescription>Capital stack based on the current project's saved price and financing assumptions, with clearly labeled preview values when a required assumption is still missing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
            <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md"><p className="text-sm font-bold uppercase tracking-wide text-primary">Start here — deal structure at a glance</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Total acquisition uses</p><p className="mt-1 text-lg font-bold">{money(uses)}</p></div><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Buyer equity at close</p><p className="mt-1 text-lg font-bold">{money(equity)}</p></div><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Senior debt funding</p><p className="mt-1 text-lg font-bold">{uses > 0 ? `${((seniorDebt / uses) * 100).toFixed(0)}%` : '—'}</p></div></div><p className="mt-4 text-sm leading-6 text-foreground">The buyer funds {uses > 0 ? `${((equity / uses) * 100).toFixed(0)}%` : '—'} of the deal with equity and the rest with debt. {dscr === null ? 'Add confirmed EBITDA/SDE to test whether the business can comfortably carry that debt.' : `Operating cash flow covers the planned debt service ${dscr.toFixed(2)}x.`}</p></div>
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4"><p className="text-sm font-semibold">Structure at a glance</p><p className="mt-1 text-sm leading-6 text-muted-foreground">This structure funds {uses > 0 ? `${((seniorDebt / uses) * 100).toFixed(0)}%` : '—'} of total uses with senior debt and {uses > 0 ? `${((equity / uses) * 100).toFixed(0)}%` : '—'} with buyer equity. {leverage !== null ? `Debt equals ${leverage.toFixed(1)}x EBITDA/SDE.` : 'Add confirmed EBITDA/SDE to assess leverage.'}{dscr !== null ? ` Operating cash flow covers annual debt service ${dscr.toFixed(2)} times.` : ''}</p></div>
            {isIllustrativePreview ? <div role="alert" className="rounded-lg border-2 border-destructive/60 bg-destructive/10 p-4 text-sm text-foreground shadow-sm"><div className="flex items-center gap-2 text-destructive"><TriangleAlert className="h-5 w-5 shrink-0" /><p className="font-bold uppercase tracking-wide">Illustrative model preview — not source-backed</p></div><p className="mt-2 font-medium">This card uses display-only starting values because this project is still missing a saved price.</p><p className="mt-1 text-muted-foreground">Nothing in this preview is saved to the project; returned facts and your saved model assumptions replace it automatically.</p></div> : null}
            <>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Total uses</p><p className="mt-1 text-lg font-semibold">{money(uses)}</p></div>
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative equity</p><p className="mt-1 text-lg font-semibold">{money(equity)}</p></div>
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative senior debt</p><p className="mt-1 text-lg font-semibold">{money(seniorDebt)}</p></div>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Leverage and downside resilience</p><p className="mt-1 text-xs text-muted-foreground">These are screening indicators, not lender underwriting.</p></div>{hasIllustrativeFinancing ? <Badge variant="warning">Financing assumptions included</Badge> : <Badge variant="outline">Saved financing inputs</Badge>}</div><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-md border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Debt funding</p><p className="mt-1 text-lg font-semibold">{uses > 0 ? `${((seniorDebt / uses) * 100).toFixed(0)}%` : '—'}</p><p className="mt-1 text-xs text-muted-foreground">senior debt ÷ total uses</p></div><div className="rounded-md border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Debt / EBITDA</p><p className="mt-1 text-lg font-semibold">{leverage === null ? 'Needs EBITDA' : `${leverage.toFixed(1)}x`}</p><p className="mt-1 text-xs text-muted-foreground">senior debt ÷ confirmed EBITDA/SDE</p></div><div className="rounded-md border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Debt-service coverage</p><p className="mt-1 text-lg font-semibold">{dscr === null ? 'Needs EBITDA' : `${dscr.toFixed(2)}x`}</p><p className="mt-1 text-xs text-muted-foreground">operating cash flow ÷ annual debt service</p></div></div>{dscr !== null && dscr < 1.25 ? <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">Downside resilience is thin: DSCR is below 1.25×. Consider lower leverage, more equity, a seller note, or revised terms.</p> : leverage !== null && leverage > 5 ? <p className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-foreground">Leverage is above 5.0× confirmed EBITDA/SDE. Review cash-flow downside and lender constraints before relying on this structure.</p> : null}</div>
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Starting assumptions</p><Badge variant={isIllustrativePreview ? 'warning' : 'secondary'}>{isIllustrativePreview ? 'Preview values' : 'Saved inputs'}</Badge></div><p className="mt-1 text-xs text-muted-foreground">You can still inspect the calculation even when some starting assumptions are missing; preview values are shown explicitly and should not be treated as confirmed deal terms.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-muted-foreground">Purchase price</p><p className="mt-1 text-sm font-medium">{money(price)}</p></div><div><p className="text-xs text-muted-foreground">Transaction fees</p><p className="mt-1 text-sm font-medium">{money(fees)}</p></div><div><p className="text-xs text-muted-foreground">Working capital</p><p className="mt-1 text-sm font-medium">{money(workingCapital)}</p></div><div><p className="text-xs text-muted-foreground">Equity contribution</p><p className="mt-1 text-sm font-medium">{(equityPercent * 100).toFixed(0)}%</p></div><div><p className="text-xs text-muted-foreground">Seller note</p><p className="mt-1 text-sm font-medium">{money(sellerNote)}</p></div></div></div>
                <div className="grid gap-4 xl:grid-cols-2"><MoneyBarChart title="Uses" description="Purchase price plus transaction fees and working-capital funding needs." data={usesData} /><MoneyBarChart title="Sources" description="Funding mix: senior debt, equity, and any seller note. Sources reconcile to uses." data={sourcesData} /></div>
                {onOpenEvidence ? <button type="button" onClick={() => onOpenEvidence(capitalStackEvidence)} className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How this was calculated</button> : null}
            </>
            <p className="text-xs leading-5 text-muted-foreground">This is an illustrative structure, not a lender commitment. Edit the saved assumptions below before relying on the debt and equity mix.</p>
        </CardContent>
    </Card>
}
