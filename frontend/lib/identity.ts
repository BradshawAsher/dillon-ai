// Analyst identity for live mode: captured by the sign-in overlay, stored in
// localStorage, and sent as headers so submissions are stamped with the right
// name/email (the role Retool's req.user used to play).
export type AnalystIdentity = {
  name: string
  email: string
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
      return { name: parsed.name, email: parsed.email }
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
  return {
    'x-analyst-name': encodeURIComponent(identity.name),
    'x-analyst-email': encodeURIComponent(identity.email),
  }
}
