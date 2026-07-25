import { useCallback, useState } from 'react'
import { Lock, LogIn, User } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'

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

type Props = {
    children: React.ReactNode
}

export default function AuthGate({ children }: Props) {
    const [user, setUser] = useState<AuthUser | null>(getStoredAuth)
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [team, setTeam] = useState('Pod 1')

    const handleLogin = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim() || !name.trim()) return
        const newUser: AuthUser = { email: email.trim(), name: name.trim(), team }
        saveAuth(newUser)
        setUser(newUser)
    }, [email, name, team])

    if (user) {
        return <>{children}</>
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Lock className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">MergeWorks</CardTitle>
                    <CardDescription>Sign in to access the Due Diligence Dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium text-foreground">
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
                            <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium text-foreground">
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
                            <label htmlFor="auth-team" className="mb-1.5 block text-sm font-medium text-foreground">
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
                        <Button type="submit" className="w-full" size="lg">
                            Sign in
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            This is a team-internal prototype. No password required during development.
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
