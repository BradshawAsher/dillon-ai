import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import DataSourceToggle from './lib/DataSourceToggle'
import './tailwind.css'
import './orgTheme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DataSourceToggle />
  </StrictMode>
)
