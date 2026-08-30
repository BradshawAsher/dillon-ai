import { useCallback, useEffect, useRef, useState } from 'react'

export type DeploymentStatus = 'idle' | 'building' | 'update_ready'

export interface DeploymentState {
    status: DeploymentStatus
    currentCommit: string
    latestCommit: string | null
    latestBuiltAt: string | null
    isDismissed: boolean
    reloadApp: () => void
    dismiss: () => void
}

export interface VersionInfo {
    commit?: string
    builtAt?: string
}

export function evaluateDeploymentStatus(
    currentCommit: string,
    currentBuiltAt: string,
    versionData: VersionInfo | null,
    ghData: { sha?: string } | null
): {
    status: DeploymentStatus
    latestCommit: string | null
    latestBuiltAt: string | null
} {
    const currentBuiltTime = Date.parse(currentBuiltAt) || Date.now()

    if (versionData) {
        const serverCommit = (versionData.commit || '').trim()
        const serverTime = Date.parse(versionData.builtAt || '')

        const isNewerCommit = Boolean(serverCommit && currentCommit !== 'local' && serverCommit !== 'local' && serverCommit !== currentCommit)
        const isNewerTime = Boolean(Number.isFinite(serverTime) && serverTime > currentBuiltTime + 15_000)

        if (isNewerCommit || isNewerTime) {
            return {
                status: 'update_ready',
                latestCommit: serverCommit || null,
                latestBuiltAt: versionData.builtAt || null,
            }
        }
    }

    if (currentCommit !== 'local' && ghData?.sha) {
        const ghSha = ghData.sha.substring(0, 7)
        if (ghSha && ghSha !== currentCommit) {
            return {
                status: 'building',
                latestCommit: ghSha,
                latestBuiltAt: null,
            }
        }
    }

    return {
        status: 'idle',
        latestCommit: null,
        latestBuiltAt: null,
    }
}

const GITHUB_REPO_COMMITS_URL = 'https://api.github.com/repos/BradshawAsher/MergeWorks-Financial-Due-Diligence/commits/main'

export function useDeploymentNotifier(): DeploymentState {
    const localInfo = typeof __APP_BUILD_INFO__ !== 'undefined'
        ? __APP_BUILD_INFO__
        : { commit: 'local', builtAt: new Date().toISOString() }

    const currentCommit = localInfo.commit
    const currentBuiltAt = localInfo.builtAt

    const [status, setStatus] = useState<DeploymentStatus>('idle')
    const [latestCommit, setLatestCommit] = useState<string | null>(null)
    const [latestBuiltAt, setLatestBuiltAt] = useState<string | null>(null)
    const [dismissedCommit, setDismissedCommit] = useState<string | null>(null)

    const isCheckingRef = useRef(false)

    const checkForUpdates = useCallback(async () => {
        if (isCheckingRef.current) return
        isCheckingRef.current = true

        try {
            let versionData: VersionInfo | null = null
            let ghData: { sha?: string } | null = null

            // 1. Check live deployed version.json on Vercel
            try {
                const versionRes = await fetch(`/version.json?t=${Date.now()}`, {
                    cache: 'no-store',
                    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
                })
                if (versionRes.ok) {
                    versionData = await versionRes.json()
                }
            } catch {}

            // 2. If version.json doesn't indicate a new deployment, check if GitHub has a newer commit (building on Vercel)
            if (currentCommit !== 'local') {
                try {
                    const ghRes = await fetch(GITHUB_REPO_COMMITS_URL, {
                        headers: { Accept: 'application/vnd.github.v3+json' },
                    })
                    if (ghRes.ok) {
                        ghData = await ghRes.json()
                    }
                } catch {}
            }

            const result = evaluateDeploymentStatus(currentCommit, currentBuiltAt, versionData, ghData)
            setStatus(result.status)
            setLatestCommit(result.latestCommit)
            setLatestBuiltAt(result.latestBuiltAt)
        } catch {
            // Silently swallow fetch errors during deployment transitions
        } finally {
            isCheckingRef.current = false
        }
    }, [currentCommit, currentBuiltAt])

    useEffect(() => {
        const initialTimer = setTimeout(() => {
            void checkForUpdates()
        }, 3_000)

        const pollInterval = setInterval(() => {
            void checkForUpdates()
        }, 25_000)

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void checkForUpdates()
            }
        }
        window.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleVisibilityChange)

        return () => {
            clearTimeout(initialTimer)
            clearInterval(pollInterval)
            window.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
    }, [checkForUpdates])

    const reloadApp = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.location.reload()
        }
    }, [])

    const dismiss = useCallback(() => {
        if (latestCommit) {
            setDismissedCommit(latestCommit)
        }
    }, [latestCommit])

    const isDismissed = Boolean(dismissedCommit && dismissedCommit === latestCommit)

    return {
        status,
        currentCommit,
        latestCommit,
        latestBuiltAt,
        isDismissed,
        reloadApp,
        dismiss,
    }
}
