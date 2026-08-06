import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
    exportQuestionsMarkdown,
    getStoredActionItems,
    getStoredSellerQuestions,
    saveStoredActionItems,
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
