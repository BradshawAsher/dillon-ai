import { describe, it, expect } from 'vitest'
import { evaluateDeploymentStatus } from './useDeploymentNotifier'

describe('evaluateDeploymentStatus', () => {
    const currentCommit = 'e54a994'
    const currentBuiltAt = '2026-08-30T02:00:00.000Z'

    it('returns idle when versions and commits match', () => {
        const result = evaluateDeploymentStatus(
            currentCommit,
            currentBuiltAt,
            { commit: 'e54a994', builtAt: '2026-08-30T02:00:00.000Z' },
            { sha: 'e54a9947890abcdef' }
        )
        expect(result.status).toBe('idle')
        expect(result.latestCommit).toBe(null)
    })

    it('returns update_ready when server version.json has a newer commit', () => {
        const result = evaluateDeploymentStatus(
            currentCommit,
            currentBuiltAt,
            { commit: 'f99bb11', builtAt: '2026-08-30T02:10:00.000Z' },
            null
        )
        expect(result.status).toBe('update_ready')
        expect(result.latestCommit).toBe('f99bb11')
        expect(result.latestBuiltAt).toBe('2026-08-30T02:10:00.000Z')
    })

    it('returns update_ready when server version.json has a newer timestamp (>15s)', () => {
        const result = evaluateDeploymentStatus(
            currentCommit,
            currentBuiltAt,
            { commit: 'e54a994', builtAt: '2026-08-30T02:05:00.000Z' },
            null
        )
        expect(result.status).toBe('update_ready')
        expect(result.latestBuiltAt).toBe('2026-08-30T02:05:00.000Z')
    })

    it('returns building when github has a newer commit but version.json has not deployed yet', () => {
        const result = evaluateDeploymentStatus(
            currentCommit,
            currentBuiltAt,
            { commit: 'e54a994', builtAt: '2026-08-30T02:00:00.000Z' },
            { sha: '1234567abcdef890' }
        )
        expect(result.status).toBe('building')
        expect(result.latestCommit).toBe('1234567')
        expect(result.latestBuiltAt).toBe(null)
    })

    it('handles null / offline server responses gracefully', () => {
        const result = evaluateDeploymentStatus(
            currentCommit,
            currentBuiltAt,
            null,
            null
        )
        expect(result.status).toBe('idle')
        expect(result.latestCommit).toBe(null)
    })
})
