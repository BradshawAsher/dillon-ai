import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import DataSourceToggle from './lib/DataSourceToggle'
import { initTheme } from './lib/darkMode'
import './tailwind.css'
import './orgTheme.css'

initTheme()

// Automatically reload page if Vite fails to fetch a stale dynamic chunk after a new deployment
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('Vite preload error detected, reloading page for latest deployment...', event)
    window.location.reload()
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DataSourceToggle />
  </StrictMode>
)
