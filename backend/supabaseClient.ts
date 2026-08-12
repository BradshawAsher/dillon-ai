import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// The project URL is a public identifier (it is sent with every request), so a
// default is harmless. The key is NOT: the service-role key bypasses RLS and is
// a server-only secret, so it must come from the environment and never be
// committed or shipped to the browser.
const DEFAULT_SUPABASE_URL = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'

function getClient(): SupabaseClient {
    if (_client) return _client

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

    if (!key) {
        // Callers (e.g. getEvalRuns) catch this and fall back to local data.
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set — refusing to create a Supabase client without a key.')
    }

    _client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    })
    return _client
}

// Lazy proxy — defers client creation until first use, so process.loadEnvFile()
// in server.ts has time to run before env vars are read.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
    get(_target, prop) {
        return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
    },
})
