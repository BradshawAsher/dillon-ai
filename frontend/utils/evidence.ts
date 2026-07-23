// Shared evidence plumbing: turns documented facts and derived metrics into
// the shape the evidence drawer renders.
//
// Every quantitative figure in the workspace should be traceable to either
// (a) a documented fact with a citation, or (b) a formula whose inputs are
// individually labelled as documented / assumed / analyst-entered. A number a
// user cannot trace is a number they cannot defend in a negotiation.
import type { ResolvedInput } from './dealMath'
import type { SubmissionHistoryItem } from './submissionHistory'

export type FactCitation = {
    source_file?: string
    row_or_cell?: string
    excerpt?: string
}

export type DocumentedFact = {
    value?: number
    status?: string
    currency?: string
    period?: string
    provenance?: string
    confidence?: number
    citations?: FactCitation[]
}

export type MetricInput = {
    label: string
    value: string
    source: 'documented' | 'assumed' | 'analyst'
}

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
    /** Google Drive file id, used to embed an inline preview of the source. */
    documentId?: string
    /** Present for derived metrics: the formula used. */
    formula?: string
    /** Present for derived metrics: each input and where it came from. */
    inputs?: MetricInput[]
}

export function parseDocumentedFacts(json: string | undefined | null): Record<string, DocumentedFact> {
    if (!json) {
        return {}
    }

    try {
        const parsed = JSON.parse(json) as unknown
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, DocumentedFact>)
            : {}
    } catch {
        return {}
    }
}

/** Finds the uploaded document a citation refers to, so we can offer a link. */
export function findCitedDocument(sourceFile: string | undefined, documents: SubmissionHistoryItem[]) {
    if (!sourceFile) {
        return undefined
    }

    const normalizeFileName = (value: string) => decodeURIComponent(value)
        .replace(/\\/g, '/')
        .split('/').pop()!
        .replace(/\?.*$/, '')
        .replace(/\.[a-z0-9]{1,6}$/i, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()

    const needle = normalizeFileName(sourceFile)

    if (needle.length === 0) {
        return undefined
    }

    const exactOrContaining = documents.find((item) => {
        const fileName = normalizeFileName(item.fileName)
        return fileName.length > 0 && (fileName === needle || needle.includes(fileName) || fileName.includes(needle))
    })
    if (exactOrContaining) return exactOrContaining

    // LLM citations occasionally lose punctuation, extensions, or one short
    // descriptor. Match only when the meaningful filename tokens still align.
    const needleTokens = new Set(needle.split(' ').filter((token) => token.length > 1))
    let best: { document: SubmissionHistoryItem; score: number } | undefined
    for (const document of documents) {
        const tokens = new Set(normalizeFileName(document.fileName).split(' ').filter((token) => token.length > 1))
        if (tokens.size === 0) continue
        const overlap = [...needleTokens].filter((token) => tokens.has(token)).length
        const score = overlap / Math.max(needleTokens.size, tokens.size)
        if (score >= 0.6 && (!best || score > best.score)) best = { document, score }
    }

    return best?.document
}

export type EvidenceStatusPresentation = {
    label: 'Confirmed' | 'Estimated' | 'Contradicted' | 'Illustrative' | 'Calculated' | 'Synthesized' | 'Needs review'
    variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
}

/** One status vocabulary for facts, findings, and calculated metrics. */
export function getEvidenceStatusPresentation(status?: string, provenance?: string): EvidenceStatusPresentation {
    const normalized = `${status ?? ''} ${provenance ?? ''}`.trim().toLowerCase()
    if (/contradict|conflict/.test(normalized)) return { label: 'Contradicted', variant: 'destructive' }
    if (/illustrative|assum/.test(normalized)) return { label: 'Illustrative', variant: 'warning' }
    if (/estimate/.test(normalized)) return { label: 'Estimated', variant: 'warning' }
    if (/confirm|documented|fully documented/.test(normalized)) return { label: 'Confirmed', variant: 'success' }
    if (/calculat/.test(normalized)) return { label: 'Calculated', variant: 'secondary' }
    if (/synthes/.test(normalized)) return { label: 'Synthesized', variant: 'secondary' }
    return { label: 'Needs review', variant: 'outline' }
}

/** Evidence for a single documented fact (revenue, EBITDA, debt, ...). */
export function buildFactEvidence(args: {
    field: string
    title: string
    facts: Record<string, DocumentedFact>
    documents: SubmissionHistoryItem[]
}): EvidenceItem {
    const fact = args.facts[args.field]
    const citation = fact?.citations?.[0]
    const sourceFile = citation?.source_file
    const document = findCitedDocument(sourceFile, args.documents)

    return {
        title: args.title,
        sourceFile: sourceFile || 'Source file was not returned',
        sourceLocation: citation?.row_or_cell,
        excerpt: citation?.excerpt,
        period: fact?.period,
        currency: fact?.currency,
        confidence: fact?.confidence ?? document?.aiConfidence,
        status: fact?.status,
        provenance: fact?.provenance || 'Documented',
        documentUrl: document?.storageFileUrl,
        documentId: document?.storageFileId,
    }
}

/**
 * Builds a Google Drive inline-preview URL from a stored file id or a share
 * URL. Returns null when neither yields a usable id.
 */
export function driveEmbedUrl(documentId?: string, documentUrl?: string): string | null {
    const id = (documentId ?? '').trim()
    if (id.length > 0) {
        return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`
    }

    // Fall back to extracting the id from a /file/d/<id>/ share URL.
    const match = (documentUrl ?? '').match(/\/file\/d\/([^/]+)/)
    if (match) {
        return `https://drive.google.com/file/d/${match[1]}/preview`
    }

    return null
}

/**
 * Evidence for a calculated metric (payback, IRR, MOIC, margins).
 *
 * `assumedInputs` comes straight from the deal-math result, so anything that
 * fell back to a default is shown as assumed rather than presented with the
 * same authority as a documented figure.
 */
export function buildDerivedEvidence(args: {
    title: string
    formula: string
    documentedInputs?: Array<{ label: string; value: string }>
    analystInputs?: Array<{ label: string; value: string }>
    assumedInputs?: ResolvedInput[]
    formatAssumed?: (input: ResolvedInput) => string
    primaryFact?: EvidenceItem
}): EvidenceItem {
    const inputs: MetricInput[] = [
        ...(args.documentedInputs ?? []).map((input) => ({ ...input, source: 'documented' as const })),
        ...(args.analystInputs ?? []).map((input) => ({ ...input, source: 'analyst' as const })),
        ...(args.assumedInputs ?? []).map((input) => ({
            label: input.label,
            value: args.formatAssumed ? args.formatAssumed(input) : String(input.value),
            source: 'assumed' as const,
        })),
    ]

    const assumedCount = args.assumedInputs?.length ?? 0

    return {
        title: args.title,
        formula: args.formula,
        inputs,
        status: assumedCount > 0 ? `${assumedCount} assumed input${assumedCount === 1 ? '' : 's'}` : 'Fully documented inputs',
        provenance: 'Calculated',
        // Carry the underlying fact's citation through so the drawer can still
        // point at a source document and excerpt.
        sourceFile: args.primaryFact?.sourceFile,
        sourceLocation: args.primaryFact?.sourceLocation,
        excerpt: args.primaryFact?.excerpt,
        period: args.primaryFact?.period,
        currency: args.primaryFact?.currency,
        confidence: args.primaryFact?.confidence,
        documentUrl: args.primaryFact?.documentUrl,
        documentId: args.primaryFact?.documentId,
    }
}
