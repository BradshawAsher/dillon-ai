import { useCallback, useState } from 'react'
import { LogIn, Shield, User } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'

type AuthUser = {
    email: string
    name: string
    team: string
    role?: 'admin' | 'tester'
}

const STORAGE_KEY = 'mergeworks.auth'
const ISOLATION_KEY = 'mergeworks.dataIsolation'

const ADMIN_EMAILS = ['bradshaw@mergeworks.io', 'brad@mergeworks.io', 'srijan@mergeworks.io', 'admin@mergeworks.io']

export function getStoredAuth(): AuthUser | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        const user = JSON.parse(raw) as AuthUser
        if (!user.role) {
            user.role = ADMIN_EMAILS.includes(user.email.toLowerCase()) ? 'admin' : 'tester'
        }
        return user
    } catch {
        return null
    }
}

export function isAdmin(): boolean {
    const user = getStoredAuth()
    return user?.role === 'admin' || !user
}

export function isDataIsolationEnabled(): boolean {
    return localStorage.getItem(ISOLATION_KEY) === 'true'
}

export function setDataIsolation(enabled: boolean) {
    localStorage.setItem(ISOLATION_KEY, enabled ? 'true' : 'false')
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
    const [isolation, setIsolation] = useState(isDataIsolationEnabled)

    const handleLogin = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !name.trim()) return
        const role = ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? 'admin' as const : 'tester' as const
        const newUser: AuthUser = { email: email.trim(), name: name.trim(), team, role }
        saveAuth(newUser)
        setAuthUser(newUser)
        setShowDialog(false)
    }, [email, name, team])

    const handleSignOut = useCallback(() => {
        clearAuth()
        setAuthUser(null)
    }, [])

    const toggleIsolation = useCallback(() => {
        const next = !isolation
        setDataIsolation(next)
        setIsolation(next)
        window.location.reload()
    }, [isolation])

    if (authUser) {
        return (
            <div className="flex items-center gap-2">
                {authUser.role === 'admin' && (
                    <button
                        onClick={toggleIsolation}
                        className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${isolation ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                        title={isolation ? 'Data isolation ON — testers only see their own data' : 'Data isolation OFF — everyone sees all data'}
                    >
                        <Shield className="h-3 w-3" />
                        {isolation ? 'Isolation ON' : 'Isolation OFF'}
                    </button>
                )}
                <Badge variant={authUser.role === 'admin' ? 'default' : 'secondary'} className="text-[10px]">
                    {authUser.role === 'admin' ? 'Admin' : 'Tester'}
                </Badge>
                <Button type="button" variant="ghost" className="gap-2 px-4 py-2 text-sm" onClick={handleSignOut}>
                    {authUser.name} · Sign out
                </Button>
            </div>
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
