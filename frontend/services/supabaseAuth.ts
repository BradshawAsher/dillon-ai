import { createClient, type User, type Session } from '@supabase/supabase-js'
import {
    AUTH_ACTIVITY_ALERT_COOLDOWN_MS,
    claimClientAlertCooldown,
    isClientSlackAlertEnabled,
    NEW_ACCOUNT_ALERT_COOLDOWN_MS,
    sendNewAccountSlackAlert,
    sendSignInSlackAlert,
    sendSignOutSlackAlert,
} from './slackAlertService'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabaseAuthClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
})

export interface AppAuthUser {
    id?: string
    email: string
    name: string
    team: string
    role: 'admin' | 'tester'
    avatarUrl?: string
}

const STORAGE_KEY = 'mergeworks.auth'
const explicitSignupStartedAtByEmail = new Map<string, number>()

const ADMIN_EMAILS = [
    'bradshaw@mergeworks.io',
    'brad@mergeworks.io',
    'srijan@mergeworks.io',
    'admin@mergeworks.io',
    'info@mergeworks.org',
    'bradshin231@gmail.com',
    's-basher@outlook.com',
    'srijanchallapalli@gmail.com',
    'ykakarl1@umbc.edu',
    'basher2@uw.edu',
    'basher2@cs.washington.edu',
]

export function getDefaultTeamForEmail(email: string): string {
    const clean = (email || '').trim().toLowerCase()
    if (clean.endsWith('@mergeworks.io') || clean.endsWith('@mergeworks.org') || ADMIN_EMAILS.includes(clean)) {
        return 'Pod 1 (Internal)'
    }
    return 'External Member'
}

export function mapSupabaseUserToAppUser(user: User | null, customTeam?: string): AppAuthUser | null {
    if (!user || !user.email) return null
    const email = user.email.trim().toLowerCase()
    const metadata = user.user_metadata || {}
    const name = metadata.full_name || metadata.name || email.split('@')[0] || 'User'
    const defaultTeam = getDefaultTeamForEmail(email)
    let team = (customTeam && customTeam.trim()) || metadata.team || defaultTeam

    // Disallow external non-admin users from assigning themselves internal Pod 1
    if (team.toLowerCase().startsWith('pod 1') && defaultTeam === 'External Member') {
        team = 'External Member'
    }

    const role: 'admin' | 'tester' = ADMIN_EMAILS.includes(email) ? 'admin' : 'tester'

    return {
        id: user.id,
        email,
        name,
        team,
        role,
        avatarUrl: metadata.avatar_url || metadata.picture,
    }
}

export const AUTH_CHANGE_EVENT = 'mergeworks:auth-change'

export function saveAppAuth(user: AppAuthUser | null) {
    if (typeof window === 'undefined') return
    if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } else {
        localStorage.removeItem(STORAGE_KEY)
    }
    window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT, { detail: { user } }))
}

export function getLocalAppAuth(): AppAuthUser | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const user = JSON.parse(raw) as AppAuthUser
            if (!user.role) {
                user.role = ADMIN_EMAILS.includes((user.email || '').toLowerCase()) ? 'admin' : 'tester'
            }
            return user
        }

        // Synchronous fallback: inspect Supabase auth token if present in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const sbRaw = localStorage.getItem(key)
                if (sbRaw) {
                    const parsed = JSON.parse(sbRaw)
                    const userObj = parsed?.user || parsed?.currentSession?.user
                    if (userObj) {
                        const appUser = mapSupabaseUserToAppUser(userObj)
                        if (appUser) {
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser))
                            return appUser
                        }
                    }
                }
            }
        }
        return null
    } catch {
        return null
    }
}

export const getStoredUser = getLocalAppAuth

/**
 * Sign Up with Email and Password
 */
export async function signUpWithPassword(email: string, password: string, fullName: string, customTeam?: string) {
    const cleanEmail = email.trim().toLowerCase()
    explicitSignupStartedAtByEmail.set(cleanEmail, Date.now())
    const defaultTeam = getDefaultTeamForEmail(cleanEmail)
    let team = (customTeam && customTeam.trim()) ? customTeam.trim() : defaultTeam

    // Disallow external non-admin users from assigning themselves internal Pod 1
    if (team.toLowerCase().startsWith('pod 1') && defaultTeam === 'External Member') {
        team = 'External Member'
    }

    const { data, error } = await supabaseAuthClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
            data: {
                full_name: fullName.trim(),
                team,
            },
        },
    })

    if (error) {
        explicitSignupStartedAtByEmail.delete(cleanEmail)
        return { success: false, error: error.message, user: null }
    }

    const appUser = mapSupabaseUserToAppUser(data.user, team) || {
        id: data.user?.id,
        email: cleanEmail,
        name: fullName.trim() || cleanEmail.split('@')[0],
        team,
        role: ADMIN_EMAILS.includes(cleanEmail) ? 'admin' as const : 'tester' as const,
    }

    saveAppAuth(appUser)
    const newAccountAlertKey = `mergeworks.signupAlertSent.${data.user?.id || cleanEmail}`
    if (typeof window === 'undefined' || claimClientAlertCooldown(localStorage, newAccountAlertKey, NEW_ACCOUNT_ALERT_COOLDOWN_MS)) {
        sendNewAccountSlackAlert({
            fullName: appUser.name,
            email: appUser.email,
            team: appUser.team,
            authMethod: 'Email & Password',
        }).catch(() => {})
    }

    return { success: true, error: null, user: appUser, session: data.session }
}

