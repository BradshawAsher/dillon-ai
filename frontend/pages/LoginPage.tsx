import React, { useState } from 'react'
import {
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Lock,
    Mail,
    Shield,
    Sparkles,
    User,
    Users,
    Building2,
    AlertCircle,
    Loader2,
} from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'
import {
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signInWithGithub,
    signInWithMicrosoft,
    initAuthListener,
    getLocalAppAuth,
    signOutUser,
    type AppAuthUser,
} from '../services/supabaseAuth'

interface LoginPageProps {
    onLoginSuccess: (user: AppAuthUser) => void
    onLaunchDashboardDirectly: () => void
    onReturnToLanding: () => void
    initialMode?: 'signin' | 'signup'
    currentUser?: AppAuthUser | null
}

export default function LoginPage({
    onLoginSuccess,
    onLaunchDashboardDirectly,
    onReturnToLanding,
    initialMode = 'signin',
    currentUser: propUser,
}: LoginPageProps) {
    const [activeUser, setActiveUser] = useState<AppAuthUser | null>(() => propUser || getLocalAppAuth())
    const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)

    React.useEffect(() => {
        if (propUser) {
            setActiveUser(propUser)
        }
        const unsubscribe = initAuthListener((user) => {
            setActiveUser(user)
        })
        return () => {
            unsubscribe?.()
        }
    }, [propUser])
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [team, setTeam] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [socialLoading, setSocialLoading] = useState<'google' | 'github' | 'microsoft' | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)
        setSuccessMessage(null)

        if (!email.trim() || !password) {
            setErrorMessage('Please provide both your email and password.')
            return
        }

        if (mode === 'signup' && !fullName.trim()) {
            setErrorMessage('Please enter your full name.')
            return
        }

        setIsLoading(true)

        try {
            if (mode === 'signup') {
                const res = await signUpWithPassword(email, password, fullName, team.trim() || undefined)
                if (!res.success) {
                    setErrorMessage(res.error || 'Unable to create account. Please check your details.')
                } else {
                    if (res.user) {
                        onLoginSuccess(res.user)
                    }
                }
            } else {
                const res = await signInWithPassword(email, password)
                if (!res.success) {
                    setErrorMessage(res.error || 'Invalid email or password. Please try again.')
                } else {
                    if (res.user) {
                        onLoginSuccess(res.user)
                    }
                }
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'An unexpected authentication error occurred.')
        } finally {
            setIsLoading(false)
        }
    }

    const handleGoogleAuth = async () => {
        setErrorMessage(null)
        setSocialLoading('google')
        try {
            const res = await signInWithGoogle()
            if (!res.success) {
                setErrorMessage(res.error || 'Google authentication failed.')
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to initialize Google Sign In.')
        } finally {
            setSocialLoading(null)
        }
    }

    const handleGithubAuth = async () => {
        setErrorMessage(null)
        setSocialLoading('github')
        try {
            const res = await signInWithGithub()
            if (!res.success) {
                setErrorMessage(res.error || 'GitHub authentication failed.')
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to initialize GitHub Sign In.')
        } finally {
            setSocialLoading(null)
        }
    }

    const handleMicrosoftAuth = async () => {
        setErrorMessage(null)
        setSocialLoading('microsoft')
        try {
            const res = await signInWithMicrosoft()
            if (!res.success) {
                setErrorMessage(res.error || 'Microsoft authentication failed.')
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Failed to initialize Microsoft Sign In.')
        } finally {
            setSocialLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20">
            {/* Top Navigation */}
            <header className="border-b border-border/40 bg-background/95 backdrop-blur px-4 sm:px-8 py-4 flex items-center justify-between">
                <button
                    type="button"
                    onClick={onReturnToLanding}
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Home</span>
                </button>

                <div className="flex items-center gap-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onLaunchDashboardDirectly}
                        className="text-xs font-semibold gap-1.5 text-primary hover:bg-primary/10"
                    >
                        <span>Try Guest Demo</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </header>

            {/* Main Auth Container */}
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
                <div className="w-full max-w-md space-y-6">
                    {activeUser ? (
                        <div className="rounded-2xl border border-primary/30 bg-card p-6 sm:p-8 shadow-xl space-y-6 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary text-2xl font-black">
                                {activeUser.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black text-foreground">Welcome back, {activeUser.name}</h1>
                                <p className="text-xs text-muted-foreground">{activeUser.email}</p>
                                <div className="mt-2.5 flex items-center justify-center gap-2">
                                    <Badge variant={activeUser.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                        {activeUser.role === 'admin' ? 'Admin' : 'Member'}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground font-medium">{activeUser.team || 'External Member'}</span>
                                </div>
                            </div>

                            <div className="space-y-2.5 pt-3">
                                <Button
                                    type="button"
                                    className="w-full font-bold text-white bg-gradient-to-r from-primary to-indigo-600 h-11 text-sm shadow-md"
                                    onClick={() => onLoginSuccess(activeUser)}
                                >
                                    <span>Continue to Workspace Dashboard</span>
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full text-xs h-9"
                                    onClick={async () => {
                                        await signOutUser()
                                        setActiveUser(null)
                                    }}
                                >
                                    Sign Out / Switch Account
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Header Brand */}
                            <div className="text-center space-y-2">
                                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary mb-1">
                                    <Shield className="h-6 w-6" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                                    {mode === 'signin' ? 'Welcome back' : 'Create your workspace account'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {mode === 'signin'
                                        ? 'Sign in to access your private deal packets and synthesis models'
                                        : 'Start analyzing M&A deals with autonomous AI diligence'}
                                </p>
                            </div>

                            {/* Auth Card */}
                            <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl space-y-6">

                        {/* Social Sign-In Buttons */}
                        <div className="space-y-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 justify-center gap-3 font-semibold border-border/80 hover:bg-muted/80 relative"
                                onClick={handleGoogleAuth}
                                disabled={!!socialLoading || isLoading}
                            >
                                {socialLoading === 'google' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                                className="w-full h-11 justify-center gap-3 font-semibold border-border/80 hover:bg-muted/80"
                                onClick={handleGithubAuth}
                                disabled={!!socialLoading || isLoading}
                            >
                                {socialLoading === 'github' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                                    </svg>
                                )}
                                <span>Continue with GitHub</span>
                            </Button>

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 justify-center gap-3 font-semibold border-border/80 hover:bg-muted/80"
                                onClick={handleMicrosoftAuth}
                                disabled={!!socialLoading || isLoading}
                            >
                                {socialLoading === 'microsoft' ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <svg className="h-4 w-4" viewBox="0 0 21 21">
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
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border/60" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-card px-3 text-muted-foreground font-semibold">
                                    Or continue with email
                                </span>
                            </div>
                        </div>

                        {/* Tab Toggle */}
                        <div className="flex rounded-lg bg-muted p-1 border border-border/40">
                            <button
                                type="button"
                                onClick={() => {
                                    setMode('signin')
                                    setErrorMessage(null)
                                }}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                    mode === 'signin'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
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
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                                    mode === 'signup'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Create Account
                            </button>
                        </div>

                        {/* Error Alert */}
                        {errorMessage && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <div className="leading-relaxed">{errorMessage}</div>
                            </div>
                        )}

                        {/* Success Alert */}
                        {successMessage && (
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                                <div className="leading-relaxed">{successMessage}</div>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {mode === 'signup' && (
                                <div>
                                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="e.g. Sarah Jenkins"
                                            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                            required={mode === 'signup'}
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Work Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@firm.com"
                                        className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-foreground mb-1.5">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        required
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            {mode === 'signup' && (
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="block text-xs font-semibold text-foreground">
                                            Custom Team / Firm Name <span className="font-normal text-muted-foreground">(Optional)</span>
                                        </label>
                                        <span className="text-[10px] text-muted-foreground">Default: External Member</span>
                                    </div>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        <input
                                            type="text"
                                            value={team}
                                            onChange={(e) => setTeam(e.target.value)}
                                            placeholder="e.g. Acme Capital, Blue Ridge Search Fund"
                                            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Leave blank to join as <span className="font-medium text-foreground">External Member</span>. You can create or manage custom teams in Workspace Settings.
                                    </p>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-11 font-bold bg-primary text-primary-foreground hover:bg-primary/90 mt-2 gap-2 shadow-md"
                                disabled={isLoading || !!socialLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{mode === 'signup' ? 'Create Account' : 'Sign In to Workspace'}</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* Bottom Guest Mode Card */}
                    <div className="rounded-xl border border-border/50 bg-muted/40 p-4 text-center space-y-2">
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>Want to test Dillon AI with sample deals first?</span>
                        </div>
                        <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={onLaunchDashboardDirectly}
                            className="text-xs font-bold text-primary p-0 h-auto hover:underline"
                        >
                            Launch Interactive App Dashboard as Guest &rarr;
                        </Button>
                    </div>
                </>
            )}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/40 py-4 px-6 text-center text-xs text-muted-foreground">
                <div className="flex items-center justify-center gap-4">
                    <span>Mergeworks Autonomous M&amp;A Diligence</span>
                    <span>•</span>
                    <span>100% Citation Guarantee</span>
                    <span>•</span>
                    <span>SOC 2 Compliant Ready</span>
                </div>
            </footer>
        </div>
    )
}
