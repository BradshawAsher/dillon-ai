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
  const triggerDebouncedDeploymentReload = (reason: string) => {
    const lastReload = Number(sessionStorage.getItem('mcp_last_preload_reload') || 0)
    if (Date.now() - lastReload > 15_000) {
      sessionStorage.setItem('mcp_last_preload_reload', String(Date.now()))
      console.warn(`Stale deployment chunk/module error (${reason}), reloading page for latest build...`)
      window.location.reload()
    }
  }

  window.addEventListener('vite:preloadError', () => {
    triggerDebouncedDeploymentReload('vite:preloadError')
  })

  // Catch script loading failures & MIME type mismatch errors on dynamic imports
  window.addEventListener(
    'error',
    (event) => {
      const errorMsg = String(event?.message || (event as any)?.error?.message || '')
      const target = event?.target as HTMLElement | null
      if (
        errorMsg.includes('Failed to load module script') ||
        errorMsg.includes('MIME type') ||
        errorMsg.includes('text/html') ||
        target?.tagName === 'SCRIPT'
      ) {
        triggerDebouncedDeploymentReload('script:moduleError')
      }
    },
    true
  )

  window.addEventListener('unhandledrejection', (event) => {
    const reason = String(event?.reason?.message || event?.reason || '')
    if (
      reason.includes('Failed to fetch dynamically imported module') ||
      reason.includes('Importing a module script failed') ||
      reason.includes('error loading dynamically imported module')
    ) {
      triggerDebouncedDeploymentReload('unhandledrejection:dynamicImport')
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <DataSourceToggle />
      <SpeedInsights sampleRate={0.25} />
    </QueryClientProvider>
  </StrictMode>
)
