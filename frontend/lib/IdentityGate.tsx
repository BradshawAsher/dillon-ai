import { useState } from 'react'

import { getDataSource } from './dataSource'
import { getIdentity, setIdentity, type AnalystIdentity } from './identity'
import { Button } from './shadcn/button'
import { Input } from './shadcn/input'
import { Label } from './shadcn/label'

// In live mode, block the app until the analyst says who they are — their
// name/email is stamped on every n8n submission, the role Retool's login
// used to play. Mock mode never asks.
export default function IdentityGate() {
  const [identity, setIdentityState] = useState<AnalystIdentity | null>(() => getIdentity())
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(() => getIdentity()?.name ?? '')
  const [email, setEmail] = useState(() => getIdentity()?.email ?? '')

  if (getDataSource() !== 'live') {
    return null
  }

  if (identity && !editing) {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-3 pr-1 shadow-retool-md">
        <span className="text-xs text-muted-foreground">
          Submitting as <span className="font-medium text-foreground">{identity.name}</span>
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Change
        </button>
      </div>
    )
  }

  const trimmedName = name.trim()
  const trimmedEmail = email.trim()
  const canSave = trimmedName.length > 0 && /^\S+@\S+\.\S+$/.test(trimmedEmail)

  const save = () => {
    if (!canSave) {
      return
    }
    const next = { name: trimmedName, email: trimmedEmail }
    setIdentity(next)
    setIdentityState(next)
    setEditing(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-retool-lg">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Who&apos;s working?</h2>
          <p className="text-sm text-muted-foreground">
            Live mode stamps your name and email on every submission sent to n8n.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="analyst-name">Name</Label>
          <Input
            id="analyst-name"
            value={name}
            placeholder="Jordan Analyst"
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="analyst-email">Email</Label>
          <Input
            id="analyst-email"
            type="email"
            value={email}
            placeholder="jordan@example.com"
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                save()
              }
            }}
          />
        </div>
        <Button className="w-full" disabled={!canSave} onClick={save}>
          Continue
        </Button>
      </div>
    </div>
  )
}
