import { describe, it, expect } from 'vitest'
import {
    parseUrlDeepLinkState,
    matchProjectFromQuery,
    buildProjectPermalink,
    VALID_WORKSPACE_TABS,
} from './deepLinking'

describe('Deep Linking Utilities', () => {
    describe('parseUrlDeepLinkState', () => {
        it('parses project, tab, and view from query string', () => {
            const parsed = parseUrlDeepLinkState('?view=dashboard&project=scenario-communications&tab=valuation')
            expect(parsed.view).toBe('dashboard')
            expect(parsed.projectQuery).toBe('scenario-communications')
            expect(parsed.tab).toBe('valuation')
        })

        it('defaults view to dashboard if project parameter is present without view param', () => {
            const parsed = parseUrlDeepLinkState('?project=werkheiser')
            expect(parsed.view).toBe('dashboard')
            expect(parsed.projectQuery).toBe('werkheiser')
            expect(parsed.tab).toBeNull()
        })

        it('handles deal query alias', () => {
            const parsed = parseUrlDeepLinkState('?deal=medical-spa&tab=synthesis')
            expect(parsed.view).toBe('dashboard')
            expect(parsed.projectQuery).toBe('medical-spa')
            expect(parsed.tab).toBe('synthesis')
        })

        it('parses login view correctly', () => {
            const parsed1 = parseUrlDeepLinkState('?view=login')
            expect(parsed1.view).toBe('login')

            const parsed2 = parseUrlDeepLinkState('?auth=true')
            expect(parsed2.view).toBe('login')
        })

        it('parses landing view correctly even with project or tab params', () => {
            const parsed = parseUrlDeepLinkState('?view=landing&project=heliopet&tab=synthesis')
            expect(parsed.view).toBe('landing')
            expect(parsed.projectQuery).toBe('heliopet')
            expect(parsed.tab).toBe('synthesis')
        })

        it('ignores invalid tabs', () => {
            const parsed = parseUrlDeepLinkState('?tab=nonexistent-tab')
            expect(parsed.tab).toBeNull()
        })

        it('parses hash anchors and routes to appropriate tab', () => {
            const parsedEvals = parseUrlDeepLinkState('?view=dashboard', '#evals')
            expect(parsedEvals.tab).toBe('evals')
            expect(parsedEvals.view).toBe('dashboard')

            const parsedBenchmarks = parseUrlDeepLinkState('', '#benchmark-models')
            expect(parsedBenchmarks.tab).toBe('evals')
            expect(parsedBenchmarks.view).toBe('dashboard')

            const parsedSpending = parseUrlDeepLinkState('', '#spending-model')
            expect(parsedSpending.tab).toBe('spending')

            const parsedAccount = parseUrlDeepLinkState('', '#account-profile')
            expect(parsedAccount.tab).toBe('account')

            const parsedIssue = parseUrlDeepLinkState('?tab=bug')
            expect(parsedIssue.tab).toBe('report_issue')

            const parsedFeedback = parseUrlDeepLinkState('?tab=feedback')
            expect(parsedFeedback.tab).toBe('report_issue')
        })
    })

    describe('matchProjectFromQuery', () => {
        const mockProjects = [
            {
                projectId: 'project-20260820-scenario-communications',
                projectKey: 'scenario-communications',
                projectName: 'Scenario Communications',
                companyName: 'Scenario Communications LLC',
            },
            {
                projectId: 'project-20260818-0d17fca2',
                projectKey: 'werkheiser-home-maintenance',
                projectName: 'Werkheiser Home Maintenance Inc',
                companyName: 'Werkheiser Home Maintenance',
            },
            {
                projectId: 'atlas-001',
                projectKey: 'apex-industrial-tech',
                projectName: 'Apex Industrial Technologies',
                companyName: 'Apex Industrial Technologies LLC',
            },
        ]

        it('matches exact projectKey', () => {
            const matched = matchProjectFromQuery('scenario-communications', mockProjects)
            expect(matched?.projectId).toBe('project-20260820-scenario-communications')
        })

        it('matches exact projectId', () => {
            const matched = matchProjectFromQuery('project-20260818-0d17fca2', mockProjects)
            expect(matched?.projectKey).toBe('werkheiser-home-maintenance')
        })

        it('matches case-insensitively with dashes or spaces', () => {
            const matched = matchProjectFromQuery('Werkheiser Home Maintenance', mockProjects)
            expect(matched?.projectId).toBe('project-20260818-0d17fca2')
        })

        it('matches substring query like "scenario" or "werkheiser"', () => {
            const matched1 = matchProjectFromQuery('scenario', mockProjects)
            expect(matched1?.projectKey).toBe('scenario-communications')

            const matched2 = matchProjectFromQuery('werkheiser', mockProjects)
            expect(matched2?.projectKey).toBe('werkheiser-home-maintenance')
        })

        it('returns null when no match found', () => {
            const matched = matchProjectFromQuery('non-existent-deal', mockProjects)
            expect(matched).toBeNull()
        })
    })

    describe('buildProjectPermalink', () => {
        it('builds canonical permalink with project and tab', () => {
            const link = buildProjectPermalink({
                origin: 'https://app.mergeworks.com',
                pathname: '/',
                projectKey: 'scenario-communications',
                tab: 'synthesis',
            })
            expect(link).toBe('https://app.mergeworks.com/?view=dashboard&project=scenario-communications&tab=synthesis')
        })

        it('omits tab if overview', () => {
            const link = buildProjectPermalink({
                origin: 'https://app.mergeworks.com',
                pathname: '/',
                projectKey: 'scenario-communications',
                tab: 'overview',
            })
            expect(link).toBe('https://app.mergeworks.com/?view=dashboard&project=scenario-communications')
        })
    })
})
