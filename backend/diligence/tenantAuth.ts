// Tenant and role authorization utilities for backend diligence endpoints.
// Enforces that non-admin requests are scoped to their own documents or demo deals.

const ADMIN_EMAILS = new Set([
  'bradshaw@mergeworks.io',
  'brad@mergeworks.io',
  'srijan@mergeworks.io',
  'admin@mergeworks.io',
  'info@mergeworks.org',
  'bradshin231@gmail.com',
  's-basher@outlook.com',
  'srijanchallapalli@gmail.com',
  'ykakarl1@umbc.edu',
  'basher2@uw.edu',
  'basher2@cs.washington.edu',
])

export function isMergeWorksAdmin(user?: { email?: string; team?: string }): boolean {
  if (!user || !user.email) return false
  const cleanEmail = user.email.trim().toLowerCase()
  if (cleanEmail.endsWith('@mergeworks.io') || cleanEmail.endsWith('@mergeworks.org')) return true
  return ADMIN_EMAILS.has(cleanEmail)
}

export function isGuestUser(user?: { email?: string; id?: string }): boolean {
  if (!user) return true
  if (user.id && user.id.trim().length > 0) return false
  const cleanEmail = (user.email || '').trim().toLowerCase()
  return (
    cleanEmail.length === 0 ||
    cleanEmail === 'dashboard@mergeworks.local' ||
    cleanEmail === 'guest'
  )
}

export function buildTenantPostgrestFilter(
  user?: { email?: string; id?: string; team?: string },
  options: { includeAnalystEmail?: boolean } = {},
): string | null {
  if (isMergeWorksAdmin(user)) {
    // Admins have global visibility across all tenants
    return null
  }

  if (isGuestUser(user)) {
    // Unauthenticated guests only see official demo deals
    return 'is_demo.eq.true'
  }

  const conditions: string[] = ['is_demo.eq.true']

  if (user?.id && user.id.trim().length > 0) {
    conditions.push(`user_id.eq.${user.id.trim()}`)
  }

  if (options.includeAnalystEmail !== false && user?.email && user.email.trim().length > 0) {
    const cleanEmail = user.email.trim().toLowerCase()
    conditions.push(`analyst_email.ilike.${cleanEmail}`)
  }

  return conditions.join(',')
}
