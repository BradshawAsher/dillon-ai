const STORAGE_KEY = 'mergeworks.projectOwnership'
const TEAM_STORAGE_KEY = 'mergeworks.projectTeams'

type OwnershipMap = Record<string, string>

function getMap(): OwnershipMap {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw) as unknown
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
        // localStorage can be unavailable or over quota
    }
}

function getTeamMap(): OwnershipMap {
    try {
        const raw = localStorage.getItem(TEAM_STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw) as unknown
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

function saveTeamMap(map: OwnershipMap) {
    try {
        localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(map))
    } catch {
        // localStorage can be unavailable or over quota
    }
}

function normalizeEmail(email: string | null | undefined): string {
    return (typeof email === 'string' ? email : '').trim().toLowerCase()
}

export function claimProject(projectKey: string, email: string) {
    const normalizedEmail = normalizeEmail(email)
    if (!projectKey || !normalizedEmail) return
    const map = getMap()
    if (!map[projectKey]) {
        map[projectKey] = normalizedEmail
        saveMap(map)
    }
}

export function claimProjectWithTeam(projectKey: string, email: string, team?: string) {
    claimProject(projectKey, email)
    if (projectKey && team && team.trim()) {
        const teamMap = getTeamMap()
        if (!teamMap[projectKey]) {
            teamMap[projectKey] = team.trim()
            saveTeamMap(teamMap)
        }
    }
}

export function getProjectOwner(projectKey: string): string | null {
    if (!projectKey) return null
    return getMap()[projectKey] || null
}

export function getProjectTeam(projectKey: string): string | null {
    if (!projectKey) return null
    return getTeamMap()[projectKey] || null
}

export function setProjectTeam(projectKey: string, team: string) {
    if (!projectKey || !team) return
    const teamMap = getTeamMap()
    teamMap[projectKey] = team.trim()
    saveTeamMap(teamMap)
}

export function isOwnedByUser(projectKey: string, email: string): boolean {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) return false
    const owner = getProjectOwner(projectKey)
    if (!owner) return false
    return owner === normalizedEmail
}

export function isOwnedByTeam(projectKey: string, team: string): boolean {
    if (!projectKey || !team) return false
    const projectTeam = getProjectTeam(projectKey)
    if (!projectTeam) return false
    return projectTeam.toLowerCase() === team.trim().toLowerCase()
}

export function getOwnedProjects(email: string): string[] {
    const normalizedEmail = normalizeEmail(email)
    if (!normalizedEmail) return []
    const map = getMap()
    return Object.entries(map)
        .filter(([, ownerEmail]) => ownerEmail === normalizedEmail)
        .map(([key]) => key)
}

export function getProjectsForTeam(team: string): string[] {
    const cleanTeam = (team || '').trim().toLowerCase()
    if (!cleanTeam) return []
    const teamMap = getTeamMap()
    return Object.entries(teamMap)
        .filter(([, t]) => t.toLowerCase() === cleanTeam)
        .map(([key]) => key)
}
