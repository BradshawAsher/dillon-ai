export interface ImmutableRelease {
    id: string
    versionTag: string
    title: string
    commit: string
    date: string
    url: string
    description: string
    isLatest?: boolean
    isPreviousStable?: boolean
}

export interface DeploymentLocation {
    hostname: string
    pathname: string
    search: string
    hash: string
}

export const PRODUCTION_APP_ORIGIN = 'https://due-diligence-dashboard.vercel.app'
export const PRODUCTION_APP_HOSTNAME = new URL(PRODUCTION_APP_ORIGIN).hostname

export const IMMUTABLE_RELEASES: ImmutableRelease[] = [
    {
        id: 'rel-main-latest',
        versionTag: 'v1.4.1',
        title: 'Current Production Release (Latest)',
        commit: 'main',
        date: '2026-09-02',
        url: 'https://due-diligence-dashboard.vercel.app/?view=dashboard',
        description: 'Multi-doc intake badges, intake filter tabs, and autosaved deal questionnaire state.',
        isLatest: true,
    },
    {
        id: 'rel-pwz-egress-poll',
        versionTag: 'v1.4.0',
        title: 'Release: 2-Stage Compact Heartbeat & Storage Egress Guard',
        commit: 'd08cabe',
        date: '2026-09-02',
        url: 'https://due-diligence-dashboard-pwzphcew7-bradasher.vercel.app/?view=dashboard',
        description: '2-stage heartbeat polling, zero-egress R2 routing, and questionnaire prefill enhancements.',
        isPreviousStable: true,
    },
    {
        id: 'rel-pr12-excel-nwc',
        versionTag: 'v1.3.0',
        title: 'Release PR #12: Live Excel .xlsx & NWC Peg Engine',
        commit: 'e77992e',
        date: '2026-09-01',
        url: 'https://due-diligence-dashboard-gys3h84i8-bradasher.vercel.app/?view=dashboard',
        description: 'Live formula Excel generator, SBA 2D rate shock matrix, and NWC peg calculator.',
    },
    {
        id: 'rel-pr11-chat-deeplinks',
        versionTag: 'v1.2.0',
        title: 'Release PR #11: 21-Tab Card Deeplinks & AI Tools',
        commit: 'a4906fb',
        date: '2026-09-01',
        url: 'https://due-diligence-dashboard-n3a5pso7o-bradasher.vercel.app/?view=dashboard',
        description: 'Cohort retention tools, banking add-back rules, and card anchors across all 21 dashboard tabs.',
    },
    {
        id: 'rel-pr10-cohort-banking',
        versionTag: 'v1.1.0',
        title: 'Release PR #10: Customer Cohort Retention & Banking Taxonomy',
        commit: '7dab0fc',
        date: '2026-08-31',
        url: 'https://due-diligence-dashboard-8sk84v6m9-bradasher.vercel.app/?view=dashboard',
        description: 'Customer cohort retention heatmap, institutional add-back taxonomy, and disallowance calculator.',
    },
    {
        id: 'rel-pr7-questionnaire',
        versionTag: 'v1.0.0',
        title: 'Release PR #7: Quick Deal Questionnaire & Baseline Cockpit',
        commit: '998cd73',
        date: '2026-08-31',
        url: 'https://due-diligence-dashboard-10ib5zxu2-bradasher.vercel.app/?view=dashboard',
        description: 'Quick Deal Questionnaire engine, baseline M&A diligence workspace, and financial models.',
    },
]

export function getImmutableReleases(): ImmutableRelease[] {
    return IMMUTABLE_RELEASES
}

export function getFallbackStableUrl(): string {
    const previous = IMMUTABLE_RELEASES.find(r => r.isPreviousStable)
    return previous ? previous.url : 'https://due-diligence-dashboard-gys3h84i8-bradasher.vercel.app/?view=dashboard'
}

export function isHistoricalDeploymentHost(hostname: string): boolean {
    const normalizedHostname = hostname.trim().toLowerCase()
    return normalizedHostname.endsWith('.vercel.app') && normalizedHostname !== PRODUCTION_APP_HOSTNAME
}

export function getLatestProductionUrl(location?: DeploymentLocation): string {
    const latestUrl = new URL(PRODUCTION_APP_ORIGIN)
    if (location) {
        latestUrl.pathname = location.pathname || '/'
        latestUrl.search = location.search || ''
        latestUrl.hash = location.hash || ''
    }
    return latestUrl.toString()
}

export function isReleaseActive(
    release: ImmutableRelease,
    currentCommit: string,
    currentHostname: string,
): boolean {
    const normalizedCommit = currentCommit.trim().toLowerCase()
    const releaseCommit = release.commit.trim().toLowerCase()

    if (releaseCommit !== 'main' && normalizedCommit !== 'local') {
        if (normalizedCommit.startsWith(releaseCommit) || releaseCommit.startsWith(normalizedCommit)) {
            return true
        }
    }

    const normalizedHostname = currentHostname.trim().toLowerCase()
    if (normalizedHostname) {
        const releaseHostname = new URL(release.url).hostname.toLowerCase()
        if (releaseHostname === normalizedHostname) return true
    }

    return Boolean(release.isLatest && !isHistoricalDeploymentHost(normalizedHostname))
}

export function getCurrentBuildInfo(): { commit: string; builtAt: string } {
    if (typeof __APP_BUILD_INFO__ !== 'undefined') {
        return __APP_BUILD_INFO__
    }
    return {
        commit: 'main',
        builtAt: new Date().toISOString(),
    }
}
