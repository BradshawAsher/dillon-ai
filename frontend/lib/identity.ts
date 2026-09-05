// Analyst identity for live mode: captured by the sign-in overlay, stored in
// localStorage, and sent as headers so submissions are stamped with the right
// name/email (the role Retool's req.user used to play).
export type AnalystIdentity = {
  name: string
  email: string
  id?: string
  team?: string
}

const STORAGE_KEY = 'dueDiligenceDashboard.analystIdentity'

export function getIdentity(): AnalystIdentity | null {
  try {
    const rawAuth = typeof window !== 'undefined' ? window.localStorage.getItem('mergeworks.auth') : null
    if (rawAuth) {
      const parsedAuth = JSON.parse(rawAuth)
      if (parsedAuth && typeof parsedAuth.email === 'string' && parsedAuth.email.trim().length > 0) {
        return {
          name: parsedAuth.name || parsedAuth.email.split('@')[0],
          email: parsedAuth.email.trim(),
          id: parsedAuth.id || undefined,
          team: parsedAuth.team || undefined,
        }
      }
    }
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as Partial<AnalystIdentity>
    if (
      typeof parsed.name === 'string' &&
      parsed.name.trim().length > 0 &&
      typeof parsed.email === 'string' &&
      parsed.email.trim().length > 0
    ) {
      return {
        name: parsed.name,
        email: parsed.email,
        id: parsed.id,
        team: parsed.team,
      }
    }
  } catch {
    // storage unavailable or corrupted — treat as signed out
  }
  return null
}

export function setIdentity(identity: AnalystIdentity) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    // best effort
  }
}

export function identityHeaders(): Record<string, string> {
  const identity = getIdentity()
  if (!identity) {
    return {}
  }
  const headers: Record<string, string> = {
    'x-analyst-name': encodeURIComponent(identity.name),
    'x-analyst-email': encodeURIComponent(identity.email),
  }
  if (identity.id) {
    headers['x-user-id'] = encodeURIComponent(identity.id)
  }
  if (identity.team) {
    headers['x-user-team'] = encodeURIComponent(identity.team)
  }
  return headers
}

/**
 * Returns the display identity headers plus the current Supabase access token.
 *
 * The display headers are retained for backwards-compatible attribution, but
 * the API must derive authorization from the bearer token rather than trusting
 * browser-controlled identity values.
 */
export async function authenticatedIdentityHeaders(): Promise<Record<string, string>> {
  const headers = identityHeaders()

  try {
    const { supabaseAuthClient } = await import('../services/supabaseAuth')
    const { data } = await supabaseAuthClient.auth.getSession()
    const accessToken = data.session?.access_token
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }
  } catch {
    // The API treats a missing/invalid bearer token as a guest request. Keeping
    // this helper best-effort lets the demo experience continue during auth
    // initialization or when Supabase is temporarily unavailable.
  }

  return headers
}

