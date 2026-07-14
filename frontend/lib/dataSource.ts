// Runtime switch between mock data and the live n8n connection for local dev.
// The choice persists in localStorage; VITE_USE_MOCKS only sets the default.
// Switching reloads the page so every hook re-initializes against the new source.
export type DataSource = 'live' | 'mock'

const STORAGE_KEY = 'dueDiligenceDashboard.dataSource'

export function getDataSource(): DataSource {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'mock' || stored === 'live') {
      return stored
    }
  } catch {
    // localStorage unavailable (private mode etc.) — fall through to default
  }

  return import.meta.env.VITE_USE_MOCKS === 'true' ? 'mock' : 'live'
}

export function setDataSource(source: DataSource) {
  try {
    window.localStorage.setItem(STORAGE_KEY, source)
  } catch {
    // best effort; the reload below still applies the default
  }

  window.location.reload()
}
