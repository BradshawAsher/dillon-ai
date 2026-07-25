import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import DataSourceToggle from './lib/DataSourceToggle'
import { initTheme } from './lib/darkMode'
import './tailwind.css'
import './orgTheme.css'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DataSourceToggle />
  </StrictMode>
)