/**
 * Sign In with Email and Password
 */
export async function signInWithPassword(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase()
    const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
    })

    if (error) {
        sendSignInSlackAlert({
            fullName: cleanEmail.split('@')[0] || 'User',
            email: cleanEmail,
            authMethod: 'Email & Password',
            status: 'Failed',
            errorMessage: error.message,
        }).catch(() => {})
        return { success: false, error: error.message, user: null }
    }

    const appUser = mapSupabaseUserToAppUser(data.user)
    if (appUser) {
        saveAppAuth(appUser)
    }

    return { success: true, error: null, user: appUser, session: data.session }
}

/**
 * Sign In with Google OAuth
 */
export async function signInWithGoogle() {
    try {
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}?view=dashboard` : undefined
        const { data, error } = await supabaseAuthClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
            },
        })

        if (error) {
            const msg = error.message?.toLowerCase() || ''
            const errorMsg = (msg.includes('not enabled') || msg.includes('validation_failed') || (error as any).status === 400)
                ? 'Google OAuth is not enabled in your Supabase project dashboard (Auth -> Providers -> Google). Please sign in with Email & Password or configure Google credentials.'
                : error.message

            sendSignInSlackAlert({
                fullName: 'Google OAuth User',
                email: 'oauth-initiation@google.com',
                authMethod: 'Google OAuth',
                status: 'Failed',
                errorMessage: errorMsg,
            }).catch(() => {})

            return { success: false, error: errorMsg }
        }

        return { success: true, url: data.url }
    } catch (err: any) {
        const errorMsg = err?.message || 'Google authentication error'
        sendSignInSlackAlert({
            fullName: 'Google OAuth User',
            email: 'oauth-initiation@google.com',
            authMethod: 'Google OAuth',
            status: 'Failed',
            errorMessage: errorMsg,
        }).catch(() => {})
        return { success: false, error: errorMsg }
    }
}

/**
 * Sign In with GitHub OAuth
 */
export async function signInWithGithub() {
    try {
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}?view=dashboard` : undefined
        const { data, error } = await supabaseAuthClient.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: redirectUrl,
            },
        })

        if (error) {
            const msg = error.message?.toLowerCase() || ''
            const errorMsg = (msg.includes('not enabled') || msg.includes('validation_failed') || (error as any).status === 400)
                ? 'GitHub OAuth is not enabled in your Supabase project dashboard (Auth -> Providers -> GitHub). Please sign in with Email & Password or configure GitHub credentials.'
                : error.message

            sendSignInSlackAlert({
                fullName: 'GitHub OAuth User',
                email: 'oauth-initiation@github.com',
                authMethod: 'GitHub OAuth',
                status: 'Failed',
                errorMessage: errorMsg,
            }).catch(() => {})

            return { success: false, error: errorMsg }
        }

        return { success: true, url: data.url }
    } catch (err: any) {
        const errorMsg = err?.message || 'GitHub authentication error'
        sendSignInSlackAlert({
            fullName: 'GitHub OAuth User',
            email: 'oauth-initiation@github.com',
            authMethod: 'GitHub OAuth',
            status: 'Failed',
            errorMessage: errorMsg,
        }).catch(() => {})
        return { success: false, error: errorMsg }
    }
}

/**
 * Sign In with Microsoft (Azure) OAuth
 */
