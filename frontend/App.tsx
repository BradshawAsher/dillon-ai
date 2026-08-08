import { useState, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import DueDiligenceDashboard from './pages/DueDiligenceDashboard'
import LandingPage from './pages/LandingPage'

export default function App() {
  const [view, setView] = useState<'landing' | 'dashboard'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('view') === 'dashboard' || params.get('app') === 'true') {
        return 'dashboard'
      }
    }
    return 'landing'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('view') === 'dashboard' || params.get('app') === 'true') {
          setView('dashboard')
        } else {
          setView('landing')
        }
      }
      window.addEventListener('popstate', handlePopState)
      return () => window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const handleLaunchDashboard = () => {
    setView('dashboard')
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?view=dashboard')
    }
  }

  const handleReturnToLanding = () => {
    setView('landing')
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname)
    }
  }

  return (
    <ErrorBoundary label="app">
      {view === 'landing' ? (
        <LandingPage onLaunchDashboard={handleLaunchDashboard} />
      ) : (
        <DueDiligenceDashboard onReturnToLanding={handleReturnToLanding} />
      )}
    </ErrorBoundary>
  )
}
