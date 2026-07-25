import { useCallback, useState } from 'react'
import { LogIn, User } from 'lucide-react'

import { Button } from '../lib/shadcn/button'

type AuthUser = {
    email: string
    name: string
    team: string
}

const STORAGE_KEY = 'mergeworks.auth'

export function getStoredAuth(): AuthUser | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return JSON.parse(raw) as AuthUser
    } catch {
        return null
    }
}

export function clearAuth() {
    localStorage.removeItem(STORAGE_KEY)
}

function saveAuth(user: AuthUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export default function LoginButton() {
    const [authUser, setAuthUser] = useState<AuthUser | null>(getStoredAuth)
    const [showDialog, setShowDialog] = useState(false)
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [team, setTeam] = useState('Pod 1')

    const handleLogin = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !name.trim()) return
        const newUser: AuthUser = { email: email.trim(), name: name.trim(), team }
        saveAuth(newUser)
        setAuthUser(newUser)
        setShowDialog(false)
    }, [email, name, team])

    const handleSignOut = useCallback(() => {
        clearAuth()
        setAuthUser(null)
    }, [])

    if (authUser) {
        return (
            <Button type="button" variant="ghost" className="gap-2 px-4 py-2 text-sm" onClick={handleSignOut}>
                {authUser.name} ({authUser.team}) · Sign out
            </Button>
        )
    }

    return (
        <>
            <Button type="button" variant="outline" className="gap-2 px-4 py-2 text-sm" onClick={() => setShowDialog(true)}>
                <LogIn className="h-4 w-4" />
                Sign in
            </Button>

            {showDialog && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowDialog(false)} />
                    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-popover p-6 shadow-xl">
                        <h2 className="text-lg font-semibold text-foreground">Sign in to MergeWorks</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Optional — sign in to personalize your experience.</p>
                        <form onSubmit={handleLogin} className="mt-4 space-y-3">
                            <div>
                                <label htmlFor="auth-name" className="mb-1 block text-xs font-medium text-foreground">
                                    Full name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        id="auth-name"
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Your name"
                                        className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="auth-email" className="mb-1 block text-xs font-medium text-foreground">
                                    Email
                                </label>
                                <div className="relative">
                                    <LogIn className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        id="auth-email"
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        className="w-full rounded-md border border-border bg-background py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="auth-team" className="mb-1 block text-xs font-medium text-foreground">
                                    Team
                                </label>
                                <select
                                    id="auth-team"
                                    value={team}
                                    onChange={e => setTeam(e.target.value)}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="Pod 1">Pod 1</option>
                                    <option value="Pod 2">Pod 2</option>
                                    <option value="Pod 3">Pod 3</option>
                                    <option value="Pod 4">Pod 4</option>
                                    <option value="Advisor">Advisor</option>
                                </select>
                            </div>
                            <div className="flex gap-2 pt-1">
                                <Button type="submit" className="flex-1">
                                    Sign in
                                </Button>
                                <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>
                                    Cancel
                                </Button>
                            </div>
                            <p className="text-center text-[10px] text-muted-foreground">
                                No password required during development. This will be replaced with real auth.
                            </p>
                        </form>
                    </div>
                </>
            )}
        </>
    )
}
