import React, { useMemo, useState } from 'react'
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    DollarSign,
    Layers,
    PieChart,
    TrendingDown,
    TrendingUp,
    Users,
} from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import {
    COHORT_PERIODS,
    DEFAULT_PRESET_COHORTS,
    computeCohortSummary,
    getCohortCellColor,
    getCohortsForProject,
    type CohortPeriod,
    type CohortRow,
} from '../utils/cohortRetention'

type CohortRetentionCardProps = {
    synthesis?: ProjectSynthesisItem
    dealModel?: DealModel
    className?: string
}

export default function CohortRetentionCard({
    synthesis,
    dealModel,
    className = '',
}: CohortRetentionCardProps) {
    const [viewMode, setViewMode] = useState<'logo' | 'nrr'>('logo')
    const [selectedPreset, setSelectedPreset] = useState<'auto' | 'saas' | 'manufacturing' | 'decay_alert'>('auto')

    const cohorts: CohortRow[] = useMemo(() => {
        if (selectedPreset === 'saas') return DEFAULT_PRESET_COHORTS.saas
        if (selectedPreset === 'manufacturing') return DEFAULT_PRESET_COHORTS.manufacturing
        if (selectedPreset === 'decay_alert') return DEFAULT_PRESET_COHORTS.decay_alert
        return getCohortsForProject(synthesis, dealModel)
    }, [selectedPreset, synthesis, dealModel])

    const summary = useMemo(() => computeCohortSummary(cohorts), [cohorts])

    return (
        <Card className={`dashboard-kpi-glass border-primary/20 relative shadow-sm ${className}`} id="cohort-retention-card">
            <div className="absolute top-3 right-3 z-10">
                <CardInfoPopover cardId="cohort-retention-card" />
            </div>

            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-8">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-2xs">
                            <Layers className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                Customer Cohort Retention &amp; Degradation Matrix
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    summary.overallHealth === 'healthy'
                                        ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30'
                                        : summary.overallHealth === 'warning'
                                        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                        : 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30'
                                }`}>
                                    {summary.overallHealth === 'healthy' ? '🟢 Healthy Cohorts' : summary.overallHealth === 'warning' ? '🟡 Churn Watchlist' : '🔴 Churn Degradation'}
                                </span>
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Triangular retention analysis auditing month-over-month customer logo decay and expansion trends.
                            </CardDescription>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border/80 shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode('logo')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                viewMode === 'logo'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Users className="h-3.5 w-3.5" />
                            <span>Logo Retention (%)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('nrr')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                viewMode === 'nrr'
                                    ? 'bg-background text-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <DollarSign className="h-3.5 w-3.5" />
                            <span>Net Revenue Retention (NRR)</span>
                        </button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
                {/* Executive Churn Alert Callout */}
                <div className={`p-3.5 rounded-xl border flex items-start gap-3 shadow-2xs ${
                    summary.overallHealth === 'healthy'
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                        : summary.overallHealth === 'warning'
                        ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-500/30 text-amber-950 dark:text-amber-200'
                        : 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-500/30 text-rose-950 dark:text-rose-200'
                }`}>
                    {summary.overallHealth === 'healthy' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${summary.overallHealth === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`} />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold leading-snug">
                            {summary.alertTitle}
                        </p>
                        <p className="text-xs opacity-90 mt-0.5 leading-relaxed">
                            {summary.alertDescription}
                        </p>
                    </div>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="rounded-lg border border-border/80 bg-background/60 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">M12 Logo Retention</p>
                        <p className={`text-base font-extrabold mt-0.5 ${summary.averageM12LogoRetention >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {summary.averageM12LogoRetention}%
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Average across cohorts</p>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-background/60 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Weighted M12 NRR</p>
                        <p className={`text-base font-extrabold mt-0.5 ${summary.averageM12Nrr >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {summary.averageM12Nrr}%
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Net contract expansion</p>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-background/60 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Terminal Churn Floor</p>
                        <p className={`text-base font-extrabold mt-0.5 ${summary.churnFloorPercent >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {summary.churnFloorPercent}%
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Lowest observed retention</p>
                    </div>

                    <div className="rounded-lg border border-border/80 bg-background/60 p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tracked Cohorts</p>
                        <p className="text-base font-extrabold text-foreground mt-0.5">
                            {summary.activeCohortsCount}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Quarterly tracking cycles</p>
                    </div>
                </div>

                {/* Triangular Retention Matrix Table */}
                <div className="overflow-x-auto rounded-xl border border-border bg-card/40">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border/80 bg-muted/40 text-muted-foreground text-[11px] font-semibold">
                                <th className="py-2.5 px-3 whitespace-nowrap">Cohort</th>
                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Customers</th>
                                <th className="py-2.5 px-3 text-right whitespace-nowrap">Base Volume</th>
                                {COHORT_PERIODS.map((period) => (
                                    <th key={period} className="py-2.5 px-3 text-center whitespace-nowrap">
                                        {period}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-mono text-xs">
                            {cohorts.map((cohort) => (
                                <tr key={cohort.cohortId} className="hover:bg-muted/30 transition-colors">
                                    <td className="py-2.5 px-3 font-sans font-bold text-foreground whitespace-nowrap">
                                        {cohort.cohortName}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-muted-foreground whitespace-nowrap font-sans">
                                        {cohort.startingCustomers}
                                    </td>
                                    <td className="py-2.5 px-3 text-right text-muted-foreground whitespace-nowrap font-sans">
                                        ${(cohort.startingRevenue / 1000).toFixed(0)}k/mo
                                    </td>
                                    {COHORT_PERIODS.map((period) => {
                                        const value = viewMode === 'logo'
                                            ? cohort.logoRetention[period]
                                            : cohort.revenueRetention[period]
                                        const colors = getCohortCellColor(value, viewMode)

                                        return (
                                            <td key={period} className="py-1.5 px-2 text-center">
                                                <div
                                                    className={`py-1.5 px-2 rounded-md border text-center transition-transform hover:scale-105 ${colors.bgClass} ${colors.textClass} ${colors.borderClass}`}
                                                    title={`${cohort.cohortName} at ${period}: ${value !== null ? `${value}%` : 'Pending observation'}`}
                                                >
                                                    {value !== null ? `${value}%` : '—'}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Preset Scenario Bar for Example Testing */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-2xs text-muted-foreground border-t border-border/60">
                    <span className="font-medium">Scenario Presets:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setSelectedPreset('auto')}
                            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                selectedPreset === 'auto' ? 'bg-primary text-primary-foreground border-primary font-bold' : 'hover:bg-muted'
                            }`}
                        >
                            Auto-Detect
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedPreset('saas')}
                            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                selectedPreset === 'saas' ? 'bg-primary text-primary-foreground border-primary font-bold' : 'hover:bg-muted'
                            }`}
                        >
                            B2B SaaS (114% NRR)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedPreset('manufacturing')}
                            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                selectedPreset === 'manufacturing' ? 'bg-primary text-primary-foreground border-primary font-bold' : 'hover:bg-muted'
                            }`}
                        >
                            Commercial Precision
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedPreset('decay_alert')}
                            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                selectedPreset === 'decay_alert' ? 'bg-rose-600 text-white border-rose-700 font-bold' : 'hover:bg-muted'
                            }`}
                        >
                            ⚠️ Churn-Masking Alert
                        </button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
