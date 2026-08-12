// Bridges per-document extraction into a project-level documented-facts object.
//
// The per-document AI analysis writes a `financialFactsJson` array on each
// document row (revenue, ebitda_sde, debt, ...). The quant cards, however,
// read a project-level `documentedFacts` object keyed by field. Nothing in n8n
// aggregates the two yet, so on live deals the whole quant layer showed
// "Inputs needed" even though the facts had been extracted.
//
// This derives that project-level object from the documents already loaded in
// the page — no extra backend or n8n call — picking the most recent period per
// metric and preferring confirmed facts.
import type { SubmissionHistoryItem } from './submissionHistory'
import {
    detectContradictions,
    observationsFromDocuments,
    type ContradictionRecord,
    type ConflictDetectorOptions,
} from './crossDocumentConflicts'

type RawFact = {
    metric?: string
    raw_value?: string
    normalized_value?: number
    period?: string
    currency?: string
    confidence?: number
    status?: string
    provenance?: string
    formula?: string
    citation?: {
        source_file?: string
        page_number?: number | string | null
        row_or_cell?: string
        excerpt?: string
    }
}

export type DerivedFact = {
    value: number
    status: string
    currency: string
    period: string
    provenance: string
    confidence: number
    citations: Array<{ source_file?: string; row_or_cell?: string; excerpt?: string }>
}

// Metrics the quant cards understand. Extra metrics are still carried through
// under their own key so future cards can use them without another change.
const KNOWN_METRICS = new Set([
    'revenue',
    'ebitda_sde',
    'debt',
    'total_assets',
    'total_liabilities',
    'cash',
    'gross_profit',
    'net_income',
    'cogs',
])

function periodRank(period: string | undefined): number {
    if (!period) return 0
    const match = period.match(/(\d{4})/)
    return match ? Number(match[1]) : 0
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function citationLocation(citation: RawFact['citation']): string | undefined {
    if (!citation) return undefined
    if (citation.row_or_cell && citation.row_or_cell.trim().length > 0) return citation.row_or_cell
    if (citation.page_number !== null && citation.page_number !== undefined && String(citation.page_number).trim().length > 0) {
        return `Page ${String(citation.page_number).trim()}`
    }
    return undefined
}

function isDerivedFact(fact: RawFact): boolean {
    const normalized = `${fact.provenance ?? ''} ${fact.formula ?? ''} ${fact.citation?.excerpt ?? ''}`.toLowerCase()
    return /reconstruct|formula|derived|calculated|implied|computed/.test(normalized)
}

/**
 * Chooses the best fact for a metric: latest period wins; within the same
 * period a confirmed fact beats an unconfirmed one, explicitly sourced facts
 * beat reconstructed ones, then higher confidence.
 */
function isBetter(candidate: RawFact, current: RawFact): boolean {
    const cp = periodRank(candidate.period)
    const pp = periodRank(current.period)
    if (cp !== pp) return cp > pp

    const cConfirmed = (candidate.status ?? '').toLowerCase() === 'confirmed'
    const pConfirmed = (current.status ?? '').toLowerCase() === 'confirmed'
    if (cConfirmed !== pConfirmed) return cConfirmed

    const cDerived = isDerivedFact(candidate)
    const pDerived = isDerivedFact(current)
    if (cDerived !== pDerived) return !cDerived

    return (candidate.confidence ?? 0) > (current.confidence ?? 0)
}

/**
 * Aggregates the completed documents of a single project into the
 * documented-facts object the quant cards consume. Returns `{}` when no
 * usable facts exist, which keeps the cards' "inputs needed" states intact.
 */
export function deriveDocumentedFacts(documents: SubmissionHistoryItem[]): Record<string, DerivedFact> {
    const bestByMetric = new Map<string, RawFact>()

    for (const document of documents) {
        if (!document.financialFactsJson) continue

        let facts: RawFact[]
        try {
            const parsed = JSON.parse(document.financialFactsJson) as unknown
            facts = Array.isArray(parsed) ? (parsed as RawFact[]) : []
        } catch {
            continue
        }

        for (const fact of facts) {
            const metric = (fact.metric ?? '').trim().toLowerCase()
            if (metric.length === 0 || !isNumber(fact.normalized_value)) continue

            const existing = bestByMetric.get(metric)
            if (!existing || isBetter(fact, existing)) {
                bestByMetric.set(metric, fact)
            }
        }
    }

    const result: Record<string, DerivedFact> = {}
    for (const [metric, fact] of bestByMetric) {
        // Keep known metrics; also keep anything else so it isn't silently lost.
        if (!KNOWN_METRICS.has(metric)) {
            // still carry it, but only if it looks like a usable numeric fact
        }
        result[metric] = {
            value: fact.normalized_value as number,
            status: fact.status ?? 'reported',
            currency: fact.currency ?? 'USD',
            period: fact.period ?? '',
            provenance: fact.provenance ?? (isDerivedFact(fact) ? 'Calculated from uploaded documents' : 'Extracted from uploaded documents'),
            confidence: isNumber(fact.confidence)
                ? (fact.confidence <= 1 ? Math.round(fact.confidence * 100) : Math.round(fact.confidence))
                : 0,
            citations: fact.citation
                ? [{
                    source_file: fact.citation.source_file,
                    row_or_cell: citationLocation(fact.citation),
                    excerpt: fact.citation.excerpt,
                }]
                : [],
        }
    }

    return result
}

/** Serialized form, ready to drop into a DealModel's `documentedFactsJson`. */
export function deriveDocumentedFactsJson(documents: SubmissionHistoryItem[]): string {
    const derived = deriveDocumentedFacts(documents)
    return Object.keys(derived).length > 0 ? JSON.stringify(derived) : ''
}

/**
 * Same aggregation as `deriveDocumentedFacts`, but also runs the deterministic
 * cross-document contradiction detector over the raw facts (which
 * `deriveDocumentedFacts` discards when it keeps only the best value per
 * metric). The `facts` field is byte-for-byte what `deriveDocumentedFacts`
 * returns; `conflicts` surfaces the competing values that disagree across
 * documents so the UI can flag them.
 */
export function deriveDocumentedFactsWithConflicts(
    documents: SubmissionHistoryItem[],
    options?: ConflictDetectorOptions,
): { facts: Record<string, DerivedFact>; conflicts: ContradictionRecord[] } {
    return {
        facts: deriveDocumentedFacts(documents),
        conflicts: detectContradictions(observationsFromDocuments(documents), options),
    }
}
