import { BarChart3 } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

export default function IndustryBenchmarksCard() {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Industry benchmarks</CardTitle>
                            <CardInfoPopover cardId="industry-benchmarks" />
                        </div>
                        <CardDescription>Compare this deal against industry medians. Only shown when a source, as-of date, and comparability notes are available.</CardDescription>
                    </div>
                    <Badge variant="secondary">Coming soon</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 text-center">
                    <p className="text-sm font-semibold text-foreground">Industry benchmarks are not yet connected</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        When available, this section will show how the target&apos;s EBITDA margin, revenue growth, customer concentration, and debt levels compare against industry medians.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'EBITDA margin', benchmark: '15–25%', note: 'SDE-adjusted for sub-$10M revenue' },
                            { label: 'Revenue growth', benchmark: '5–15% YoY', note: 'Organic, excluding M&A' },
                            { label: 'Customer concentration', benchmark: '<20% top client', note: 'Revenue share from largest customer' },
                            { label: 'Debt / EBITDA', benchmark: '<3.0x', note: 'Senior debt only' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-md border border-dashed border-border p-3 text-left">
                                <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                <p className="mt-1 text-sm font-semibold text-foreground">{item.benchmark}</p>
                                <p className="mt-1 text-[10px] text-muted-foreground">{item.note}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                        Requirements: a reliable benchmark source (BizBuySell, IBIS, PitchBook), an as-of date, comparability notes on industry/size segment, and analyst review confirming the comparison is fair.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
