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
]

const TAB_ALIASES: Record<string, WorkspaceTab> = {
    projects: 'documents',
    project: 'documents',
    docs: 'documents',
    risk: 'diagnostics',
    playbook: 'diagnostics',
    benchmark: 'analysis',
    billing: 'spending',
    faq: 'faqs',
    error: 'errors',
    audit: 'history',
    intake: 'diligence',
}

export interface ParsedDeepLink {
    view: 'landing' | 'dashboard' | null
    projectQuery: string | null
    tab: WorkspaceTab | null
}

/**
 * Parses URL search string for deep linking parameters.
 */
export function parseUrlDeepLinkState(search: string): ParsedDeepLink {
    if (!search || typeof search !== 'string') {
        return { view: null, projectQuery: null, tab: null }
    }
    const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
    
    // View detection
    let view: 'landing' | 'dashboard' | null = null
    if (params.get('view') === 'dashboard' || params.get('app') === 'true' || params.has('project') || params.has('deal') || params.has('tab')) {
        view = 'dashboard'
    } else if (params.get('view') === 'landing') {
        view = 'landing'
    }

    // Project query
    const projectQuery = params.get('project') || params.get('deal') || params.get('projectId') || null

    // Tab detection with alias support
    const rawTab = (params.get('tab') || '').toLowerCase().trim()
    let tab: WorkspaceTab | null = null
    if (rawTab) {
        if (VALID_WORKSPACE_TABS.includes(rawTab as WorkspaceTab)) {
            tab = rawTab as WorkspaceTab
        } else if (TAB_ALIASES[rawTab]) {
            tab = TAB_ALIASES[rawTab]
        }
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
