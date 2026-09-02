import { describe, it, expect } from 'vitest'
import {
    IMMUTABLE_RELEASES,
    getImmutableReleases,
    getFallbackStableUrl,
    getCurrentBuildInfo,
    getLatestProductionUrl,
    isHistoricalDeploymentHost,
    isReleaseActive,
    PRODUCTION_APP_HOSTNAME,
} from './deploymentVersions'

describe('deploymentVersions utility', () => {
    it('returns a non-empty list of immutable releases', () => {
        const releases = getImmutableReleases()
        expect(releases.length).toBeGreaterThan(0)
        expect(releases[0].isLatest).toBe(true)
    })

    it('identifies a previous stable rollback deployment URL', () => {
        const fallbackUrl = getFallbackStableUrl()
        expect(fallbackUrl).toBeDefined()
        expect(fallbackUrl).toContain('https://')
        expect(fallbackUrl).toContain('vercel.app')
    })

    it('each release has valid URL and commit hash', () => {
        IMMUTABLE_RELEASES.forEach((release) => {
            expect(release.id).toBeTruthy()
            expect(release.versionTag).toMatch(/^v\d+\.\d+\.\d+$/)
            expect(release.url).toContain('vercel.app')
            expect(release.commit).toBeTruthy()
        })
    })

    it('getCurrentBuildInfo returns fallback when global is not defined', () => {
        const buildInfo = getCurrentBuildInfo()
        expect(buildInfo.commit).toBeTruthy()
        expect(buildInfo.builtAt).toBeTruthy()
    })

    it('distinguishes canonical production from immutable Vercel deployments', () => {
        expect(isHistoricalDeploymentHost(PRODUCTION_APP_HOSTNAME)).toBe(false)
        expect(isHistoricalDeploymentHost('due-diligence-dashboard-gys3h84i8-bradasher.vercel.app')).toBe(true)
        expect(isHistoricalDeploymentHost('localhost')).toBe(false)
        expect(isHistoricalDeploymentHost('deals.example.com')).toBe(false)
    })

    it('returns to canonical production without discarding the active route', () => {
        expect(getLatestProductionUrl({
            hostname: 'historical.vercel.app',
            pathname: '/deal/apex',
            search: '?view=dashboard&project=apex',
            hash: '#analysis',
        })).toBe('https://due-diligence-dashboard.vercel.app/deal/apex?view=dashboard&project=apex#analysis')
    })

    it('marks the release matching the real host or build commit as active', () => {
        const latest = IMMUTABLE_RELEASES.find((release) => release.isLatest)!
        const previous = IMMUTABLE_RELEASES.find((release) => release.isPreviousStable)!
        const previousHostname = new URL(previous.url).hostname

        expect(isReleaseActive(latest, 'abcdef0', PRODUCTION_APP_HOSTNAME)).toBe(true)
        expect(isReleaseActive(latest, previous.commit, previousHostname)).toBe(false)
        expect(isReleaseActive(previous, previous.commit, previousHostname)).toBe(true)
        expect(isReleaseActive(previous, previous.commit, 'unlisted-preview.vercel.app')).toBe(true)
    })
})
