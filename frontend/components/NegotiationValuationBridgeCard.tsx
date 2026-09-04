import { useState, useMemo } from 'react'
import {
    Scale,
    DollarSign,
    ShieldAlert,
    Copy,
    Check,
    FileText,
    ChevronDown,
    ChevronUp,
    Shield,
    TrendingDown,
    AlertCircle,
    Info,
} from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import DataOriginBadge from './common/DataOriginBadge'
import { copyToClipboard } from '../utils/clipboard'
import {
    computeValuationBridge,
    generateValuationBridgeClause,
    generateSpecialEscrowClause,
    generateSpecificRepsClause,
    type DeductionHandling,
} from '../utils/valuationBridge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
}

type ClauseTab = 'sec23_bridge' | 'sec82_escrow' | 'sec314_reps'

export default function NegotiationValuationBridgeCard({ model, synthesis, projectName }: Props) {
    const [handlingOverrides, setHandlingOverrides] = useState<Record<string, DeductionHandling>>({})
    const [activeClauseTab, setActiveClauseTab] = useState<ClauseTab>('sec23_bridge')
    const [copiedTab, setCopiedTab] = useState<ClauseTab | null>(null)
    const [showLegalDrawer, setShowLegalDrawer] = useState<boolean>(true)

    const bridge = useMemo(() => {
        return computeValuationBridge(model, synthesis, handlingOverrides)
    }, [model, synthesis, handlingOverrides])

    const formatMoney = (val?: number | null) => {
        if (val == null) return '—'
        if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
        if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
        return `$${val.toLocaleString()}`
    }

    const handleToggleHandling = (itemId: string, handling: DeductionHandling) => {
        setHandlingOverrides((prev) => ({
            ...prev,
            [itemId]: handling,
        }))
    }

    const handleCopyClause = async (tab: ClauseTab, text: string) => {
        const success = await copyToClipboard(text)
        if (success) {
            setCopiedTab(tab)
            window.setTimeout(() => setCopiedTab(null), 2200)
        }
    }

    const clauseText = useMemo(() => {
        if (activeClauseTab === 'sec23_bridge') {
            return generateValuationBridgeClause(bridge, projectName)
        }
        if (activeClauseTab === 'sec82_escrow') {
            return generateSpecialEscrowClause(bridge, projectName)
        }
        return generateSpecificRepsClause(projectName)
    }, [activeClauseTab, bridge, projectName])

    return (
        <Card id="negotiation-valuation-bridge" className="overflow-hidden scroll-mt-6 border-border/80 shadow-sm">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base font-bold text-foreground">
                            Purchase price adjustment &amp; valuation bridge
                        </CardTitle>
                        <CardInfoPopover cardId="valuation-bridge" />
                    </div>
                    <div className="flex items-center gap-2">
                        <DataOriginBadge
                            origin="calculated"
                            label="Contract Bridge Model"
                            formula="Purchase Price − Diligence Deductions"
                        />
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary border border-primary/20">
                            <TrendingDown className="h-3 w-3" />
                            Retrading &amp; Escrow Sizing
                        </span>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Itemized valuation deductions from diligence findings, special indemnity escrow recommendations, and APA contract language.
                </p>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
                {/* Executive Bridge KPI Summary Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Initial LOI Valuation</p>
                            <DataOriginBadge origin={model.purchasePrice ? "user_entered" : "assumption"} label={model.purchasePrice ? "Saved LOI" : "Model Anchor"} compact />
                        </div>
                        <p className="text-lg font-bold text-foreground mt-0.5">{formatMoney(bridge.baselinePurchasePrice)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                            {bridge.entryMultiple > 0 ? `${bridge.entryMultiple.toFixed(2)}x EBITDA` : '—'}
                        </p>
                    </div>
                    <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
                        <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">Total EV Deductions</p>
                            <DataOriginBadge origin="calculated" label="Haircut" formula="Σ EV Deductions" compact />
                        </div>
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                            -{formatMoney(bridge.totalEvDeduction)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {bridge.baselinePurchasePrice > 0 ? `${((bridge.totalEvDeduction / bridge.baselinePurchasePrice) * 100).toFixed(1)}% price haircut` : '—'}
                        </p>
                    </div>
                    <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-3">
                        <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Special Escrow Fund</p>
                            <DataOriginBadge origin="calculated" label="Sized Escrow" formula="Σ Indemnity Escrows" compact />
                        </div>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-400 mt-0.5">{formatMoney(bridge.totalSpecialEscrow)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">R&amp;W / tax holdback</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                        <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Defensible Counter-Offer</p>
                            <DataOriginBadge origin="calculated" label="Counter-Offer" formula="Initial LOI − EV Deductions" compact />
                        </div>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{formatMoney(bridge.defensibleCounterOffer)}</p>
                        <p className="text-[10px] font-semibold text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                            Total buyer relief: {formatMoney(bridge.totalSavingsDollars)} ({bridge.totalSavingsPercent.toFixed(1)}%)
                        </p>
                    </div>
                </div>

                {/* Bridge Deduction Schedule Table */}
                <div className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-muted/40 px-3.5 py-2 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <DollarSign className="h-3.5 w-3.5 text-primary" />
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">Itemized Valuation Adjustments</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Click toggle to reallocate between direct EV discount, escrow, or earnout</span>
                    </div>

                    <div className="divide-y divide-border">
                        {bridge.items.map((item) => (
                            <div key={item.id} className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-muted/20 transition-colors">
                                <div className="space-y-1 max-w-xl">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-foreground">{item.title}</span>
                                        <DataOriginBadge origin="extracted" label="AI Diligence Finding" compact />
                                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                            item.category === 'ebitda_haircut'
                                                ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
                                                : item.category === 'liability'
                                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                                                : item.category === 'capex'
                                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                                                : 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30'
                                        }`}>
                                            {item.category.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            Ref: {item.apaSectionRef}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        {item.rationale}
                                    </p>
                                    {item.multipleImpact && (
                                        <p className="text-[10px] font-mono text-purple-700 dark:text-purple-300">
                                            Math: {formatMoney(item.baseAmount)} disallowed × {item.multipleImpact.toFixed(1)}x multiple = {formatMoney(item.totalDeduction)} haircut
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                                    <div className="text-right">
                                        <p className="text-sm font-bold font-mono text-foreground">
                                            {formatMoney(item.totalDeduction)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground uppercase">
                                            {item.handling.replace('_', ' ')}
                                        </p>
                                    </div>

                                    {/* Action Selector */}
                                    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 shadow-2xs">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleHandling(item.id, 'ev_reduction')}
                                            className={`rounded px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors ${
                                                item.handling === 'ev_reduction'
                                                    ? 'bg-rose-600 text-white shadow-2xs'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                            title="Deduct directly from purchase price at closing"
                                        >
                                            EV Cut
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleHandling(item.id, 'special_escrow')}
                                            className={`rounded px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors ${
                                                item.handling === 'special_escrow'
                                                    ? 'bg-blue-600 text-white shadow-2xs'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                            title="Hold back in segregated indemnity escrow for 18-24 months"
                                        >
                                            Escrow
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleHandling(item.id, 'earnout_contingent')}
                                            className={`rounded px-2 py-1 text-[10px] font-bold cursor-pointer transition-colors ${
                                                item.handling === 'earnout_contingent'
                                                    ? 'bg-amber-600 text-white shadow-2xs'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }`}
                                            title="Defer into contingent earnout milestones"
                                        >
                                            Earnout
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* APA & Reps/Warranties Legal Drafter */}
                <div className="rounded-xl border border-border/80 overflow-hidden bg-card/40">
                    <div className="p-3 bg-muted/40 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                APA Contract Language &amp; Reps Drafter
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowLegalDrawer(!showLegalDrawer)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            {showLegalDrawer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            <span>{showLegalDrawer ? 'Hide Clauses' : 'Show Clauses'}</span>
                        </button>
                    </div>

                    {showLegalDrawer && (
                        <div className="p-3.5 space-y-3">
                            {/* Tab Selectors */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setActiveClauseTab('sec23_bridge')}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                            activeClauseTab === 'sec23_bridge'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        Section 2.3: Valuation Adjustment
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveClauseTab('sec82_escrow')}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                            activeClauseTab === 'sec82_escrow'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        Section 8.2(c): Special Escrow
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveClauseTab('sec314_reps')}
                                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
                                            activeClauseTab === 'sec314_reps'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        Section 3.14: Contractor &amp; Tax Reps
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleCopyClause(activeClauseTab, clauseText)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-2xs"
                                >
                                    {copiedTab === activeClauseTab ? (
                                        <>
                                            <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-emerald-700 dark:text-emerald-400">Copied to Clipboard</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-3.5 w-3.5" />
                                            <span>Copy Clause for Legal Counsel</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Code/Pre Block */}
                            <pre className="rounded-lg border border-border/70 bg-muted/50 p-3 text-[10px] font-mono text-foreground leading-relaxed whitespace-pre-wrap overflow-x-auto max-h-56">
                                {clauseText}
                            </pre>

                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Info className="h-3 w-3 text-muted-foreground shrink-0" />
                                <span>
                                    Legal Structuring Aid: Formatted for inclusion in Asset Purchase Agreements (APA) or Stock Purchase Agreements (SPA). Review with M&amp;A legal counsel before signing.
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
