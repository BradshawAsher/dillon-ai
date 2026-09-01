import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
    exportQuestionsMarkdown,
    getStoredActionItems,
    getStoredSellerQuestions,
    saveStoredActionItems,
    saveStoredSellerQuestions,
    type CustomSellerQuestion,
} from './projectActionTracker'

class MemoryStorage {
    private store = new Map<string, string>()
    getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null }
    setItem(k: string, v: string) { this.store.set(k, v) }
    removeItem(k: string) { this.store.delete(k) }
    clear() { this.store.clear() }
}

beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
})

afterEach(() => {
    // @ts-expect-error cleanup
    delete globalThis.localStorage
})

describe('action item storage', () => {
    it('round-trips stored items per project', () => {
        saveStoredActionItems('p1', [{ id: 'a', text: 'Do it', priority: 'high', done: false, createdAt: 'now' }])
        expect(getStoredActionItems('p1')?.[0].text).toBe('Do it')
        expect(getStoredActionItems('other')).toBeNull()
    })

    it('returns null when stored value is not an array (corrupted)', () => {
        localStorage.setItem('mergeworks_action_items_p1', '{"not":"an array"}')
        expect(getStoredActionItems('p1')).toBeNull()
    })

    it('returns null when seller questions storage is corrupted', () => {
        localStorage.setItem('mergeworks_seller_questions_p1', '42')
        expect(getStoredSellerQuestions('p1')).toBeNull()
    })

    it('drops non-object entries from a partially corrupted array', () => {
        localStorage.setItem('mergeworks_action_items_p1', JSON.stringify([
            null, 'oops', 5, { id: 'a', text: 'Real', priority: 'low', done: false, createdAt: 'now' },
        ]))
        const items = getStoredActionItems('p1')
        expect(items).toHaveLength(1)
        expect(items?.[0].text).toBe('Real')
    })

    it('round-trips seller questions per project and isolates other projects', () => {
        const questions: CustomSellerQuestion[] = [
            { id: 'q1', question: 'Renewal status?', answered: false, createdAt: 'now' },
        ]
        saveStoredSellerQuestions('p1', questions)
        expect(getStoredSellerQuestions('p1')?.[0].question).toBe('Renewal status?')
        expect(getStoredSellerQuestions('p2')).toBeNull()
    })
})

describe('exportQuestionsMarkdown', () => {
    const questions: CustomSellerQuestion[] = [
        { id: '1', question: 'Q one', answered: true, notes: 'ok', createdAt: 'now' },
        { id: '2', question: 'Q two', answered: false, createdAt: 'now' },
    ]

    it('renders one table row per question with status markers', () => {
        const md = exportQuestionsMarkdown('Acme', questions)
        expect(md).toContain('| 1 | [x] Answered | Q one | ok |')
        expect(md).toContain('| 2 | [ ] Open | Q two | - |')
    })

    it('includes the owner alongside notes in the Owner / Notes column', () => {
        const md = exportQuestionsMarkdown('Acme', [
            { id: '1', question: 'Q', answered: false, owner: 'Dana', notes: 'follow up', createdAt: 'now' },
            { id: '2', question: 'Q2', answered: false, owner: 'Lee', createdAt: 'now' },
        ])
        expect(md).toContain('| 1 | [ ] Open | Q | Dana — follow up |')
        expect(md).toContain('| 2 | [ ] Open | Q2 | Lee |')
    })

    it('escapes pipes and newlines so they cannot break the table', () => {
        const md = exportQuestionsMarkdown('Acme', [
            { id: '1', question: 'Line1\nLine2 | piped', answered: false, notes: 'a|b\nc', createdAt: 'now' },
        ])
        // no raw newline inside the row, pipe escaped
        expect(md).toContain('Line1 Line2 \\| piped')
        expect(md).toContain('a\\|b c')
        expect(md).not.toContain('Line1\nLine2')
    })
})
