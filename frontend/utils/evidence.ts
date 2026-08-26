// Shared evidence plumbing: turns documented facts and derived metrics into
// the shape the evidence drawer renders.
//
// Every quantitative figure in the workspace should be traceable to either
// (a) a documented fact with a citation, or (b) a formula whose inputs are
// individually labelled as documented / assumed / analyst-entered. A number a
// user cannot trace is a number they cannot defend in a negotiation.
import type { ResolvedInput } from './dealMath'
import type { SubmissionHistoryItem } from './submissionHistory'
import { resolveStorageCdnUrl } from '../services/supabaseStorage'

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
    source_document?: string
    source_page?: string | number
    page_number?: string | number
    quote_snippet?: string
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

/** Formats a confidence score or label into a clean, human-readable display string without arbitrary hardcoded fallbacks. */
export function formatEvidenceConfidence(confidence?: string | number | null): string {
    if (confidence === undefined || confidence === null || confidence === '') {
        return 'Unrated'
    }
    const cleanStr = String(confidence).trim()
    const numericCandidate = cleanStr.endsWith('%') ? cleanStr.slice(0, -1).trim() : cleanStr
    const num = typeof confidence === 'number' ? confidence : Number(numericCandidate)
    if (Number.isFinite(num)) {
        const scaled = num <= 1 && num > 0 ? Math.round(num * 100) : Math.round(num)
        // Clamp to a valid 0..100 percentage so a malformed value ("150") can't
        // render as "150% (High Confidence)".
        const val = Math.min(100, Math.max(0, scaled))
        return `${val}% (${val >= 85 ? 'High Confidence' : val >= 60 ? 'Medium Confidence' : 'Low Confidence'})`
    }
    const lower = cleanStr.toLowerCase()
    if (lower === 'high' || lower.includes('high')) return 'High Confidence'
    if (lower === 'medium' || lower === 'med' || lower.includes('med')) return 'Medium Confidence'
    if (lower === 'low' || lower.includes('low')) return 'Low Confidence'
    return cleanStr
}

export function parseDocumentedFacts(json: string | undefined | null): Record<string, DocumentedFact> {
    if (!json) {
        return {}
    }

    try {
        const parsed = JSON.parse(json) as unknown
        const facts = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as Record<string, DocumentedFact>)
            : {}

        // Fallback: If ebitda_sde is missing from documented facts but net_income exists,
        // use net_income as the documented baseline along with its source citation.
        if (!facts.ebitda_sde && facts.net_income) {
            facts.ebitda_sde = {
                ...facts.net_income,
                provenance: facts.net_income.provenance || 'Documented (Net Income)',
            }
        }

        return facts
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
        const overlap = Array.from(needleTokens).filter((t) => tokens.has(t)).length
        if (overlap > 0 && (!best || overlap > best.score)) {
            best = { document, score: overlap }
        }
    }

    return best?.document
}

export type EvidenceStatusPresentation = {
    label: 'Confirmed' | 'Estimated' | 'Contradicted' | 'Illustrative' | 'Calculated' | 'Synthesized' | 'Needs review'
    variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
}

export type ProvenanceCategory = 'document' | 'web' | 'calculated' | 'synthesized' | 'analyst' | 'unknown'

export type ProvenanceCategoryPresentation = {
    category: ProvenanceCategory
    label: string
    variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'outline'
}

export function getProvenanceCategory(args: {
    provenance?: string
    status?: string
    formula?: string
    sourceFile?: string
    documentUrl?: string
    documentId?: string
}): ProvenanceCategoryPresentation {
    return getProvenanceCategoryPresentation(args)
}

/** High-level origin badge: document upload vs web enrichment vs derived math. */
export function getProvenanceCategoryPresentation(args: {
    provenance?: string
    status?: string
    formula?: string
    sourceFile?: string
    documentUrl?: string
    documentId?: string
}): ProvenanceCategoryPresentation {
    const normalized = `${args.provenance ?? ''} ${args.status ?? ''}`.trim().toLowerCase()

    if (/web|public|enrichment|domain|internet|online reputation/.test(normalized)) {
        return { category: 'web', label: 'Web source', variant: 'outline' }
    }
    if (args.formula || /calculat|deterministic math|reconcil/.test(normalized)) {
        return { category: 'calculated', label: 'Calculated', variant: 'secondary' }
    }
    if (/synthes|project synthesis|consolidat/.test(normalized)) {
        return { category: 'synthesized', label: 'Synthesized', variant: 'secondary' }
    }
    if (/analyst|assumption|illustrative|preview|example/.test(normalized)) {
        return { category: 'analyst', label: 'Analyst input', variant: 'warning' }
    }
    if (
        args.documentUrl ||
        args.documentId ||
        (args.sourceFile && !/not returned|n\/a/.test(args.sourceFile.toLowerCase())) ||
        /document|upload|extracted|extract/.test(normalized)
    ) {
        return { category: 'document', label: 'Document source', variant: 'success' }
    }

    return { category: 'unknown', label: 'Source unknown', variant: 'outline' }
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

    let sourceFile = citation?.source_file
    if (!sourceFile && args.documents.length > 0) {
        // The bare "pl" abbreviation must be delimited (underscore counts as a
        // delimiter here, so \b is too strict) — otherwise it matches inside
        // ordinary words like "supplier", "template", or "employee_list" and
        // mis-attributes a financial fact's source to an unrelated document.
        const plDoc = args.documents.find((d) =>
            /p&l|p_and_l|(?<![a-z0-9])pl(?![a-z0-9])|financial|statement|tax/i.test(d.fileName)
        )
        if (plDoc) {
            sourceFile = plDoc.fileName
        }
    }

    return buildDocumentLinkedEvidence({
        title: args.title,
        sourceFile: sourceFile,
        sourceLocation: citation?.row_or_cell || (fact?.period ? `Period: ${fact.period}` : undefined),
        excerpt: citation?.excerpt,
        period: fact?.period,
        currency: fact?.currency,
        confidence: fact?.confidence,
        status: fact?.status,
        provenance: fact?.provenance || 'Documented',
        documents: args.documents,
        fallbackSourceFile: 'Source file was not returned',
    })
}

