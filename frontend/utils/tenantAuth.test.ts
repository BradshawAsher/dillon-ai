import { describe, expect, it } from 'vitest'
import { isMergeWorksAdmin, isGuestUser, buildTenantPostgrestFilter } from '../../backend/diligence/tenantAuth'

describe('tenantAuth utilities', () => {
    describe('isMergeWorksAdmin', () => {
        it('identifies internal admin emails', () => {
            expect(isMergeWorksAdmin({ email: 'bradshaw@mergeworks.io' })).toBe(true)
            expect(isMergeWorksAdmin({ email: 'brad@mergeworks.io' })).toBe(true)
            expect(isMergeWorksAdmin({ email: 'srijan@mergeworks.io' })).toBe(true)
            expect(isMergeWorksAdmin({ email: 'admin@mergeworks.io' })).toBe(true)
            expect(isMergeWorksAdmin({ email: 'info@mergeworks.org' })).toBe(true)
            expect(isMergeWorksAdmin({ email: 'anyone@mergeworks.io' })).toBe(true)
            expect(isMergeWorksAdmin({ email: 'partner@mergeworks.org' })).toBe(true)
        })

        it('identifies external non-admin users', () => {
            expect(isMergeWorksAdmin({ email: 'external@acme-cap.com' })).toBe(false)
            expect(isMergeWorksAdmin({ email: 'guest' })).toBe(false)
            expect(isMergeWorksAdmin({ email: 'dashboard@mergeworks.local' })).toBe(false)
            expect(isMergeWorksAdmin(undefined)).toBe(false)
        })
    })

    describe('isGuestUser', () => {
        it('identifies unauthenticated or local guest users', () => {
            expect(isGuestUser(undefined)).toBe(true)
            expect(isGuestUser({ email: 'guest' })).toBe(true)
            expect(isGuestUser({ email: 'dashboard@mergeworks.local' })).toBe(true)
            expect(isGuestUser({ email: '' })).toBe(true)
        })

        it('identifies authenticated users with IDs or emails as non-guests', () => {
            expect(isGuestUser({ id: 'uuid-123', email: 'user@company.com' })).toBe(false)
            expect(isGuestUser({ email: 'user@company.com' })).toBe(false)
        })
    })

    describe('buildTenantPostgrestFilter', () => {
        it('returns null for admins so all records are visible', () => {
            expect(buildTenantPostgrestFilter({ email: 'bradshaw@mergeworks.io' })).toBeNull()
            expect(buildTenantPostgrestFilter({ email: 'admin@mergeworks.io' })).toBeNull()
        })

        it('returns demo-only filter for guest users', () => {
            expect(buildTenantPostgrestFilter(undefined)).toBe('is_demo.eq.true')
            expect(buildTenantPostgrestFilter({ email: 'guest' })).toBe('is_demo.eq.true')
            expect(buildTenantPostgrestFilter({ email: 'dashboard@mergeworks.local' })).toBe('is_demo.eq.true')
        })

        it('builds scoped filter for authenticated external users', () => {
            const filter = buildTenantPostgrestFilter({
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'analyst@acmecapital.com',
                team: 'Acme M&A',
            })
            expect(filter).toContain('is_demo.eq.true')
            expect(filter).toContain('user_id.eq.123e4567-e89b-12d3-a456-426614174000')
            expect(filter).toContain('analyst_email.ilike.analyst@acmecapital.com')
            expect(filter).not.toContain('team.eq.')
        })

        it('omits analyst email for tables that only support user_id ownership', () => {
            const filter = buildTenantPostgrestFilter({
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'analyst@acmecapital.com',
            }, { includeAnalystEmail: false })
            expect(filter).toBe('is_demo.eq.true,user_id.eq.123e4567-e89b-12d3-a456-426614174000')
        })
    })
})
