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

function periodRank(period: string | undefined): number {
    if (!period) return 0
    // A dated label (even a dated "TTM 2023") ranks by its explicit year.
    const match = period.match(/(\d{4})/)
    if (match) return Number(match[1])
    // An undated trailing-twelve-month / current label is the most recent view
    // available, so it must outrank any dated fiscal year rather than sorting to
    // the bottom (rank 0) and losing to a stale annual figure. Use a sentinel
    // above any plausible calendar year; this keeps the comparison deterministic.
    if (/\bttm\b|\bltm\b|trailing twelve|last twelve|current/i.test(period)) return 9999
    return 0
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
    // Match a trailing magnitude unit. Order matters: longer tokens must be tried
    // before shorter ones that prefix-collide (billion before bn/b, million
    // before mm/m) so both finance shorthand ("$1.5MM") and spelled-out
    // magnitudes ("$1.5 million") parse to the same value.
    const unitMatch = normalized.match(/(billion|bn|b|million|mm|m|thousand|k)$/i)
    const unit = unitMatch ? unitMatch[1].toLowerCase() : ''
    const multiplier =
        unit === 'billion' || unit === 'bn' || unit === 'b' ? 1_000_000_000
        : unit === 'million' || unit === 'mm' || unit === 'm' ? 1_000_000
        : unit === 'thousand' || unit === 'k' ? 1_000
        : 1
    const numericPart = unit ? normalized.slice(0, normalized.length - unit.length) : normalized
    // A magnitude suffix with no leading number ("$M", "$K", "$bn") or an empty
    // payload ("$") is not a real figure. Reject it rather than letting Number('')
    // read it as $0 — a spurious zero would mask "no data" as a genuine value and
    // skew any downstream sum or comparison.
    if (numericPart.length === 0) return null
    const parsed = Number(numericPart)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed * multiplier : null
}

