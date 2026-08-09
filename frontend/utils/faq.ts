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

/** Filters a FAQ list by category and case-insensitive text query. */
export function filterFaqs<T extends FaqLike>(faqs: T[], filter: FaqFilter = {}): T[] {
    const category = filter.category ?? 'all'
    const query = (filter.query ?? '').trim().toLowerCase()

    return faqs.filter((faq) => {
        const matchesCategory = category === 'all' || faq.category === category
        const matchesSearch =
            query === '' ||
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query) ||
            faq.categoryLabel.toLowerCase().includes(query)
        return matchesCategory && matchesSearch
    })
}
