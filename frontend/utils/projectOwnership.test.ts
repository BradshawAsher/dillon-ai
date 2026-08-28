import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
    claimProject,
    claimProjectWithTeam,
    getOwnedProjects,
    getProjectOwner,
    getProjectTeam,
    getProjectsForTeam,
    isOwnedByUser,
    isOwnedByTeam,
    setProjectTeam,
} from './projectOwnership'

const STORAGE_KEY = 'mergeworks.projectOwnership'

// jsdom-free localStorage shim so these pure-ish helpers can be exercised.
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

describe('projectOwnership', () => {
    it('claims a project once and reports the owner (normalized)', () => {
        claimProject('proj-1', '  Analyst@Example.COM ')
        expect(getProjectOwner('proj-1')).toBe('analyst@example.com')
        expect(isOwnedByUser('proj-1', 'analyst@example.com')).toBe(true)
    })

    it('does not overwrite an existing owner', () => {
        claimProject('proj-1', 'first@example.com')
        claimProject('proj-1', 'second@example.com')
        expect(getProjectOwner('proj-1')).toBe('first@example.com')
    })

    it('ignores empty project keys and emails', () => {
        claimProject('', 'a@example.com')
        claimProject('proj-2', '   ')
        expect(getProjectOwner('proj-2')).toBeNull()
        expect(getOwnedProjects('a@example.com')).toEqual([])
    })

    it('does not throw on a null/undefined email', () => {
        expect(() => claimProject('proj-x', null as unknown as string)).not.toThrow()
        expect(getProjectOwner('proj-x')).toBeNull()
        expect(isOwnedByUser('proj-x', undefined as unknown as string)).toBe(false)
        expect(getOwnedProjects(null as unknown as string)).toEqual([])
    })

    it('lists only the projects owned by a given email', () => {
        claimProject('p1', 'a@example.com')
        claimProject('p2', 'b@example.com')
        claimProject('p3', 'a@example.com')
        expect(getOwnedProjects('A@example.com').sort()).toEqual(['p1', 'p3'])
    })

    it('recovers from corrupted storage (non-object) instead of throwing', () => {
        localStorage.setItem(STORAGE_KEY, '["not", "a", "map"]')
        expect(getProjectOwner('p1')).toBeNull()
        // and can still claim afterwards
        claimProject('p1', 'a@example.com')
        expect(getProjectOwner('p1')).toBe('a@example.com')
    })

    it('claims project with team and filters by team correctly', () => {
        claimProjectWithTeam('deal-1', 'alex@acme.com', 'Acme Capital')
        claimProjectWithTeam('deal-2', 'sarah@acme.com', 'Acme Capital')
        claimProjectWithTeam('deal-3', 'bob@external.com', 'External Member')

        expect(getProjectOwner('deal-1')).toBe('alex@acme.com')
        expect(getProjectTeam('deal-1')).toBe('Acme Capital')
        expect(isOwnedByTeam('deal-1', 'Acme Capital')).toBe(true)
        expect(isOwnedByTeam('deal-1', 'Other Firm')).toBe(false)
        expect(getProjectsForTeam('Acme Capital').sort()).toEqual(['deal-1', 'deal-2'])

        setProjectTeam('deal-3', 'Beacon Search Fund')
        expect(getProjectTeam('deal-3')).toBe('Beacon Search Fund')
        expect(getProjectsForTeam('Beacon Search Fund')).toEqual(['deal-3'])
    })
})
