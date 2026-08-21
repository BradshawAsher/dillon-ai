import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
    CUSTOM_ARCHIVED_PROJECTS_STORAGE,
    archiveProjectKey,
    formatProjectStage,
    getArchivedProjectKeys,
    getProjectStatusVariant,
    isProjectArchivedKey,
} from './projectWorkspace'

describe('getProjectStatusVariant', () => {
    it('maps "ready for synthesis" to success', () => {
        expect(getProjectStatusVariant('Ready for synthesis')).toBe('success')
    })

    it('maps "needs triage" to destructive', () => {
        expect(getProjectStatusVariant('Needs triage')).toBe('destructive')
    })

    it('maps in-progress and needs-review to warning', () => {
        expect(getProjectStatusVariant('In progress')).toBe('warning')
        expect(getProjectStatusVariant('Needs review')).toBe('warning')
    })

    it('is case- and whitespace-insensitive', () => {
        expect(getProjectStatusVariant('  READY FOR SYNTHESIS  ')).toBe('success')
    })

    it('falls back to secondary for anything unrecognised', () => {
        expect(getProjectStatusVariant('archived')).toBe('secondary')
        expect(getProjectStatusVariant('')).toBe('secondary')
    })
})

describe('formatProjectStage', () => {
    it('returns a friendly placeholder for blank input', () => {
        expect(formatProjectStage('')).toBe('Stage not captured')
        expect(formatProjectStage('   ')).toBe('Stage not captured')
    })

    it('title-cases and de-slugs a stage token', () => {
        expect(formatProjectStage('post-loi')).toBe('Post Loi')
        expect(formatProjectStage('due_diligence')).toBe('Due Diligence')
    })
})

describe('archived project key storage', () => {
    class MemoryStorage {
        private store = new Map<string, string>()
        getItem(k: string) { return this.store.has(k) ? this.store.get(k)! : null }
        setItem(k: string, v: string) { this.store.set(k, v) }
        removeItem(k: string) { this.store.delete(k) }
        clear() { this.store.clear() }
    }

    beforeEach(() => {
        Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true })
        Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
    })

    afterEach(() => {
        // @ts-expect-error cleanup
        delete globalThis.localStorage
        // @ts-expect-error cleanup
        delete globalThis.window
    })

    it('round-trips archived keys and reports membership', () => {
        archiveProjectKey('proj-a')
        expect(getArchivedProjectKeys()).toEqual(['proj-a'])
        expect(isProjectArchivedKey('proj-a')).toBe(true)
        expect(isProjectArchivedKey('proj-b')).toBe(false)
    })

    it('resolves corrupted (non-array) storage to an empty array instead of crashing', () => {
        localStorage.setItem(CUSTOM_ARCHIVED_PROJECTS_STORAGE, JSON.stringify({ oops: true }))
        expect(getArchivedProjectKeys()).toEqual([])
        expect(() => isProjectArchivedKey('proj-a')).not.toThrow()
    })

    it('drops non-string entries from a corrupted array', () => {
        localStorage.setItem(CUSTOM_ARCHIVED_PROJECTS_STORAGE, JSON.stringify(['ok', 42, null, 'fine']))
        expect(getArchivedProjectKeys()).toEqual(['ok', 'fine'])
    })
})
