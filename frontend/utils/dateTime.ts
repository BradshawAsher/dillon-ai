export function formatEasternTime(value: string | number | null | undefined, fallback = 'Pending') {
  // n8n rows sometimes hand back a numeric epoch as an actual number (not a
  // string), and callers occasionally pass null/undefined. Coerce first so a
  // non-string value formats instead of throwing on `.trim()`.
  const trimmed = (typeof value === 'string' ? value : value == null ? '' : String(value)).trim()

  if (trimmed.length === 0) {
    return fallback
  }

  // n8n data-table rows sometimes carry a numeric epoch (seconds or
  // milliseconds) rather than an ISO string; Date.parse rejects those, so
  // handle an all-digits value explicitly before falling back to Date.parse.
  // Require a realistic epoch length (>= 10 digits: 10 = seconds, more = ms) so
  // a short all-digit string — a bare year like "2026" — is NOT read as an
  // epoch (which rendered it as a 1970 date) and instead passes through as-is.
  const isAllDigits = /^\d+$/.test(trimmed)
  const epochTimestamp = isAllDigits
    ? (trimmed.length >= 10 ? Number(trimmed) * (trimmed.length <= 10 ? 1000 : 1) : Number.NaN)
    : Date.parse(trimmed)

  if (Number.isNaN(epochTimestamp)) {
    return trimmed
  }

  const timestamp = epochTimestamp

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(timestamp)
}
