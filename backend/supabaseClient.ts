import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

function getClient(): SupabaseClient {
    if (_client) return _client

    const url = process.env.SUPABASE_URL ?? ''
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

    if (!url || !key) {
        throw new Error('[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set. Add them to .env or Vercel env vars.')
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
