export function formatEasternTime(value: string, fallback = 'Pending') {
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return fallback
  }

  // n8n data-table rows sometimes carry a numeric epoch (seconds or
  // milliseconds) rather than an ISO string; Date.parse rejects those, so
  // handle an all-digits value explicitly before falling back to Date.parse.
  const epochTimestamp = /^\d+$/.test(trimmed)
    ? Number(trimmed) * (trimmed.length <= 10 ? 1000 : 1)
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
