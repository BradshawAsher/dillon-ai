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

export function getStoredActionItems(projectId: string): CustomActionItem[] | null {
    try {
        const raw = localStorage.getItem(`${ACTION_ITEMS_STORAGE_KEY_PREFIX}${projectId}`)
        if (!raw) return null
        return JSON.parse(raw) as CustomActionItem[]
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
        return JSON.parse(raw) as CustomSellerQuestion[]
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

export function exportQuestionsMarkdown(projectName: string, questions: CustomSellerQuestion[]): string {
    const dateStr = new Date().toISOString().split('T')[0]
    let md = `# Diligence Questions for Seller / Management\n`
    md += `**Project:** ${projectName}\n`
    md += `**Date:** ${dateStr}\n\n`
    md += `| # | Status | Question | Owner / Notes |\n`
    md += `|---|---|---|---|\n`

    questions.forEach((q, index) => {
        const status = q.answered ? '[x] Answered' : '[ ] Open'
        const notes = q.notes || '-'
        md += `| ${index + 1} | ${status} | ${q.question.replace(/\|/g, '\\|')} | ${notes.replace(/\|/g, '\\|')} |\n`
    })

    return md
}
