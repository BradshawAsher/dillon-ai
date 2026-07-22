import { Calculator, LineChart, WalletCards } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'

type PendingArea = 'returns' | 'growth' | 'structure'

const content = {
    returns: { icon: Calculator, title: 'Returns model', description: 'Cash-on-cash return, debt service, IRR, payback, and MOIC belong here.', required: 'Required inputs: purchase price, equity contribution, interest rate, amortization, fees, taxes, and documented operating cash flow.' },
    growth: { icon: LineChart, title: 'Growth scenarios', description: 'Conservative, base, and aggressive revenue, margin, and business-value projections belong here.', required: 'Required inputs: historical financials, growth assumptions, capacity constraints, pricing assumptions, and evidence supporting each scenario.' },
    structure: { icon: WalletCards, title: 'Deal structure', description: 'Sources and uses, seller financing, earn-outs, rollover equity, and debt capacity belong here.', required: 'Required inputs: purchase price, debt payoff, closing costs, working-capital need, and the buyer’s financing constraints.' },
} satisfies Record<PendingArea, { icon: typeof Calculator; title: string; description: string; required: string }>

export default function DealModelPendingCard({ area }: { area: PendingArea }) {
    const item = content[area]
    const Icon = item.icon
    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><CardTitle className="text-xl">{item.title}</CardTitle></div><CardDescription>{item.description}</CardDescription></CardHeader><CardContent className="p-5"><div className="rounded-lg border border-dashed border-border bg-muted/20 p-5"><p className="text-sm font-semibold text-foreground">Model not configured yet</p><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{item.required} MergeWorks should not generate return or growth outputs until those inputs are either supported by uploaded documents or explicitly confirmed as assumptions.</p></div></CardContent></Card>
}
