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
    // x-forwarded-for may arrive as a comma-joined string or a header array; in
    // both cases the client is the first entry. Skip blank segments — a leading
    // empty value (", 5.6.7.8") must not resolve to an empty-string IP, which
    // would collapse every such caller into one shared rate-limit bucket.
    const forwarded = headers['x-forwarded-for']
    const forwardedParts = Array.isArray(forwarded)
        ? forwarded.flatMap((part) => part.split(','))
        : typeof forwarded === 'string'
            ? forwarded.split(',')
            : []
    for (const part of forwardedParts) {
        const trimmed = part.trim()
        if (trimmed.length > 0) return trimmed
    }
    const realIp = headers['x-real-ip']
    if (typeof realIp === 'string' && realIp.trim().length > 0) return realIp.trim()
    return 'unknown'
}

/** Classifies a route+method into a rate bucket. */
export function bucketFor(route: string, method: string): Bucket {
    // Safe, side-effect-free methods (including CORS preflight) share the
    // generous read budget rather than spending the tighter write allowance.
    const upper = method.toUpperCase()
    if (upper === 'GET' || upper === 'HEAD' || upper === 'OPTIONS') return 'read'
    if (route === 'submit' || route === 'retry-failed-document' || route === 'chat') return 'trigger'
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
