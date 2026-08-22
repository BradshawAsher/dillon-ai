import { useEffect, useState } from 'react'
import { copyToClipboard } from '../utils/clipboard'
import { Check, Copy, ExternalLink, FileText, X } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import DocumentHighlightViewer from './DocumentHighlightViewer'
import ExpandableText from './ExpandableText'
import ProvenanceBadge from './ProvenanceBadge'
import { driveEmbedUrl, formatEvidenceConfidence, getEvidenceStatusPresentation, type EvidenceItem, type MetricInput } from '../utils/evidence'

// The canonical definition now lives in utils/evidence.ts; re-exported here so
// existing imports keep working.
export type { EvidenceItem }

function canOpen(url?: string) {
    return Boolean(url && /^https?:\/\//i.test(url))
}

function CitedDocumentViewer({ evidence }: { evidence: EvidenceItem }) {
    const [showInline, setShowInline] = useState(false)
    const embedUrl = driveEmbedUrl(evidence.documentId, evidence.documentUrl)
    const openUrl = evidence.documentUrl && canOpen(evidence.documentUrl)
        ? evidence.documentUrl
        : evidence.documentId
            ? `https://drive.google.com/file/d/${encodeURIComponent(evidence.documentId)}/view`
            : null

    if (!embedUrl && !openUrl) {
        return (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">
                A direct document link is not available for this evidence yet. The citation above remains available for manual lookup.
            </p>
        )
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                {embedUrl ? (
                    <Button type="button" variant={showInline ? 'secondary' : 'default'} onClick={() => setShowInline((open) => !open)}>
                        <FileText className="mr-2 h-4 w-4" />
                        {showInline ? 'Hide document preview' : 'Preview source document'}
                    </Button>
                ) : null}
                {openUrl ? (
                    <Button type="button" variant="outline" onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open in new tab
                    </Button>
                ) : null}
            </div>
            {showInline && embedUrl ? (
                <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                    <iframe
                        title={`Source document: ${evidence.sourceFile ?? 'document'}`}
                        src={embedUrl}
                        className="h-[420px] w-full"
                        allow="autoplay"
                    />
                    {evidence.sourceLocation ? (
                        <p className="border-t border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                            Cited location: <span className="font-medium text-foreground">{evidence.sourceLocation}</span> — the viewer opens the full document; scroll to this location to confirm the figure.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    )
}

const SOURCE_LABELS: Record<MetricInput['source'] | 'web', { label: string; variant: 'success' | 'warning' | 'secondary' | 'outline'; className?: string; icon: string }> = {
    documented: { label: 'Document Fact', variant: 'success', className: 'provenance-badge-doc', icon: '📄' },
    assumed: { label: 'Model Assumption', variant: 'warning', className: 'provenance-badge-analyst', icon: '⚡' },
    analyst: { label: 'Analyst Override', variant: 'secondary', className: 'provenance-badge-analyst', icon: '✏️' },
    web: { label: 'Public Web', variant: 'outline', className: 'provenance-badge-web', icon: '🌐' },
}

function CalculationBreakdown({ formula, inputs }: { formula?: string; inputs?: MetricInput[] }) {
    if (!formula && (!inputs || inputs.length === 0)) {
        return null
    }

    return (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
            {formula ? (
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">How it is calculated</p>
                    <p className="mt-1 font-mono text-sm leading-6 text-foreground">{formula}</p>
                </div>
            ) : null}
            {inputs && inputs.length > 0 ? (
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inputs & Provenance</p>
                    <ul className="mt-2 space-y-2">
                        {inputs.map((input) => {
                            const labelInfo = SOURCE_LABELS[input.source] || SOURCE_LABELS.analyst
                            return (
                                <li key={`${input.label}-${input.value}`} className="flex flex-wrap items-center justify-between gap-2 text-sm rounded-md bg-background/50 px-2.5 py-1.5 border border-border/50">
                                    <span className="text-muted-foreground">{input.label}</span>
                                    <span className="flex items-center gap-2">
                                        <span className="font-semibold text-foreground">{input.value}</span>
                                        <Badge variant={labelInfo.variant} className={`gap-1 text-[11px] ${labelInfo.className ?? ''}`}>
                                            <span>{labelInfo.icon}</span>
                                            <span>{labelInfo.label}</span>
                                        </Badge>
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ) : null}
        </div>
    )
}

export default function EvidenceDrawer({ evidence, onClose }: { evidence: EvidenceItem | null; onClose: () => void }) {
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        if (!evidence) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [evidence, onClose])

    if (!evidence) return null

    const formattedConfidence = formatEvidenceConfidence(evidence.confidence)
    const confidence = formattedConfidence
    const status = getEvidenceStatusPresentation(evidence.status, evidence.provenance)

    const handleCopyCitation = () => {
        const text = `**Evidence Title:** ${evidence.title}\n` +
            `**Source Document:** ${evidence.sourceFile || 'N/A'}\n` +
            `**Location:** ${evidence.sourceLocation || 'N/A'}\n` +
            `**Status:** ${status.label}\n` +
            `**Excerpt:** "${evidence.excerpt || 'No excerpt available'}"`

        void copyToClipboard(text).then((ok) => {
            if (ok) {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
            }
        })
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-start bg-black/35" role="presentation" onMouseDown={onClose}>
            <aside
                id="diligence-evidence-drawer"
                data-evidence-drawer="true"
                role="dialog"
                aria-modal="true"
                aria-label="Evidence detail"
                className="flex h-full w-full max-w-xl flex-col border-r border-border bg-background shadow-2xl animate-in slide-in-from-left duration-200"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-border p-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <p className="text-sm font-semibold">Evidence detail</p>
                        </div>
                        <h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">{evidence.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyCitation}
                            className="flex items-center gap-1.5 text-xs"
                            title="Copy formatted citation"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied!' : 'Copy Citation'}</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Close evidence drawer" onClick={onClose}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div id="evidence-drawer-scroll-body" className="flex-1 space-y-5 overflow-y-auto p-5">
                    <div className="flex flex-wrap gap-2">
                        <ProvenanceBadge
                            provenance={evidence.provenance}
                            status={evidence.status}
                            formula={evidence.formula}
                            documentUrl={evidence.documentUrl}
                            documentId={evidence.documentId}
                            sourceFile={evidence.sourceFile}
                        />
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {evidence.status && evidence.status.toLowerCase() !== status.label.toLowerCase() ? (
                            <Badge variant="outline">{evidence.status}</Badge>
                        ) : null}
                        {evidence.provenance ? (
                            <Badge variant="outline" className="max-w-[14rem] truncate" title={evidence.provenance}>
                                {evidence.provenance}
                            </Badge>
                        ) : null}
                    </div>

                    <CalculationBreakdown formula={evidence.formula} inputs={evidence.inputs} />

                    <Detail label="Source document" value={evidence.sourceFile || 'Uploaded document'} />
                    <Detail
                        label="Page / cell / location"
                        value={
                            !evidence.sourceLocation || evidence.sourceLocation === 'AI document summary'
                                ? 'Document-wide analysis summary'
                                : evidence.sourceLocation
                        }
                    />
                    <Detail label="Reporting period" value={evidence.period && !evidence.period.includes('not returned') ? evidence.period : 'Full document scope / TTM'} />
                    <Detail label="Currency" value={evidence.currency && !evidence.currency.includes('not returned') ? evidence.currency : 'USD ($)'} />
                    <Detail
                        label="Extraction confidence"
                        value={
                            confidence === 'Unrated' || confidence === 'Not returned' || !confidence
                                ? 'Document-level qualitative insight'
                                : confidence
                        }
                    />

                    {evidence.excerpt ? (
                        <div id="evidence-cited-excerpt" className="rounded-md border border-border bg-background/80 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cited excerpt</p>
                            <p className="mt-1 text-sm leading-6 text-foreground whitespace-pre-wrap">{evidence.excerpt}</p>
                        </div>
                    ) : null}

                    <div id="evidence-pdf-viewer">
                        <DocumentHighlightViewer
                            sourceFile={evidence.sourceFile}
                            sourceLocation={evidence.sourceLocation}
                            excerpt={evidence.excerpt}
                            documentUrl={evidence.documentUrl}
                            documentId={evidence.documentId}
                            confidence={confidence}
                        />
                    </div>
                </div>
            </aside>
        </div>
    )
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm leading-6 text-foreground font-medium">{value}</p>
        </div>
    )
}
