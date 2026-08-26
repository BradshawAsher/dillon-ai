// Shared FAQ search/filter logic used by both the dashboard FAQ sidebar and the
// technical FAQ workspace tab. Kept pure and typed so the two components can't
// drift apart and so the matching rules are unit-tested in one place.

export interface FaqLike {
    category: string
    categoryLabel: string
    question: string
    answer: string
}

export type FaqFilter = {
    /** Category id, or 'all' for no category constraint. */
    category?: string
    /** Free-text query matched against question, answer, and category label. */
    query?: string
}

/** Lower-cases and collapses any run of whitespace to a single space, so a
 *  query with doubled spaces still matches an answer wrapped across lines. */
function normalizeForSearch(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Filters a FAQ list by category and case-insensitive text query.
 *
 * A multi-word query is matched term-by-term (AND) against the combined
 * question + answer + category label, so "risk score" still matches an entry
 * where "risk" is in the question and "score" is in the answer, and the terms
 * need not appear together or in order. A single-term query behaves like the
 * previous substring match. */
export function filterFaqs<T extends FaqLike>(faqs: T[], filter: FaqFilter = {}): T[] {
    const category = filter.category ?? 'all'
    const terms = normalizeForSearch(filter.query ?? '').split(' ').filter(Boolean)

    return faqs.filter((faq) => {
        const matchesCategory = category === 'all' || faq.category === category
        const haystack = normalizeForSearch(`${faq.question} ${faq.answer} ${faq.categoryLabel}`)
        const matchesSearch = terms.length === 0 || terms.every((term) => haystack.includes(term))
        return matchesCategory && matchesSearch
    })
}
