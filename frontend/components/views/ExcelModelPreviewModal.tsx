import React, { useState, useMemo, useEffect } from 'react'
import {
    FileSpreadsheet,
    Download,
    X,
    Copy,
    Check,
    Calculator,
    ShieldCheck,
    Layers,
    TrendingUp,
    FileCheck,
    Scale,
} from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Badge } from '../../lib/shadcn/badge'
import type { DealModel, ProjectSynthesisItem } from '../../hooks/backend/diligence'
import {
    buildLiveExcelModelPreview,
    type ExcelPreviewCell,
} from '../../utils/excelModelGenerator'

export interface ExcelModelPreviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
    onDownloadExcel: () => Promise<void> | void
}

function getSheetIcon(sheetId: string): React.ReactNode {
    switch (sheetId) {
        case 'projections':
            return <TrendingUp className="h-3.5 w-3.5" />
        case 'returns':
            return <Calculator className="h-3.5 w-3.5" />
        case 'audit':
            return <FileCheck className="h-3.5 w-3.5" />
        case 'bridge':
            return <Scale className="h-3.5 w-3.5" />
        default:
            return <Layers className="h-3.5 w-3.5" />
    }
}

export function ExcelModelPreviewModal({
    open,
    onOpenChange,
    model,
    synthesis,
    projectName,
    onDownloadExcel,
}: ExcelModelPreviewModalProps) {
    const [activeSheetId, setActiveSheetId] = useState<string>('assumptions')
    const [selectedCell, setSelectedCell] = useState<ExcelPreviewCell | null>(null)
    const [copiedSheet, setCopiedSheet] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)

    useEffect(() => {
        if (!open) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onOpenChange(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onOpenChange])

    const sheets = useMemo(
        () => buildLiveExcelModelPreview({
            model,
            synthesis: synthesis ?? undefined,
            projectName,
        }),
        [model, synthesis, projectName]
    )
    const activeSheet = sheets.find(s => s.id === activeSheetId) || sheets[0]

    // Set initial selected cell when active sheet changes
    useEffect(() => {
        if (activeSheet && activeSheet.rows.length > 0 && activeSheet.rows[0].length > 1) {
            setSelectedCell(activeSheet.rows[0][1])
        }
    }, [activeSheetId, activeSheet])

    if (!open) return null

    const handleCopySheetTsv = async () => {
        if (!activeSheet) return
        try {
            const headerLine = activeSheet.headers.join('\t')
            const bodyLines = activeSheet.rows.map(row => row.map(c => c.value).join('\t')).join('\n')
            await navigator.clipboard.writeText(`${headerLine}\n${bodyLines}`)
            setCopiedSheet(true)
            setTimeout(() => setCopiedSheet(false), 2000)
        } catch {
            // fallback
        }
    }

    const handleDownload = async () => {
        setIsDownloading(true)
        try {
            await onDownloadExcel()
        } finally {
            setTimeout(() => setIsDownloading(false), 1200)
        }
    }

    const safeName = (projectName || 'deal').replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50)

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in-0 duration-200">
            <div
                id="excel-preview-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="excel-preview-title"
                className="relative flex flex-col w-full max-w-6xl max-h-[94vh] rounded-2xl border border-emerald-500/30 bg-card text-card-foreground shadow-2xl overflow-hidden"
            >
                {/* Modal Top Header Bar */}
                <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                            <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 id="excel-preview-title" className="text-sm font-bold text-foreground sm:text-base">
                                    {safeName}_financial_model.xlsx
                                </h2>
                                <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                    Live Formula Workbook
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground hidden sm:inline-flex">
                                    ⚡ 100% In-Memory · $0.00 Egress
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Exact sheet structure and formulas compiled for <strong className="text-foreground">{projectName}</strong>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            size="sm"
                            className="gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>{isDownloading ? 'Exporting...' : 'Download .xlsx'}</span>
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

                {/* Excel-style Formula Bar */}
                <div className="flex items-center gap-2 border-b border-border/60 bg-background px-4 py-2 shrink-0 text-xs font-mono">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/60 border border-border/60 text-muted-foreground shrink-0 font-semibold min-w-[54px] justify-center">
                        <span>{selectedCell?.coord || 'A1'}</span>
                    </div>
                    <div className="text-muted-foreground/80 italic shrink-0 px-1 font-sans font-semibold">
                        fx
                    </div>
                    <div className="flex-1 truncate px-2 py-1 rounded bg-muted/30 border border-border/40 text-foreground font-mono">
                        {selectedCell?.formula ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {selectedCell.formula}
                            </span>
                        ) : (
                            <span>{selectedCell?.value || 'Select any cell to inspect formula'}</span>
                        )}
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopySheetTsv}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground shrink-0 gap-1 cursor-pointer"
                        title="Copy active sheet table to clipboard"
                    >
                        {copiedSheet ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                        <span>{copiedSheet ? 'Copied Tab' : 'Copy Tab'}</span>
                    </Button>
                </div>

                {/* 5 Sheet Tabs Selector Bar */}
                <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-muted/20 px-3 py-1.5 shrink-0 scrollbar-none">
                    {sheets.map(sheet => {
                        const isActive = sheet.id === activeSheetId
                        return (
                            <button
                                key={sheet.id}
                                type="button"
                                onClick={() => setActiveSheetId(sheet.id)}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs border border-border/80 font-bold'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                }`}
                            >
                                {getSheetIcon(sheet.id)}
                                <span>{sheet.name}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Main Interactive Spreadsheet Grid */}
                <div className="flex-1 overflow-auto p-4 bg-muted/10">
                    <div className="inline-block min-w-full align-middle rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
                        <table className="min-w-full divide-y divide-border/60 text-xs text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-900 text-white font-semibold">
                                    {/* Excel Row Index Header */}
                                    <th scope="col" className="w-10 px-2.5 py-2.5 text-center text-[11px] text-slate-400 bg-slate-950/80 border-r border-slate-800">
                                        #
                                    </th>
                                    {activeSheet.headers.map((hdr, hIdx) => {
                                        const colLetter = String.fromCharCode(65 + hIdx)
                                        return (
                                            <th
                                                key={hdr}
                                                scope="col"
                                                className="px-3 py-2.5 text-xs font-semibold tracking-wide border-r border-slate-800 last:border-r-0"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span>{hdr}</span>
                                                    <span className="text-[10px] text-slate-400 font-mono font-normal">
                                                        [{colLetter}]
                                                    </span>
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40 font-mono text-[12px]">
                                {activeSheet.rows.map((row, rIdx) => {
                                    const rowNum = rIdx + 2
                                    return (
                                        <tr
                                            key={rIdx}
                                            className="hover:bg-primary/5 transition-colors group"
                                        >
                                            {/* Row Number Marker */}
                                            <td className="px-2 py-1.5 text-center text-[10px] text-muted-foreground/70 bg-muted/40 border-r border-border/60 select-none font-sans">
                                                {rowNum}
                                            </td>
                                            {row.map((cell, cIdx) => {
                                                const isSelected = selectedCell?.coord === cell.coord
                                                let cellBg = ''
                                                if (cell.isSubHeader) {
                                                    cellBg = 'bg-muted/50 font-bold text-foreground font-sans'
                                                } else if (cell.isAccent) {
                                                    cellBg = 'bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 font-semibold'
                                                }

                                                return (
                                                    <td
                                                        key={cell.coord || cIdx}
                                                        onClick={() => setSelectedCell(cell)}
                                                        className={`px-3 py-1.5 border-r border-border/40 last:border-r-0 cursor-cell transition-all ${cellBg} ${
                                                            isSelected
                                                                ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-500/10'
                                                                : ''
                                                        } ${
                                                            cell.align === 'right'
                                                                ? 'text-right'
                                                                : cell.align === 'center'
                                                                ? 'text-center'
                                                                : 'text-left font-sans'
                                                        }`}
                                                        title={cell.formula ? `Formula: ${cell.formula}` : undefined}
                                                    >
                                                        <div className="flex items-center gap-1 justify-between">
                                                            {cell.formula && (
                                                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-sans opacity-60 group-hover:opacity-100">
                                                                    fx
                                                                </span>
                                                            )}
                                                            <span className="flex-1 truncate">{cell.value}</span>
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border/70 bg-muted/30 px-4 py-3 gap-2 shrink-0 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span>
                            Compiled 100% in-browser via ExcelJS. Open in Microsoft Excel 2016+, Office 365, or Google Sheets.
                        </span>
                    </div>

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
                            onClick={handleDownload}
                            disabled={isDownloading}
                            size="sm"
                            className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                        >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            <span>Download .xlsx File</span>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ExcelModelPreviewModal

