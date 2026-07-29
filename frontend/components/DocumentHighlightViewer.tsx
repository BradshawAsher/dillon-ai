import { useState, useMemo } from 'react'
import { FileText, ExternalLink, ZoomIn, ZoomOut, Sparkles, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'

type DocumentHighlightViewerProps = {
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    documentUrl?: string
    documentId?: string
    confidence?: string | number
}

export default function DocumentHighlightViewer({
    sourceFile = 'Uploaded Document',
    sourceLocation = 'Document-wide analysis summary',
    excerpt,
    documentUrl,
    documentId,
    confidence,
}: DocumentHighlightViewerProps) {
    const [zoom, setZoom] = useState(100)
    const [highlightActive, setHighlightActive] = useState(true)
    const [excerptExpanded, setExcerptExpanded] = useState(true)

    const cleanDriveId = useMemo(() => {
        if (documentId) return documentId
        if (!documentUrl) return null
        const match = documentUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || documentUrl.match(/id=([a-zA-Z0-9_-]+)/)
        return match ? match[1] : null
    }, [documentId, documentUrl])

    const embedUrl = cleanDriveId
        ? `https://drive.google.com/file/d/${cleanDriveId}/preview`
        : documentUrl || null

    const formattedLocation = sourceLocation === 'AI document summary' ? 'Document summary' : sourceLocation

    // Highlight matching keywords inside excerpt
    const highlightedExcerpt = useMemo(() => {
        if (!excerpt) return null
        if (!highlightActive) return excerpt

        const pattern = /(revenue|ebitda|margin|debt|customer|concentration|risk|contract|cogs|operating|loss|profit|client|tax|liability|asset|\$[\d,]+|\d+(?:\.\d+)?%)/gi
        const parts = excerpt.split(pattern)

        return parts.map((part, index) => {
            if (pattern.test(part)) {
                return (
                    <mark key={index} className="rounded bg-amber-300/80 px-1 py-0.5 font-semibold text-amber-950 dark:bg-amber-400/90 dark:text-amber-950 shadow-sm">
                        {part}
                    </mark>
                )
            }
            return part
        })
    }, [excerpt, highlightActive])

    return (
        <div className="space-y-3 rounded-xl border border-primary/20 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="rounded-lg bg-primary/10 p-1.5 text-primary">
                        <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{sourceFile}</p>
                        <p className="text-[11px] text-muted-foreground">{formattedLocation}</p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant={highlightActive ? 'success' : 'secondary'} className="gap-1 text-[10px]">
                        <Sparkles className="h-3 w-3" />
                        {highlightActive ? 'Highlighted' : 'Off'}
                    </Badge>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHighlightActive(!highlightActive)}
                        className="h-7 px-2 text-[11px]"
                    >
                        Toggle
                    </Button>
                    {embedUrl && (
                        <a
                            href={embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <Maximize2 className="h-3 w-3" /> Full screen
                        </a>
                    )}
                </div>
            </div>

            {/* Full document preview — shown when a Drive / URL embed is available */}
            {embedUrl ? (
                <div className="space-y-3">
                    <div className="overflow-hidden rounded-lg border border-border bg-black/5 dark:bg-black/40">
                        <iframe
                            title={`Full document: ${sourceFile}`}
                            src={embedUrl}
                            className="w-full border-0"
                            style={{ height: 'calc(100vh - 340px)', minHeight: '400px' }}
                            allow="autoplay"
                        />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Cited location: <strong className="text-foreground">{formattedLocation}</strong></span>
                        <a
                            href={embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                        >
                            Open in new tab <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
            ) : null}

            {/* Highlighted excerpt — collapsible callout pinned below the doc preview */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5">
                <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-xs font-medium text-foreground hover:bg-amber-500/10 transition-colors rounded-t-lg"
                    onClick={() => setExcerptExpanded((v) => !v)}
                >
                    <span className="flex items-center gap-2">
                        <span className="uppercase tracking-wide text-[10px] text-muted-foreground">Cited excerpt</span>
                        {confidence && (
                            <span className="text-muted-foreground">
                                · Confidence: <strong className="text-foreground">{typeof confidence === 'number' ? `${confidence}%` : confidence}</strong>
                            </span>
                        )}
                    </span>
                    {excerptExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                {excerptExpanded && (
                    <div className="relative px-4 pb-4 font-mono text-xs leading-relaxed" style={{ fontSize: `${(zoom / 100) * 0.75}rem` }}>
                        <div className="absolute top-0 right-3 flex items-center gap-1 opacity-60 hover:opacity-100">
                            <button type="button" onClick={() => setZoom((z) => Math.max(80, z - 10))} className="rounded p-1 hover:bg-background/80" title="Zoom out">
                                <ZoomOut className="h-3 w-3" />
                            </button>
                            <span className="text-[10px] font-sans text-muted-foreground">{zoom}%</span>
                            <button type="button" onClick={() => setZoom((z) => Math.min(150, z + 10))} className="rounded p-1 hover:bg-background/80" title="Zoom in">
                                <ZoomIn className="h-3 w-3" />
                            </button>
                        </div>
                        <p className="whitespace-pre-wrap pr-20">{highlightedExcerpt || 'No excerpt available for this citation.'}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
