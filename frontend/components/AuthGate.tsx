import React, { useCallback, useEffect, useState } from 'react'
import { LogIn, Shield, User, Lock, Mail, Loader2, AlertCircle } from 'lucide-react'

import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'
import {
    getLocalAppAuth,
    saveAppAuth,
    signOutUser,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signInWithGithub,
    signInWithMicrosoft,
    initAuthListener,
    type AppAuthUser,
} from '../services/supabaseAuth'

export type AuthUser = AppAuthUser

const ISOLATION_KEY = 'mergeworks.dataIsolation'

export function getStoredAuth(): AuthUser | null {
    return getLocalAppAuth()
}

export function isAdmin(): boolean {
    const user = getStoredAuth()
    return user?.role === 'admin' || !user
}

export const DATA_ISOLATION_EVENT = 'mergeworks:data-isolation-change'

export function isDataIsolationEnabled(): boolean {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(ISOLATION_KEY) === 'true'
}

export function setDataIsolation(enabled: boolean) {
    if (typeof window === 'undefined') return
    localStorage.setItem(ISOLATION_KEY, enabled ? 'true' : 'false')
    window.dispatchEvent(new CustomEvent(DATA_ISOLATION_EVENT, { detail: { enabled } }))
}

export function clearAuth() {
    signOutUser()
}

