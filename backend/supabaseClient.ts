import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null
let _authClient: SupabaseClient | null = null

// The project URL is a public identifier (it is sent with every request), so a
// default is harmless. The key is NOT: the service-role key bypasses RLS and is
// a server-only secret, so it must come from the environment and never be
// committed or shipped to the browser.
// The edge proxy may cache only genuinely public, unauthenticated PostgREST
// reads. User-scoped reads carry Authorization and must never be shared.
const DEFAULT_SUPABASE_URL = 'https://dillon-ai-worker.bradshin231.workers.dev'
const DEFAULT_DIRECT_SUPABASE_URL = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'

function getSupabaseKey(): string {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''
    if (!key) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — refusing to create a Supabase client without a key.')
    }
    return key
}

function getClient(): SupabaseClient {
    if (_client) return _client

    if (process.env.NODE_ENV !== 'production' && !process.env.NODE_TLS_REJECT_UNAUTHORIZED) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
    const key = getSupabaseKey()

    _client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    return _client
}

function getAuthClient(): SupabaseClient {
    if (_authClient) return _authClient

    // Token verification must never traverse the shared caching proxy. A cache
    // key based only on /auth/v1/user could return one account for another
    // bearer token. SUPABASE_AUTH_URL is an optional direct-origin override.
    const url = process.env.SUPABASE_AUTH_URL || DEFAULT_DIRECT_SUPABASE_URL
    _authClient = createClient(url, getSupabaseKey(), {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    return _authClient
}

// Lazy proxy — defers client creation until first use, so process.loadEnvFile()
// in server.ts has time to run before env vars are read.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
    },
})

export const supabaseAuth: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getAuthClient() as unknown as Record<string | symbol, unknown>)[prop]
    },
})