// Raw model fact arrays are less specific than the canonical financialFactsJson
// schema. Use the same classification in both quant facts and project KPIs.
export function normalizeExtractedFinancialFact(input: unknown): { metric: string; value: number } | null {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null
    const fact = input as Record<string, unknown>
    const label = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')
    const type = label(fact.fact_type || fact.metric)
    const name = label(fact.fact_name || fact.name)
    const labels = `${type} ${name}`
    const text = String(fact.text_value || fact.raw_value || (typeof fact.value === 'string' ? fact.value : '')).trim()
    const units = `${label(fact.unit)} ${label(fact.currency)}`

    // A broad type such as "revenue" does not make campaign reach or a revenue
    // percentage a company dollar amount. Exclusions also apply to multiples.
    if (/\b(case stud(?:y|ies)|campaign|marketing performance|impressions?|reach|views?|engagement|placements?|attendees?|guests?|partners?|percent(?:age)?|concentration|margin|growth|mix|share|churn|per client|client spend|project size|weighted (?:avg|average))\b/.test(labels)
        || /%/.test(text + units) || /\b(percent(?:age)?|count|people|views?|impressions?)\b/.test(units)) return null

    const parse = (value: unknown) => typeof value === 'number' || typeof value === 'string' ? parseMagnitudeMoney(value) : null
    const normalized = parse(fact.normalized_value) ?? parse(fact.normalizedValue)
    const numeric = parse(fact.numeric_value) ?? parse(fact.value)
    const multipleText = text.match(/^(\d+(?:\.\d+)?)\s*[x×]$/i)
    const isMultiple = /\bmultiple\b/.test(labels) || !!multipleText || /\b(?:x|times)\b|×/.test(units)

    if (isMultiple) {
        // Do not default an unqualified "valuation multiple" to EBITDA.
        const metric = /\b(?:revenue|sales)\b/.test(labels) ? 'revenue_multiple'
            : /\b(?:ebitda|sde)\b/.test(labels) ? 'ebitda_multiple' : ''
        const value = normalized ?? numeric ?? (multipleText ? Number(multipleText[1]) : null)
        return metric && value !== null && Number.isFinite(value) && value > 0 ? { metric, value } : null
    }

    // Operating income is not EBITDA without an explicit reconciliation.
    if (/\boperating income\b/.test(labels)) return null

    const aliases: Record<string, string> = {
        revenue: 'revenue', income: 'revenue', 'total income': 'revenue', sales: 'revenue',
        ebitda: 'ebitda_sde', 'adjusted ebitda': 'ebitda_sde', 'ebitda sde': 'ebitda_sde', sde: 'ebitda_sde',
        'gross profit': 'gross_profit', 'net income': 'net_income',
        debt: 'debt', 'proposed debt financing': 'debt',
        'asking price': 'asking_price', 'purchase price': 'asking_price', valuation: 'asking_price',
        'transaction use of funds': 'asking_price', 'acquisition use': 'asking_price',
    }
    let metric = Object.prototype.hasOwnProperty.call(aliases, type) ? aliases[type] : ''
    if (!metric) {
        if (/\b(?:revenue|total income)\b/.test(name)) metric = 'revenue'
        else if (/\b(?:ebitda|sde)\b/.test(name)) metric = 'ebitda_sde'
        else if (name === 'gross profit') metric = 'gross_profit'
        else if (name === 'net income') metric = 'net_income'
        else if (['debt', 'total proposed sba loan', 'sba loan allocation for business acquisition'].includes(name)) metric = 'debt'
        else if (['stated valuation', 'valuation', 'business acquisition use of funds', 'asking price', 'purchase price'].includes(name)) metric = 'asking_price'
    }
    if (!metric) return null

    // Explicitly normalized values are already in base units. Otherwise parse
    // a complete magnitude-bearing string once ("$4.88M", "750 thousand"),
    // rather than multiplying an arbitrary small number by a guessed unit.
    const textValue = parse(text)
    const hasMagnitude = /(?:billion|bn|b|million|mm|m|thousand|k)$/i.test(text)
    const value = normalized ?? (hasMagnitude && textValue !== null ? textValue : numeric ?? textValue)
    return value !== null && Number.isFinite(value) && value > 0 ? { metric, value } : null
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
function isBetter(candidate?: RawFact | null, current?: RawFact | null): boolean {
    if (!candidate) return false
    if (!current) return true
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
                    const rawFinancialFacts = Array.isArray(parsed.financial_facts)
                        ? parsed.financial_facts
                        : Array.isArray(parsed.financialFacts)
                            ? parsed.financialFacts
                            : Array.isArray(parsed.facts)
                                ? parsed.facts
                                : []

                    for (const ff of rawFinancialFacts) {
                        const normalized = normalizeExtractedFinancialFact(ff)
                        if (!normalized) continue
                        const { metric, value } = normalized
                        const multiple = metric.endsWith('_multiple')
                        const raw = ff.text_value || ff.raw_value || (multiple ? `${value}x` : `$${value.toLocaleString()}`)
                        const citation = Array.isArray(ff.citations) && ff.citations[0] ? ff.citations[0] : {
                            source_file: document.fileName,
                            excerpt: `${ff.fact_name || metric}: ${raw}`,
                        }
                        const extractedFact: RawFact = {
                            metric,
                            normalized_value: value,
                            raw_value: raw,
                            period: ff.period || (multiple ? 'Pricing' : 'TTM'),
                            currency: multiple ? 'x' : ff.currency || 'USD',
                            confidence: ff.confidence_score ?? ff.confidence ?? 0.95,
                            status: 'confirmed',
                            provenance: 'Extracted from document financial facts',
                            citation,
                        }
                        facts.push(extractedFact)
                        if (metric === 'asking_price') {
                            facts.push({ ...extractedFact, metric: 'purchase_price' })
                        }
                    }

                    const parsedRev = parsed.revenueTTM ?? parsed.revenue_ttm ?? parsed.revenue ?? parsed.totalRevenue ?? parsed.total_revenue
                    if (parsedRev !== undefined && parsedRev !== null) {
                        const revNum = typeof parsedRev === 'number' ? parsedRev : parseMagnitudeMoney(parsedRev)
                        if (revNum !== null && Number.isFinite(revNum) && revNum > 0) {
                            facts.push({
                                metric: 'revenue',
                                normalized_value: revNum,
                                raw_value: typeof parsedRev === 'string' ? parsedRev : `$${revNum.toLocaleString()}`,
                                period: 'TTM',
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

                    const parsedEbitda = parsed.ebitda ?? parsed.ebitda_sde ?? parsed.adjustedEbitda ?? parsed.adjusted_ebitda
                    if (parsedEbitda !== undefined && parsedEbitda !== null) {
                        const ebitdaNum = typeof parsedEbitda === 'number' ? parsedEbitda : parseMagnitudeMoney(parsedEbitda)
                        if (ebitdaNum !== null && Number.isFinite(ebitdaNum) && ebitdaNum > 0) {
                            facts.push({
                                metric: 'ebitda_sde',
                                normalized_value: ebitdaNum,
                                raw_value: typeof parsedEbitda === 'string' ? parsedEbitda : `$${ebitdaNum.toLocaleString()}`,
                                period: 'TTM',
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

                    const v = parsed.valuation || (document as any).valuation
                    if (v && typeof v === 'object') {
                        const ask = v.askingPrice ?? v.asking_price ?? v.targetPrice ?? v.target_price
                        const base = v.valuationBaseEstimate ?? v.base_estimate ?? v.baseEstimate
                        const citations = Array.isArray(v.citations) ? v.citations : []
                        const primaryCitation = citations[0] || {
                            source_file: document.fileName,
                            excerpt: `Valuation: $${(ask || base || 0).toLocaleString()}`,
                        }
                        if (typeof ask === 'number' && ask > 0) {
                            facts.push({
                                metric: 'asking_price',
                                normalized_value: ask,
                                raw_value: `$${ask.toLocaleString()}`,
                                period: 'Asking',
                                currency: v.currency || 'USD',
                                confidence: v.valuation_confidence_score || 0.95,
                                status: 'confirmed',
                                provenance: 'Extracted from Prospectus / Valuation',
                                citation: primaryCitation,
                            })
                            facts.push({
                                metric: 'purchase_price',
                                normalized_value: ask,
                                raw_value: `$${ask.toLocaleString()}`,
                                period: 'Asking',
                                currency: v.currency || 'USD',
                                confidence: v.valuation_confidence_score || 0.95,
                                status: 'confirmed',
                                provenance: 'Extracted from Prospectus / Valuation',
                                citation: primaryCitation,
                            })
                        }
                        if (typeof base === 'number' && base > 0) {
                            if (!ask) {
                                facts.push({
                                    metric: 'purchase_price',
                                    normalized_value: base,
                                    raw_value: `$${base.toLocaleString()}`,
                                    period: 'Valuation',
                                    currency: v.currency || 'USD',
                                    confidence: v.valuation_confidence_score || 0.95,
                                    status: 'confirmed',
                                    provenance: 'Extracted from Prospectus / Valuation',
                                    citation: primaryCitation,
                                })
                                facts.push({
                                    metric: 'asking_price',
                                    normalized_value: base,
                                    raw_value: `$${base.toLocaleString()}`,
                                    period: 'Valuation',
                                    currency: v.currency || 'USD',
                                    confidence: v.valuation_confidence_score || 0.95,
                                    status: 'confirmed',
                                    provenance: 'Extracted from Prospectus / Valuation',
                                    citation: primaryCitation,
                                })
                            }
                        }
                        for (const cit of citations) {
                            const text = cit?.excerpt || ''
                            const ebitdaMultMatch = text.match(/(\d+(?:\.\d+)?)\s*x\s*(?:adj\.?\s*)?ebitda/i)
                            if (ebitdaMultMatch) {
                                const mv = parseFloat(ebitdaMultMatch[1])
                                if (Number.isFinite(mv) && mv > 0) {
                                    facts.push({
                                        metric: 'ebitda_multiple',
                                        normalized_value: mv,
                                        raw_value: `${mv}x`,
                                        period: cit.period || 'Pricing',
                                        currency: 'x',
                                        confidence: cit.confidence_score || 0.95,
                                        status: 'confirmed',
                                        provenance: 'Extracted from valuation multiple disclosures',
                                        citation: cit,
                                    })
                                }
                            }
                            const revMultMatch = text.match(/(\d+(?:\.\d+)?)\s*x\s*revenue/i)
                            if (revMultMatch) {
                                const rmv = parseFloat(revMultMatch[1])
                                if (Number.isFinite(rmv) && rmv > 0) {
                                    facts.push({
                                        metric: 'revenue_multiple',
                                        normalized_value: rmv,
                                        raw_value: `${rmv}x`,
                                        period: cit.period || 'Pricing',
                                        currency: 'x',
                                        confidence: cit.confidence_score || 0.95,
                                        status: 'confirmed',
                                        provenance: 'Extracted from valuation multiple disclosures',
                                        citation: cit,
                                    })
                                }
                            }
                        }
                    }
                }
            } catch {
                // ignore
            }
        }

        if (facts.length === 0) continue

        for (const fact of facts) {
            if (!fact) continue
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
                // Clamp to a valid 0..100 percentage so a malformed upstream
                // confidence (1.5, 150, a negative) can't surface as an
                // out-of-range meter value downstream.
                ? Math.min(100, Math.max(0, Math.round(fact.confidence <= 1 ? fact.confidence * 100 : fact.confidence)))
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
