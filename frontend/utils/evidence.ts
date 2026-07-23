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

    const needle = sourceFile.trim().toLowerCase()

    if (needle.length === 0) {
        return undefined
    }

    return documents.find((item) => {
        const fileName = item.fileName.trim().toLowerCase()
        return fileName.length > 0 && (fileName === needle || needle.includes(fileName) || fileName.includes(needle))
    })
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
    }
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
    }
}
