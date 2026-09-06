// Deterministic cross-document contradiction detector.
//
// The per-document math checks (see DETERMINISTIC_MATH_CHECKS.md) only ever
// compare numbers extracted from the *same* document. Nothing checks whether
// two different documents in the same deal disagree about the same figure —
// e.g. a seller-claimed EBITDA vs a buyer-supported EBITDA, or bank-statement
// cash vs balance-sheet cash. Those contradictions are exactly what a buyer
// needs surfaced before a negotiation.
//
// This module compares the same metric+period across documents and flags any
// pair whose values diverge beyond tolerance. It is pure and source-agnostic:
// two thin adapters map the live `SubmissionHistoryItem[]` shape and the eval
// harness `ActualRunDoc[]` shape onto a common `FactObservation[]`, and the
// core `detectContradictions` runs over that. The same logic therefore powers
// both the live dashboard and the scored eval dimension.
import { parseMagnitudeMoney } from './documentedFacts'

/** One observed value of a metric from a single source document. */
export type FactObservation = {
    /** Document the value came from (file name / label). */
    sourceDoc: string
    /** Raw metric key, pre-canonicalization. */
    metric: string
    period?: string
    value: number
    citations?: Array<{ source_file?: string; row_or_cell?: string; excerpt?: string }>
}

export type ConflictSeverity = 'info' | 'warning' | 'critical'

/** A detected disagreement between two documents about one metric+period. */
export type ContradictionRecord = {
    /** Canonical metric key. */
    metric: string
    /** Canonical period label ('' when undated). */
    period: string
    docA: string
    docB: string
    valueA: number
    valueB: number
    /** |a-b| / max(|a|,|b|), in 0..1. */
    deltaPct: number
    severity: ConflictSeverity
    citations: Array<{ source_file?: string; row_or_cell?: string; excerpt?: string }>
}

/** Every comparable cross-document pair, including verified matches. */
export type FactComparisonRecord = ContradictionRecord & {
    withinTolerance: boolean
    tolerancePct: number
}

export type ConflictDetectorOptions = {
    /** Below this relative delta, two values are considered consistent. */
    tolerancePct?: number
    /** At/above this delta a contradiction is at least a warning. */
    warningPct?: number
    /** At/above this delta a contradiction is critical. */
    criticalPct?: number
    /** Extra canonical-metric overrides merged over the defaults. */
    metricAliases?: Record<string, string>
}

const DEFAULT_OPTIONS: Required<Omit<ConflictDetectorOptions, 'metricAliases'>> = {
    tolerancePct: 0.02,
    warningPct: 0.05,
    criticalPct: 0.15,
}

// Common metric synonyms collapsed to one canonical key so the same figure
// reported under slightly different names still compares. `adjusted_ebitda` is
// deliberately kept distinct from `ebitda` — an adjusted figure legitimately
// differs — but callers can relate them via `metricAliases` when a deal treats
// the two as the same line.
const DEFAULT_METRIC_ALIASES: Record<string, string> = {
    ebitda_sde: 'ebitda',
    sde: 'ebitda',
    normalized_ebitda: 'ebitda',
    reported_ebitda: 'ebitda',
    net_revenue: 'revenue',
    total_revenue: 'revenue',
    sales: 'revenue',
    total_debt: 'debt',
    cash_and_equivalents: 'cash',
    cash_and_cash_equivalents: 'cash',
}

/** Lowercase, trim, collapse separator runs to a single underscore, then alias. */
export function canonicalMetric(metric: string, aliases: Record<string, string> = {}): string {
    const base = (metric ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
    return aliases[base] ?? DEFAULT_METRIC_ALIASES[base] ?? base
}

/**
 * Canonical comparison bucket for a period. TTM/LTM values only compare with
 * other trailing-twelve-month values; dated values collapse to their year;
 * undated values ('') only compare with other undated values.
 */
export function canonicalPeriod(period: string | undefined): string {
    const raw = (period ?? '').trim().toLowerCase()
    if (raw.length === 0) return ''
    if (/\bttm\b|\bltm\b|trailing twelve|last twelve/.test(raw)) return 'TTM'
    const year = raw.match(/(20\d{2})/)
    if (year) return year[1]
    // A non-empty but unparseable label (e.g. "Q4", "FY19", "interim") must not
    // collapse into the undated ('') bucket — doing so would let it cross-compare
    // with genuinely undated facts and manufacture contradictions across periods
    // that were never asserted to be the same. Give it a stable self-only bucket
    // derived from the label so it compares only with identical labels.
    return raw.replace(/[\s_-]+/g, '_').replace(/^_+|_+$/g, '')
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value)
}