export async function signInWithMicrosoft() {
    try {
        const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}?view=dashboard` : undefined
        const { data, error } = await supabaseAuthClient.auth.signInWithOAuth({
            provider: 'azure',
            options: {
                scopes: 'email profile openid',
                redirectTo: redirectUrl,
            },
        })

        if (error) {
            const msg = error.message?.toLowerCase() || ''
            const errorMsg = (msg.includes('not enabled') || msg.includes('validation_failed') || (error as any).status === 400)
                ? 'Microsoft (Azure) OAuth is not enabled in your Supabase project dashboard (Auth -> Providers -> Azure). Please configure your Azure Client ID & Secret or sign in with Email & Password.'
                : error.message

            sendSignInSlackAlert({
                fullName: 'Microsoft OAuth User',
                email: 'oauth-initiation@microsoft.com',
                authMethod: 'Microsoft Azure AD',
                status: 'Failed',
                errorMessage: errorMsg,
            }).catch(() => {})

            return { success: false, error: errorMsg }
        }

        return { success: true, url: data.url }
    } catch (err: any) {
        const errorMsg = err?.message || 'Microsoft authentication error'
        sendSignInSlackAlert({
            fullName: 'Microsoft OAuth User',
            email: 'oauth-initiation@microsoft.com',
            authMethod: 'Microsoft Azure AD',
            status: 'Failed',
            errorMessage: errorMsg,
        }).catch(() => {})
        return { success: false, error: errorMsg }
    }
}

/**
 * Sign Out (Instant local clear + background remote signout)
 */
export async function signOutUser() {
    const currentUser = getLocalAppAuth()
    if (currentUser && isClientSlackAlertEnabled('VITE_ENABLE_AUTH_ACTIVITY_SLACK_ALERTS')) {
        console.info(`[Auth] Dispatching Sign-Out Slack notification for ${currentUser.email}`)
        sendSignOutSlackAlert({
            fullName: currentUser.name,
            email: currentUser.email,
            team: currentUser.team,
            role: currentUser.role,
        }).catch((err) => console.warn('[Auth] Failed to send sign-out alert:', err))
    }
    saveAppAuth(null)
    if (typeof window !== 'undefined') {
        try {
            sessionStorage.clear()
        } catch {}
    }
    try {
        await supabaseAuthClient.auth.signOut().catch(() => {})
    } catch {
        // ignore network error on signout
    }
}

/**
 * Initialize and listen to Auth Changes
 */
export function initAuthListener(onUserChange: (user: AppAuthUser | null) => void) {
    // 1. Initial check (synchronous local read)
    const initial = getLocalAppAuth()
    if (initial) {
        onUserChange(initial)
    }

    // 2. Initial remote session check
    supabaseAuthClient.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            const appUser = mapSupabaseUserToAppUser(session.user)
            if (appUser) {
                saveAppAuth(appUser)
                onUserChange(appUser)
                return
            }
        }
    }).catch(() => {})

    // 3. Listen to instant custom app event
    const handleCustomChange = (e: Event) => {
        const ce = e as CustomEvent<{ user: AppAuthUser | null }>
        if (ce.detail !== undefined) {
            onUserChange(ce.detail.user)
        }
    }
    if (typeof window !== 'undefined') {
        window.addEventListener(AUTH_CHANGE_EVENT, handleCustomChange)
    }

    // 4. Real-time Supabase auth state listener
    const { data: { subscription } } = supabaseAuthClient.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            const appUser = mapSupabaseUserToAppUser(session.user)
            if (appUser) {
                saveAppAuth(appUser)
                onUserChange(appUser)

                // Trigger Slack alert on SIGNED_IN event
                if (_event === 'SIGNED_IN' && typeof window !== 'undefined') {
                    const userCreatedAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0
                    const isGenuineNewAccount = userCreatedAt > 0 && (Date.now() - userCreatedAt) < 600000 // within 10 minutes of signup
                    const alertKey = `mergeworks.signupAlertSent.${session.user.id}`
                    const explicitSignupStartedAt = explicitSignupStartedAtByEmail.get(appUser.email.toLowerCase()) || 0
                    const isExplicitSignupInFlight = explicitSignupStartedAt > 0 && Date.now() - explicitSignupStartedAt < 10 * 60 * 1000

                    if (isGenuineNewAccount) {
                        if (!isExplicitSignupInFlight && claimClientAlertCooldown(localStorage, alertKey, NEW_ACCOUNT_ALERT_COOLDOWN_MS)) {
                            const provider = session.user.app_metadata?.provider || 'OAuth / SSO'
                            console.info(`[Auth] Dispatching New Account Slack notification for ${appUser.email}`)
                            sendNewAccountSlackAlert({
                                fullName: appUser.name,
                                email: appUser.email,
                                team: appUser.team,
                                authMethod: `${provider.toUpperCase()} Sign-In`,
                            }).catch((err) => console.warn('[Auth] Failed to send new account alert:', err))
                        }
                    } else if (isClientSlackAlertEnabled('VITE_ENABLE_AUTH_ACTIVITY_SLACK_ALERTS')) {
                        // Routine successful sign-ins are optional and limited
                        // to one alert per user/browser per day.
                        const signInAlertKey = `mergeworks.signInAlertSentAt.${session.user.id}`
                        if (claimClientAlertCooldown(localStorage, signInAlertKey, AUTH_ACTIVITY_ALERT_COOLDOWN_MS)) {
                            const rawProvider = session.user.app_metadata?.provider || 'Google OAuth'
                            const providerLabel = rawProvider.charAt(0).toUpperCase() + rawProvider.slice(1) + (rawProvider.includes('email') ? '' : ' OAuth')
                            console.info(`[Auth] Dispatching Sign-In Slack notification for ${appUser.email}`)
                            sendSignInSlackAlert({
                                fullName: appUser.name,
                                email: appUser.email,
                                role: appUser.role,
                                team: appUser.team,
                                authMethod: providerLabel,
                                status: 'Success',
                            }).catch((err) => console.warn('[Auth] Failed to send sign-in alert:', err))
                        }
                    }
                }
            }
        } else if (_event === 'SIGNED_OUT') {
            saveAppAuth(null)
            onUserChange(null)
        }
    })

    return () => {
        if (typeof window !== 'undefined') {
            window.removeEventListener(AUTH_CHANGE_EVENT, handleCustomChange)
        }
        subscription.unsubscribe()
    }
}
