import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

const DEFAULT_SUPABASE_URL = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'
const DEFAULT_SUPABASE_KEY = 'REDACTED_SUPABASE_SERVICE_ROLE_KEY'

function getClient(): SupabaseClient {
    if (_client) return _client

    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY

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
