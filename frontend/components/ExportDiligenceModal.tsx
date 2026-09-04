import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'
import { Check, Copy, Download, FileText, Printer, Sparkles, X, ShieldAlert, Scale, DollarSign, BookOpen } from 'lucide-react'
import type { ProjectSynthesisItem, DealModel } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { generateIcMemoMarkdown, generateIcMemoHtml } from '../utils/icMemoGenerator'
import { generateLoiMarkdown } from '../utils/loiGenerator'
import { computeValuationBridge } from '../utils/valuationBridge'

export interface ExportDiligenceModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    dealName: string
    projectId: string
    synthesis?: ProjectSynthesisItem | null
    dealModel: DealModel
    documents?: SubmissionHistoryItem[]
    initialDocumentType?: 'ic_memo' | 'loi'
}

function formatMoney(val: number | null | undefined): string {
    if (val == null || !Number.isFinite(val)) return '—'
    return `$${Math.round(val).toLocaleString()}`
}

export function ExportDiligenceModal({
    open,
    onOpenChange,
    dealName,
    projectId,
    synthesis,
    dealModel,
    documents,
    initialDocumentType = 'ic_memo',
}: ExportDiligenceModalProps) {
    const [copied, setCopied] = useState(false)
    const [activeTab, setActiveTab] = useState<'preview' | 'markdown'>('preview')
    const [exportDocType, setExportDocType] = useState<'ic_memo' | 'loi'>(initialDocumentType)

    useEffect(() => {
        if (open) {
            setExportDocType(initialDocumentType)
        }
    }, [open, initialDocumentType])

    useEffect(() => {
        if (!open) return
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onOpenChange(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onOpenChange])

    if (!open) return null

    const docItems = (documents || []).map((d) => ({
        fileName: d.fileName,
        documentType: d.documentType || 'Financial Statement',
        status: d.status
    }))

    const icMarkdownContent = generateIcMemoMarkdown({
        model: dealModel,
        synthesis,
        projectName: dealName,
        projectId,
        documents: docItems
    })

    const loiMarkdownContent = generateLoiMarkdown({
        model: dealModel,
        synthesis,
        projectName: dealName,
        projectId,
    })

    const markdownContent = exportDocType === 'loi' ? loiMarkdownContent : icMarkdownContent

    const bridge = computeValuationBridge(dealModel, synthesis)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(markdownContent)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Fallback
        }
    }

    const handleDownloadMarkdown = () => {
        const safeName = (dealName || 'Diligence').replace(/[^a-zA-Z0-9_-]/g, '_')
        const fileName = exportDocType === 'loi' ? `${safeName}_Letter_of_Intent_LOI.md` : `${safeName}_IC_Diligence_Memorandum.md`
        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', fileName)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handlePrint = () => {
        const html = generateIcMemoHtml({
            model: dealModel,
            synthesis,
            projectName: dealName,
            projectId,
            documents: docItems
        })

        const printWindow = window.open('', '_blank', 'width=900,height=800')
        if (!printWindow) return

        printWindow.document.open()
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            try {
                printWindow.print()
            } catch {
                // Ignore print errors
            }
        }, 300)
    }

    const verdict = synthesis?.finalRecommendation || 'PENDING EVALUATION'
    const isProceed = verdict.toLowerCase().includes('buy') || verdict.toLowerCase().includes('proceed')
    const isReject = verdict.toLowerCase().includes('pass') || verdict.toLowerCase().includes('reject')

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in-0 duration-200">
            <Card id="export-diligence-modal" className="relative w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border-primary/20 bg-card text-card-foreground">
                <CardHeader className="border-b border-border/60 pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <CardTitle className="text-lg font-bold">
                                    {exportDocType === 'loi' ? 'Non-Binding Letter of Intent (LOI)' : 'Investment Committee Diligence Memorandum'}
                                </CardTitle>
                                <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/40 bg-primary/10">
                                    {exportDocType === 'loi' ? 'Legal Deal Offer' : 'Institutional PDF & Markdown'}
                                </Badge>
                            </div>
                            <CardDescription className="text-xs text-muted-foreground mt-1">
                                {exportDocType === 'loi' ? (
                                    <span>Formal external acquisition offer &amp; definitive APA covenants for <strong className="text-foreground">{dealName || 'Active Target'}</strong></span>
                                ) : (
                                    <span>Publication-grade committee memorandum for <strong className="text-foreground">{dealName || 'Active Target'}</strong></span>
                                )}
                            </CardDescription>
                        </div>
                        <button
                            type="button"
                            onClick={() => onOpenChange(false)}
                            className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none p-1"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* DOCUMENT TYPE SELECTOR: IC MEMO VS LOI */}
                    <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-lg border border-border/60">
                        <button
                            type="button"
                            onClick={() => setExportDocType('ic_memo')}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                                exportDocType === 'ic_memo'
                                    ? 'bg-background shadow-xs text-primary border border-border/80'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Investment Committee Memo (Internal)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setExportDocType('loi')}
                            className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                                exportDocType === 'loi'
                                    ? 'bg-background shadow-xs text-primary border border-border/80'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <Scale className="h-3.5 w-3.5" />
                            <span>Letter of Intent — LOI (External Offer)</span>
                        </button>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button
                            type="button"
                            variant="default"
                            onClick={handlePrint}
                            className="h-auto flex flex-col items-center justify-center gap-1.5 p-3.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm text-center"
                        >
                            <Printer className="h-5 w-5 mb-0.5" />
                            <span className="font-semibold text-xs">Print / Save as PDF</span>
                            <span className="text-[10px] text-primary-foreground/80 font-normal">
                                {exportDocType === 'loi' ? 'Print or PDF legal offer sheet' : 'Letter-size institutional IC memo'}
                            </span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDownloadMarkdown}
                            className="h-auto flex flex-col items-center justify-center gap-1.5 p-3.5 border-primary/30 hover:bg-primary/5 text-center"
                        >
                            <Download className="h-5 w-5 text-primary mb-0.5" />
                            <span className="font-semibold text-xs">Download Markdown</span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                                {exportDocType === 'loi' ? 'Formal LOI term sheet (.md)' : '7-Section complete diligence dossier (.md)'}
                            </span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCopy}
                            className="h-auto flex flex-col items-center justify-center gap-1.5 p-3.5 border-border hover:bg-muted text-center"
                        >
                            {copied ? <Check className="h-5 w-5 text-emerald-500 mb-0.5" /> : <Copy className="h-5 w-5 text-muted-foreground mb-0.5" />}
                            <span className="font-semibold text-xs">{copied ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Fast paste into Word, Docs, or email</span>
                        </Button>
                    </div>

                    {/* TABS HEADER */}
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('preview')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                    activeTab === 'preview'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                {exportDocType === 'loi' ? 'Formal LOI Preview' : 'Executive IC Preview'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('markdown')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                    activeTab === 'markdown'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            >
                                Raw Markdown Dossier
                            </button>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            <span>Project: <strong className="text-foreground">{projectId}</strong></span>
                            <span>&middot;</span>
                            <span>{docItems.length} verified docs</span>
                        </div>
                    </div>

                    {/* PREVIEW CONTAINER */}
                    {activeTab === 'preview' ? (
                        exportDocType === 'loi' ? (
                            <div className="space-y-4 rounded-lg border border-border/70 bg-card p-4 text-xs">
                                {/* LOI OFFER HEADER STRIP */}
                                <div className="p-3 rounded-md border border-primary/30 bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 font-bold text-sm text-primary">
                                        <Scale className="h-4 w-4" />
                                        <span>PROPOSED ACQUISITION OFFER: {formatMoney(bridge.defensibleCounterOffer > 0 ? bridge.defensibleCounterOffer : dealModel.purchasePrice)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge variant="outline" className="font-semibold text-xs border-primary/40 text-primary">
                                            Asset Purchase • Cash-Free, Debt-Free
                                        </Badge>
                                        {Boolean(synthesis?.letterOfIntentPresent) ? (
                                            <Badge variant="outline" className="font-semibold text-xs border-amber-500/50 bg-amber-500/10 text-amber-800 dark:text-amber-300">
                                                Amended &amp; Restated (Post-LOI Re-Trade)
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="font-semibold text-xs border-blue-500/50 bg-blue-500/10 text-blue-800 dark:text-blue-300">
                                                Initial Offer (Pre-LOI)
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                {/* CAPITAL STACK & VALUATION */}
                                <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
                                    <div className="flex items-center justify-between font-semibold text-xs border-b border-border/40 pb-1">
                                        <span className="flex items-center gap-1.5 text-foreground">
                                            <DollarSign className="h-3.5 w-3.5 text-primary" />
                                            Proposed Financing &amp; Capital Stack
                                        </span>
                                        <span className="text-muted-foreground">Multiple: {bridge.entryMultiple.toFixed(2)}x EBITDA</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                                        <div className="bg-background rounded p-2 border border-border/40">
                                            <p className="text-[10px] text-muted-foreground">Senior SBA 7(a) / Bank Debt</p>
                                            <p className="font-mono font-bold text-xs">{formatMoney(dealModel.seniorDebtAmount ?? Math.round((dealModel.purchasePrice || 6_000_000) * 0.60))}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">10-yr fully amortizing term loan</p>
                                        </div>
                                        <div className="bg-background rounded p-2 border border-border/40">
                                            <p className="text-[10px] text-muted-foreground">Seller Subordinated Note</p>
                                            <p className="font-mono font-bold text-xs">{formatMoney(dealModel.sellerNoteAmount ?? Math.round((dealModel.purchasePrice || 6_000_000) * 0.15))}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">5-yr term @ 6.0%–8.0% interest</p>
                                        </div>
                                        <div className="bg-background rounded p-2 border border-emerald-500/40 bg-emerald-500/5">
                                            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">Buyer Cash Equity Check</p>
                                            <p className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">
                                                {formatMoney(dealModel.equityAmount ?? Math.round((dealModel.purchasePrice || 6_000_000) * (dealModel.equityContributionPercent ?? 0.25)))}
                                            </p>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">100% committed sponsor equity</p>
                                        </div>
                                    </div>
                                </div>

                                {/* COVENANTS, ESCROW & WORKING CAPITAL PEG */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="rounded border border-border/60 bg-muted/10 p-3 space-y-1.5">
                                        <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                            <BookOpen className="h-3.5 w-3.5 text-primary" />
                                            Working Capital Target (NWC Peg)
                                        </p>
                                        <p className="font-mono font-bold text-sm text-foreground">
                                            {formatMoney(dealModel.workingCapitalRequirement ?? 415_000)}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Subject to 12-month trailing monthly balance sheet average. Includes a 90-day post-closing dollar-for-dollar cash true-up adjustment.
                                        </p>
                                    </div>

                                    <div className="rounded border border-border/60 bg-muted/10 p-3 space-y-1.5">
                                        <p className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                                            Indemnity Escrows &amp; Holdbacks
                                        </p>
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-mono font-bold text-sm text-foreground">
                                                {formatMoney(Math.round((dealModel.purchasePrice || 6_000_000) * 0.10))}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">(10% General Escrow)</span>
                                        </div>
                                        {bridge.totalSpecialEscrow > 0 ? (
                                            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                                                + {formatMoney(bridge.totalSpecialEscrow)} Special Indemnity Escrow for identified diligence contingencies.
                                            </p>
                                        ) : (
                                            <p className="text-[11px] text-muted-foreground">
                                                Held in third-party escrow for 12 months post-closing to secure customary representations &amp; warranties.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* BINDING COVENANTS CALLOUT */}
                                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 space-y-1 text-amber-900 dark:text-amber-200">
                                    <p className="font-bold text-xs flex items-center gap-1.5">
                                        <Scale className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                        Legally Binding Exclusivity ("No-Shop") &amp; Confidentiality
                                    </p>
                                    <p className="text-[11px]">
                                        Seller agrees to a <strong>60-day strict exclusivity period</strong> from execution. All discussions and diligence data remain strictly governed by the mutual NDA. Governing law: State of Delaware.
                                    </p>
                                </div>
                            </div>
                        ) : (
                        <div className="space-y-4 rounded-lg border border-border/70 bg-card p-4 text-xs">
                            {/* VERDICT STRIP */}
                            <div className={`p-3 rounded-md border flex items-center justify-between ${
                                isProceed
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                    : isReject
                                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                                    : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                            }`}>
                                <div className="flex items-center gap-2 font-bold text-sm">
                                    <Scale className="h-4 w-4" />
                                    <span>IC RECOMMENDATION: {verdict.toUpperCase()}</span>
                                </div>
                                <span className="font-semibold text-xs uppercase px-2 py-0.5 rounded bg-background/60 border border-current">
                                    {synthesis?.finalTrafficLight?.toUpperCase() || 'EVALUATION'} SIGNAL
                                </span>
                            </div>

                            {/* VALUATION BRIDGE SUMMARY */}
                            <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-2">
                                <div className="flex items-center justify-between font-semibold text-xs border-b border-border/40 pb-1">
                                    <span className="flex items-center gap-1.5 text-foreground">
                                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                                        Defensible Valuation Bridge
                                    </span>
                                    <span className="text-muted-foreground">Multiple: {bridge.entryMultiple.toFixed(2)}x</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                    <div className="bg-background rounded p-2 border border-border/40">
                                        <p className="text-[10px] text-muted-foreground">1. Starting Baseline</p>
                                        <p className="font-mono font-bold text-xs">{formatMoney(bridge.baselinePurchasePrice)}</p>
                                    </div>
                                    <div className="bg-background rounded p-2 border border-border/40">
                                        <p className="text-[10px] text-rose-600 dark:text-rose-400">2. Disallowances</p>
                                        <p className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">-{formatMoney(bridge.totalEvDeduction)}</p>
                                    </div>
                                    <div className="bg-background rounded p-2 border border-border/40">
                                        <p className="text-[10px] text-amber-600 dark:text-amber-400">3. Escrow Holdback</p>
                                        <p className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">-{formatMoney(bridge.totalSpecialEscrow)}</p>
                                    </div>
                                    <div className="bg-background rounded p-2 border border-emerald-500/40 bg-emerald-500/5">
                                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">4. Net Counter-Offer</p>
                                        <p className="font-mono font-bold text-xs text-emerald-700 dark:text-emerald-300">{formatMoney(bridge.defensibleCounterOffer)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* TOP RED FLAGS & LEVERS */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="rounded border border-rose-500/30 bg-rose-500/5 p-3 space-y-1.5">
                                    <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300">
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        <span>Key Diligence Flags</span>
                                    </div>
                                    <ul className="space-y-1 pl-4 list-disc text-foreground/90 text-[11px]">
                                        {(synthesis?.redFlags || ['Stable gross margin history documented across statements.']).slice(0, 3).map((rf, i) => (
                                            <li key={i}>{rf}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-1.5">
                                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                                        <span>Investment Highlights</span>
                                    </div>
                                    <ul className="space-y-1 pl-4 list-disc text-foreground/90 text-[11px]">
                                        {(synthesis?.keyTakeaways || ['Target demonstrates recurring revenue and defensible gross margin profile.']).slice(0, 3).map((kt, i) => (
                                            <li key={i}>{kt}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground italic text-center pt-1">
                                Click &ldquo;Print / Save as PDF&rdquo; above to generate the full multi-page memo with APA contract covenants and partner sign-off blocks.
                            </p>
                        </div>
                    )) : (
                        <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold text-foreground border-b border-border/50 pb-1.5">
                                <span className="flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    Investment Committee Memo Markdown
                                </span>
                                <span className="text-[11px] text-muted-foreground font-normal">
                                    7 Sections &middot; 5-Tier Lineage
                                </span>
                            </div>
                            <div className="max-h-72 overflow-y-auto rounded bg-background/90 p-3 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap select-all border border-border/50">
                                {markdownContent}
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between border-t border-border/60 pt-3 pb-3">
                    <span className="text-[11px] text-muted-foreground">
                        Dillon AI &middot; mergeworks.io &middot; Investment Committee Standard
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

export default ExportDiligenceModal
