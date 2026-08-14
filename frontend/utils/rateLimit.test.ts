import { describe, expect, it } from 'vitest'

import { bucketFor, getClientIp, rateLimit } from '../../api/_lib/rateLimit'

describe('bucketFor', () => {
    it('classifies GETs as reads', () => {
        expect(bucketFor('history', 'GET')).toBe('read')
    })
    it('classifies expensive workflow triggers', () => {
        expect(bucketFor('submit', 'POST')).toBe('trigger')
        expect(bucketFor('retry-failed-document', 'POST')).toBe('trigger')
    })
    it('classifies other POSTs as writes', () => {
        expect(bucketFor('deal-models', 'POST')).toBe('write')
    })
    it('classifies safe methods (HEAD, OPTIONS) as reads regardless of case', () => {
        expect(bucketFor('submit', 'HEAD')).toBe('read')
        expect(bucketFor('submit', 'options')).toBe('read')
        expect(bucketFor('history', 'get')).toBe('read')
    })
})

describe('getClientIp', () => {
    it('takes the first IP from x-forwarded-for', () => {
        expect(getClientIp({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' })).toBe('1.2.3.4')
    })
    it('falls back to x-real-ip then unknown', () => {
        expect(getClientIp({ 'x-real-ip': '9.9.9.9' })).toBe('9.9.9.9')
        expect(getClientIp({})).toBe('unknown')
    })
    it('skips a leading empty x-forwarded-for segment', () => {
        expect(getClientIp({ 'x-forwarded-for': ', 5.6.7.8' })).toBe('5.6.7.8')
    })
    it('falls through to x-real-ip when x-forwarded-for is all blanks', () => {
        expect(getClientIp({ 'x-forwarded-for': ' , ', 'x-real-ip': '9.9.9.9' })).toBe('9.9.9.9')
    })
    it('handles an array-valued x-forwarded-for, skipping blanks', () => {
        expect(getClientIp({ 'x-forwarded-for': ['', '7.7.7.7'] })).toBe('7.7.7.7')
    })
})

describe('rateLimit', () => {
    it('allows requests up to the trigger limit then blocks with a Retry-After', () => {
        const ip = `test-${Math.random()}`
        // trigger bucket limit is 12
        for (let i = 0; i < 12; i += 1) {
            expect(rateLimit(ip, 'submit', 'POST').allowed).toBe(true)
        }
        const blocked = rateLimit(ip, 'submit', 'POST')
        expect(blocked.allowed).toBe(false)
        expect(blocked.remaining).toBe(0)
        expect(blocked.retryAfterSec).toBeGreaterThan(0)
    })

    it('tracks read and trigger buckets independently per IP', () => {
        const ip = `test-${Math.random()}`
        // exhaust triggers
        for (let i = 0; i < 12; i += 1) rateLimit(ip, 'submit', 'POST')
        expect(rateLimit(ip, 'submit', 'POST').allowed).toBe(false)
        // reads on the same IP are a separate, still-open bucket
        expect(rateLimit(ip, 'history', 'GET').allowed).toBe(true)
    })

    it('isolates limits per IP', () => {
        const a = `a-${Math.random()}`
        const b = `b-${Math.random()}`
        for (let i = 0; i < 12; i += 1) rateLimit(a, 'submit', 'POST')
        expect(rateLimit(a, 'submit', 'POST').allowed).toBe(false)
        expect(rateLimit(b, 'submit', 'POST').allowed).toBe(true)
    })
})
