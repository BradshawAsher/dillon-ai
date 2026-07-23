import { WalletCards } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { buildDerivedEvidence, type EvidenceItem } from '../utils/evidence'
import { MoneyBarChart } from './DealCharts'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function DealStructureVisualCard({ model, onOpenEvidence }: { model: DealModel; onOpenEvidence?: (evidence: EvidenceItem) => void }) {
    const price = model.purchasePrice ?? model.askingPrice
    const fees = model.transactionFees ?? 0
    const workingCapital = model.workingCapitalRequirement ?? 0
    const sellerNote = model.sellerNoteAmount ?? 0
    const equityPercent = model.equityContributionPercent ?? 0.3
    const uses = price === null ? null : price + fees + workingCapital
    const equity = uses === null ? null : uses * equityPercent
    const seniorDebt = uses === null || equity === null ? null : Math.max(0, uses - equity - sellerNote)
    const data = uses === null || equity === null || seniorDebt === null ? [] : [
        { label: 'Purchase price', value: price ?? 0 },
        { label: 'Fees + working capital', value: fees + workingCapital },
        { label: 'Senior debt', value: seniorDebt },
        { label: 'Equity', value: equity },
        ...(sellerNote > 0 ? [{ label: 'Seller note', value: sellerNote }] : []),
    ]
    const capitalStackEvidence = buildDerivedEvidence({
        title: 'Illustrative capital stack',
        formula: 'total uses = purchase price + transaction fees + working-capital requirement; equity = total uses × equity contribution; senior debt = total uses − equity − seller note',
        analystInputs: [
            { label: 'Purchase / asking price', value: price === null ? 'Not set' : money(price) },
            { label: 'Transaction fees', value: money(fees) },
            { label: 'Working-capital requirement', value: money(workingCapital) },
            { label: 'Equity contribution', value: `${(equityPercent * 100).toFixed(0)}%` },
            { label: 'Seller note', value: money(sellerNote) },
        ],
    })

    return <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-card/80">
            <div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Sources and uses</CardTitle></div>
            <CardDescription>Illustrative capital stack based on the current project's saved price and financing assumptions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
            {uses === null ? <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">Add a purchase or asking price to see the illustrative sources-and-uses chart.</p> : <>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Total uses</p><p className="mt-1 text-lg font-semibold">{money(uses)}</p></div>
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative equity</p><p className="mt-1 text-lg font-semibold">{money(equity!)}</p></div>
                    <div className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">Illustrative senior debt</p><p className="mt-1 text-lg font-semibold">{money(seniorDebt!)}</p></div>
                </div>
                <MoneyBarChart title="Capital stack" description="Uses and funding sources should reconcile after you review the assumptions below." data={data} />
                {onOpenEvidence ? <button type="button" onClick={() => onOpenEvidence(capitalStackEvidence)} className="text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">How this was calculated</button> : null}
            </>}
            <p className="text-xs leading-5 text-muted-foreground">This is an illustrative structure, not a lender commitment. Edit the saved assumptions below before relying on the debt and equity mix.</p>
        </CardContent>
    </Card>
}
