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

export const IMMUTABLE_RELEASES: ImmutableRelease[] = [
    {
        id: 'rel-main-latest',
        versionTag: 'v1.4.0',
        title: 'Current Production Release (Latest)',
        commit: 'main',
        date: '2026-09-01',
        url: 'https://due-diligence-dashboard.vercel.app/?view=dashboard',
        description: 'Command Palette deep links, export menu upgrades, and complete typecheck/zero-warning build.',
        isLatest: true,
    },
    {
        id: 'rel-pr12-excel-nwc',
        versionTag: 'v1.3.0',
        title: 'Release PR #12: Live Excel .xlsx & NWC Peg Engine',
        commit: 'e77992e',
        date: '2026-09-01',
        url: 'https://due-diligence-dashboard-gys3h84i8-bradasher.vercel.app/?view=dashboard',
        description: 'Live formula Excel generator, SBA 2D rate shock matrix, and NWC peg calculator.',
        isPreviousStable: true,
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

export function getCurrentBuildInfo(): { commit: string; builtAt: string } {
    if (typeof __APP_BUILD_INFO__ !== 'undefined') {
        return __APP_BUILD_INFO__
    }
    return {
        commit: 'main',
        builtAt: new Date().toISOString(),
    }
}
