import { describe, expect, it } from 'vitest'

import { formatProjectStage, getProjectStatusVariant } from './projectWorkspace'

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
