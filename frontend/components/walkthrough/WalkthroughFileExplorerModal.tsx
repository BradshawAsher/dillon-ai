import React, { useState, useEffect } from 'react'
import {
    Folder,
    FileText,
    FileSpreadsheet,
    CheckSquare,
    Square,
    UploadCloud,
    X,
    Search,
    ShieldCheck,
    Lock,
    HardDrive,
    Sparkles,
    ArrowRight,
} from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Badge } from '../../lib/shadcn/badge'

export interface VDRMockFile {
    id: string
    name: string
    extension: 'pdf' | 'xlsx'
    sizeStr: string
    sizeBytes: number
    category: string
    badge: string
    dateModified: string
    color: string
}

export const MOCK_VDR_FILES: VDRMockFile[] = [
    {
        id: 'file-pnl',
        name: 'Apex_Industrial_FY23-FY25_Profit_and_Loss.pdf',
        extension: 'pdf',
        sizeStr: '3.4 MB',
        sizeBytes: 1024 * 3480,
        category: 'Financial Statements',
        badge: 'Audited 3-Year P&L',
        dateModified: 'Yesterday at 4:15 PM',
        color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
    {
        id: 'file-bs',
        name: 'Apex_Industrial_Q3_Balance_Sheet.xlsx',
        extension: 'xlsx',
        sizeStr: '1.8 MB',
        sizeBytes: 1024 * 1840,
        category: 'Working Capital & Assets',
        badge: 'Multi-Tab Excel Model',
        dateModified: 'Oct 14, 2025',
        color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
        id: 'file-loi',
        name: 'Signed_Letter_of_Intent_Apex_Acquisition.pdf',
        extension: 'pdf',
        sizeStr: '840 KB',
        sizeBytes: 1024 * 840,
        category: 'Deal Terms & Legal',
        badge: 'Executed LOI ($12.5M)',
        dateModified: 'Nov 02, 2025',
        color: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    },
    {
        id: 'file-tax',
        name: 'IRS_Form_1120_Tax_Return_2024.pdf',
        extension: 'pdf',
        sizeStr: '2.1 MB',
        sizeBytes: 1024 * 2150,
        category: 'Tax Filings',
        badge: 'IRS Form 1120 Verified',
        dateModified: 'Oct 28, 2025',
        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
]

interface WalkthroughFileExplorerModalProps {
    isOpen: boolean
    onClose: () => void
    onUploadFiles: (files: VDRMockFile[]) => void
    isAutoSelected?: boolean
}

export function WalkthroughFileExplorerModal({
    isOpen,
    onClose,
    onUploadFiles,
    isAutoSelected = true,
}: WalkthroughFileExplorerModalProps) {
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
        new Set(isAutoSelected ? MOCK_VDR_FILES.map((f) => f.id) : [])
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        if (isOpen && isAutoSelected) {
            setSelectedFileIds(new Set(MOCK_VDR_FILES.map((f) => f.id)))
        }
    }, [isOpen, isAutoSelected])

    if (!isOpen) return null

    const toggleFile = (id: string) => {
        setSelectedFileIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const selectAll = () => {
        setSelectedFileIds(new Set(MOCK_VDR_FILES.map((f) => f.id)))
    }

    const unselectAll = () => {
        setSelectedFileIds(new Set())
    }

    const handleConfirmUpload = () => {
        setIsUploading(true)
        const selectedList = MOCK_VDR_FILES.filter((f) => selectedFileIds.has(f.id))
        setTimeout(() => {
            onUploadFiles(selectedList.length > 0 ? selectedList : MOCK_VDR_FILES)
            setIsUploading(false)
            onClose()
        }, 400)
    }

    const filteredFiles = MOCK_VDR_FILES.filter(
        (f) =>
            f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.badge.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in-0 duration-200 pointer-events-auto overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="flex flex-col lg:flex-row items-stretch justify-center gap-4 w-full max-w-5xl max-h-[90vh]">
                {/* Main VDR File Explorer Window */}
                <div
                    id="mock-file-explorer-window"
                    className="flex-1 rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl overflow-hidden ring-1 ring-primary/20 animate-in zoom-in-95 duration-200 flex flex-col min-w-0 max-h-[85vh]"
                >
                    {/* macOS / Modern OS Window Titlebar */}
                    <div className="flex items-center justify-between border-b border-border/70 bg-muted/70 px-4 py-3 select-none">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 mr-2">
                                <span
                                    className="h-3 w-3 rounded-full bg-red-500/80 hover:bg-red-600 transition-colors cursor-pointer inline-block"
                                    onClick={onClose}
                                    title="Close window"
                                />
                                <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                                <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                <HardDrive className="h-3.5 w-3.5 text-primary" />
                                <span>Virtual Data Room — Apex Industrial Technologies LLC</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                <Lock className="h-3 w-3" /> 256-bit AES Encrypted
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md hover:bg-muted"
                                onClick={onClose}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Breadcrumb path & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-b border-border/60 bg-background/50 px-4 py-2.5 text-xs">
                        <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[11px] overflow-x-auto whitespace-nowrap">
                            <span className="text-foreground font-semibold flex items-center gap-1">
                                <Folder className="h-3.5 w-3.5 text-primary fill-primary/20" /> VDR Vault
                            </span>
                            <span>/</span>
                            <span>Apex Industrial Technologies</span>
                            <span>/</span>
                            <span className="text-primary font-bold">01_Financials_and_Tax</span>
                        </div>

                        <div className="relative min-w-[200px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Filter files in folder..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-md border border-border/70 bg-background pl-8 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* File List Header & Quick Actions */}
                    <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border/40 text-xs">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={selectedFileIds.size === MOCK_VDR_FILES.length ? unselectAll : selectAll}
                                className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
                            >
                                {selectedFileIds.size === MOCK_VDR_FILES.length ? (
                                    <CheckSquare className="h-4 w-4 text-primary" />
                                ) : (
                                    <Square className="h-4 w-4 text-muted-foreground" />
                                )}
                                <span>
                                    {selectedFileIds.size === MOCK_VDR_FILES.length
                                        ? 'Deselect All'
                                        : 'Select All 4 Documents'}
                                </span>
                            </button>
                            <span className="text-muted-foreground text-2xs">
                                ({selectedFileIds.size} of {MOCK_VDR_FILES.length} selected)
                            </span>
                        </div>
                        <Badge variant="outline" className="text-2xs font-mono">
                            Total Packet: 8.14 MB
                        </Badge>
                    </div>

                    {/* File Items List */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-border/20">
                        {filteredFiles.map((file) => {
                            const isSelected = selectedFileIds.has(file.id)
                            return (
                                <div
                                    key={file.id}
                                    onClick={() => toggleFile(file.id)}
                                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-primary/50 bg-primary/8 shadow-xs ring-1 ring-primary/25'
                                            : 'border-border/60 bg-card/60 hover:bg-muted/50 hover:border-border'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="shrink-0">
                                            {isSelected ? (
                                                <CheckSquare className="h-5 w-5 text-primary" />
                                            ) : (
                                                <Square className="h-5 w-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <div
                                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${file.color}`}
                                        >
                                            {file.extension === 'pdf' ? (
                                                <FileText className="h-5 w-5" />
                                            ) : (
                                                <FileSpreadsheet className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                                                {file.name}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-2xs text-muted-foreground">
                                                <span className="font-mono">{file.sizeStr}</span>
                                                <span>•</span>
                                                <span>{file.category}</span>
                                                <span>•</span>
                                                <span>{file.dateModified}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center gap-2">
                                        <Badge
                                            variant="secondary"
                                            className="hidden sm:inline-flex text-[10px] font-medium border border-border/50"
                                        >
                                            {file.badge}
                                        </Badge>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Footer Action Bar */}
                    <div className="border-t border-border/80 bg-muted/60 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Ready for parallel batch ingestion on OpenAI 5.6 Terra & n8n Pod 1.</span>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={onClose}
                                className="flex-1 sm:flex-initial"
                            >
                                Cancel
                            </Button>
                            <Button
                                id="vdr-upload-files-btn"
                                type="button"
                                size="sm"
                                onClick={handleConfirmUpload}
                                disabled={selectedFileIds.size === 0 || isUploading}
                                className="flex-1 sm:flex-initial gap-1.5 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                            >
                                <UploadCloud className="h-4 w-4" />
                                <span>
                                    {isUploading
                                        ? 'Staging Files...'
                                        : `Upload ${selectedFileIds.size} File${selectedFileIds.size === 1 ? '' : 's'} to Deal Intake`}
                                </span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Walkthrough Companion Guidance Panel */}
                <div className="w-full lg:w-80 rounded-2xl border border-primary/40 bg-card/95 shadow-2xl backdrop-blur-xl p-5 flex flex-col justify-between shrink-0 ring-1 ring-primary/30 relative overflow-hidden">
                    {/* Top ambient glow */}
                    <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-primary/20 blur-2xl pointer-events-none" />

                    <div className="space-y-4">
                        {/* Header badge */}
                        <div className="flex items-center justify-between">
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[11px] font-semibold gap-1.5 py-1 px-2.5">
                                <Sparkles className="h-3 w-3 animate-pulse" />
                                Step 3 • VDR Ingestion
                            </Badge>
                            <span className="text-[11px] font-mono font-medium text-muted-foreground">
                                4 files ready
                            </span>
                        </div>

                        {/* Title & Target Deal */}
                        <div>
                            <h3 className="text-base font-bold text-foreground">
                                Stage VDR Deal Documents
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                                <HardDrive className="h-3.5 w-3.5 text-primary" />
                                <span>Apex Industrial ($12.5M LOI)</span>
                            </div>
                        </div>

                        {/* Explanatory Narrative */}
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Dillon AI has connected to the deal room and pre-selected the 4 core financial & legal exhibits needed for institutional due diligence.
                        </p>

                        {/* Interactive Checklist Preview */}
                        <div className="space-y-2 rounded-xl bg-muted/40 border border-border/60 p-3 text-xs">
                            <div className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                                Selected Exhibits (4)
                            </div>
                            <div className="space-y-1.5 text-2xs text-foreground font-medium">
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                    <span className="truncate">3-Year Audited P&L ($15.8M Rev)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    <span className="truncate">Q3 Balance Sheet & Working Capital</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                                    <span className="truncate">Executed LOI ($12.5M Valuation)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    <span className="truncate">IRS Form 1120-S Tax Return</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Callout */}
                        <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs text-primary font-medium flex items-start gap-2.5">
                            <span className="text-sm shrink-0">👉</span>
                            <span>
                                Click <strong>'Upload 4 Files'</strong> below to stage files into your deal vault, or let the walkthrough auto-advance.
                            </span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 mt-4 border-t border-border/60 space-y-2">
                        <Button
                            type="button"
                            onClick={handleConfirmUpload}
                            disabled={selectedFileIds.size === 0 || isUploading}
                            className="w-full gap-2 font-bold shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer"
                        >
                            <UploadCloud className="h-4 w-4" />
                            <span>
                                {isUploading
                                    ? 'Staging Files...'
                                    : `Upload ${selectedFileIds.size} File${selectedFileIds.size === 1 ? '' : 's'} Now`}
                            </span>
                            <ArrowRight className="h-4 w-4 ml-auto" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="w-full text-xs text-muted-foreground hover:text-foreground"
                        >
                            Close Explorer
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
