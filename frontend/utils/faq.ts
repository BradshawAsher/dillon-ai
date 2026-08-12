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

/** Filters a FAQ list by category and case-insensitive text query. */
export function filterFaqs<T extends FaqLike>(faqs: T[], filter: FaqFilter = {}): T[] {
    const category = filter.category ?? 'all'
    const query = normalizeForSearch(filter.query ?? '')

    return faqs.filter((faq) => {
        const matchesCategory = category === 'all' || faq.category === category
        const matchesSearch =
            query === '' ||
            normalizeForSearch(faq.question).includes(query) ||
            normalizeForSearch(faq.answer).includes(query) ||
            normalizeForSearch(faq.categoryLabel).includes(query)
        return matchesCategory && matchesSearch
    })
}
