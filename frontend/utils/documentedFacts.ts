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
    'purchase_price',
    'asking_price',
    'ebitda_multiple',
    'revenue_multiple',
    'target_working_capital',
    'escrow_amount',
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

export function parseMagnitudeMoney(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined) return null
    if (typeof value === 'number') return Number.isFinite(value) ? value : null
    let str = String(value).trim()
    if (!str) return null
    str = str.replace(/\b(?:usd|cad|eur|gbp|aud)\b/gi, '').trim()
    const normalized = str.replace(/[$,\s]/g, '')
    const multiplier = /b$/i.test(normalized) ? 1_000_000_000 : /m$/i.test(normalized) ? 1_000_000 : /k$/i.test(normalized) ? 1_000 : 1
    const parsed = Number(normalized.replace(/[kmb]$/i, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed * multiplier : null
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
        // 1. Direct LOI / Purchase Agreement valuation extraction
        const isLoiDoc = (
            (document.detectedDocumentType || '').toLowerCase().includes('loi') ||
            (document.detectedDocumentType || '').toLowerCase().includes('purchase agreement') ||
            (document.documentType || '').toLowerCase().includes('loi') ||
            (document.fileName || '').toLowerCase().includes('loi') ||
            (document.fileName || '').toLowerCase().includes('letter_of_intent')
        )

        if (document.valuationBaseEstimate) {
            const valNum = parseMagnitudeMoney(document.valuationBaseEstimate)
            if (valNum !== null && valNum > 0) {
                const priceFact: RawFact = {
                    metric: 'purchase_price',
                    normalized_value: valNum,
                    raw_value: `$${valNum.toLocaleString()}`,
                    period: (document as any).period || 'LOI / Agreement',
                    currency: 'USD',
                    confidence: 0.95,
                    status: 'confirmed',
                    provenance: 'Extracted from Purchase Agreement / LOI',
                    citation: {
                        source_file: document.fileName || 'letter_of_intent.pdf',
                        excerpt: document.aiSummary || `Proposed enterprise value / purchase price of $${valNum.toLocaleString()}`,
                    },
                }
                const existingPrice = bestByMetric.get('purchase_price')
                if (!existingPrice || isBetter(priceFact, existingPrice)) {
                    bestByMetric.set('purchase_price', priceFact)
                }
                const askingFact: RawFact = { ...priceFact, metric: 'asking_price' }
                const existingAsking = bestByMetric.get('asking_price')
                if (!existingAsking || isBetter(askingFact, existingAsking)) {
                    bestByMetric.set('asking_price', askingFact)
                }
            }
        }

        let facts: RawFact[] = []

        if (document.ebitdaExtracted && !isLoiDoc) {
            const ebitdaNum = parseMagnitudeMoney(document.ebitdaExtracted)
            if (ebitdaNum !== null && ebitdaNum > 0) {
                facts.push({
                    metric: 'ebitda_sde',
                    normalized_value: ebitdaNum,
                    raw_value: `$${ebitdaNum.toLocaleString()}`,
                    period: (document as any).period || 'TTM',
                    currency: 'USD',
                    confidence: 0.95,
                    status: 'confirmed',
                    provenance: 'Extracted from uploaded documents',
                    citation: {
                        source_file: document.fileName || 'financial_statement.pdf',
                        excerpt: document.aiSummary || `Extracted EBITDA of $${ebitdaNum.toLocaleString()}`,
                    },
                })
            }
        }

        if ((document as any).revenueExtracted || (document as any).revenue) {
            const revNum = parseMagnitudeMoney((document as any).revenueExtracted || (document as any).revenue)
            if (revNum !== null && revNum > 0) {
                facts.push({
                    metric: 'revenue',
                    normalized_value: revNum,
                    raw_value: `$${revNum.toLocaleString()}`,
                    period: (document as any).period || 'TTM',
                    currency: 'USD',
                    confidence: 0.95,
                    status: 'confirmed',
                    provenance: 'Extracted from uploaded documents',
                    citation: {
                        source_file: document.fileName || 'financial_statement.pdf',
                        excerpt: document.aiSummary || `Extracted Revenue of $${revNum.toLocaleString()}`,
                    },
                })
            }
        }

        if (document.financialFactsJson) {
            try {
                const parsed = JSON.parse(document.financialFactsJson) as unknown
                if (Array.isArray(parsed)) facts.push(...(parsed as RawFact[]))
            } catch {
                // ignore
            }
        }

        const factArray = Array.isArray((document as any).extractedFacts)
            ? (document as any).extractedFacts
            : Array.isArray((document as any).financialFacts)
                ? (document as any).financialFacts
                : []
        for (const ef of factArray) {
            const m = ef.metric === 'ebitda' || ef.metric === 'adjusted_ebitda' ? 'ebitda_sde' : ef.metric
            const norm = ef.normalizedValue ?? ef.normalized_value ?? (typeof ef.value === 'number' ? ef.value : null)
            if (norm !== null && norm !== undefined && isNumber(norm)) {
                facts.push({
                    metric: m,
                    normalized_value: norm,
                    raw_value: ef.rawValue ?? ef.raw_value ?? `$${norm.toLocaleString()}`,
                    period: ef.period || 'TTM',
                    currency: ef.currency || 'USD',
                    confidence: ef.confidence ?? 0.95,
                    status: 'confirmed',
                    provenance: 'Extracted from uploaded documents',
                    citation: ef.citation,
                })
            }
        }

        if (document.extractedJson) {
            try {
                const parsed = typeof document.extractedJson === 'string' ? JSON.parse(document.extractedJson) : document.extractedJson
                if (parsed && typeof parsed === 'object') {
                    if (Array.isArray(parsed.financial_facts)) facts.push(...parsed.financial_facts)
                    if (Array.isArray(parsed.financialFacts)) facts.push(...parsed.financialFacts)
                    if (Array.isArray(parsed.facts)) facts.push(...parsed.facts)
                    if (typeof parsed.revenue === 'number' && Number.isFinite(parsed.revenue)) {
                        facts.push({ metric: 'revenue', normalized_value: parsed.revenue, raw_value: `$${parsed.revenue.toLocaleString()}`, period: 'TTM' })
                    }
                    if (typeof parsed.ebitda === 'number' && Number.isFinite(parsed.ebitda)) {
                        facts.push({ metric: 'ebitda_sde', normalized_value: parsed.ebitda, raw_value: `$${parsed.ebitda.toLocaleString()}`, period: 'TTM' })
                    }
                }
            } catch {
                // ignore
            }
        }

        if ((document as any).valuation && typeof (document as any).valuation === 'object') {
            const v = (document as any).valuation
            const ask = v.askingPrice ?? v.asking_price
            const base = v.valuationBaseEstimate ?? v.base_estimate ?? v.baseEstimate
            if (typeof ask === 'number' && ask > 0) {
                facts.push({ metric: 'asking_price', normalized_value: ask, raw_value: `$${ask.toLocaleString()}`, period: 'Asking' })
                facts.push({ metric: 'purchase_price', normalized_value: ask, raw_value: `$${ask.toLocaleString()}`, period: 'Asking' })
            }
            if (typeof base === 'number' && base > 0 && !ask) {
                facts.push({ metric: 'purchase_price', normalized_value: base, raw_value: `$${base.toLocaleString()}`, period: 'Valuation' })
                facts.push({ metric: 'asking_price', normalized_value: base, raw_value: `$${base.toLocaleString()}`, period: 'Valuation' })
            }
        }

        if (facts.length === 0) continue

        for (const fact of facts) {
            const metric = (fact.metric ?? '').trim().toLowerCase()
            if (metric.length === 0 || !isNumber(fact.normalized_value)) continue

            // Parse multiple mentions from raw_value (e.g. "5.50 times the Adjusted EBITDA" -> 5.50x)
            const rawText = `${fact.raw_value ?? ''} ${fact.citation?.excerpt ?? ''}`
            const multMatch = rawText.match(/(\d+(?:\.\d+)?)\s*(?:times|x)\b/i)
            if (multMatch) {
                const multipleVal = parseFloat(multMatch[1])
                if (Number.isFinite(multipleVal) && multipleVal > 0 && multipleVal < 100) {
                    const multFact: RawFact = {
                        metric: 'ebitda_multiple',
                        normalized_value: multipleVal,
                        raw_value: `${multipleVal}x`,
                        period: fact.period || '',
                        currency: 'x',
                        confidence: 0.95,
                        status: 'confirmed',
                        provenance: 'Extracted from Purchase Agreement / LOI',
                        citation: fact.citation,
                    }
                    const existingMult = bestByMetric.get('ebitda_multiple')
                    if (!existingMult || isBetter(multFact, existingMult)) {
                        bestByMetric.set('ebitda_multiple', multFact)
                    }
                }
            }

            // If an LOI fact labeled "ebitda_sde" has enterprise value text or is an LOI document
            if (isLoiDoc && metric === 'ebitda_sde' && rawText.toLowerCase().includes('enterprise value')) {
                // Register this enterprise value as purchase price
                const priceFact: RawFact = {
                    metric: 'purchase_price',
                    normalized_value: fact.normalized_value,
                    raw_value: fact.raw_value,
                    period: fact.period || 'LOI',
                    currency: fact.currency || 'USD',
                    confidence: fact.confidence ?? 0.95,
                    status: fact.status || 'confirmed',
                    provenance: 'Extracted from Purchase Agreement / LOI',
                    citation: fact.citation,
                }
                const existingPrice = bestByMetric.get('purchase_price')
                if (!existingPrice || isBetter(priceFact, existingPrice)) {
                    bestByMetric.set('purchase_price', priceFact)
                }
                const askingFact: RawFact = { ...priceFact, metric: 'asking_price' }
                const existingAsking = bestByMetric.get('asking_price')
                if (!existingAsking || isBetter(askingFact, existingAsking)) {
                    bestByMetric.set('asking_price', askingFact)
                }

                // If document had a separate ebitda_extracted, use that for operating ebitda_sde instead of the EV
                const ebitdaExtractedNum = parseMagnitudeMoney(document.ebitdaExtracted)
                if (ebitdaExtractedNum !== null && ebitdaExtractedNum > 0) {
                    const operatingEbitdaFact: RawFact = {
                        ...fact,
                        normalized_value: ebitdaExtractedNum,
                        raw_value: `$${ebitdaExtractedNum.toLocaleString()}`,
                    }
                    const existingEbitda = bestByMetric.get('ebitda_sde')
                    if (!existingEbitda || isBetter(operatingEbitdaFact, existingEbitda)) {
                        bestByMetric.set('ebitda_sde', operatingEbitdaFact)
                    }
                }
                // Do not register the multi-million EV as operating EBITDA
                continue
            }

            const existing = bestByMetric.get(metric)
            if (!existing || isBetter(fact, existing)) {
                bestByMetric.set(metric, fact)
            }
        }
    }

    const result: Record<string, DerivedFact> = {}
    for (const [metric, fact] of bestByMetric) {
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
