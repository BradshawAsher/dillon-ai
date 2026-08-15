import { useMemo } from 'react'
import { Dice5 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardExplainerPopover from './CardExplainerPopover'

type Props = {
    model: DealModel
}

type SimResult = {
    moic: number
    exitValue: number
}

function seededRandom(seed: number) {
    let s = seed
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff
        return (s >>> 0) / 0xffffffff
    }
}

function normalFromUniform(u1: number, u2: number) {
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

const SIMULATIONS = 1000

export default function MonteCarloCard({ model }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitdaIsConfirmed = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde.value === 'number'

    const result = useMemo(() => {
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const holdYears = model.holdPeriodYears ?? 5
        const baseGrowth = model.baseRevenueGrowth ?? 0.05
        const baseMargin = model.baseEbitdaMargin ?? (revenue && ebitda ? ebitda / revenue : 0.20)
        const exitMult = model.exitMultiple ?? (price / ebitda)
        const transactionFees = model.transactionFees ?? 0
        const workingCapital = model.workingCapitalRequirement ?? 0
        const totalInvestment = price + transactionFees + workingCapital

        const growthStd = 0.03
        const marginStd = 0.03
        const multipleStd = 1.0

        const rand = seededRandom(42)
        const results: SimResult[] = []

        for (let i = 0; i < SIMULATIONS; i++) {
            const u1 = Math.max(rand(), 0.0001)
            const u2 = rand()
            const u3 = Math.max(rand(), 0.0001)
            const u4 = rand()
            const u5 = Math.max(rand(), 0.0001)
            const u6 = rand()

            const simGrowth = baseGrowth + normalFromUniform(u1, u2) * growthStd
            const simMargin = Math.max(0.01, baseMargin + normalFromUniform(u3, u4) * marginStd)
            const simMultiple = Math.max(1, exitMult + normalFromUniform(u5, u6) * multipleStd)

            const baseRev = revenue ?? ebitda / baseMargin
            const futureRevenue = baseRev * Math.pow(1 + simGrowth, holdYears)
            const futureEbitda = futureRevenue * simMargin
            const exitValue = futureEbitda * simMultiple

            const moic = exitValue / totalInvestment

            results.push({ moic, exitValue })
        }

        results.sort((a, b) => a.moic - b.moic)

        const p10 = results[Math.floor(SIMULATIONS * 0.1)]
        const p25 = results[Math.floor(SIMULATIONS * 0.25)]
        const p50 = results[Math.floor(SIMULATIONS * 0.5)]
        const p75 = results[Math.floor(SIMULATIONS * 0.75)]
        const p90 = results[Math.floor(SIMULATIONS * 0.9)]

        const lossCount = results.filter(r => r.moic < 1).length
        const lossProb = (lossCount / SIMULATIONS) * 100

        const doubleCount = results.filter(r => r.moic >= 2).length
        const doubleProb = (doubleCount / SIMULATIONS) * 100

        const tripleCount = results.filter(r => r.moic >= 3).length
        const tripleProb = (tripleCount / SIMULATIONS) * 100

        const buckets = [
            { label: '<1x', count: 0, color: 'bg-red-400' },
            { label: '1-2x', count: 0, color: 'bg-amber-400' },
            { label: '2-3x', count: 0, color: 'bg-green-400' },
            { label: '3-4x', count: 0, color: 'bg-emerald-500' },
            { label: '4x+', count: 0, color: 'bg-blue-500' },
        ]
        for (const r of results) {
            if (r.moic < 1) buckets[0].count++
            else if (r.moic < 2) buckets[1].count++
            else if (r.moic < 3) buckets[2].count++
            else if (r.moic < 4) buckets[3].count++
            else buckets[4].count++
        }

        return { p10, p25, p50, p75, p90, lossProb, doubleProb, tripleProb, buckets, totalInvestment }
    }, [model, facts])

    if (!result) return null

    const maxBucket = Math.max(...result.buckets.map(b => b.count))

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Dice5 className="h-4 w-4 text-primary" />
                            <CardTitle className="text-lg">Monte Carlo simulation</CardTitle>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {SIMULATIONS.toLocaleString()} scenarios varying growth, margin, and exit multiple
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CardExplainerPopover
                            title="Monte Carlo Returns Simulation"
                            whatIsIt="Runs 5,000 randomized 5-year operating scenarios to calculate the statistical probability of doubling your money (2x MOIC) vs losing capital (<1x MOIC)."
                            howItWorks="Applies random statistical distributions to 3 key variables simultaneously: Revenue Growth Rate, EBITDA Margin, and Exit Valuation Multiple."
                            whyItMatters="Single-point financial models are overly optimistic. Monte Carlo tests downside resilience so you know if your returns depend on perfection or if the deal can handle real-world volatility."
                        />
                        <Badge variant={ebitdaIsConfirmed ? 'success' : 'warning'} className="w-fit text-[10px] px-2.5 py-0.5 font-bold">
                            {ebitdaIsConfirmed ? '✓ Verified Source Baseline' : '⚠ Illustrative Simulation'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Data Source & Trustability Notice */}
                <div className={`rounded-lg border p-3 text-xs leading-relaxed ${ebitdaIsConfirmed ? 'border-emerald-300/60 bg-emerald-50/40 dark:border-emerald-800/60 dark:bg-emerald-950/20' : 'border-amber-300/60 bg-amber-50/40 dark:border-amber-800/60 dark:bg-amber-950/20'}`}>
                    <p className="font-bold text-foreground mb-1">
                        {ebitdaIsConfirmed ? '✓ Simulation Data Trustability & Source:' : '⚠ Simulation Data Source Notice:'}
                    </p>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                        {ebitdaIsConfirmed
                            ? 'This 1,000-scenario simulation anchors on confirmed starting financial facts (EBITDA/SDE), stochastically varying growth (±3%), margin (±3%), and exit multiple (±1.0x).'
                            : 'This simulation uses illustrative preview starting figures. Upload source financial documents to anchor the simulation on confirmed facts.'}
                    </p>
                </div>
                <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">MOIC distribution</p>
                    <div className="flex items-end gap-1 h-16">
                        {result.buckets.map((bucket, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                <div
                                    className={`w-full rounded-t-sm ${bucket.color} transition-all`}
                                    style={{ height: `${(bucket.count / maxBucket) * 100}%`, minHeight: bucket.count > 0 ? '4px' : '0px' }}
                                />
                                <span className="text-[9px] text-muted-foreground">{bucket.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                        <span>Worse</span>
                        <span>Better</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">Loss probability</p>
                        <p className={`text-sm font-bold ${result.lossProb > 20 ? 'text-red-600' : result.lossProb > 10 ? 'text-amber-600' : 'text-green-600'}`}>
                            {result.lossProb.toFixed(0)}%
                        </p>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">2x+ chance</p>
                        <p className={`text-sm font-bold ${result.doubleProb > 50 ? 'text-green-600' : 'text-foreground'}`}>
                            {result.doubleProb.toFixed(0)}%
                        </p>
                    </div>
                    <div className="rounded-lg border border-border p-2">
                        <p className="text-[10px] text-muted-foreground">3x+ chance</p>
                        <p className={`text-sm font-bold ${result.tripleProb > 30 ? 'text-green-600' : 'text-foreground'}`}>
                            {result.tripleProb.toFixed(0)}%
                        </p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <p className="text-xs font-medium text-foreground">Percentile outcomes</p>
                    <div className="relative h-8 rounded-lg bg-muted/50 overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-red-200 dark:bg-red-900/30" style={{ width: '10%' }} />
                        <div className="absolute inset-y-0 bg-amber-200 dark:bg-amber-900/30" style={{ left: '10%', width: '15%' }} />
                        <div className="absolute inset-y-0 bg-green-200 dark:bg-green-900/30" style={{ left: '25%', width: '50%' }} />
                        <div className="absolute inset-y-0 bg-emerald-200 dark:bg-emerald-900/30" style={{ left: '75%', width: '15%' }} />
                        <div className="absolute inset-y-0 bg-blue-200 dark:bg-blue-900/30" style={{ left: '90%', width: '10%' }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                        <span>P10: {result.p10.moic.toFixed(1)}x</span>
                        <span>P25: {result.p25.moic.toFixed(1)}x</span>
                        <span className="font-bold text-foreground">P50: {result.p50.moic.toFixed(1)}x</span>
                        <span>P75: {result.p75.moic.toFixed(1)}x</span>
                        <span>P90: {result.p90.moic.toFixed(1)}x</span>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        Simulates {SIMULATIONS.toLocaleString()} scenarios by randomly varying revenue growth (±3%), EBITDA margin (±3%),
                        and exit multiple (±1.0x) around base assumptions. Assumes normal distributions.
                        Not a prediction — illustrates the range of plausible outcomes.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
