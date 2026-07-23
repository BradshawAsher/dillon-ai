import { ExternalLink, FileText, X } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'

export type EvidenceItem = {
    title: string
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    period?: string
    currency?: string
    confidence?: string | number
    status?: string
    provenance?: string
    documentUrl?: string
}

function canOpen(url?: string) {
    return Boolean(url && /^https?:\/\//i.test(url))
}

export default function EvidenceDrawer({ evidence, onClose }: { evidence: EvidenceItem | null; onClose: () => void }) {
    if (!evidence) return null
    const confidence = evidence.confidence === undefined || evidence.confidence === '' ? 'Not returned' : typeof evidence.confidence === 'number' ? `${evidence.confidence}%` : evidence.confidence
    return <div className="fixed inset-0 z-50 flex justify-end bg-black/35" role="presentation" onMouseDown={onClose}><aside role="dialog" aria-modal="true" aria-label="Evidence detail" className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between gap-4 border-b border-border p-5"><div className="min-w-0"><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><p className="text-sm font-semibold">Evidence detail</p></div><h2 className="mt-2 text-lg font-semibold leading-7 text-foreground">{evidence.title}</h2></div><Button type="button" variant="ghost" size="icon" aria-label="Close evidence drawer" onClick={onClose}><X className="h-5 w-5" /></Button></div><div className="flex-1 space-y-5 overflow-y-auto p-5"><div className="flex flex-wrap gap-2"><Badge variant="outline">{evidence.status || 'Status not returned'}</Badge><Badge variant="secondary">{evidence.provenance || 'Evidence source'}</Badge></div><Detail label="Source document" value={evidence.sourceFile || 'Source file was not returned by the workflow.'} /><Detail label="Page / cell / location" value={evidence.sourceLocation || 'Location was not returned.'} /><Detail label="Reporting period" value={evidence.period || 'Period was not returned.'} /><Detail label="Currency" value={evidence.currency || 'Currency was not returned.'} /><Detail label="Extraction confidence" value={confidence} /><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source excerpt</p><p className="mt-2 whitespace-pre-wrap rounded-lg border border-border bg-muted/20 p-4 text-sm leading-6 text-foreground">{evidence.excerpt || 'An excerpt was not returned. Review the source document and location above.'}</p></div>{canOpen(evidence.documentUrl) ? <Button type="button" className="w-full" onClick={() => window.open(evidence.documentUrl, '_blank', 'noopener,noreferrer')}><ExternalLink className="mr-2 h-4 w-4" />Open source document</Button> : <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-sm text-muted-foreground">A direct document link is not available for this evidence yet. The citation above remains available for manual lookup.</p>}</div></aside></div>
}

function Detail({ label, value }: { label: string; value: string }) {
    return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm leading-6 text-foreground">{value}</p></div>
}
