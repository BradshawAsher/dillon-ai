import React, { useState, useEffect } from 'react'
import {
    BookOpen,
    Download,
    Copy,
    Check,
    X,
    FileText,
    Code,
    AlertTriangle,
    CheckCircle2,
    HelpCircle,
    SlidersHorizontal,
    FileWarning,
    TrendingUp,
    ShieldAlert
} from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Badge } from '../../lib/shadcn/badge'
import type { DealModel, ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { buildMarkdownReport } from '../ExportDealButton'

export interface DossierPreviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
    onDownloadMarkdown: () => void
    onCopyMarkdown: () => void
}

export function DossierPreviewModal({
    open,
    onOpenChange,
    model,
    synthesis,
    projectName,
    onDownloadMarkdown,
    onCopyMarkdown,
}: DossierPreviewModalProps) {
    const [activeTab, setActiveTab] = useState<'formatted' | 'raw'>('formatted')
    const [copied, setCopied] = useState(false)

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onOpenChange(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onOpenChange])

    if (!open) return null

    const markdownText = buildMarkdownReport(model, synthesis ?? undefined, projectName)
    const safeName = (projectName || 'deal').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)

    const handleCopy = () => {
        onCopyMarkdown()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const askingPrice = model?.askingPrice
    const purchasePrice = model?.purchasePrice || askingPrice
    const revenue = model?.revenue
    const ebitda = model?.ebitda
    const entryMult = purchasePrice && ebitda && ebitda > 0 ? (purchasePrice / ebitda).toFixed(1) : null

    const riskLevel = synthesis?.finalRiskLevel || 'MODERATE'
    const trafficLight = synthesis?.finalTrafficLight || 'YELLOW'

    const redFlags = synthesis?.redFlags || []
    const yellowFlags = synthesis?.yellowFlags || []
    const greenFlags = synthesis?.greenFlags || []
    const openQuestions = synthesis?.openQuestions || []
    const negotiationLevers = synthesis?.negotiationLevers || []
    const missingDocs = synthesis?.missingDocuments || []

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in-0 duration-200">
            <div
                id="dossier-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dossier-preview-title"
                className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-sky-500/30 bg-card text-card-foreground shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 id="dossier-preview-title" className="text-sm font-bold text-foreground sm:text-base">
                                    {safeName}_summary.md
                                </h2>
                                <Badge variant="outline" className="text-[10px] font-semibold border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300">
                                    Executive Deal Dossier
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground hidden sm:inline-flex">
                                    Markdown Brief
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Visual summary plus the exact Markdown content used by the download
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="gap-1 text-xs cursor-pointer"
                            title="Copy Markdown to Clipboard"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </Button>
                        <Button
                            onClick={onDownloadMarkdown}
                            size="sm"
                            className="gap-1.5 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download .md</span>
                        </Button>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            aria-label="Close Preview"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-4 py-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('formatted')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'formatted'
                                ? 'bg-background text-sky-600 dark:text-sky-400 shadow-xs border border-border/80'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                    >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Visual Summary</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('raw')}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            activeTab === 'raw'
                                ? 'bg-background text-sky-600 dark:text-sky-400 shadow-xs border border-border/80'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                    >
                        <Code className="h-3.5 w-3.5" />
                        <span>Exact .md Content</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-background">
                    {activeTab === 'formatted' ? (
                        <div className="space-y-6 max-w-3xl mx-auto">
                            {/* Title & Metadata */}
                            <div className="border-b border-border/60 pb-4">
                                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                    Due Diligence Summary: {projectName}
                                </h1>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} via Dillon AI Due Diligence Engine
                                </p>
                            </div>

                            {/* Key Financial Snapshot Strip */}
                            <div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
                                    Deal Financial Overview
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                                        <div className="text-[11px] text-muted-foreground">Asking / Offer</div>
                                        <div className="text-base font-bold text-foreground">
                                            {purchasePrice ? `$${Math.round(purchasePrice).toLocaleString()}` : '—'}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                                        <div className="text-[11px] text-muted-foreground">Revenue (TTM)</div>
                                        <div className="text-base font-bold text-foreground">
                                            {revenue ? `$${Math.round(revenue).toLocaleString()}` : '—'}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                                        <div className="text-[11px] text-muted-foreground">Adjusted EBITDA</div>
                                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                                            {ebitda ? `$${Math.round(ebitda).toLocaleString()}` : '—'}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                                        <div className="text-[11px] text-muted-foreground">Entry Multiple</div>
                                        <div className="text-base font-bold text-sky-600 dark:text-sky-400">
                                            {entryMult ? `${entryMult}x` : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Risk Assessment Strip */}
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                                        <ShieldAlert className="h-4 w-4 text-sky-500" />
                                        <span>Risk Assessment Verdict</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-semibold text-xs border-border/80">
                                            Posture: {riskLevel}
                                        </Badge>
                                        <Badge
                                            variant="secondary"
                                            className={`font-bold text-xs ${
                                                trafficLight === 'GREEN'
                                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                                                    : trafficLight === 'RED'
                                                    ? 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
                                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                            }`}
                                        >
                                            {trafficLight} LIGHT
                                        </Badge>
                                    </div>
                                </div>

                                {redFlags.length > 0 && (
                                    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 dark:text-red-400">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            <span>Red Flags Identified ({redFlags.length})</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                                            {redFlags.map((flag, i) => (
                                                <li key={i} className="leading-relaxed"><strong className="text-foreground font-medium">{flag}</strong></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {yellowFlags.length > 0 && (
                                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                                            <AlertTriangle className="h-3.5 w-3.5" />
                                            <span>Yellow Flags / Diligence Watch Items ({yellowFlags.length})</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                                            {yellowFlags.map((flag, i) => (
                                                <li key={i} className="leading-relaxed">{flag}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {greenFlags.length > 0 && (
                                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1.5">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            <span>Green Flags & Strategic Strengths ({greenFlags.length})</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                                            {greenFlags.map((flag, i) => (
                                                <li key={i} className="leading-relaxed">{flag}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Open Questions & Negotiation Levers */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {openQuestions.length > 0 && (
                                    <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                            <HelpCircle className="h-3.5 w-3.5 text-primary" />
                                            <span>Open Questions for Management</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1.5">
                                            {openQuestions.slice(0, 5).map((q, i) => (
                                                <li key={i} className="leading-relaxed">{q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {negotiationLevers.length > 0 && (
                                    <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
                                        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                                            <span>Key Negotiation Levers</span>
                                        </div>
                                        <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1.5">
                                            {negotiationLevers.slice(0, 5).map((lever, i) => (
                                                <li key={i} className="leading-relaxed">{lever}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Missing Documents */}
                            {missingDocs.length > 0 && (
                                <div className="rounded-xl border border-border/70 bg-card p-4 space-y-2">
                                    <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                        <FileWarning className="h-3.5 w-3.5 text-amber-500" />
                                        <span>Missing Documents Checklist</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {missingDocs.map((doc, i) => (
                                            <Badge key={i} variant="outline" className="text-xs py-1 border-amber-500/30 text-amber-800 dark:text-amber-300">
                                                {doc}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Model Underwriting Assumptions */}
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-2 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                                    <TrendingUp className="h-3.5 w-3.5 text-primary" />
                                    <span>Model Underwriting Assumptions</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-muted-foreground">
                                    <div>Hold Period: <strong className="text-foreground">{model?.holdPeriodYears ?? 5} Years</strong></div>
                                    <div>Base Growth: <strong className="text-foreground">{((model?.baseRevenueGrowth ?? 0.05) * 100).toFixed(1)}%</strong></div>
                                    <div>Senior Rate: <strong className="text-foreground">{((model?.interestRate ?? 0.08) * 100).toFixed(1)}%</strong></div>
                                    <div>Exit Multiple: <strong className="text-foreground">{model?.exitMultiple ?? 4.5}x</strong></div>
                                    <div>Tax Rate: <strong className="text-foreground">{((model?.taxRate ?? 0.25) * 100).toFixed(1)}%</strong></div>
                                    <div>Amortization: <strong className="text-foreground">{model?.amortizationYears ?? 10} Years</strong></div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border/80 bg-slate-950 p-4 overflow-x-auto text-slate-200 font-mono text-xs leading-relaxed shadow-inner">
                            <pre className="whitespace-pre-wrap">{markdownText}</pre>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-3 shrink-0 text-xs">
                    <p className="text-muted-foreground text-xs hidden sm:block">
                        Instant in-browser compilation. Use for investor meetings, lender packages, and deal syndication.
                    </p>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="text-xs cursor-pointer"
                        >
                            Close Preview
                        </Button>
                        <Button
                            onClick={onDownloadMarkdown}
                            size="sm"
                            className="text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white cursor-pointer shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span>Download .md</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DossierPreviewModal