function severityFor(deltaPct: number, opts: Required<Omit<ConflictDetectorOptions, 'metricAliases'>>): ConflictSeverity {
    if (deltaPct >= opts.criticalPct) return 'critical'
    if (deltaPct >= opts.warningPct) return 'warning'
    return 'info'
}

/**
 * Returns every independently sourced metric+period comparison. Unlike
 * `detectContradictions`, this includes pairs that agree within tolerance so a
 * UI can award a verified match only when two real source documents tie.
 */
export function compareFactsAcrossDocuments(
    observations: FactObservation[],
    options: ConflictDetectorOptions = {},
): FactComparisonRecord[] {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const aliases = options.metricAliases ?? {}
    const groups = new Map<string, Array<FactObservation & { canonMetric: string; canonPeriod: string }>>()

    for (const obs of observations) {
        if (!isFiniteNumber(obs.value)) continue
        const canonMetric = canonicalMetric(obs.metric, aliases)
        if (!canonMetric) continue
        const canonPeriod = canonicalPeriod(obs.period)
        const key = `${canonMetric}|${canonPeriod}`
        const bucket = groups.get(key) ?? []
        bucket.push({ ...obs, canonMetric, canonPeriod })
        groups.set(key, bucket)
    }

    const comparisons: FactComparisonRecord[] = []
    for (const bucket of groups.values()) {
        for (let i = 0; i < bucket.length; i += 1) {
            for (let j = i + 1; j < bucket.length; j += 1) {
                const a = bucket[i]
                const b = bucket[j]
                if (a.sourceDoc === b.sourceDoc) continue
                const scale = Math.max(Math.abs(a.value), Math.abs(b.value))
                if (scale === 0) continue
                const deltaPct = Math.abs(a.value - b.value) / scale
                comparisons.push({
                    metric: a.canonMetric,
                    period: a.canonPeriod,
                    docA: a.sourceDoc,
                    docB: b.sourceDoc,
                    valueA: a.value,
                    valueB: b.value,
                    deltaPct,
                    severity: severityFor(deltaPct, opts),
                    citations: [...(a.citations ?? []), ...(b.citations ?? [])],
                    withinTolerance: deltaPct <= opts.tolerancePct,
                    tolerancePct: opts.tolerancePct,
                })
            }
        }
    }

    return comparisons.sort((x, y) => {
        if (x.withinTolerance !== y.withinTolerance) return x.withinTolerance ? 1 : -1
        const sev = SEVERITY_RANK[y.severity] - SEVERITY_RANK[x.severity]
        return sev !== 0 ? sev : y.deltaPct - x.deltaPct
    })
}

const SEVERITY_RANK: Record<ConflictSeverity, number> = { critical: 3, warning: 2, info: 1 }

/**
 * Groups observations by canonical metric+period and reports every pair of
 * values from *different* documents that diverge beyond `tolerancePct`.
 */
export function detectContradictions(
    observations: FactObservation[],
    options: ConflictDetectorOptions = {},
): ContradictionRecord[] {
    return compareFactsAcrossDocuments(observations, options)
        .filter((record) => !record.withinTolerance)
        .map(({ withinTolerance: _withinTolerance, tolerancePct: _tolerancePct, ...record }) => record)
}

// ---------------------------------------------------------------------------
// Adapters — map the two real fact shapes onto FactObservation[].
// ---------------------------------------------------------------------------

type DocumentLike = {
    fileName?: string
    financialFactsJson?: string
}

