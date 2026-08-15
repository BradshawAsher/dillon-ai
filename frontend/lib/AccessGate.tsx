import { useEffect, useState } from 'react'

import { Button } from './shadcn/button'
import { Input } from './shadcn/input'
import { Label } from './shadcn/label'

// Shared-password gate. The standalone server (server.ts) reports via
// /api/session whether APP_PASSWORD is set; if so, this overlay blocks the app
// until /api/login succeeds and sets the session cookie. The Vite dev server
// has no /api/session route, so dev mode never shows the gate.
type GateState = 'checking' | 'locked' | 'open'

export default function AccessGate() {
  const [state, setState] = useState<GateState>('checking')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetch('/api/session')
      .then(async (response) => {
        if (!response.ok) {
          return { authRequired: false, authenticated: false }
        }
        return (await response.json()) as { authRequired: boolean; authenticated: boolean }
      })
      .catch(() => ({ authRequired: false, authenticated: false }))
      .then((session) => {
        if (!cancelled) {
          setState(session.authRequired && !session.authenticated ? 'locked' : 'open')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (state !== 'locked') {
    return null
  }

  const submit = async () => {
    if (password.length === 0 || submitting) {
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (response.ok) {
        // Reload so every query hook re-fires with the session cookie in place.
        window.location.reload()
        return
      }
      setError('Incorrect password')
    } catch {
      setError('Could not reach the server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-retool-lg">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Dillon AI Due Diligence Cockpit</h2>
          <p className="text-sm text-muted-foreground">Enter the team password to continue.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="app-password">Password</Label>
          <Input
            id="app-password"
            type="password"
            value={password}
            autoFocus
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void submit()
              }
            }}
          />
        </div>
        {error.length > 0 ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button className="w-full" disabled={password.length === 0 || submitting} onClick={() => void submit()}>
          {submitting ? 'Checking…' : 'Unlock'}
        </Button>
      </div>
    </div>
  )
}
