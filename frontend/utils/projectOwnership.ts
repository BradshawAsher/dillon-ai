const STORAGE_KEY = 'mergeworks.projectOwnership'

type OwnershipMap = Record<string, string>

function getMap(): OwnershipMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function saveMap(map: OwnershipMap) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

export function claimProject(projectKey: string, email: string) {
    const map = getMap()
    if (!map[projectKey]) {
        map[projectKey] = email.toLowerCase()
        saveMap(map)
    }
}

export function getProjectOwner(projectKey: string): string | null {
    return getMap()[projectKey] || null
}

export function isOwnedByUser(projectKey: string, email: string): boolean {
    const owner = getProjectOwner(projectKey)
    if (!owner) return false
    return owner === email.toLowerCase()
}

export function getOwnedProjects(email: string): string[] {
    const map = getMap()
    return Object.entries(map)
        .filter(([, ownerEmail]) => ownerEmail === email.toLowerCase())
        .map(([key]) => key)
}
