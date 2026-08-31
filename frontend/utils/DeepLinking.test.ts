import { describe, it, expect, afterEach } from 'vitest'
import {
    parseUrlDeepLinkState,
    matchProjectFromQuery,
    buildProjectPermalink,
    syncBrowserUrl,
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

        it('routes OAuth callback tokens in hash and PKCE code to dashboard', () => {
            const parsedOAuthHash = parseUrlDeepLinkState('', '#access_token=mock-token&refresh_token=mock-refresh&token_type=bearer')
            expect(parsedOAuthHash.view).toBe('dashboard')

            const parsedOAuthCode = parseUrlDeepLinkState('?code=493d56b0-f4ca-4361-9c60-4fbbe2e26002')
            expect(parsedOAuthCode.view).toBe('dashboard')

            const parsedOAuthError = parseUrlDeepLinkState('', '#error=unauthorized_client&error_description=Access+denied')
            expect(parsedOAuthError.view).toBe('login')
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

        it('does not spuriously match a project whose name is a 1-2 char substring of the query', () => {
            const projects = [
                { projectId: 'p1', projectKey: 'ab', projectName: 'AB', companyName: 'AB' },
                { projectId: 'p2', projectKey: 'northstar', projectName: 'Northstar Capital', companyName: 'Northstar' },
            ]
            // "grabber" contains "ab" but must not resolve to the two-letter project.
            expect(matchProjectFromQuery('grabber-deal', projects)).toBeNull()
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

    describe('syncBrowserUrl', () => {
        afterEach(() => {
            // @ts-expect-error test cleanup of the stubbed global
            delete globalThis.window
        })

        function stubWindow(href: string): () => string {
            let captured = href
            Object.defineProperty(globalThis, 'window', {
                value: {
                    location: { href },
                    history: {
                        replaceState: (_state: unknown, _title: string, url: string) => {
                            captured = url
                        },
                    },
                },
                configurable: true,
            })
            return () => captured
        }

        it('sets view=dashboard, project and tab in place', () => {
            const getUrl = stubWindow('https://app.test/app?stale=1')
            syncBrowserUrl('scenario-communications', 'valuation')
            const url = new URL(getUrl())
            expect(url.searchParams.get('view')).toBe('dashboard')
            expect(url.searchParams.get('project')).toBe('scenario-communications')
            expect(url.searchParams.get('tab')).toBe('valuation')
        })

        it('removes the project param when no project is given', () => {
            const getUrl = stubWindow('https://app.test/app?project=old&tab=growth')
            syncBrowserUrl(undefined, 'growth')
            const url = new URL(getUrl())
            expect(url.searchParams.has('project')).toBe(false)
            expect(url.searchParams.get('tab')).toBe('growth')
        })

        it('removes the tab param for the overview tab', () => {
            const getUrl = stubWindow('https://app.test/app?project=p&tab=valuation')
            syncBrowserUrl('p', 'overview')
            const url = new URL(getUrl())
            expect(url.searchParams.has('tab')).toBe(false)
            expect(url.searchParams.get('project')).toBe('p')
        })

        it('does nothing when window is unavailable', () => {
            expect(() => syncBrowserUrl('p', 'valuation')).not.toThrow()
        })
    })
})
