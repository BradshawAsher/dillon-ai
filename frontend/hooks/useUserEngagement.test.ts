import { describe, it, expect } from 'vitest'
import {
    evaluateEngagementState,
    dismissEngagementState,
    snoozeEngagementState,
    completeWalkthroughEngagementState,
    SEVEN_DAYS_MS,
    FOURTEEN_DAYS_MS,
    type UserEngagementState,
} from './useUserEngagement'

describe('useUserEngagement Logic & State Machine', () => {
    it('creates initial state and flags new_user nudge for first time visitor', () => {
        const now = 1700000000000
        const result = evaluateEngagementState(null, now)

        expect(result.shouldNudge).toBe(true)
        expect(result.nudgeReason).toBe('new_user')
        expect(result.nextState).toEqual({
            firstSeenAt: now,
            lastSeenAt: now,
            totalVisits: 1,
            hasCompletedWalkthrough: false,
            hasDismissedNudge: false,
            snoozedUntil: null,
        })
    })

    it('flags new_user nudge on 2nd visit if walkthrough not completed', () => {
        const now = 1700000000000
        const priorState: UserEngagementState = {
            firstSeenAt: now - 3600000,
            lastSeenAt: now - 1800000,
            totalVisits: 1,
            hasCompletedWalkthrough: false,
            hasDismissedNudge: false,
            snoozedUntil: null,
        }

        const result = evaluateEngagementState(priorState, now)
        expect(result.shouldNudge).toBe(true)
        expect(result.nudgeReason).toBe('new_user')
        expect(result.nextState.totalVisits).toBe(2)
    })

    it('does NOT flag new_user nudge on 3rd visit if user is active but chose not to do tour', () => {
        const now = 1700000000000
        const priorState: UserEngagementState = {
            firstSeenAt: now - 7200000,
            lastSeenAt: now - 1800000,
            totalVisits: 2,
            hasCompletedWalkthrough: false,
            hasDismissedNudge: false,
            snoozedUntil: null,
        }

        const result = evaluateEngagementState(priorState, now)
        expect(result.shouldNudge).toBe(false)
        expect(result.nudgeReason).toBe(null)
        expect(result.nextState.totalVisits).toBe(3)
    })

    it('flags returning_user nudge when returning after > 14 days of inactivity', () => {
        const now = 1700000000000
        const priorState: UserEngagementState = {
            firstSeenAt: now - (FOURTEEN_DAYS_MS * 3),
            lastSeenAt: now - (FOURTEEN_DAYS_MS + 10000),
            totalVisits: 10,
            hasCompletedWalkthrough: true,
            hasDismissedNudge: false,
            snoozedUntil: null,
        }

        const result = evaluateEngagementState(priorState, now)
        expect(result.shouldNudge).toBe(true)
        expect(result.nudgeReason).toBe('returning_user')
        expect(result.nextState.totalVisits).toBe(11)
    })

    it('suppresses nudge if snooze is currently active', () => {
        const now = 1700000000000
        const priorState: UserEngagementState = {
            firstSeenAt: now - (FOURTEEN_DAYS_MS * 3),
            lastSeenAt: now - (FOURTEEN_DAYS_MS + 10000),
            totalVisits: 10,
            hasCompletedWalkthrough: true,
            hasDismissedNudge: false,
            snoozedUntil: now + (2 * 24 * 60 * 60 * 1000), // 2 days left
        }

        const result = evaluateEngagementState(priorState, now)
        expect(result.shouldNudge).toBe(false)
        expect(result.nudgeReason).toBe(null)
    })

    it('shows returning_user nudge if snooze has expired', () => {
        const now = 1700000000000
        const priorState: UserEngagementState = {
            firstSeenAt: now - (FOURTEEN_DAYS_MS * 3),
            lastSeenAt: now - (FOURTEEN_DAYS_MS + 10000),
            totalVisits: 10,
            hasCompletedWalkthrough: true,
            hasDismissedNudge: false,
            snoozedUntil: now - 1000, // Expired 1 sec ago
        }

        const result = evaluateEngagementState(priorState, now)
        expect(result.shouldNudge).toBe(true)
        expect(result.nudgeReason).toBe('returning_user')
    })

    it('suppresses nudge if permanently dismissed', () => {
        const now = 1700000000000
        const priorState: UserEngagementState = {
            firstSeenAt: now - (FOURTEEN_DAYS_MS * 3),
            lastSeenAt: now - (FOURTEEN_DAYS_MS + 10000),
            totalVisits: 10,
            hasCompletedWalkthrough: false,
            hasDismissedNudge: true,
            snoozedUntil: null,
        }

        const result = evaluateEngagementState(priorState, now)
        expect(result.shouldNudge).toBe(false)
        expect(result.nudgeReason).toBe(null)
    })

    it('correctly transitions state when dismissed, snoozed, or completed', () => {
        const now = 1700000000000
        const initial: UserEngagementState = {
            firstSeenAt: now,
            lastSeenAt: now,
            totalVisits: 1,
            hasCompletedWalkthrough: false,
            hasDismissedNudge: false,
            snoozedUntil: null,
        }

        const dismissed = dismissEngagementState(initial)
        expect(dismissed.hasDismissedNudge).toBe(true)

        const snoozed = snoozeEngagementState(initial, SEVEN_DAYS_MS, now)
        expect(snoozed.snoozedUntil).toBe(now + SEVEN_DAYS_MS)

        const completed = completeWalkthroughEngagementState(initial)
        expect(completed.hasCompletedWalkthrough).toBe(true)
    })
})
