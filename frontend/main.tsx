import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App'
import AccessGate from './lib/AccessGate'
import DataSourceToggle from './lib/DataSourceToggle'
import IdentityGate from './lib/IdentityGate'
import './tailwind.css'
import './orgTheme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <DataSourceToggle />
    <IdentityGate />
    <AccessGate />
  </StrictMode>
)
