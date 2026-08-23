import type { WorkspaceTab } from '../components/DealWorkspaceNav'

export const VALID_WORKSPACE_TABS: WorkspaceTab[] = [
    'overview',
    'analysis',
    'diagnostics',
    'diligence',
    'synthesis',
    'spending',
    'compare',
    'valuation',
    'returns',
    'growth',
    'structure',
    'negotiation',
    'documents',
    'shortcuts',
    'evals',
    'faqs',
    'history',
    'email',
    'errors',
    'report_issue',
    'account',
]

const TAB_ALIASES: Record<string, WorkspaceTab> = {
    projects: 'documents',
    project: 'documents',
    docs: 'documents',
    risk: 'diagnostics',
    playbook: 'diagnostics',
    benchmark: 'evals',
    benchmarks: 'evals',
    eval: 'evals',
    evals: 'evals',
    evaluations: 'evals',
    evaluation: 'evals',
    harness: 'evals',
    scoring: 'evals',
    billing: 'spending',
    costs: 'spending',
    cost: 'spending',
    faq: 'faqs',
    faqs: 'faqs',
    error: 'errors',
    errors: 'errors',
    logs: 'errors',
    audit: 'history',
    intake: 'diligence',
    upload: 'diligence',
    issue: 'report_issue',
    issues: 'report_issue',
    bug: 'report_issue',
    bugs: 'report_issue',
    feedback: 'report_issue',
    support: 'report_issue',
    report: 'report_issue',
    'report-issue': 'report_issue',
    report_issue: 'report_issue',
    profile: 'account',
    settings: 'account',
    user: 'account',
    account: 'account',
    myaccount: 'account',
    me: 'account',
}

const SECTION_ANCHOR_MAP: Record<string, WorkspaceTab> = {
    // overview
    'overview-snapshot': 'overview',
    'overview-health': 'overview',
    'overview-actions': 'overview',
    'overview-timeline': 'overview',
    // analysis
    'analysis-deal-on-a-page': 'analysis',
    'analysis-scorecard': 'analysis',
    'analysis-snapshot': 'analysis',
    'analysis-opportunity': 'analysis',
    'analysis-risk-valuation': 'analysis',
    // diagnostics
    'diag-quick-insights': 'diagnostics',
    'diag-thesis': 'diagnostics',
    'diag-decision': 'diagnostics',
    'diag-playbook': 'diagnostics',
    // diligence
    'project-intake': 'diligence',
    'latest-submission-section': 'diligence',
    'diligence-document-flags': 'diligence',
    'diligence-project-synth': 'diligence',
    // synthesis
    'synthesis-judgment': 'synthesis',
    'synthesis-valuation': 'synthesis',
    'synthesis-material-impact': 'synthesis',
    'synthesis-filters': 'synthesis',
    // spending
    'spending-model': 'spending',
    'spending-api-calls': 'spending',
    'spending-forecast': 'spending',
    // evals
    'evals-benchmarks': 'evals',
    'evals-accuracy': 'evals',
    'evals-latency': 'evals',
    'benchmark-models': 'evals',
    'extraction-accuracy': 'evals',
    'latency-throughput': 'evals',
    // account
    'account-profile': 'account',
    'account-security': 'account',
    'account-preferences': 'account',
}

export interface ParsedDeepLink {
    view: 'landing' | 'login' | 'dashboard' | null
    projectQuery: string | null
    tab: WorkspaceTab | null
}

/**
 * Resolves a raw tab string or hash anchor to a valid WorkspaceTab.
 */
