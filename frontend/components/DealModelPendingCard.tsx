import { Calculator, LineChart, WalletCards } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import type { DealModel } from '../hooks/backend/diligence'

type PendingArea = 'returns' | 'growth' | 'structure'

const content = {
    returns: { icon: Calculator, title: 'Returns model', description: 'Cash-on-cash return, debt service, IRR, payback, and MOIC belong here.', required: 'Required inputs: purchase price, equity contribution, interest rate, amortization, fees, taxes, and documented operating cash flow.' },
    growth: { icon: LineChart, title: 'Growth scenarios', description: 'Conservative, base, and aggressive revenue, margin, and business-value projections belong here.', required: 'Required inputs: historical financials, growth assumptions, capacity constraints, pricing assumptions, and evidence supporting each scenario.' },
    structure: { icon: WalletCards, title: 'Deal structure', description: 'Sources and uses, seller financing, earn-outs, rollover equity, and debt capacity belong here.', required: 'Required inputs: purchase price, debt payoff, closing costs, working-capital need, and the buyer’s financing constraints.' },
} satisfies Record<PendingArea, { icon: typeof Calculator; title: string; description: string; required: string }>

const fields: Partial<Record<PendingArea, Array<[keyof DealModel, string]>>> = {
    returns: [['holdPeriodYears', 'Hold period (years)'], ['taxRate', 'Tax rate (decimal)'], ['maintenanceCapex', 'Annual maintenance capex'], ['exitMultiple', 'Exit multiple'], ['exitCosts', 'Exit costs']],
    structure: [['purchasePrice', 'Purchase price'], ['debtAssumed', 'Debt assumed'], ['cashAcquired', 'Cash acquired'], ['workingCapitalRequirement', 'Working-capital requirement'], ['transactionFees', 'Transaction fees']],
}

export default function DealModelPendingCard({ area, model, onChange }: { area: PendingArea; model?: DealModel; onChange?: (field: keyof DealModel, value: string) => void }) {
    const item = content[area]
    const Icon = item.icon
    const areaFields = fields[area] ?? []
    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><CardTitle className="text-xl">{item.title}</CardTitle></div><CardDescription>{item.description}</CardDescription></CardHeader><CardContent className="space-y-5 p-5">{areaFields.length > 0 ? <div className="rounded-lg border border-primary/25 bg-primary/5 p-4"><p className="text-sm font-semibold text-foreground">Saved model assumptions</p><p className="mt-1 text-xs leading-5 text-muted-foreground">These are analyst-entered assumptions, not document facts. They save to the selected project.</p><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{areaFields.map(([field, label]) => <label key={field} className="space-y-1"><span className="text-xs font-medium text-muted-foreground">{label}</span><Input inputMode="decimal" value={model?.[field] ?? ''} onChange={(event) => onChange?.(field, event.target.value)} placeholder="Not set" /></label>)}</div></div> : null}<div className="rounded-lg border border-dashed border-border bg-muted/20 p-5"><p className="text-sm font-semibold text-foreground">Model calculations not configured yet</p><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{item.required} MergeWorks should not generate return or growth outputs until those inputs are either supported by uploaded documents or explicitly confirmed as assumptions.</p></div></CardContent></Card>
}
