import { describe, it, expect } from 'vitest'
import { generateId } from './generateId'

describe('generateId', () => {
    it('prefixes the id and includes an epoch segment', () => {
        const id = generateId('chat')
        expect(id).toMatch(/^chat-\d+-[a-z0-9]{1,4}$/)
    })

    it('produces distinct ids across successive calls', () => {
        const ids = new Set(Array.from({ length: 200 }, () => generateId('tool')))
        // Same-millisecond calls fall back to the random suffix; 200 ids should
        // still be overwhelmingly unique.
        expect(ids.size).toBeGreaterThan(190)
    })
})
