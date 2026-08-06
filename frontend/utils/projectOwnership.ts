const STORAGE_KEY = 'mergeworks.projectOwnership'

type OwnershipMap = Record<string, string>

function getMap(): OwnershipMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw) as unknown
        // Only accept a plain object of string values; anything else (an array,
        // a primitive, corrupted data) resets to an empty map rather than
        // throwing later when callers index into it.
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
        const map: OwnershipMap = {}
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof value === 'string') map[key] = value
        }
        return map
    } catch {
        return {}
    }
}

function saveMap(map: OwnershipMap) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {
        // localStorage can be unavailable (private mode) or over quota — a
        // failed persist should never crash the claim flow.
    }
}

export function claimProject(projectKey: string, email: string) {
    if (!projectKey || !email.trim()) return
    const map = getMap()
    if (!map[projectKey]) {
        map[projectKey] = email.trim().toLowerCase()
        saveMap(map)
    }
}

export function getProjectOwner(projectKey: string): string | null {
    if (!projectKey) return null
    return getMap()[projectKey] || null
}

export function isOwnedByUser(projectKey: string, email: string): boolean {
    if (!email.trim()) return false
    const owner = getProjectOwner(projectKey)
    if (!owner) return false
    return owner === email.trim().toLowerCase()
}

export function getOwnedProjects(email: string): string[] {
    if (!email.trim()) return []
    const normalizedEmail = email.trim().toLowerCase()
    const map = getMap()
    return Object.entries(map)
        .filter(([, ownerEmail]) => ownerEmail === normalizedEmail)
        .map(([key]) => key)
}
