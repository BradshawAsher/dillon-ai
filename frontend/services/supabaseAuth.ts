import { createClient, type User, type Session } from '@supabase/supabase-js'
import { sendNewAccountSlackAlert, sendSignInSlackAlert } from './slackAlertService'

const SUPABASE_URL = 'https://sihpsqrunkwkxhhnwoqe.supabase.co'
const SUPABASE_ANON_KEY = 'REDACTED_SUPABASE_ANON_KEY'

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

export function mapSupabaseUserToAppUser(user: User | null, customTeam?: string): AppAuthUser | null {
    if (!user || !user.email) return null
    const email = user.email.trim().toLowerCase()
    const metadata = user.user_metadata || {}
    const name = metadata.full_name || metadata.name || email.split('@')[0] || 'User'
    const team = customTeam || metadata.team || 'Pod 1'
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
export async function signUpWithPassword(email: string, password: string, fullName: string, team: string = 'Pod 1') {
    const { data, error } = await supabaseAuthClient.auth.signUp({
        email: email.trim(),
        password,
        options: {
            data: {
                full_name: fullName.trim(),
                team: team.trim(),
            },
        },
    })

    if (error) {
        return { success: false, error: error.message, user: null }
    }

    const appUser = mapSupabaseUserToAppUser(data.user, team) || {
        id: data.user?.id,
        email: email.trim().toLowerCase(),
        name: fullName.trim() || email.split('@')[0],
        team,
        role: ADMIN_EMAILS.includes(email.trim().toLowerCase()) ? 'admin' as const : 'tester' as const,
    }

    saveAppAuth(appUser)
    // Dispatch Slack alert to #pod-1-agent-alerts
    sendNewAccountSlackAlert({
        fullName: appUser.name,
        email: appUser.email,
        team: appUser.team,
        authMethod: 'Email & Password',
    }).catch(() => {})

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
        sendSignInSlackAlert({
            fullName: appUser.name,
            email: appUser.email,
            role: appUser.role,
            team: appUser.team,
            authMethod: 'Email & Password',
            status: 'Success',
        }).catch(() => {})
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
    saveAppAuth(null)
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

                // Trigger Slack alert only for genuinely new user creations (created in the last 2 minutes)
                if (_event === 'SIGNED_IN' && typeof window !== 'undefined') {
                    const userCreatedAt = session.user.created_at ? new Date(session.user.created_at).getTime() : 0
                    const isGenuineNewAccount = userCreatedAt > 0 && (Date.now() - userCreatedAt) < 120000 // within 2 minutes of signup
                    const alertKey = `mergeworks.signupAlertSent.${session.user.id}`

                    if (isGenuineNewAccount && !localStorage.getItem(alertKey)) {
                        localStorage.setItem(alertKey, 'true')
                        const provider = session.user.app_metadata?.provider || 'OAuth / SSO'
                        sendNewAccountSlackAlert({
                            fullName: appUser.name,
                            email: appUser.email,
                            team: appUser.team,
                            authMethod: `${provider.toUpperCase()} Sign-In`,
                        }).catch(() => {})
                    } else {
                        // Regular sign-in alert with 15-minute session debounce
                        const sessionAlertKey = `mergeworks.signInAlertSent.${session.user.id}.${Math.floor(Date.now() / (1000 * 60 * 15))}`
                        if (!sessionStorage.getItem(sessionAlertKey)) {
                            sessionStorage.setItem(sessionAlertKey, 'true')
                            const rawProvider = session.user.app_metadata?.provider || 'Google OAuth'
                            const providerLabel = rawProvider.charAt(0).toUpperCase() + rawProvider.slice(1) + (rawProvider.includes('email') ? '' : ' OAuth')
                            sendSignInSlackAlert({
                                fullName: appUser.name,
                                email: appUser.email,
                                role: appUser.role,
                                team: appUser.team,
                                authMethod: providerLabel,
                                status: 'Success',
                            }).catch(() => {})
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
