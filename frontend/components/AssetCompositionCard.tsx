import { useMemo } from 'react'
import { PieChart } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type AssetSlice = {
    label: string
    value: number
    color: string
}

const COLORS = [
    'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
]

export default function AssetCompositionCard({ model }: Props) {
    const slices = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const items: AssetSlice[] = []

        const assetKeys: [string, string][] = [
            ['cash_equivalents', 'Cash & Equivalents'],
            ['accounts_receivable', 'Accounts Receivable'],
            ['inventory', 'Inventory'],
            ['real_estate', 'Real Estate'],
            ['equipment', 'Equipment'],
            ['furniture_fixtures', 'Furniture & Fixtures'],
            ['vehicles', 'Vehicles'],
            ['intellectual_property', 'Intellectual Property'],
            ['goodwill', 'Goodwill'],
            ['total_assets', 'Total Assets'],
        ]

        for (const [key, label] of assetKeys) {
            const fact = facts[key]
            if (fact && typeof fact.value === 'number' && fact.value > 0 && key !== 'total_assets') {
                items.push({ label, value: fact.value, color: COLORS[items.length % COLORS.length] })
            }
        }

        if (items.length === 0) {
            const totalAssets = facts.total_assets?.value
            const totalLiabilities = facts.total_liabilities?.value
            const equity = facts.equity?.value || facts.net_worth?.value
            const ar = facts.accounts_receivable?.value
            const inv = facts.inventory?.value

            if (typeof totalAssets === 'number' && totalAssets > 0) {
                if (typeof ar === 'number' && ar > 0) items.push({ label: 'Accounts Receivable', value: ar, color: COLORS[0] })
                if (typeof inv === 'number' && inv > 0) items.push({ label: 'Inventory', value: inv, color: COLORS[1] })
                const known = (ar || 0) + (inv || 0)
                if (totalAssets > known) items.push({ label: 'Other Assets', value: totalAssets - known, color: COLORS[2] })
            } else if (typeof equity === 'number' && equity > 0 && typeof totalLiabilities === 'number') {
                items.push({ label: 'Net Equity', value: equity, color: COLORS[0] })
                if (totalLiabilities > 0) items.push({ label: 'Liabilities', value: totalLiabilities, color: COLORS[3] })
            }
        }

        return items
    }, [model])

    if (slices.length === 0) return null

    const total = slices.reduce((sum, s) => sum + s.value, 0)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Asset composition</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="mb-4 flex h-6 w-full overflow-hidden rounded-full">
                    {slices.map((slice, i) => (
                        <div
                            key={i}
                            className={`${slice.color} transition-all`}
                            style={{ width: `${(slice.value / total) * 100}%` }}
                            title={`${slice.label}: $${slice.value.toLocaleString()} (${((slice.value / total) * 100).toFixed(1)}%)`}
                        />
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {slices.map((slice, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <span className={`h-3 w-3 shrink-0 rounded-sm ${slice.color}`} />
                            <div className="min-w-0 flex-1">
                                <span className="text-xs text-foreground truncate block">{slice.label}</span>
                                <span className="text-[10px] text-muted-foreground">
                                    ${slice.value.toLocaleString()} ({((slice.value / total) * 100).toFixed(0)}%)
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-3 border-t border-border pt-2 text-right">
                    <span className="text-sm font-semibold text-foreground">Total: ${total.toLocaleString()}</span>
                </div>
            </CardContent>
        </Card>
    )
}
