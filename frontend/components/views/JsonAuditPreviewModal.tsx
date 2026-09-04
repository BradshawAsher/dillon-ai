import React, { useState, useMemo, useEffect } from 'react'
import {
    Code2,
    Download,
    Copy,
    Check,
    X,
    FileCheck,
    ShieldCheck,
    Search,
    Database,
    Binary
} from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Badge } from '../../lib/shadcn/badge'
import { Input } from '../../lib/shadcn/input'
import type { DealModel, ProjectSynthesisItem } from '../../hooks/backend/diligence'
import { buildJsonExport } from '../ExportDealButton'

export interface JsonAuditPreviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
    onDownloadJson: () => void
}

export function JsonAuditPreviewModal({
    open,
    onOpenChange,
    model,
    synthesis,
    projectName,
    onDownloadJson,
}: JsonAuditPreviewModalProps) {
    const [filterSection, setFilterSection] = useState<'all' | 'dealModel' | 'documentedFacts' | 'synthesis'>('all')
    const [searchQuery, setSearchQuery] = useState('')
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

    const jsonPayload = useMemo(() => {
        return buildJsonExport(model, synthesis ?? undefined, projectName)
    }, [model, synthesis, projectName])

    if (!open) return null

    const safeName = (projectName || 'deal').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)

    const factsCount = Object.keys(jsonPayload.documentedFacts || {}).length
    const redFlagsCount = jsonPayload.synthesis?.redFlags?.length ?? 0
    const yellowFlagsCount = jsonPayload.synthesis?.yellowFlags?.length ?? 0

    // Selected payload section
    let displayData: any = jsonPayload
    if (filterSection === 'dealModel') {
        displayData = { dealModel: jsonPayload.dealModel }
    } else if (filterSection === 'documentedFacts') {
        displayData = { documentedFacts: jsonPayload.documentedFacts }
    } else if (filterSection === 'synthesis') {
        displayData = { synthesis: jsonPayload.synthesis }
    }

    const jsonString = JSON.stringify(displayData, null, 2)

    // Filter lines if search query is provided
    const lines = jsonString.split('\n')
    const filteredLines = searchQuery.trim()
        ? lines.filter(line => line.toLowerCase().includes(searchQuery.toLowerCase().trim()))
        : lines

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // fallback
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in-0 duration-200">
            <div
                id="json-audit-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="json-preview-title"
                className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-amber-500/30 bg-card text-card-foreground shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                            <Code2 className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 id="json-preview-title" className="text-sm font-bold text-foreground sm:text-base">
                                    {safeName}_export.json
                                </h2>
                                <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                    Current Export Schema
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground hidden sm:inline-flex">
                                    Audit Payload
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Exact machine-readable payload used by the JSON download
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopy}
                            className="gap-1 text-xs cursor-pointer"
                            title="Copy entire JSON to clipboard"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                        </Button>
                        <Button
                            onClick={onDownloadJson}
                            size="sm"
                            className="gap-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download .json</span>
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

                {/* Quick Stats Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-border/60 bg-muted/20 px-4 py-2 text-xs">
                    <div className="flex items-center gap-1.5">
                        <Database className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Facts:</span>
                        <strong className="text-foreground">{factsCount} Extracted</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-muted-foreground">Red Flags:</span>
                        <strong className="text-foreground">{redFlagsCount}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-muted-foreground">Watch Items:</span>
                        <strong className="text-foreground">{yellowFlagsCount}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Binary className="h-3.5 w-3.5 text-sky-500" />
                        <span className="text-muted-foreground">Egress:</span>
                        <strong className="text-emerald-600 dark:text-emerald-400">$0.00 (In-Memory)</strong>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-border/60 bg-background px-4 py-2 shrink-0">
                    <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setFilterSection('all')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                filterSection === 'all'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Full JSON ({lines.length} lines)
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterSection('dealModel')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                filterSection === 'dealModel'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            dealModel
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterSection('documentedFacts')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                filterSection === 'documentedFacts'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            documentedFacts
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterSection('synthesis')}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                                filterSection === 'synthesis'
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            synthesis
                        </button>
                    </div>

                    <div className="relative w-full sm:w-60">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Filter JSON lines..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>
                </div>

                {/* JSON Code Viewer */}
                <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-200 font-mono text-xs shadow-inner">
                    <pre className="space-y-0.5 leading-relaxed">
                        {filteredLines.map((line, idx) => (
                            <div key={idx} className="flex group hover:bg-slate-900/80 rounded px-1">
                                <span className="w-10 select-none text-right pr-4 text-slate-600 group-hover:text-slate-400">
                                    {idx + 1}
                                </span>
                                <span className="flex-1 whitespace-pre-wrap">{line}</span>
                            </div>
                        ))}
                    </pre>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-3 shrink-0 text-xs">
                    <p className="text-muted-foreground text-xs hidden sm:block">
                        Structured format verified for automated pipeline ingest, CRM sync, or REST APIs.
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
                            onClick={onDownloadJson}
                            size="sm"
                            className="text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span>Download .json</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default JsonAuditPreviewModal
