import { useState, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import DueDiligenceDashboard from './pages/DueDiligenceDashboard'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import { parseUrlDeepLinkState } from './utils/deepLinking'
import { initAuthListener, getLocalAppAuth, type AppAuthUser } from './services/supabaseAuth'
import {
  claimClientAlertCooldown,
  isClientSlackAlertEnabled,
  sendVisitorTrafficSlackAlert,
  VISITOR_ALERT_COOLDOWN_MS,
} from './services/slackAlertService'

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppAuthUser | null>(getLocalAppAuth)
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>(() => {
    if (typeof window !== 'undefined') {
      const parsed = parseUrlDeepLinkState(window.location.search, window.location.hash)
      if (parsed.view === 'login') {
        return 'login'
      }
      if (parsed.view === 'dashboard') {
        return 'dashboard'
      }
    }
    return 'landing'
  })

  useEffect(() => {
    // 1. Initialize Supabase Auth state listener
    const unsubscribe = initAuthListener((user) => {
      setCurrentUser(user)
      if (user && typeof window !== 'undefined') {
        const isOAuthCallback = window.location.search.includes('code=') || 
                                window.location.hash.includes('access_token=') ||
                                window.location.search.includes('token_hash=')
        const parsed = parseUrlDeepLinkState(window.location.search, window.location.hash)
        if (isOAuthCallback || parsed.view === 'dashboard' || parsed.view === 'login') {
          setView('dashboard')
        }
      }
    })

    // 2. Anonymous traffic alerts are intentionally opt-in. When enabled,
    // report a browser at most once per week instead of once per tab/session.
    if (typeof window !== 'undefined' && isClientSlackAlertEnabled('VITE_ENABLE_VISITOR_SLACK_ALERTS')) {
      const visitorKey = 'mergeworks.visitorTrafficAlertReportedAt'
      if (claimClientAlertCooldown(localStorage, visitorKey, VISITOR_ALERT_COOLDOWN_MS)) {
        const urlParams = new URLSearchParams(window.location.search)
        sendVisitorTrafficSlackAlert({
          path: window.location.pathname + window.location.search,
          referrer: document.referrer || 'Direct Visit / Bookmark',
          userAgent: navigator.userAgent,
          screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
          utmSource: urlParams.get('utm_source') || urlParams.get('ref') || urlParams.get('source') || undefined,
        }).catch(() => {})
      }
    }

    // 3. Browser history popstate navigation
    if (typeof window !== 'undefined') {
      const handlePopState = () => {
        const parsed = parseUrlDeepLinkState(window.location.search, window.location.hash)
        if (parsed.view === 'login') {
          setView('login')
        } else if (parsed.view === 'dashboard') {
          setView('dashboard')
        } else {
          setView('landing')
        }
      }
      window.addEventListener('popstate', handlePopState)
      return () => {
        unsubscribe?.()
        window.removeEventListener('popstate', handlePopState)
      }
    }

    return () => {
      unsubscribe?.()
    }
  }, [])

  const handleLaunchDashboard = () => {
    setView('dashboard')
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?view=dashboard#upload-section')
      setTimeout(() => {
        const el = document.querySelector('[data-project-intake]') || document.getElementById('upload-section')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const handleGoToLogin = () => {
    setView('login')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      window.history.pushState({}, '', '?view=login')
    }
  }

  const handleLoginSuccess = (user: AppAuthUser) => {
    setCurrentUser(user)
    setView('dashboard')
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?view=dashboard#upload-section')
      setTimeout(() => {
        const el = document.querySelector('[data-project-intake]') || document.getElementById('upload-section')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 100)
    }
  }

  const handleReturnToLanding = () => {
    setView('landing')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
      window.history.pushState({}, '', window.location.pathname)
    }
  }

  return (
    <ErrorBoundary label="app">
      {view === 'landing' && (
        <LandingPage
          onLaunchDashboard={handleLaunchDashboard}
          onGoToLogin={handleGoToLogin}
          currentUser={currentUser}
          onSignOut={() => setCurrentUser(null)}
        />
      )}
      {view === 'login' && (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onLaunchDashboardDirectly={handleLaunchDashboard}
          onReturnToLanding={handleReturnToLanding}
          currentUser={currentUser}
        />
      )}
      {view === 'dashboard' && (
        <DueDiligenceDashboard
          onReturnToLanding={handleReturnToLanding}
        />
      )}
    </ErrorBoundary>
  )
}
