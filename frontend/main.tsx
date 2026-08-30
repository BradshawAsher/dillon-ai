import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'

import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App'
import DataSourceToggle from './lib/DataSourceToggle'
import { initTheme } from './lib/darkMode'
import { queryClient } from './lib/queryClient'
import './tailwind.css'
import './orgTheme.css'

initTheme()

// Automatically reload page if Vite fails to fetch a stale dynamic chunk after a new deployment (debounced)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    const lastReload = Number(sessionStorage.getItem('mcp_last_preload_reload') || 0)
    if (Date.now() - lastReload > 20_000) {
      sessionStorage.setItem('mcp_last_preload_reload', String(Date.now()))
      console.warn('Vite preload error detected, reloading page for latest deployment...', event)
      window.location.reload()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <DataSourceToggle />
      <SpeedInsights />
    </QueryClientProvider>
  </StrictMode>
)

