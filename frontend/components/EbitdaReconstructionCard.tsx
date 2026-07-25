import { Calculator, CircleAlert } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import { WaterfallChart, type WaterfallDatum } from './DealCharts'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function pct(value: number) {
    return `${(value * 100).toFixed(1)}%`
}

type LineItem = {
    label: string
    value: number
    source: 'documented' | 'calculated' | 'analyst'
    note?: string
}

export default function EbitdaReconstructionCard({ model, onOpenEvidence }: { model: DealModel; onOpenEvidence?: (evidence: EvidenceItem) => void }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null

    if (revenue === null || ebitda === null) return null

    const margin = ebitda / revenue
    const opex = revenue - ebitda
    const lines: LineItem[] = [
        { label: 'Revenue', value: revenue, source: 'documented' },
        { label: 'Less: Operating expenses (implied)', value: -opex, source: 'calculated', note: 'Revenue minus EBITDA/SDE' },
        { label: 'EBITDA / SDE', value: ebitda, source: 'documented' },
    ]

    const addBacks = facts.add_backs
    if (addBacks && typeof addBacks.value === 'number' && addBacks.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Owner add-backs', value: addBacks.value, source: addBacks.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    const depreciation = facts.depreciation
    if (depreciation && typeof depreciation.value === 'number' && depreciation.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Depreciation & amortization', value: depreciation.value, source: depreciation.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    const interest = facts.interest_expense
    if (interest && typeof interest.value === 'number' && interest.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Interest expense', value: interest.value, source: interest.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    const taxes = facts.taxes
    if (taxes && typeof taxes.value === 'number' && taxes.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Taxes', value: taxes.value, source: taxes.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    const warnings: string[] = []
    if (margin > 0.6) warnings.push(`Margin is ${pct(margin)} — unusually high, verify add-backs`)
    if (margin < 0.05) warnings.push(`Margin is ${pct(margin)} — very thin, check for missing line items`)
    if (margin < 0) warnings.push(`Negative EBITDA margin (${pct(margin)}) — verify sign and period`)

    return <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-card/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /><CardTitle className="text-xl">EBITDA reconstruction</CardTitle></div>
                    <CardDescription className="mt-1">Breaks documented revenue into operating components. Line items marked "calculated" are implied from confirmed totals; they are not independently verified.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={warnings.length ? 'warning' : 'success'}>{warnings.length ? `${warnings.length} review item${warnings.length > 1 ? 's' : ''}` : 'Reasonable'}</Badge>
                    <Badge variant="outline">{pct(margin)} margin</Badge>
                </div>
            </div>
        </CardHeader>
        <CardContent className="p-4">
            <div className="space-y-1">
                {lines.map((line, index) => (
                    <button
                        key={`${line.label}-${index}`}
                        type="button"
                        onClick={() => onOpenEvidence?.({
                            title: line.label,
                            sourceFile: facts.revenue?.citations?.[0]?.source_file || facts.ebitda_sde?.citations?.[0]?.source_file,
                            sourceLocation: facts.revenue?.citations?.[0]?.row_or_cell || 'Financial statement',
                            excerpt: `${line.label}: ${money(line.value)}${line.note ? ` (${line.note})` : ''}`,
                            status: line.source === 'documented' ? 'Confirmed' : line.source === 'calculated' ? 'Calculated' : 'Analyst entry',
                            provenance: 'EBITDA reconstruction',
                            period: facts.revenue?.period || facts.ebitda_sde?.period,
                            currency: facts.revenue?.currency || 'USD',
                        })}
                        className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30 ${line.label === 'EBITDA / SDE' ? 'border-t-2 border-primary/30 font-semibold' : ''}`}
                    >
                        <span className="flex items-center gap-2">
                            <span className="text-foreground">{line.label}</span>
                            <Badge variant={line.source === 'documented' ? 'success' : line.source === 'calculated' ? 'secondary' : 'outline'} className="text-[10px]">{line.source}</Badge>
                        </span>
                        <span className={`font-mono ${line.value < 0 ? 'text-destructive' : 'text-foreground'}`}>{money(line.value)}</span>
                    </button>
                ))}
            </div>

            {warnings.length > 0 ? <div className="mt-4 space-y-2">
                {warnings.map((warning) => (
                    <div key={warning} className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <p className="text-xs text-foreground">{warning}</p>
                    </div>
                ))}
            </div> : null}

            <WaterfallChart
                title="EBITDA bridge"
                description="Visual flow from revenue through expenses to EBITDA/SDE. Green bars add value; red bars subtract."
                data={lines.map((line): WaterfallDatum => ({
                    label: line.label.replace('Less: ', '').replace('Plus: ', '').replace(' (implied)', ''),
                    value: line.value,
                    type: line.label === 'Revenue' || line.label === 'EBITDA / SDE' ? 'total' : line.value >= 0 ? 'positive' : 'negative',
                }))}
            />

            <p className="mt-4 text-xs text-muted-foreground">Click any line to see its evidence source. Additional line items (interest, taxes, depreciation, add-backs) appear automatically when documented by the uploaded financials.</p>
        </CardContent>
    </Card>
}
