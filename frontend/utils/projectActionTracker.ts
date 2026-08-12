export type ActionItemPriority = 'high' | 'medium' | 'low'

export type CustomActionItem = {
    id: string
    text: string
    priority: ActionItemPriority
    done: boolean
    createdAt: string
}

export type CustomSellerQuestion = {
    id: string
    question: string
    answered: boolean
    owner?: string
    notes?: string
    createdAt: string
}

const ACTION_ITEMS_STORAGE_KEY_PREFIX = 'mergeworks_action_items_'
const SELLER_QUESTIONS_STORAGE_KEY_PREFIX = 'mergeworks_seller_questions_'

/** True for a plain object — used to drop null/primitive entries that would
 *  crash callers reading item fields (item.text, item.priority, ...). */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getStoredActionItems(projectId: string): CustomActionItem[] | null {
    try {
        const raw = localStorage.getItem(`${ACTION_ITEMS_STORAGE_KEY_PREFIX}${projectId}`)
        if (!raw) return null
        const parsed = JSON.parse(raw) as unknown
        // Guard against corrupted storage: callers `.map`/`.filter` over this and
        // read item fields, so a non-array reads as "nothing stored" and any
        // non-object entries are dropped rather than crashing later.
        return Array.isArray(parsed) ? (parsed.filter(isRecord) as CustomActionItem[]) : null
    } catch {
        return null
    }
}

export function saveStoredActionItems(projectId: string, items: CustomActionItem[]): void {
    try {
        localStorage.setItem(`${ACTION_ITEMS_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(items))
    } catch (e) {
        console.error('Failed to save action items to localStorage:', e)
    }
}

export function getStoredSellerQuestions(projectId: string): CustomSellerQuestion[] | null {
    try {
        const raw = localStorage.getItem(`${SELLER_QUESTIONS_STORAGE_KEY_PREFIX}${projectId}`)
        if (!raw) return null
        const parsed = JSON.parse(raw) as unknown
        return Array.isArray(parsed) ? (parsed.filter(isRecord) as CustomSellerQuestion[]) : null
    } catch {
        return null
    }
}

export function saveStoredSellerQuestions(projectId: string, questions: CustomSellerQuestion[]): void {
    try {
        localStorage.setItem(`${SELLER_QUESTIONS_STORAGE_KEY_PREFIX}${projectId}`, JSON.stringify(questions))
    } catch (e) {
        console.error('Failed to save seller questions to localStorage:', e)
    }
}

/** Escapes a value for a single Markdown table cell: pipes and newlines both
 * break a table row, so neutralize them. */
function escapeTableCell(value: string): string {
    return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

export function exportQuestionsMarkdown(projectName: string, questions: CustomSellerQuestion[]): string {
    const dateStr = new Date().toISOString().split('T')[0]
    let md = `# Diligence Questions for Seller / Management\n`
    md += `**Project:** ${escapeTableCell(projectName)}\n`
    md += `**Date:** ${dateStr}\n\n`
    md += `| # | Status | Question | Owner / Notes |\n`
    md += `|---|---|---|---|\n`

    questions.forEach((q, index) => {
        const status = q.answered ? '[x] Answered' : '[ ] Open'
        // The column is "Owner / Notes" — include the owner, which was dropped.
        const ownerNotes = [q.owner, q.notes].map((s) => (s ?? '').trim()).filter(Boolean).join(' — ') || '-'
        md += `| ${index + 1} | ${status} | ${escapeTableCell(q.question)} | ${escapeTableCell(ownerNotes)} |\n`
    })

    return md
}
