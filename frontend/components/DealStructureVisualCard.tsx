import { WalletCards } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { buildDerivedEvidence, type EvidenceItem } from '../utils/evidence'
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
    const data = [
        { label: isIllustrativePreview ? 'Illustrative purchase price' : 'Purchase price', value: price },
        { label: 'Fees + working capital', value: fees + workingCapital },
        { label: 'Senior debt', value: seniorDebt },
        { label: 'Equity', value: equity },
        ...(sellerNote > 0 ? [{ label: 'Seller note', value: sellerNote }] : []),
    ]
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
            <CardDescription>Illustrative capital stack based on the current project's saved price and financing assumptions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
            {isIllustrativePreview ? <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm text-foreground"><p className="font-semibold">Illustrative model preview</p><p className="mt-1 text-muted-foreground">This card uses display-only starting values because this project is still missing a saved price. Nothing in this preview is saved to the project; returned facts and your inputs replace it automatically.</p></div> : null}
            <>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Total uses</p><p className="mt-1 text-lg font-semibold">{money(uses)}</p></div>
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative equity</p><p className="mt-1 text-lg font-semibold">{money(equity)}</p></div>
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative senior debt</p><p className="mt-1 text-lg font-semibold">{money(seniorDebt)}</p></div>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Starting assumptions</p><Badge variant={isIllustrativePreview ? 'warning' : 'secondary'}>{isIllustrativePreview ? 'Preview values' : 'Saved inputs'}</Badge></div><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><div><p className="text-xs text-muted-foreground">Purchase price</p><p className="mt-1 text-sm font-medium">{money(price)}</p></div><div><p className="text-xs text-muted-foreground">Transaction fees</p><p className="mt-1 text-sm font-medium">{money(fees)}</p></div><div><p className="text-xs text-muted-foreground">Working capital</p><p className="mt-1 text-sm font-medium">{money(workingCapital)}</p></div><div><p className="text-xs text-muted-foreground">Equity contribution</p><p className="mt-1 text-sm font-medium">{(equityPercent * 100).toFixed(0)}%</p></div><div><p className="text-xs text-muted-foreground">Seller note</p><p className="mt-1 text-sm font-medium">{money(sellerNote)}</p></div></div></div>
                <MoneyBarChart title="Capital stack" description="Uses and funding sources should reconcile after you review the assumptions below." data={data} />
                {onOpenEvidence ? <button type="button" onClick={() => onOpenEvidence(capitalStackEvidence)} className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How this was calculated</button> : null}
            </>
            <p className="text-xs leading-5 text-muted-foreground">This is an illustrative structure, not a lender commitment. Edit the saved assumptions below before relying on the debt and equity mix.</p>
        </CardContent>
    </Card>
}
