import React, { useEffect } from 'react'
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Clock,
    Cpu,
    DollarSign,
    Download,
    ExternalLink,
    FileCheck,
    FileText,
    FolderKanban,
    Layers,
    ShieldAlert,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

export type HighLevelBusinessSummaryData = {
    projectName: string
    companyName: string
    projectId: string
    stage?: string
    documentsCount?: number
    askingPrice?: string | number
    revenue?: string | number
    ebitda?: string | number
    valuation?: string | number
    multiple?: string | number
    verdict?: string
    trafficLight?: 'GREEN' | 'YELLOW' | 'RED' | string
    executiveSummary?: string
    redFlags?: string[]
    greenFlags?: string[]
    keyFinancials?: Array<{ label: string; value: string | number }>
    renegotiationPoints?: string[]
    dealGrade?: string
    totalCostUsd?: number
    docCostUsd?: number
    synthCostUsd?: number
    docPrimaryModel?: string
    synthPrimaryModel?: string
    synthesisReport?: any
}

type HighLevelBusinessSummaryModalProps = {
    isOpen: boolean
    onClose: () => void
    data: HighLevelBusinessSummaryData | null
    onViewWorkspace?: (projectId: string) => void
    onDownloadSynthesis?: () => void
}

export function HighLevelBusinessSummaryModal({
    isOpen,
    onClose,
    data,
    onViewWorkspace,
    onDownloadSynthesis,
}: HighLevelBusinessSummaryModalProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            window.addEventListener('keydown', handleKeyDown)
        }
        return () => {
            document.body.style.overflow = ''
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen, onClose])

    if (!isOpen || !data) return null

    const trafficLight = (data.trafficLight || '').toUpperCase()
    const verdictVariant: 'success' | 'warning' | 'destructive' | 'outline' =
        trafficLight === 'GREEN' || (data.verdict || '').toLowerCase().includes('proceed')
            ? 'success'
            : trafficLight === 'YELLOW' || (data.verdict || '').toLowerCase().includes('renegotiat') || (data.verdict || '').toLowerCase().includes('caution')
                ? 'warning'
                : trafficLight === 'RED' || (data.verdict || '').toLowerCase().includes('abort') || (data.verdict || '').toLowerCase().includes('high risk')
                    ? 'destructive'
                    : 'outline'

    const formatCurrency = (val?: string | number, fallback = 'N/A') => {
        if (val === undefined || val === null || val === '') return fallback
        if (typeof val === 'number') {
            return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        }
        const str = String(val).trim()
        if (str.startsWith('$')) return str
        const num = Number(str.replace(/[^0-9.-]+/g, ''))
        if (!isNaN(num) && num > 0) {
            return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
        }
        return str
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
            <div
                id="summary-modal-container"
                className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-primary/20 bg-background/95 shadow-2xl overflow-hidden my-auto scroll-mt-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Top Header */}
                <div className="flex items-start justify-between border-b border-border/80 bg-muted/40 p-5 sm:p-6">
                    <div className="space-y-1.5 pr-8">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="gap-1 font-mono text-xs uppercase tracking-wider bg-primary/10 text-primary border-primary/30">
                                <Building2 className="h-3.5 w-3.5" /> High-Level Summary
                            </Badge>
                            {data.verdict ? (
                                <Badge variant={verdictVariant} className="gap-1 text-xs font-bold uppercase tracking-wide">
                                    {data.verdict}
                                </Badge>
                            ) : null}
                            {data.dealGrade ? (
                                <Badge variant="outline" className="font-mono font-black text-xs bg-card border-primary/40 text-foreground">
                                    Grade: {data.dealGrade}
                                </Badge>
                            ) : null}
                            {data.stage ? (
                                <Badge variant="secondary" className="text-xs">
                                    {data.stage}
                                </Badge>
                            ) : null}
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            {data.projectName}
                        </h2>
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span>Company: <strong className="text-foreground">{data.companyName || data.projectName}</strong></span>
                            <span>•</span>
                            <span className="font-mono text-xs">ID: {data.projectId}</span>
                        </p>
                    </div>
                    <Button
                        id="summary-modal-close-btn"
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground shrink-0"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    {/* Financial Snapshot Grid */}
                    <div id="summary-modal-financials" className={`grid grid-cols-2 gap-3 ${data.valuation && data.valuation !== 'N/A' && data.askingPrice && data.askingPrice !== 'N/A' ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} scroll-mt-6`}>
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Asking Price</p>
                            <p className="text-lg sm:text-xl font-black text-foreground">{formatCurrency(data.askingPrice)}</p>
                        </div>
                        {data.valuation && data.valuation !== 'N/A' && (
                            <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">AI Valuation</p>
                                <p className="text-lg sm:text-xl font-black text-foreground">{formatCurrency(data.valuation)}</p>
                            </div>
                        )}
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Revenue</p>
                            <p className="text-lg sm:text-xl font-black text-foreground">{formatCurrency(data.revenue)}</p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Adjusted EBITDA</p>
                            <p className="text-lg sm:text-xl font-black text-foreground">{formatCurrency(data.ebitda)}</p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Implied Multiple</p>
                            <p className="text-lg sm:text-xl font-black text-primary">
                                {data.multiple ? (String(data.multiple).endsWith('x') ? data.multiple : `${data.multiple}x`) : 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Executive Summary */}
                    {data.executiveSummary ? (
                        <div id="summary-modal-rationale" className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-2 scroll-mt-6">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-primary" /> Executive Summary &amp; Deal Rationale
                            </h3>
                            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                                {data.executiveSummary}
                            </p>
                        </div>
                    ) : null}

                    {/* Red Flags & Green Flags Grid */}
                    <div id="summary-modal-flags" className="grid gap-4 sm:grid-cols-2 scroll-mt-6">
                        {/* Red Flags */}
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                                <ShieldAlert className="h-4 w-4" /> Key Red Flags &amp; Risks
                            </h3>
                            {data.redFlags && data.redFlags.length > 0 ? (
                                <ul className="space-y-1.5 text-xs text-foreground list-disc pl-4">
                                    {data.redFlags.map((flag, idx) => (
                                        <li key={idx} className="leading-normal">{flag}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No critical red flags flagged.</p>
                            )}
                        </div>

                        {/* Green Flags / Upsides */}
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4" /> Key Value Drivers &amp; Upsides
                            </h3>
                            {data.greenFlags && data.greenFlags.length > 0 ? (
                                <ul className="space-y-1.5 text-xs text-foreground list-disc pl-4">
                                    {data.greenFlags.map((flag, idx) => (
                                        <li key={idx} className="leading-normal">{flag}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-xs text-muted-foreground italic">Solid baseline operations confirmed.</p>
                            )}
                        </div>
                    </div>

                    {/* Renegotiation Points if present */}
                    {data.renegotiationPoints && data.renegotiationPoints.length > 0 ? (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4" /> Priority Renegotiation Points &amp; LOI Conditions
                            </h3>
                            <ul className="space-y-1.5 text-xs text-foreground list-disc pl-4">
                                {data.renegotiationPoints.map((item, idx) => (
                                    <li key={idx} className="leading-normal">{item}</li>
                                ))}
                            </ul>
                        </div>
                    ) : null}

                    {/* Technical & Execution Metadata */}
                    <div className="rounded-xl border border-border/80 bg-card/50 p-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-background">
                                <FileCheck className="h-3 w-3 text-primary" />
                                Docs Analyzed: {data.documentsCount ?? 0}
                            </Badge>
                            {data.docPrimaryModel ? (
                                <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-background">
                                    <Cpu className="h-3 w-3 text-blue-500" />
                                    Doc AI: {data.docPrimaryModel}
                                </Badge>
                            ) : null}
                            {data.synthPrimaryModel ? (
                                <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-background">
                                    <Sparkles className="h-3 w-3 text-purple-500" />
                                    Synth AI: {data.synthPrimaryModel}
                                </Badge>
                            ) : null}
                        </div>
                        {typeof data.totalCostUsd === 'number' && data.totalCostUsd > 0 ? (
                            <div className="font-mono font-bold text-foreground">
                                Total AI Pipeline Cost: ${data.totalCostUsd.toFixed(4)}
                            </div>
                        ) : null}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/80 bg-muted/40 p-4 sm:p-5">
                    {onDownloadSynthesis ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={onDownloadSynthesis}
                        >
                            <Download className="h-4 w-4" /> Download Full Synthesis Report
                        </Button>
                    ) : null}

                    {onViewWorkspace ? (
                        <Button
                            type="button"
                            variant="default"
                            className="gap-2 font-semibold shadow-md"
                            onClick={() => {
                                onViewWorkspace(data.projectId)
                                onClose()
                            }}
                        >
                            <ExternalLink className="h-4 w-4" /> Open Full Deal Workspace
                        </Button>
                    ) : null}

                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    )
}
