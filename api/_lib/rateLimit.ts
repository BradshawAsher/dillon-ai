// Lightweight in-memory rate limiter for the public /api/diligence/* routes.
//
// The API is internet-reachable on Vercel and (today) unauthenticated, so an
// abusive caller could hammer the read endpoints or — worse — spam the
// submit/retry triggers, which cost real money by firing n8n + LLM runs. This
// caps requests per client IP per rolling window.
//
// Caveat: Vercel serverless instances are per-invocation and not shared, so a
// process-local Map only throttles traffic that lands on the same warm
// instance. It meaningfully blunts single-source bursts (the common abuse
// case); a fully distributed limit would need a shared store (Upstash Redis /
// Supabase). This is intentionally the low-risk first layer.

import type { IncomingHttpHeaders } from 'node:http'

type Bucket = 'read' | 'write' | 'trigger'

// Requests allowed per rolling 60s window, per IP, per bucket.
const WINDOW_MS = 60_000
const LIMITS: Record<Bucket, number> = {
    // Generous: the dashboard polls history/synthesis/deal-models frequently.
    read: 200,
    // Persisting edits (deal model, action tracker, consideration toggles).
    write: 60,
    // Expensive workflow triggers (submit/retry) — these spend money.
    trigger: 12,
}

const hits = new Map<string, number[]>()

/** Best-effort client IP from proxy headers, falling back to a shared bucket. */
export function getClientIp(headers: IncomingHttpHeaders): string {
    const forwarded = headers['x-forwarded-for']
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim()
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
        return forwarded[0].trim()
    }
    const realIp = headers['x-real-ip']
    if (typeof realIp === 'string' && realIp.length > 0) return realIp.trim()
    return 'unknown'
}

/** Classifies a route+method into a rate bucket. */
export function bucketFor(route: string, method: string): Bucket {
    if (method === 'GET') return 'read'
    if (route === 'submit' || route === 'retry-failed-document') return 'trigger'
    return 'write'
}

export type RateLimitResult = {
    allowed: boolean
    limit: number
    remaining: number
    retryAfterSec: number
}

/**
 * Records a request and reports whether it is within the limit for its bucket.
 * Uses a sliding 60s window per (ip, bucket).
 */
export function rateLimit(ip: string, route: string, method: string): RateLimitResult {
    const bucket = bucketFor(route, method)
    const limit = LIMITS[bucket]
    const now = Date.now()
    const key = `${ip}:${bucket}`

    const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)

    if (timestamps.length >= limit) {
        const oldest = timestamps[0]
        const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000))
        hits.set(key, timestamps)
        return { allowed: false, limit, remaining: 0, retryAfterSec }
    }

    timestamps.push(now)
    hits.set(key, timestamps)

    // Opportunistic cleanup so the map doesn't grow unbounded on a warm instance.
    if (hits.size > 5000) {
        for (const [k, ts] of hits) {
            const fresh = ts.filter((t) => now - t < WINDOW_MS)
            if (fresh.length === 0) hits.delete(k)
            else hits.set(k, fresh)
        }
    }

    return { allowed: true, limit, remaining: limit - timestamps.length, retryAfterSec: 0 }
}
