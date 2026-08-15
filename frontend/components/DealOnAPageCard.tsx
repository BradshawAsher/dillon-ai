import { useMemo } from 'react'
import { FileImage } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
}

export default function DealOnAPageCard({ model, synthesis, projectName }: Props) {
    const summary = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const hasExtractedFinancials = Boolean(ebitda !== null || revenue !== null)
        const price = model.purchasePrice ?? model.askingPrice

        if (!price) return null

        const entryMult = ebitda && ebitda > 0 ? price / ebitda : null
        const margin = revenue && ebitda ? (ebitda / revenue) * 100 : null
        const growth = model.baseRevenueGrowth ?? 0.05
        const exitMult = model.exitMultiple ?? 4.0
        const holdYears = model.holdPeriodYears ?? 5
        const debt = model.seniorDebtAmount ?? 0
        const equity = model.equityAmount ?? (price - debt - (model.sellerNoteAmount ?? 0))

        const futureEbitda = ebitda ? ebitda * Math.pow(1 + growth, holdYears) : null
        const exitValue = futureEbitda ? futureEbitda * exitMult : null
        const moic = exitValue && equity > 0 ? exitValue / equity : null

        const redFlags = synthesis?.redFlags?.length ?? 0
        const greenFlags = synthesis?.greenFlags?.length ?? 0
        const signal = redFlags === 0 ? 'LOW' : redFlags <= 2 ? 'MODERATE' : 'HIGH'
        const signalColor = signal === 'LOW' ? 'text-green-600 bg-green-50 dark:bg-green-950/30' : signal === 'MODERATE' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 'text-red-600 bg-red-50 dark:bg-red-950/30'

        return {
            price, revenue, ebitda, entryMult, margin, growth, exitMult, holdYears,
            debt, equity, exitValue, moic, redFlags, greenFlags, signal, signalColor,
            hasExtractedFinancials,
        }
    }, [model, synthesis])

    if (!summary) return null

    const fmt = (n: number) => {
        if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
        return `$${n.toLocaleString()}`
    }

    return (
        <Card className="overflow-hidden print:shadow-none print:border-2">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Deal on a page</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    One-glance summary for screenshots and quick decision-making.
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="rounded-xl border-2 border-primary/20 p-4 space-y-3 bg-background">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-foreground">{projectName || 'Unnamed Deal'}</h3>
                            {summary.hasExtractedFinancials ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Historical revenue and EBITDA extracted from VDR files">
                                    ✓ Documented VDR Facts
                                </span>
                            ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Starting default assumptions">
                                    ⚙ Starting Assumption
                                </span>
                            )}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${summary.signalColor}`}>
                            {summary.signal} RISK
                        </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">Price</p>
                            <p className="text-sm font-bold text-foreground">{fmt(summary.price)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">Revenue</p>
                            <p className="text-sm font-bold text-foreground">{summary.revenue ? fmt(summary.revenue) : '—'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">EBITDA</p>
                            <p className="text-sm font-bold text-foreground">{summary.ebitda ? fmt(summary.ebitda) : '—'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">Entry Mult</p>
                            <p className="text-sm font-bold text-foreground">{summary.entryMult ? `${summary.entryMult.toFixed(1)}x` : '—'}</p>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="flex items-center justify-between pt-0.5">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">Underwriting &amp; Illustrative Model Projections</p>
                        <span className="text-[9px] text-muted-foreground italic">(5yr hold, 4.0x exit mult)</span>
                    </div>

                    <div className="grid grid-cols-5 gap-2 text-center">
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">Margin</p>
                            <p className="text-xs font-semibold">{summary.margin ? `${summary.margin.toFixed(0)}%` : '—'}</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">Growth</p>
                            <p className="text-xs font-semibold">{(summary.growth * 100).toFixed(0)}%</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">Exit Mult</p>
                            <p className="text-xs font-semibold">{summary.exitMult.toFixed(1)}x</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">Hold</p>
                            <p className="text-xs font-semibold">{summary.holdYears}yr</p>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground">MOIC</p>
                            <p className={`text-xs font-bold ${summary.moic && summary.moic >= 2 ? 'text-green-600' : summary.moic && summary.moic >= 1.5 ? 'text-amber-600' : 'text-red-600'}`}>
                                {summary.moic ? `${summary.moic.toFixed(1)}x` : '—'}
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground mb-1">Structure</p>
                            <div className="flex h-3 rounded-full overflow-hidden">
                                {summary.equity > 0 && (
                                    <div className="bg-blue-500" style={{ width: `${(summary.equity / summary.price) * 100}%` }} title="Equity" />
                                )}
                                {summary.debt > 0 && (
                                    <div className="bg-amber-500" style={{ width: `${(summary.debt / summary.price) * 100}%` }} title="Debt" />
                                )}
                                {(model.sellerNoteAmount ?? 0) > 0 && (
                                    <div className="bg-purple-500" style={{ width: `${((model.sellerNoteAmount ?? 0) / summary.price) * 100}%` }} title="Seller Note" />
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Equity</span>
                                <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Debt</span>
                                <span className="text-[8px] text-muted-foreground flex items-center gap-0.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />Seller</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-[9px] uppercase text-muted-foreground mb-1">Flags</p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs">
                                    <span className="text-red-600 font-bold">{summary.redFlags}</span>
                                    <span className="text-muted-foreground"> red</span>
                                </span>
                                <span className="text-xs">
                                    <span className="text-green-600 font-bold">{summary.greenFlags}</span>
                                    <span className="text-muted-foreground"> green</span>
                                </span>
                            </div>
                            {summary.exitValue && (
                                <p className="text-[9px] text-muted-foreground mt-1">
                                    Projected exit: {fmt(summary.exitValue)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