export function resolveWorkspaceTab(raw: string | null | undefined): WorkspaceTab | null {
    if (!raw || typeof raw !== 'string') return null
    const cleaned = raw.toLowerCase().replace(/^#+/, '').trim()
    if (!cleaned) return null

    if (VALID_WORKSPACE_TABS.includes(cleaned as WorkspaceTab)) {
        return cleaned as WorkspaceTab
    }
    if (TAB_ALIASES[cleaned]) {
        return TAB_ALIASES[cleaned]
    }
    if (SECTION_ANCHOR_MAP[cleaned]) {
        return SECTION_ANCHOR_MAP[cleaned]
    }
    for (const prefix of VALID_WORKSPACE_TABS) {
        if (cleaned.startsWith(`${prefix}-`) || cleaned.startsWith(`${prefix}_`)) {
            return prefix
        }
    }
    if (cleaned.startsWith('diag-')) return 'diagnostics'
    if (cleaned.startsWith('doc-') || cleaned.startsWith('docs-')) return 'documents'
    return null
}

/**
 * Parses URL search string and optional hash for deep linking parameters.
 */
export function parseUrlDeepLinkState(search: string, hash?: string): ParsedDeepLink {
    const rawSearch = search && typeof search === 'string' ? search : ''
    const params = new URLSearchParams(rawSearch.startsWith('?') ? rawSearch : `?${rawSearch}`)
    const rawHash = hash && typeof hash === 'string' ? hash : ''
    const cleanHash = rawHash.replace(/^#+/, '').trim()
    const hashParams = new URLSearchParams(cleanHash)
    
    // Project query
    const projectQuery = params.get('project') || params.get('deal') || params.get('projectId') || null

    // Tab detection with query param priority, then hash fallback
    const rawTabParam = (params.get('tab') || '').toLowerCase().trim()
    let tab: WorkspaceTab | null = resolveWorkspaceTab(rawTabParam)

    if (!tab && rawHash) {
        tab = resolveWorkspaceTab(rawHash)
    }

    const isOAuthSuccessCallback = params.has('code') || 
                                   params.has('token_hash') || 
                                   hashParams.has('access_token') || 
                                   hashParams.has('refresh_token') || 
                                   cleanHash.includes('access_token=')

    const isOAuthErrorCallback = params.has('error') || 
                                 params.has('error_description') || 
                                 hashParams.has('error') || 
                                 hashParams.has('error_description') || 
                                 cleanHash.includes('error_description=')

    // View detection
    let view: 'landing' | 'login' | 'dashboard' | null = null
    if (isOAuthErrorCallback) {
        view = 'login'
    } else if (isOAuthSuccessCallback) {
        view = 'dashboard'
    } else if (params.get('view') === 'landing') {
        view = 'landing'
    } else if (params.get('view') === 'login' || params.get('auth') === 'true' || params.get('signin') === 'true') {
        view = 'login'
    } else if (
        params.get('view') === 'dashboard' ||
        params.get('app') === 'true' ||
        params.has('project') ||
        params.has('deal') ||
        params.has('tab') ||
        tab !== null
    ) {
        view = 'dashboard'
    }

    return { view, projectQuery, tab }
}

/**
 * Normalizes strings for robust fuzzy/slug matching (e.g. "Scenario-Communications" -> "scenariocommunications")
 */
function normalizeForMatching(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/**
 * Resolves a URL project query string to a matching project summary row.
 */
export function matchProjectFromQuery<T extends { projectId?: string; projectKey?: string; projectName?: string; companyName?: string }>(
    query: string | null | undefined,
    projectSummaries: T[]
): T | null {
    if (!query || !query.trim() || !projectSummaries || projectSummaries.length === 0) {
        return null
    }

    const trimmed = query.trim()
    const normQuery = normalizeForMatching(trimmed)

    // 1. Exact match on projectId or projectKey
    const exactKeyMatch = projectSummaries.find(
        (p) => (p.projectId && p.projectId.toLowerCase() === trimmed.toLowerCase()) ||
               (p.projectKey && p.projectKey.toLowerCase() === trimmed.toLowerCase())
    )
    if (exactKeyMatch) return exactKeyMatch

    // 2. Normalized alphanumeric match on key / ID
    const normKeyMatch = projectSummaries.find(
        (p) => (p.projectId && normalizeForMatching(p.projectId) === normQuery) ||
               (p.projectKey && normalizeForMatching(p.projectKey) === normQuery)
    )
    if (normKeyMatch) return normKeyMatch

    // 3. Exact / normalized match on companyName or projectName
    const nameMatch = projectSummaries.find(
        (p) => (p.companyName && normalizeForMatching(p.companyName) === normQuery) ||
               (p.projectName && normalizeForMatching(p.projectName) === normQuery)
    )
    if (nameMatch) return nameMatch

    // 4. Substring containment match (e.g. "scenario" matches "Scenario Communications")
    if (normQuery.length >= 3) {
        const containsMatch = projectSummaries.find((p) => {
            const pName = normalizeForMatching(p.projectName || '')
            const cName = normalizeForMatching(p.companyName || '')
            const pKey = normalizeForMatching(p.projectKey || '')
            const pId = normalizeForMatching(p.projectId || '')
            return (
                (pName && (pName.includes(normQuery) || normQuery.includes(pName))) ||
                (cName && (cName.includes(normQuery) || normQuery.includes(cName))) ||
                (pKey && (pKey.includes(normQuery) || normQuery.includes(pKey))) ||
                (pId && (pId.includes(normQuery) || normQuery.includes(pId)))
            )
        })
        if (containsMatch) return containsMatch
    }

    return null
}

/**
 * Builds a clean, canonical permalink URL for sharing a specific project and tab.
 */
export function buildProjectPermalink(options: {
    projectKey?: string
    tab?: WorkspaceTab | string
    origin?: string
    pathname?: string
}): string {
    const origin = options.origin || (typeof window !== 'undefined' ? window.location.origin : '')
    const pathname = options.pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')

    const params = new URLSearchParams()
    params.set('view', 'dashboard')

    if (options.projectKey) {
        // Create clean slug if it's a project key
        params.set('project', options.projectKey)
    }

    if (options.tab && options.tab !== 'overview') {
        params.set('tab', options.tab)
    }

    const qs = params.toString()
    return `${origin}${pathname}${qs ? `?${qs}` : ''}`
}

/**
 * Safely updates browser URL in place without page reloads.
 */
export function syncBrowserUrl(projectKey?: string, tab?: WorkspaceTab | string): void {
    if (typeof window === 'undefined') return
    try {
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.set('view', 'dashboard')
        
        if (projectKey) {
            currentUrl.searchParams.set('project', projectKey)
        } else {
            currentUrl.searchParams.delete('project')
        }

        if (tab && tab !== 'overview') {
            currentUrl.searchParams.set('tab', tab)
        } else {
            currentUrl.searchParams.delete('tab')
        }

        window.history.replaceState({}, '', currentUrl.toString())
    } catch {
        // Ignore in restricted iframe environments
    }
}
