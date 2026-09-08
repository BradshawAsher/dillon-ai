import { useCallback, useEffect, useRef, useState } from 'react'
import { getLatestProductionUrl, isHistoricalDeploymentHost } from '../utils/deploymentVersions'

export type DeploymentStatus = 'idle' | 'building' | 'update_ready' | 'historical'

export interface DeploymentState {
    status: DeploymentStatus
    currentCommit: string
    latestCommit: string | null
    latestBuiltAt: string | null
    isDismissed: boolean
    reloadApp: () => void
    returnToLatest: () => void
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
    ghData: { sha?: string } | null,
    historicalDeployment = false,
): {
    status: DeploymentStatus
    latestCommit: string | null
    latestBuiltAt: string | null
} {
    if (historicalDeployment) {
        return {
            status: 'historical',
            latestCommit: null,
            latestBuiltAt: null,
        }
    }

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
    const historicalDeployment = typeof window !== 'undefined'
        && isHistoricalDeploymentHost(window.location.hostname)
    const latestProductionUrl = typeof window !== 'undefined'
        ? getLatestProductionUrl(window.location)
        : getLatestProductionUrl()

    const [status, setStatus] = useState<DeploymentStatus>(historicalDeployment ? 'historical' : 'idle')
    const [latestCommit, setLatestCommit] = useState<string | null>(null)
    const [latestBuiltAt, setLatestBuiltAt] = useState<string | null>(null)
    const [dismissedCommit, setDismissedCommit] = useState<string | null>(null)

    const isCheckingRef = useRef(false)

    const checkForUpdates = useCallback(async () => {
        if (isCheckingRef.current) return
        if (historicalDeployment) {
            setStatus('historical')
            return
        }
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

            // 2. We intentionally avoid unauthenticated client-side pings to api.github.com
            // to avoid hitting GitHub IP rate limits (60 req/hr) and 403 console errors in production.
            // Deployment status is accurately tracked by live deployed version.json.

            const result = evaluateDeploymentStatus(currentCommit, currentBuiltAt, versionData, ghData)
            setStatus(result.status)
            setLatestCommit(result.latestCommit)
            setLatestBuiltAt(result.latestBuiltAt)
        } catch {
            // Silently swallow fetch errors during deployment transitions
        } finally {
            isCheckingRef.current = false
        }
    }, [currentCommit, currentBuiltAt, historicalDeployment])

    useEffect(() => {
        if (historicalDeployment) {
            setStatus('historical')
            return
        }

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
    }, [checkForUpdates, historicalDeployment])

    const reloadApp = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.location.reload()
        }
    }, [])

    const returnToLatest = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.location.assign(latestProductionUrl)
        }
    }, [latestProductionUrl])

    const dismiss = useCallback(() => {
        const dismissKey = latestCommit ?? (status === 'historical' ? `historical:${currentCommit}` : null)
        if (dismissKey) {
            setDismissedCommit(dismissKey)
        }
    }, [currentCommit, latestCommit, status])

    const activeDismissKey = latestCommit ?? (status === 'historical' ? `historical:${currentCommit}` : null)
    const isDismissed = Boolean(dismissedCommit && dismissedCommit === activeDismissKey)

    return {
        status,
        currentCommit,
        latestCommit,
        latestBuiltAt,
        isDismissed,
        reloadApp,
        returnToLatest,
        dismiss,
    }
}
