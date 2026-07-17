export function formatEasternTime(value: string, fallback = 'Pending') {
  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return fallback
  }

  const timestamp = Date.parse(trimmed)

  if (Number.isNaN(timestamp)) {
    return trimmed
  }

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