export default function LoginButton({ onNavigateAccount }: { onNavigateAccount?: () => void } = {}) {
    const [authUser, setAuthUser] = useState<AuthUser | null>(getLocalAppAuth)
    const [showDialog, setShowDialog] = useState(false)
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [team, setTeam] = useState('Pod 1 (Acquisitions & Diligence)')
    const [isolation, setIsolation] = useState(isDataIsolationEnabled)
    const [loading, setLoading] = useState(false)
    const [socialLoading, setSocialLoading] = useState<'google' | 'github' | 'microsoft' | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        const unsubscribe = initAuthListener((user) => {
            setAuthUser(user)
        })

        const handleIsolationChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>
            if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
                setIsolation(customEvent.detail.enabled)
            } else {
                setIsolation(isDataIsolationEnabled())
            }
        }
        window.addEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
        return () => {
            unsubscribe?.()
            window.removeEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
        }
    }, [])

    const handleLogin = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setErrorMessage(null)
        if (!email.trim() || !password) {
            setErrorMessage('Email and password are required.')
            return
        }

        setLoading(true)
        try {
            if (mode === 'signup') {
                const res = await signUpWithPassword(email, password, name || email.split('@')[0], team)
                if (!res.success) {
                    setErrorMessage(res.error || 'Failed to create account.')
                } else {
                    if (res.user) setAuthUser(res.user)
                    setShowDialog(false)
                }
            } else {
                const res = await signInWithPassword(email, password)
                if (!res.success) {
                    setErrorMessage(res.error || 'Invalid email or password.')
                } else {
                    if (res.user) setAuthUser(res.user)
                    setShowDialog(false)
                }
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Authentication error.')
        } finally {
            setLoading(false)
        }
    }, [email, password, name, team, mode])

    const handleGoogle = useCallback(async () => {
        setSocialLoading('google')
        setErrorMessage(null)
        try {
            const res = await signInWithGoogle()
            if (!res.success) setErrorMessage(res.error || 'Google login failed')
        } catch (err: any) {
            setErrorMessage(err?.message || 'Google login failed')
        } finally {
            setSocialLoading(null)
        }
    }, [])

    const handleGithub = useCallback(async () => {
        setSocialLoading('github')
        setErrorMessage(null)
        try {
            const res = await signInWithGithub()
            if (!res.success) setErrorMessage(res.error || 'GitHub login failed')
        } catch (err: any) {
            setErrorMessage(err?.message || 'GitHub login failed')
        } finally {
            setSocialLoading(null)
        }
    }, [])

    const handleMicrosoft = useCallback(async () => {
        setSocialLoading('microsoft')
        setErrorMessage(null)
        try {
            const res = await signInWithMicrosoft()
            if (!res.success) setErrorMessage(res.error || 'Microsoft login failed')
        } catch (err: any) {
            setErrorMessage(err?.message || 'Microsoft login failed')
        } finally {
            setSocialLoading(null)
        }
    }, [])

    const handleSignOut = useCallback(async () => {
        await signOutUser()
        setAuthUser(null)
    }, [])

    const toggleIsolation = useCallback(() => {
        const next = !isolation
        setDataIsolation(next)
        setIsolation(next)
    }, [isolation])

    // Always-visible isolation toggle
    const isolationButton = (
        <button
            type="button"
            onClick={toggleIsolation}
            className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                isolation
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
                    : 'border-border text-muted-foreground hover:bg-muted'
            }`}
            title={
                isolation
                    ? 'Data isolation is ON — you only see your own projects. Click to show all projects.'
                    : 'Data isolation is OFF — all projects are visible.'
            }
        >
            <Shield className="h-3 w-3" />
            {isolation ? 'Private ON' : 'Pod View'}
        </button>
    )

    if (authUser) {
        return (
            <div className="flex items-center gap-2">
                {isolationButton}
                <button
                    type="button"
                    onClick={onNavigateAccount}
                    className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/60 hover:bg-muted/80 px-2.5 py-1.5 transition-colors cursor-pointer group"
                    title="Open Account & Settings"
                >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                        {authUser.name.charAt(0).toUpperCase()}
                    </div>
                    <Badge variant={authUser.role === 'admin' ? 'default' : 'secondary'} className="text-[9px] px-1.5 py-0">
                        {authUser.role === 'admin' ? 'Admin' : 'Member'}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {authUser.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground hidden lg:inline">
                        ({authUser.team || 'Pod 1'})
                    </span>
                </button>
                {onNavigateAccount && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
                        onClick={onNavigateAccount}
                        title="Open Account & Settings"
                    >
                        <User className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Account</span>
                    </Button>
                )}
                <Button type="button" variant="ghost" size="sm" className="px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={handleSignOut}>
                    Sign out
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            {isolationButton}
            <Button
                type="button"
                variant="outline"
                className="gap-2 px-4 py-2 text-sm font-semibold border-primary/30 text-primary hover:bg-primary/10 shadow-sm"
                onClick={() => setShowDialog(true)}
            >
                <LogIn className="h-4 w-4" />
                Sign in / Register
            </Button>

            {showDialog && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" onClick={() => setShowDialog(false)} />
                    <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-popover p-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-border/40">
                            <div>
                                <h2 className="text-base font-bold text-foreground">
                                    {mode === 'signin' ? 'Sign in to Dillon AI' : 'Create Workspace Account'}
                                </h2>
                                <p className="text-xs text-muted-foreground">Save your deals and team syntheses</p>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowDialog(false)} className="h-7 w-7 p-0 text-muted-foreground">
                                ✕
                            </Button>
                        </div>

                        {/* Maintenance Disclaimer */}
                        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />
                                <div className="space-y-0.5">
                                    <p className="font-semibold text-amber-200">SSO Maintenance Notice</p>
                                    <p className="text-amber-300/90 leading-tight">
                                        Single Sign-On is undergoing scheduled maintenance until <strong>August 27</strong>. Please use <strong>Email & Password</strong> or Demo Mode.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Social Sign-In */}
                        <div className="mt-4 space-y-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-9 justify-center gap-2 text-xs font-semibold"
                                onClick={handleGoogle}
                                disabled={!!socialLoading || loading}
                            >
                                {socialLoading === 'google' ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                        />
                                    </svg>
                                )}
                                <span>Continue with Google</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-9 justify-center gap-2 text-xs font-semibold"
                                onClick={handleGithub}
                                disabled={!!socialLoading || loading}
                            >
                                {socialLoading === 'github' ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                    </svg>
                                )}
                                <span>Continue with GitHub</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-9 justify-center gap-2 text-xs font-semibold"
                                onClick={handleMicrosoft}
                                disabled={!!socialLoading || loading}
                            >
                                {socialLoading === 'microsoft' ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 21 21">
                                        <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                                        <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                                        <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                                    </svg>
                                )}
                                <span>Continue with Microsoft</span>
                            </Button>
                        </div>

                        {/* Divider */}
                        <div className="relative my-3">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/60" />
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase">
                                <span className="bg-popover px-2 text-muted-foreground font-semibold">
                                    or continue with email
                                </span>
                            </div>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex rounded-md bg-muted p-1 border border-border/40 mb-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('signin')
                                    setErrorMessage(null)
                                }}
                                className={`flex-1 py-1 text-xs font-bold rounded-sm transition-all ${
                                    mode === 'signin' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                }`}
                            >
                                Sign In
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('signup')
                                    setErrorMessage(null)
                                }}
                                className={`flex-1 py-1 text-xs font-bold rounded-sm transition-all ${
                                    mode === 'signup' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                                }`}
                            >
                                Create Account
                            </button>
                        </div>

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-3">
                            {mode === 'signup' && (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-foreground">
                                        Full name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Your name"
                                            className="w-full rounded-md border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            required={mode === 'signup'}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block text-xs font-medium text-foreground">
                                    Work Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="you@firm.com"
                                        className="w-full rounded-md border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-medium text-foreground">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full rounded-md border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {mode === 'signup' && (
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-foreground">
                                        Team / Pod
                                    </label>
                                    <select
                                        value={team}
                                        onChange={e => setTeam(e.target.value)}
                                        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="Pod 1 (Acquisitions & Diligence)">Pod 1 (Acquisitions &amp; Diligence)</option>
                                        <option value="Pod 2 (Growth Equity)">Pod 2 (Growth Equity)</option>
                                        <option value="Pod 3 (Special Situations)">Pod 3 (Special Situations)</option>
                                        <option value="Independent Sponsor">Independent Sponsor</option>
                                        <option value="M&A Advisory">M&amp;A Advisory</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-2 pt-1">
                                <Button type="submit" className="flex-1 text-xs h-9" disabled={loading}>
                                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : mode === 'signin' ? 'Sign In' : 'Create Account'}
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => setShowDialog(false)} className="text-xs h-9">
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    )
}
