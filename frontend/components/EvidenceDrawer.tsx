import { useState } from 'react'
import { ExternalLink, FileText, X } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { driveEmbedUrl, type EvidenceItem, type MetricInput } from '../utils/evidence'

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

const SOURCE_LABELS: Record<MetricInput['source'], { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
    documented: { label: 'Documented', variant: 'success' },
    assumed: { label: 'Assumed', variant: 'warning' },
    analyst: { label: 'Analyst input', variant: 'secondary' },
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
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inputs</p>
                    <ul className="mt-2 space-y-1.5">
                        {inputs.map((input) => (
                            <li key={`${input.label}-${input.value}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground">{input.label}</span>
                                <span className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{input.value}</span>
                                    <Badge variant={SOURCE_LABELS[input.source].variant}>{SOURCE_LABELS[input.source].label}</Badge>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    )
}

export default function EvidenceDrawer({ evidence, onClose }: { evidence: EvidenceItem | null; onClose: () => void }) {
    if (!evidence) return null
    const confidence = evidence.confidence === undefined || evidence.confidence === '' ? 'Not returned' : typeof evidence.confidence === 'number' ? `${evidence.confidence}%` : evidence.confidence
    return <div className="fixed inset-0 z-50 flex justify-end bg-black/35" role="presentation" onMouseDown={onClose}><aside role="dialog" aria-modal="true" aria-label="Evidence detail" className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-border p-5"><div className="min-w-0"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><p className="text-sm font-semibold">Evidence detail</p></div><h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">{evidence.title}</h2></div><Button type="button" variant="ghost" size="icon" aria-label="Close evidence drawer" onClick={onClose}><X className="h-5 w-5" /></Button></div><div className="flex-1 space-y-5 overflow-y-auto p-5"><div className="flex flex-wrap gap-2"><Badge variant="outline">{evidence.status || 'Status not returned'}</Badge><Badge variant="secondary">{evidence.provenance || 'Evidence source'}</Badge></div><CalculationBreakdown formula={evidence.formula} inputs={evidence.inputs} /><Detail label="Source document" value={evidence.sourceFile || 'Source file was not returned by the workflow.'} /><Detail label="Page / cell / location" value={evidence.sourceLocation || 'Location was not returned.'} /><Detail label="Reporting period" value={evidence.period || 'Period was not returned.'} /><Detail label="Currency" value={evidence.currency || 'Currency was not returned.'} /><Detail label="Extraction confidence" value={confidence} /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source excerpt</p><p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-4 text-sm leading-6 text-foreground">{evidence.excerpt || 'An excerpt was not returned. Review the source document and location above.'}</p></div><CitedDocumentViewer evidence={evidence} /></div></aside></div>
}

function Detail({ label, value }: { label: string; value: string }) {
    return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-6 text-foreground">{value}</p></div>
}
