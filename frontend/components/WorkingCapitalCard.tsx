import { useState, useMemo } from 'react'
import { Coins, Copy, Check, Calculator, FileText, ArrowUpDown } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { calculateWorkingCapitalPeg, type RollingTimeframe } from '../utils/workingCapitalPeg'

type Props = {
    model: DealModel
}

export default function WorkingCapitalCard({ model }: Props) {
    const [selectedTimeframe, setSelectedTimeframe] = useState<RollingTimeframe>('12m')
    const [collarPercent, setCollarPercent] = useState<number>(5)
    const [copiedClause, setCopiedClause] = useState<boolean>(false)
    const [showPegCalculator, setShowPegCalculator] = useState<boolean>(true)

    const pegResult = useMemo(() => {
        return calculateWorkingCapitalPeg(model, selectedTimeframe, collarPercent)
    }, [model, selectedTimeframe, collarPercent])

    const data = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const rawRevenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const revenue = rawRevenue && rawRevenue > 0 ? rawRevenue : 12_400_000
        const ar = typeof facts.accounts_receivable?.value === 'number' ? facts.accounts_receivable.value : 850_000
        const inventory = typeof facts.inventory?.value === 'number' ? facts.inventory.value : 420_000
        const cash = typeof facts.cash_equivalents?.value === 'number' ? facts.cash_equivalents.value : 350_000

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

    const handleCopyClause = () => {
        if (!pegResult.definitiveAgreementClause) return
        navigator.clipboard.writeText(pegResult.definitiveAgreementClause)
        setCopiedClause(true)
        setTimeout(() => setCopiedClause(false), 2000)
    }

    if (!data || data.items.length === 0) return null

    const wcHealth = parseFloat(data.wcAsPercentOfRev) <= 15 ? 'Efficient' : parseFloat(data.wcAsPercentOfRev) <= 25 ? 'Normal' : 'Capital intensive'
    const wcColor = parseFloat(data.wcAsPercentOfRev) <= 15 ? 'text-green-600' : parseFloat(data.wcAsPercentOfRev) <= 25 ? 'text-blue-600' : 'text-amber-600'

    return (
        <Card id="structure-working-capital-peg" className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Target Working Capital (NWC) Peg Calculator</CardTitle>
                        <CardInfoPopover cardId="working-capital" />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowPegCalculator(!showPegCalculator)}
                        className="flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                        <Calculator className="h-3.5 w-3.5" />
                        {showPegCalculator ? 'Hide Peg Engine' : 'Show Peg Engine'}
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Normalized rolling NWC peg benchmarks, seasonal swing volatility, and Definitive Purchase Agreement (APA) closing adjustment provisions.
                </p>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                {/* Core Net Working Capital Metrics */}
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

                {/* Interactive Target NWC Peg Calculator */}
                {showPegCalculator && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                            <div>
                                <span className="text-xs font-bold text-foreground">Rolling Peg Average:</span>
                                <span className="ml-1 text-xs text-muted-foreground font-mono">
                                    ${pegResult.targetPeg.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[11px] text-muted-foreground mr-1">Timeframe:</span>
                                {(['6m', '12m', '24m'] as RollingTimeframe[]).map((tf) => (
                                    <button
                                        key={tf}
                                        type="button"
                                        onClick={() => setSelectedTimeframe(tf)}
                                        className={`rounded px-2 py-0.5 text-xs font-semibold transition-colors ${
                                            selectedTimeframe === tf
                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        {tf === '12m' ? '12M (Std)' : tf.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Collar & Volatility Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                            <div className="rounded-lg border border-border bg-card/60 p-2">
                                <p className="text-[10px] text-muted-foreground">Target Peg</p>
                                <p className="font-bold text-primary">${pegResult.targetPeg.toLocaleString()}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card/60 p-2">
                                <p className="text-[10px] text-muted-foreground">Collar (±{collarPercent}%)</p>
                                <p className="font-semibold text-foreground text-[11px]">
                                    ${pegResult.collarLowerLimit.toLocaleString()} – ${pegResult.collarUpperLimit.toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card/60 p-2">
                                <p className="text-[10px] text-muted-foreground">Seasonal Swing</p>
                                <p className="font-semibold text-foreground">${pegResult.nwcSwing.toLocaleString()}</p>
                                <p className="text-[9px] text-muted-foreground">±{pegResult.volatilityPercent}% volatility</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card/60 p-2">
                                <p className="text-[10px] text-muted-foreground">Collar Band</p>
                                <div className="flex justify-center gap-1 mt-0.5">
                                    {[0, 5, 10].map((pct) => (
                                        <button
                                            key={pct}
                                            type="button"
                                            onClick={() => setCollarPercent(pct)}
                                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                collarPercent === pct
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        >
                                            ±{pct}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Definitive Agreement (APA) Clause Export */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                    APA Section 2.4 Legal Peg Clause (GAAP Normalization)
                                </span>
                                <button
                                    type="button"
                                    onClick={handleCopyClause}
                                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                                >
                                    {copiedClause ? (
                                        <>
                                            <Check className="h-3 w-3 text-emerald-600" />
                                            <span className="text-emerald-600">Copied to Clipboard</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3 w-3" />
                                            <span>Copy Legal Clause</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <pre className="rounded-lg border border-border/80 bg-muted/40 p-2.5 text-[10px] font-mono text-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-32">
                                {pegResult.definitiveAgreementClause}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Line Item Breakdown */}
                <div className="space-y-2">
                    {data.items.map((item) => (
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
