import { useState, useMemo } from 'react'
import { Coins, Copy, Check, Calculator, FileText, ArrowUpDown } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import DataOriginBadge from './common/DataOriginBadge'
import { calculateWorkingCapitalPeg, type RollingTimeframe } from '../utils/workingCapitalPeg'
import { normalizePercentageFraction } from '../utils/dealMath'

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
        const revenue = rawRevenue && rawRevenue > 0 ? rawRevenue : null
        const ar = typeof facts.accounts_receivable?.value === 'number' ? facts.accounts_receivable.value : null
        const inventory = typeof facts.inventory?.value === 'number' ? facts.inventory.value : null
        const ap = typeof facts.accounts_payable?.value === 'number' ? facts.accounts_payable.value : null
        const accrued = typeof facts.accrued_expenses?.value === 'number' ? facts.accrued_expenses.value : null
        const cogs = typeof facts.cogs?.value === 'number'
            ? facts.cogs.value
            : typeof facts.cost_of_goods_sold?.value === 'number' ? facts.cost_of_goods_sold.value : null

        if (revenue === null || [ar, inventory, ap, accrued].every((value) => value === null)) return null

        const dailyRevenue = revenue / 365
        const dso = ar ? Math.round(ar / dailyRevenue) : null
        const dih = inventory && cogs && cogs > 0 ? Math.round(inventory / (cogs / 365)) : null

        // Transaction NWC normally excludes cash and debt. Only documented
        // operating current assets/liabilities belong in this snapshot.
        const currentAssets = (ar ?? 0) + (inventory ?? 0)
        const currentLiabilities = (ap ?? 0) + (accrued ?? 0)
        const netWC = currentAssets - currentLiabilities
        const wcAsPercentOfRev = (netWC / revenue) * 100
        const wcRequirement = model.workingCapitalRequirement ?? 0

        const growth = normalizePercentageFraction(model.baseRevenueGrowth) ?? 0.05
        const additionalWCNeeded = netWC * growth

        const items = [
            { label: 'Accounts receivable', value: ar, days: dso ? `${dso} days sales` : null },
            { label: 'Inventory', value: inventory, days: dih ? `${dih} days on hand` : null },
            { label: 'Accounts payable', value: ap, days: null },
            { label: 'Accrued expenses', value: accrued, days: null },
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
            assumptions: [
                ...(dih === null && inventory ? ['Inventory days unavailable because documented COGS is missing'] : []),
                ...(ar === null ? ['Accounts receivable is missing'] : []),
                ...(ap === null ? ['Accounts payable is missing'] : []),
                ...(accrued === null ? ['Accrued expenses is missing'] : []),
            ],
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
                    Operating NWC snapshot plus an illustrative peg model. Validate the peg against actual month-end balances before using legal language.
                </p>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    The rolling series is synthetic, modeled from the available annual snapshot; it is not extracted monthly history. {pegResult.assumedInputs.join(' · ')}
                    {data.assumptions.length > 0 ? ` · ${data.assumptions.join(' · ')}` : ''}
                </div>
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
                            <div className="rounded-lg border border-border bg-card/60 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-[10px] text-muted-foreground font-medium">Target Peg</p>
                                    <DataOriginBadge
                                        origin="calculated"
                                        label="Calculated (Target Peg)"
                                        metricLabel="Target Net Working Capital Peg"
                                        metricValue={`$${pegResult.targetPeg.toLocaleString()}`}
                                        formula={`Mean trailing ${selectedTimeframe} monthly NWC (Current Assets excl. cash − Current Liabilities excl. debt)`}
                                        description="Target dollar amount of operational working capital the seller must deliver debt-free and cash-free at transaction close."
                                        compact
                                    />
                                </div>
                                <p className="font-bold text-primary mt-1">${pegResult.targetPeg.toLocaleString()}</p>
                            </div>
                            <div className="rounded-lg border border-border bg-card/60 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-[10px] text-muted-foreground font-medium">Collar (±{collarPercent}%)</p>
                                    <DataOriginBadge
                                        origin="calculated"
                                        label="Calculated (Collar)"
                                        metricLabel={`Working Capital Collar (±${collarPercent}%)`}
                                        metricValue={`$${pegResult.collarLowerLimit.toLocaleString()} – $${pegResult.collarUpperLimit.toLocaleString()}`}
                                        formula={`Target Peg ± (Target Peg × ${collarPercent}%)`}
                                        description="Contractual corridor around the target peg within which minor fluctuations trigger zero purchase price adjustment."
                                        compact
                                    />
                                </div>
                                <p className="font-semibold text-foreground text-[11px] mt-1">
                                    ${pegResult.collarLowerLimit.toLocaleString()} – ${pegResult.collarUpperLimit.toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card/60 p-2 flex flex-col justify-between">
                                <div className="flex items-center justify-between gap-1">
                                    <p className="text-[10px] text-muted-foreground font-medium">Seasonal Swing</p>
                                    <DataOriginBadge
                                        origin="calculated"
                                        label="Calculated (Volatility)"
                                        metricLabel="Seasonal NWC Volatility"
                                        metricValue={`$${pegResult.nwcSwing.toLocaleString()} (±${pegResult.volatilityPercent}%)`}
                                        formula="Peak Monthly NWC − Trough Monthly NWC"
                                        description="Maximum seasonal capital expansion requiring intra-year liquidity or a dedicated revolving line of credit."
                                        compact
                                    />
                                </div>
                                <p className="font-semibold text-foreground mt-1">${pegResult.nwcSwing.toLocaleString()}</p>
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
                                    Illustrative APA Section 2.4 Draft
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
