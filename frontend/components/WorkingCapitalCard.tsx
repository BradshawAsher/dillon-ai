import { useMemo } from 'react'
import { Coins } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

export default function WorkingCapitalCard({ model }: Props) {
    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const ar = typeof facts.accounts_receivable?.value === 'number' ? facts.accounts_receivable.value : null
        const inventory = typeof facts.inventory?.value === 'number' ? facts.inventory.value : null
        const cash = typeof facts.cash_equivalents?.value === 'number' ? facts.cash_equivalents.value : null

        if (!revenue || revenue <= 0) return null

        const dailyRevenue = revenue / 365

        const dso = ar ? Math.round(ar / dailyRevenue) : null
        const dih = inventory ? Math.round(inventory / (revenue * 0.6 / 365)) : null

        const currentAssets = (ar ?? 0) + (inventory ?? 0) + (cash ?? 0)
        const estimatedPayables = revenue * 0.12
        const netWC = currentAssets - estimatedPayables
        const wcAsPercentOfRev = (netWC / revenue) * 100
        const wcRequirement = model.workingCapitalRequirement ?? 0

        const growth = model.baseRevenueGrowth ?? 0.05
        const additionalWCNeeded = netWC * growth

        const items = [
            { label: 'Accounts receivable', value: ar, days: dso ? `${dso} days sales` : null },
            { label: 'Inventory', value: inventory, days: dih ? `${dih} days on hand` : null },
            { label: 'Cash & equivalents', value: cash, days: null },
        ].filter(i => i.value != null && i.value > 0) as { label: string; value: number; days: string | null }[]

        return {
            items,
            netWC: Math.round(netWC),
            wcAsPercentOfRev: wcAsPercentOfRev.toFixed(1),
            wcRequirement,
            additionalWCNeeded: Math.round(additionalWCNeeded),
            dso,
            dih,
            revenue,
        }
    }, [model])

    if (!data || data.items.length === 0) return null

    const wcHealth = parseFloat(data.wcAsPercentOfRev) <= 15 ? 'Efficient' : parseFloat(data.wcAsPercentOfRev) <= 25 ? 'Normal' : 'Capital intensive'
    const wcColor = parseFloat(data.wcAsPercentOfRev) <= 15 ? 'text-green-600' : parseFloat(data.wcAsPercentOfRev) <= 25 ? 'text-blue-600' : 'text-amber-600'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Working capital analysis</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Cash tied up in operations and growth capital requirements.
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">Net working capital</p>
                        <p className="text-sm font-bold text-foreground">${data.netWC.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">WC / Revenue</p>
                        <p className={`text-sm font-bold ${wcColor}`}>{data.wcAsPercentOfRev}%</p>
                        <p className={`text-[9px] ${wcColor}`}>{wcHealth}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-[10px] text-muted-foreground">Growth WC needed</p>
                        <p className="text-sm font-bold text-foreground">${data.additionalWCNeeded.toLocaleString()}/yr</p>
                    </div>
                </div>

                <div className="space-y-2">
                    {data.items.map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-xs text-foreground">{item.label}</p>
                                {item.days && <p className="text-[10px] text-muted-foreground">{item.days}</p>}
                            </div>
                            <span className="text-xs font-mono font-medium text-foreground">${item.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>

                {(data.dso != null || data.dih != null) && (
                    <div className="rounded-lg bg-muted/50 p-2.5 text-[10px] text-muted-foreground space-y-1">
                        {data.dso != null && (
                            <p>{data.dso <= 30 ? '✓' : data.dso <= 45 ? '◐' : '⚠'} DSO of {data.dso} days is {data.dso <= 30 ? 'excellent — customers pay quickly' : data.dso <= 45 ? 'normal for B2B' : 'elevated — consider tightening payment terms'}</p>
                        )}
                        {data.dih != null && (
                            <p>{data.dih <= 45 ? '✓' : data.dih <= 90 ? '◐' : '⚠'} Inventory turns every {data.dih} days — {data.dih <= 45 ? 'lean operations' : data.dih <= 90 ? 'standard' : 'slow-moving, ties up cash'}</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