/** Reads a fact's numeric value under either snake_case or camelCase.
 *
 * Falls back to the magnitude parser when the raw value is a formatted string
 * ("$1,200,000", "1.2M") that bare Number() would turn into NaN — otherwise a
 * genuine cross-document conflict on a string-formatted figure is silently
 * dropped. */
function readFactValue(fact: any): number | null {
    const raw = fact?.normalizedValue ?? fact?.normalized_value ?? fact?.numeric_value ?? fact?.value
    const value = Number(raw)
    if (Number.isFinite(value)) return value
    if (typeof raw !== 'string') return null
    // parseMagnitudeMoney only accepts non-negative magnitudes, but a fact can be
    // a loss written as "-$1.2M" or in accounting notation "($1.2M)". Detect the
    // sign, parse the magnitude of the absolute value, then re-apply it —
    // otherwise a genuine cross-document conflict on a negative figure (e.g. a
    // seller-claimed vs buyer-restated negative EBITDA) is silently dropped.
    const trimmed = raw.trim()
    const isNegative = trimmed.startsWith('-') || /^\(.*\)$/.test(trimmed)
    const magnitude = parseMagnitudeMoney(trimmed.replace(/^[-(]/, '').replace(/\)$/, ''))
    if (magnitude === null) return null
    return isNegative ? -magnitude : magnitude
}

function readFactCitations(fact: any): FactObservation['citations'] {
    const citations = fact?.citation ? [fact.citation] : Array.isArray(fact?.citations) ? fact.citations : []
    if (citations.length === 0) return undefined
    return citations.map((citation: any) => ({
        source_file: citation?.source_file,
        row_or_cell: citation?.row_or_cell,
        excerpt: citation?.excerpt,
    }))
}

/**
 * Live path. Parses each document's `financialFactsJson` the same way
 * `deriveDocumentedFacts` does, but emits EVERY fact as an observation rather
 * than collapsing to a single best value per metric — the competing values are
 * precisely what a contradiction check needs.
 */
export function observationsFromDocuments(documents: DocumentLike[]): FactObservation[] {
    const observations: FactObservation[] = []
    for (const document of documents) {
        let facts: any[] = []
        if (document.financialFactsJson) {
            try {
                const parsed = JSON.parse(document.financialFactsJson) as unknown
                if (Array.isArray(parsed)) facts.push(...parsed)
            } catch {
                // ignore
            }
        }
        const extraFacts = Array.isArray((document as any).extractedFacts)
            ? (document as any).extractedFacts
            : Array.isArray((document as any).financialFacts)
                ? (document as any).financialFacts
                : []
        if (extraFacts.length > 0) {
            facts.push(...extraFacts)
        }
        for (const fact of facts) {
            const metric = String(fact?.metric ?? fact?.fact_type ?? fact?.fact_name ?? '').trim()
            const value = readFactValue(fact)
            if (metric.length === 0 || value === null) continue
            observations.push({
                sourceDoc: document.fileName ?? 'unknown',
                metric,
                period: fact?.period,
                value,
                citations: readFactCitations(fact),
            })
        }
    }
    return observations
}

type RunDocLike = {
    fileName?: string
    financialFacts?: any[]
    extractedFacts?: any[]
}

/**
 * Harness path. Reads a project's run documents, tolerating both the
 * `financialFacts` shape and the newer mml `extractedFacts` shape.
 */
export function observationsFromRunDocs(docs: RunDocLike[]): FactObservation[] {
    const observations: FactObservation[] = []
    for (const doc of docs) {
        const facts = Array.isArray(doc.financialFacts)
            ? doc.financialFacts
            : Array.isArray(doc.extractedFacts)
                ? doc.extractedFacts
                : []
        for (const fact of facts) {
            const metric = (fact?.metric ?? '').trim()
            const value = readFactValue(fact)
            if (metric.length === 0 || value === null) continue
            observations.push({
                sourceDoc: doc.fileName ?? 'unknown',
                metric,
                period: fact?.period,
                value,
                citations: readFactCitations(fact),
            })
        }
    }
    return observations
}
