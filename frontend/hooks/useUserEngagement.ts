import { useState, useEffect, useCallback } from 'react'

export interface UserEngagementState {
    firstSeenAt: number
    lastSeenAt: number
    totalVisits: number
    hasCompletedWalkthrough: boolean
    hasDismissedNudge: boolean
    snoozedUntil: number | null
    lastSeenAppVersion?: string
}

export const USER_ENGAGEMENT_STORAGE_KEY = 'mergeworks_user_engagement_v1'
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
export const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

export function evaluateEngagementState(
    rawState: UserEngagementState | null,
    now = Date.now(),
    inactiveThresholdMs = FOURTEEN_DAYS_MS
): {
    nextState: UserEngagementState
    shouldNudge: boolean
    nudgeReason: 'new_user' | 'returning_user' | null
} {
    if (!rawState) {
        return {
            nextState: {
                firstSeenAt: now,
                lastSeenAt: now,
                totalVisits: 1,
                hasCompletedWalkthrough: false,
                hasDismissedNudge: false,
                snoozedUntil: null,
            },
            shouldNudge: true,
            nudgeReason: 'new_user',
        }
    }

    const wasInactive = now - (rawState.lastSeenAt || now) > inactiveThresholdMs
    const nextState: UserEngagementState = {
        ...rawState,
        totalVisits: (rawState.totalVisits || 0) + 1,
        lastSeenAt: now,
    }

    const isSnoozed = Boolean(nextState.snoozedUntil && now < nextState.snoozedUntil)
    const isDismissed = Boolean(nextState.hasDismissedNudge)

    if (isDismissed || isSnoozed) {
        return {
            nextState,
            shouldNudge: false,
            nudgeReason: null,
        }
    }

    if (nextState.totalVisits <= 2 && !nextState.hasCompletedWalkthrough) {
        return {
            nextState,
            shouldNudge: true,
            nudgeReason: 'new_user',
        }
    }

    if (wasInactive) {
        return {
            nextState,
            shouldNudge: true,
            nudgeReason: 'returning_user',
        }
    }

    return {
        nextState,
        shouldNudge: false,
        nudgeReason: null,
    }
}

export function dismissEngagementState(state: UserEngagementState): UserEngagementState {
    return { ...state, hasDismissedNudge: true }
}

export function snoozeEngagementState(
    state: UserEngagementState,
    durationMs = SEVEN_DAYS_MS,
    now = Date.now()
): UserEngagementState {
    return { ...state, snoozedUntil: now + durationMs }
}

export function completeWalkthroughEngagementState(state: UserEngagementState): UserEngagementState {
    return { ...state, hasCompletedWalkthrough: true }
}

export function useUserEngagement(options?: {
    initialDelayMs?: number
    inactiveThresholdMs?: number
    snoozeDurationMs?: number
}) {
    const initialDelay = options?.initialDelayMs ?? 2500
    const inactiveThreshold = options?.inactiveThresholdMs ?? FOURTEEN_DAYS_MS
    const snoozeDuration = options?.snoozeDurationMs ?? SEVEN_DAYS_MS

    const [engagementState, setEngagementState] = useState<UserEngagementState | null>(null)
    const [shouldShowNudge, setShouldShowNudge] = useState(false)
    const [nudgeReason, setNudgeReason] = useState<'new_user' | 'returning_user' | null>(null)

    // Load and evaluate engagement metrics on mount
    useEffect(() => {
        let timer: any = null

        try {
            const now = Date.now()
            let rawParsed: UserEngagementState | null = null
            if (typeof window !== 'undefined') {
                const raw = localStorage.getItem(USER_ENGAGEMENT_STORAGE_KEY)
                if (raw) {
                    rawParsed = JSON.parse(raw) as UserEngagementState
                }
            }

            const { nextState, shouldNudge, nudgeReason: reason } = evaluateEngagementState(
                rawParsed,
                now,
                inactiveThreshold
            )

            if (typeof window !== 'undefined') {
                localStorage.setItem(USER_ENGAGEMENT_STORAGE_KEY, JSON.stringify(nextState))
            }
            setEngagementState(nextState)

            if (shouldNudge) {
                setNudgeReason(reason)
                const delay = reason === 'returning_user' ? initialDelay + 500 : initialDelay
                timer = setTimeout(() => setShouldShowNudge(true), delay)
            }
        } catch (e) {
            console.warn('[useUserEngagement] Local storage access failed', e)
        }

        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [initialDelay, inactiveThreshold])

    const dismissNudge = useCallback(() => {
        setShouldShowNudge(false)
        setEngagementState((prev) => {
            if (!prev) return prev
            const next = dismissEngagementState(prev)
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(USER_ENGAGEMENT_STORAGE_KEY, JSON.stringify(next))
                }
            } catch {}
            return next
        })
    }, [])

    const snoozeNudge = useCallback(
        (customDurationMs?: number) => {
            setShouldShowNudge(false)
            const duration = customDurationMs ?? snoozeDuration
            setEngagementState((prev) => {
                if (!prev) return prev
                const next = snoozeEngagementState(prev, duration)
                try {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(USER_ENGAGEMENT_STORAGE_KEY, JSON.stringify(next))
                    }
                } catch {}
                return next
            })
        },
        [snoozeDuration]
    )

    const markWalkthroughCompleted = useCallback(() => {
        setShouldShowNudge(false)
        setEngagementState((prev) => {
            if (!prev) return prev
            const next = completeWalkthroughEngagementState(prev)
            try {
                if (typeof window !== 'undefined') {
                    localStorage.setItem(USER_ENGAGEMENT_STORAGE_KEY, JSON.stringify(next))
                }
            } catch {}
            return next
        })
    }, [])

    return {
        engagementState,
        shouldShowNudge,
        nudgeReason,
        dismissNudge,
        snoozeNudge,
        markWalkthroughCompleted,
    }
}