/**
 * Normalizes evidence objects so every clickable source consistently carries
 * through a matched document id / URL when one can be resolved.
 */
export function buildDocumentLinkedEvidence(args: {
    title: string
    documents?: SubmissionHistoryItem[]
    sourceFile?: string
    fallbackSourceFile?: string
    sourceLocation?: string
    fallbackSourceLocation?: string
    excerpt?: string
    period?: string
    currency?: string
    confidence?: string | number | null
    status?: string
    provenance?: string
}): EvidenceItem {
    const resolvedSourceFile = args.sourceFile || args.fallbackSourceFile
    const document = findCitedDocument(resolvedSourceFile, args.documents ?? [])

    return {
        title: args.title,
        sourceFile: resolvedSourceFile,
        sourceLocation: args.sourceLocation || args.fallbackSourceLocation,
        excerpt: args.excerpt,
        period: args.period,
        currency: args.currency,
        confidence: args.confidence ?? document?.aiConfidence,
        status: args.status,
        provenance: args.provenance,
        documentUrl: resolveStorageCdnUrl(document?.storageFileUrl),
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

    // Fall back to extracting the id from a share URL. Drive hands these out in
    // several shapes: /file/d/<id>/…, open?id=<id>, and uc?id=<id>.
    const url = documentUrl ?? ''
    // Match the id after any Drive/Docs "/d/" segment — /file/d/, /document/d/,
    // /spreadsheets/d/, /presentation/d/ — so a cited Google Doc, Sheet, or
    // Slides share link previews too, not only /file/d/ uploads. Stop the
    // capture at a query (`?`) or fragment (`#`) boundary as well as `/` or `&`,
    // otherwise ".../d/ABC?usp=sharing" or "open?id=ABC#h" folds the trailing
    // query/fragment into the id and yields a broken preview.
    const match = url.match(/\/d\/([^/?#]+)/) ?? url.match(/[?&]id=([^&#]+)/)
    if (match) {
        return `https://drive.google.com/file/d/${encodeURIComponent(decodeURIComponent(match[1]))}/preview`
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
    modelAssumptions?: Array<{ label: string; value: string }>
    analystInputs?: Array<{ label: string; value: string }>
    assumedInputs?: ResolvedInput[]
    formatAssumed?: (input: ResolvedInput) => string
    primaryFact?: EvidenceItem
    isConfirmed?: boolean
    statusLabel?: string
}): EvidenceItem {
    const inputs: MetricInput[] = [
        ...(args.documentedInputs ?? []).map((input) => ({ ...input, source: 'documented' as const })),
        ...(args.modelAssumptions ?? []).map((input) => ({ ...input, source: 'assumed' as const })),
        ...(args.analystInputs ?? []).map((input) => ({ ...input, source: 'analyst' as const })),
        ...(args.assumedInputs ?? []).map((input) => ({
            label: input.label,
            value: args.formatAssumed ? args.formatAssumed(input) : String(input.value),
            source: 'assumed' as const,
        })),
    ]

    const hasAssumptions = (args.modelAssumptions && args.modelAssumptions.length > 0) || (args.assumedInputs && args.assumedInputs.length > 0)
    const isFullyConfirmed = args.isConfirmed ?? (!hasAssumptions && (args.documentedInputs?.length ?? 0) > 0)

    const status = args.statusLabel ?? (isFullyConfirmed ? 'Confirmed Math' : 'Illustrative EBITDA')
    const confidence = isFullyConfirmed ? (args.primaryFact?.confidence ?? 'High') : 'Model Assumption'

    return {
        title: args.title,
        formula: args.formula,
        inputs,
        status,
        provenance: 'Calculated',
        // Only attach source document citation if the calculation is actually grounded in confirmed facts.
        // For illustrative preview examples, do NOT attach a document citation!
        sourceFile: isFullyConfirmed ? args.primaryFact?.sourceFile : undefined,
        sourceLocation: isFullyConfirmed ? args.primaryFact?.sourceLocation : undefined,
        excerpt: isFullyConfirmed ? args.primaryFact?.excerpt : undefined,
        period: isFullyConfirmed ? args.primaryFact?.period : undefined,
        currency: args.primaryFact?.currency,
        confidence,
        documentUrl: isFullyConfirmed ? args.primaryFact?.documentUrl : undefined,
        documentId: isFullyConfirmed ? args.primaryFact?.documentId : undefined,
    }
}
