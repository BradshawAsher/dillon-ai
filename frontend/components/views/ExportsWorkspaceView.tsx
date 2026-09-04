import React, { Suspense, lazy, useState } from 'react'
import {
    Printer,
    Scale,
    FileSpreadsheet,
    Download,
    Copy,
    Check,
    BookOpen,
    Code2,
    ShieldCheck,
    Sparkles,
    FileText,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    Briefcase,
    Eye
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../lib/shadcn/card'
import { Button } from '../../lib/shadcn/button'
import { Badge } from '../../lib/shadcn/badge'
import type { DealModel, ProjectSynthesisItem } from '../../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../../utils/submissionHistory'
import type { WorkspaceTab } from '../DealWorkspaceNav'
import { DossierPreviewModal } from './DossierPreviewModal'
import { JsonAuditPreviewModal } from './JsonAuditPreviewModal'

const ExcelModelPreviewModal = lazy(() =>
    import('./ExcelModelPreviewModal').then((module) => ({ default: module.ExcelModelPreviewModal }))
)

export interface ExportsWorkspaceViewProps {
    dealModel: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
    documents?: SubmissionHistoryItem[]
    onExportIcMemo: () => void
    onExportLoi: () => void
    onExportExcel: () => Promise<void> | void
    onExportMarkdown: () => void
    onExportJson: () => void
    onCopySummary: () => void
    onSwitchTab?: (tab: WorkspaceTab, anchor?: string) => void
    onOpenChatWithPrompt?: (prompt: string) => void
}

function formatCurrency(val: number | null | undefined): string {
    if (val == null || !Number.isFinite(val)) return '—'
    return `$${Math.round(val).toLocaleString()}`
}

export function ExportsWorkspaceView({
    dealModel,
    synthesis,
    projectName,
    documents = [],
    onExportIcMemo,
    onExportLoi,
    onExportExcel,
    onExportMarkdown,
    onExportJson,
    onCopySummary,
    onSwitchTab,
    onOpenChatWithPrompt,
}: ExportsWorkspaceViewProps) {
    const [copiedSummary, setCopiedSummary] = useState(false)
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false)
    const [previewModal, setPreviewModal] = useState<'excel' | 'dossier' | 'json' | null>(null)

    const askingPrice = dealModel?.askingPrice || (synthesis as any)?.financialFacts?.askingPrice
    const reportedRevenue = dealModel?.revenue || (synthesis as any)?.financialFacts?.revenue
    const normalizedEbitda = dealModel?.ebitda || (synthesis as any)?.financialFacts?.ebitda
    const multiple = askingPrice && normalizedEbitda && normalizedEbitda > 0
        ? `${(askingPrice / normalizedEbitda).toFixed(1)}x`
        : '—'

    const hasData = Boolean(askingPrice || reportedRevenue || normalizedEbitda || synthesis)

    const handleCopy = () => {
        onCopySummary()
        setCopiedSummary(true)
        setTimeout(() => setCopiedSummary(false), 2200)
    }

    const handleDownloadExcel = async () => {
        setIsDownloadingExcel(true)
        try {
            await onExportExcel()
        } finally {
            setTimeout(() => setIsDownloadingExcel(false), 1200)
        }
    }

    const handleAskDillon = (promptText: string) => {
        if (onOpenChatWithPrompt) {
            onOpenChatWithPrompt(promptText)
        } else {
            const input = (document.querySelector('textarea[placeholder*="Ask Dillon"]') || document.querySelector('[data-chat-input]')) as HTMLTextAreaElement | HTMLInputElement | null
            if (input) {
                input.value = promptText
                input.focus()
                input.dispatchEvent(new Event('input', { bubbles: true }))
            }
        }
    }

    return (
        <div id="exports-hub" className="space-y-6">
            {/* Top Hub Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-linear-to-r from-card via-card/95 to-primary/5 p-6 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
                                <Briefcase className="h-5 w-5" />
                            </span>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                    Deal Deliverables & Export Hub
                                </h1>
                                <p className="text-xs text-muted-foreground sm:text-sm">
                                    Publication-grade memos, legal term sheets, live models, and structured audit packets for{' '}
                                    <strong className="font-semibold text-foreground">{projectName}</strong>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Badge variant="outline" className="gap-1.5 border-primary/30 bg-primary/10 text-primary py-1 px-2.5 text-xs font-semibold">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>5 Active Deliverables</span>
                        </Badge>
                        <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-1 px-2.5 text-xs font-semibold">
                            <Eye className="h-3.5 w-3.5" />
                            <span>In-App Previews Active</span>
                        </Badge>
                        <Badge
                            variant="outline"
                            className={`gap-1.5 py-1 px-2.5 text-xs font-semibold ${
                                hasData
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}
                        >
                            {hasData ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                            <span>{hasData ? 'Verified Data Ready' : 'Diligence Data In Progress'}</span>
                        </Badge>
                    </div>
                </div>

                {/* Quick Snapshot Strip */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/50 pt-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-border/40 bg-background/50 p-2.5">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Asking Price</div>
                        <div className="text-base font-bold text-foreground">{formatCurrency(askingPrice)}</div>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/50 p-2.5">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Normalized EBITDA</div>
                        <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(normalizedEbitda)}</div>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/50 p-2.5">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Implied Multiple</div>
                        <div className="text-base font-bold text-primary">{multiple}</div>
                    </div>
                    <div className="rounded-xl border border-border/40 bg-background/50 p-2.5">
                        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">VDR Documents</div>
                        <div className="text-base font-bold text-foreground">{documents.length > 0 ? `${documents.length} Files` : 'Active Deal'}</div>
                    </div>
                </div>
            </div>

            {/* Grid of 5 Institutional Deliverables */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {/* 1. Investment Committee (IC) Deal Memorandum */}
                <Card id="export-ic-memo" className="relative flex flex-col justify-between border-border/80 bg-card hover:border-primary/50 transition-all duration-200 shadow-2xs hover:shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                                <Printer className="h-5 w-5" />
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25">
                                    .PDF / PRINT
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                    7 SECTIONS
                                </Badge>
                            </div>
                        </div>
                        <CardTitle className="mt-3 text-base font-bold text-foreground">
                            Investment Committee (IC) Memo
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                            Comprehensive, publication-grade investment memorandum for IC voting. Features executive verdict (🟢/🟡/🔴), normalized EBITDA bridge with disallowed seller perks, customer concentration analysis, and definitive covenant recommendations.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 pt-0">
                        <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Audit Provenance:</span>
                                <span className="font-semibold text-foreground">5-Tier Evidence Badges</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Output Formats:</span>
                                <span className="font-semibold text-foreground">Print to PDF · Markdown</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                        <Button
                            onClick={onExportIcMemo}
                            className="w-full flex-1 gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
                            title="Open Investment Committee Memo Modal (.pdf / Print)"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Open / Print Memo</span>
                            <ArrowUpRight className="h-3 w-3 opacity-70" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onExportMarkdown}
                            className="w-full sm:w-auto gap-1 text-xs cursor-pointer"
                            title="Download Raw Markdown"
                        >
                            <Download className="h-3 w-3" />
                            <span>.md</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* 2. Formal Letter of Intent (LOI) & Term Sheet */}
                <Card id="export-loi" className="relative flex flex-col justify-between border-border/80 bg-card hover:border-violet-500/50 transition-all duration-200 shadow-2xs hover:shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                <Scale className="h-5 w-5" />
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/25">
                                    TERM SHEET
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                    60-D EXCLUSIVITY
                                </Badge>
                            </div>
                        </div>
                        <CardTitle className="mt-3 text-base font-bold text-foreground">
                            Letter of Intent (LOI) & Term Sheet
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                            Institutional 8-section transaction offer and binding exclusivity agreement. Includes capital stack schedule (SBA 7a, seller note, equity check), $415k target working capital peg with 90-day true-up, 10% escrow holdback, and Delaware governing law.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 pt-0">
                        <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Legal Enforceability:</span>
                                <span className="font-semibold text-foreground">Binding Exclusivity + APA Peg</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Modes Supported:</span>
                                <span className="font-semibold text-foreground">Initial Offer · Post-LOI Revised</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                        <Button
                            onClick={onExportLoi}
                            className="w-full flex-1 gap-1.5 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white cursor-pointer shadow-xs"
                            title="Generate Letter of Intent (LOI) Modal"
                        >
                            <Scale className="h-3.5 w-3.5" />
                            <span>Generate Formal LOI</span>
                            <ArrowUpRight className="h-3 w-3 opacity-70" />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onExportLoi}
                            className="w-full sm:w-auto gap-1 text-xs cursor-pointer border-violet-500/30 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10"
                            title="Review Legal Sections"
                        >
                            <FileText className="h-3 w-3" />
                            <span>Preview</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* 3. Live 5-Sheet Financial Model (.xlsx) */}
                <Card id="export-excel" className="relative flex flex-col justify-between border-border/80 bg-card hover:border-emerald-500/50 transition-all duration-200 shadow-2xs hover:shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <FileSpreadsheet className="h-5 w-5" />
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25">
                                    MICROSOFT EXCEL
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                    LIVE FORMULAS
                                </Badge>
                            </div>
                        </div>
                        <CardTitle className="mt-3 text-base font-bold text-foreground">
                            Live 5-Sheet Financial Model (.xlsx)
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                            Five-sheet underwriting workbook generated 100% in-browser with live Excel formulas. Includes deal assumptions, 5-year projections, LBO returns, documented-fact provenance, and the valuation and escrow bridge.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 pt-0">
                        <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Formula Engine:</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active Excel Recalculation</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Compatibility:</span>
                                <span className="font-semibold text-foreground">Excel 2016+, Office 365, Sheets</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewModal('excel')}
                            className="w-full sm:w-auto flex-1 gap-1.5 text-xs font-semibold border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer shadow-2xs"
                            title="Preview all 5 worksheets and dynamic formulas in-browser"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview Model</span>
                        </Button>
                        <Button
                            onClick={handleDownloadExcel}
                            disabled={isDownloadingExcel}
                            className="w-full sm:w-auto flex-1 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs disabled:opacity-50"
                            title="Download Live 5-Sheet Excel Model (.xlsx)"
                        >
                            <FileSpreadsheet className="h-3.5 w-3.5" />
                            <span>{isDownloadingExcel ? 'Compiling...' : 'Download .xlsx'}</span>
                            <Download className="h-3 w-3 opacity-70" />
                        </Button>
                    </CardFooter>
                </Card>

                {/* 4. Executive Deal Summary Dossier (.md) */}
                <Card id="export-summary" className="relative flex flex-col justify-between border-border/80 bg-card hover:border-primary/50 transition-all duration-200 shadow-2xs hover:shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                <BookOpen className="h-5 w-5" />
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                                    EXECUTIVE BRIEF
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                    MARKDOWN
                                </Badge>
                            </div>
                        </div>
                        <CardTitle className="mt-3 text-base font-bold text-foreground">
                            Executive Deal Dossier (.md)
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                            Clean, high-level briefing designed for deal partners, lenders, and co-investors. Summarizes investment thesis, key strengths, operational risks, and valuation multiples in portable Markdown.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 pt-0">
                        <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Read Time:</span>
                                <span className="font-semibold text-foreground">~3 Minutes</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Intended Audience:</span>
                                <span className="font-semibold text-foreground">Sponsors, Lenders, Deal Leads</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewModal('dossier')}
                            className="w-full sm:w-auto flex-1 gap-1.5 text-xs font-semibold border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 cursor-pointer shadow-2xs"
                            title="Preview formatted executive dossier in-browser"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Preview Dossier</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onExportMarkdown}
                            className="w-full sm:w-auto gap-1 text-xs cursor-pointer"
                            title="Download Executive Dossier Markdown"
                        >
                            <Download className="h-3 w-3" />
                            <span>.md</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleCopy}
                            className="w-full sm:w-auto gap-1 text-xs cursor-pointer"
                            title="Copy Markdown to Clipboard"
                        >
                            {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copiedSummary ? 'Copied!' : 'Copy'}</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* 5. Structured Diligence Audit Packet (.json) */}
                <Card id="export-json" className="relative flex flex-col justify-between border-border/80 bg-card hover:border-amber-500/50 transition-all duration-200 shadow-2xs hover:shadow-md">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Code2 className="h-5 w-5" />
                            </div>
                            <div className="flex flex-wrap gap-1">
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                                    AUDIT PAYLOAD
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                    JSON SCHEMA
                                </Badge>
                            </div>
                        </div>
                        <CardTitle className="mt-3 text-base font-bold text-foreground">
                            Structured Diligence JSON (.json)
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                            Machine-readable data packet containing raw extracted financial facts, reconciliation conflict logs, line-item adjustments, confidence scores, and source citations with cell/page coordinates.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 pt-0">
                        <div className="rounded-lg border border-border/50 bg-muted/40 p-2.5 space-y-1 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Schema Standard:</span>
                                <span className="font-semibold text-foreground">MergeWorks Audit v1.4</span>
                            </div>
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>Integration Use:</span>
                                <span className="font-semibold text-foreground">API / ERP / Pipeline CRM</span>
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-2 flex flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewModal('json')}
                            className="w-full sm:w-auto flex-1 gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer shadow-2xs"
                            title="Inspect JSON audit tree and facts in-browser"
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Inspect Payload</span>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={onExportJson}
                            className="w-full sm:w-auto flex-1 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs hover:border-amber-500/50 hover:text-amber-700 dark:hover:text-amber-300"
                            title="Download Structured Audit JSON"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download .json</span>
                        </Button>
                    </CardFooter>
                </Card>

                {/* 6. Dillon AI Interactive Deliverable Assistant Card */}
                <Card className="relative flex flex-col justify-between border-dashed border-primary/40 bg-primary/5 shadow-2xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary">
                                <Sparkles className="h-5 w-5" />
                            </div>
                            <Badge variant="outline" className="text-[10px] font-bold border-primary/40 text-primary">
                                AI ASSISTANT
                            </Badge>
                        </div>
                        <CardTitle className="mt-3 text-base font-bold text-foreground">
                            Need a Custom Deliverable?
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                            Ask Dillon to draft custom indemnity schedules, calculate specific SBA debt covenants, or synthesize deal memos tailored to your committee requirements.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3 pt-0 space-y-1.5">
                        <button
                            type="button"
                            onClick={() => handleAskDillon(`Explain the key clauses in the Letter of Intent (LOI) for ${projectName}, including the working capital peg and exclusivity.`)}
                            className="w-full text-left text-xs p-2 rounded-lg border border-primary/20 bg-background/60 hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-pointer text-foreground flex items-center justify-between group"
                        >
                            <span className="line-clamp-1">Explain LOI exclusivity & NWC peg</span>
                            <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0 text-primary" />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAskDillon(`How do the formulas work in the Live Excel Model for ${projectName}? Explain the DSCR and IRR calculations.`)}
                            className="w-full text-left text-xs p-2 rounded-lg border border-primary/20 bg-background/60 hover:bg-primary/10 hover:border-primary/40 transition-colors cursor-pointer text-foreground flex items-center justify-between group"
                        >
                            <span className="line-clamp-1">Explain live Excel model formulas</span>
                            <ArrowUpRight className="h-3 w-3 opacity-60 group-hover:opacity-100 shrink-0 text-primary" />
                        </button>
                    </CardContent>

                    <CardFooter className="pt-2">
                        <Button
                            variant="default"
                            onClick={() => handleAskDillon(`I want to review the full diligence package and export options for ${projectName}.`)}
                            className="w-full gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Ask Dillon About Exports</span>
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* In-App Deliverable Preview Modals */}
            {previewModal === 'excel' ? (
                <Suspense fallback={null}>
                    <ExcelModelPreviewModal
                        open
                        onOpenChange={(open) => setPreviewModal(open ? 'excel' : null)}
                        model={dealModel}
                        synthesis={synthesis}
                        projectName={projectName}
                        onDownloadExcel={handleDownloadExcel}
                    />
                </Suspense>
            ) : null}

            <DossierPreviewModal
                open={previewModal === 'dossier'}
                onOpenChange={(open) => setPreviewModal(open ? 'dossier' : null)}
                model={dealModel}
                synthesis={synthesis}
                projectName={projectName}
                onDownloadMarkdown={onExportMarkdown}
                onCopyMarkdown={onCopySummary}
            />

            <JsonAuditPreviewModal
                open={previewModal === 'json'}
                onOpenChange={(open) => setPreviewModal(open ? 'json' : null)}
                model={dealModel}
                synthesis={synthesis}
                projectName={projectName}
                onDownloadJson={onExportJson}
            />
        </div>
    )
}

export default ExportsWorkspaceView
