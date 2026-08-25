import React, { useState, useEffect, useCallback } from 'react'
import { Shield, ShieldCheck, Lock, Users } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Badge } from '../../lib/shadcn/badge'
import { getStoredAuth, isDataIsolationEnabled, setDataIsolation, DATA_ISOLATION_EVENT } from '../AuthGate'
import { AUTH_CHANGE_EVENT, AppAuthUser } from '../../services/supabaseAuth'
import { sendAdminAccessRequestSlackAlert } from '../../services/slackAlertService'

interface DataIsolationBannerProps {
    onOpenAuthModal?: () => void
    className?: string
}

export function DataIsolationBanner({ onOpenAuthModal, className = '' }: DataIsolationBannerProps) {
    const [isolationEnabled, setIsolationEnabled] = useState(isDataIsolationEnabled)
    const [user, setUser] = useState<AppAuthUser | null>(getStoredAuth)
    const [adminRequested, setAdminRequested] = useState(false)
    const [isApplying, setIsApplying] = useState(false)

    useEffect(() => {
        const handleIsolationChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>
            if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
                setIsolationEnabled(customEvent.detail.enabled)
            } else {
                setIsolationEnabled(isDataIsolationEnabled())
            }
        }

        const handleAuthChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ user: AppAuthUser | null }>
            if (customEvent.detail !== undefined) {
                setUser(customEvent.detail.user)
            } else {
                setUser(getStoredAuth())
            }
        }

        const checkAuth = () => {
            setUser(getStoredAuth())
        }

        window.addEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
        window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange)
        window.addEventListener('storage', checkAuth)
        return () => {
            window.removeEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
            window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange)
            window.removeEventListener('storage', checkAuth)
        }
    }, [])

    const handleToggle = useCallback(() => {
        const next = !isolationEnabled
        setDataIsolation(next)
        setIsolationEnabled(next)
    }, [isolationEnabled])

    const handleApplyAdmin = useCallback(async () => {
        if (!user) {
            onOpenAuthModal?.()
            return
        }
        setIsApplying(true)
        try {
            await sendAdminAccessRequestSlackAlert({
                fullName: user.name || 'MergeWorks User',
                email: user.email,
                team: user.team,
                reason: 'User applied from Data Isolation Banner to view all 62+ pushed projects firm-wide.',
            })
            setAdminRequested(true)
        } finally {
            setIsApplying(false)
        }
    }, [user, onOpenAuthModal])

    return (
        <div
            className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
                isolationEnabled
                    ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-background shadow-sm'
                    : 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-primary/5 to-background shadow-sm'
            } p-4 sm:p-5 ${className}`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3.5">
                    <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                            isolationEnabled
                                ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                : 'border-amber-500/30 bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        }`}
                    >
                        {isolationEnabled ? (
                            <ShieldCheck className="h-5 w-5" />
                        ) : (
                            <Shield className="h-5 w-5" />
                        )}
                    </div>
                    <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-foreground text-sm sm:text-base">
                                {isolationEnabled
                                    ? 'Private Workspace Active'
                                    : 'Test Your Own Deals in Private'}
                            </span>
                            <Badge
                                variant={isolationEnabled ? 'default' : 'secondary'}
                                className={`text-[11px] font-medium ${
                                    isolationEnabled
                                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                        : 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30'
                                }`}
                            >
                                {isolationEnabled ? 'Data Isolation ON' : 'Data Isolation OFF'}
                            </Badge>
                            {user && (
                                <span className="text-xs text-muted-foreground">
                                    Signed in as <strong className="text-foreground">{user.name}</strong> ({user.role || 'tester'})
                                </span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            {isolationEnabled
                                ? 'Your document uploads, extraction notes, and red flags are completely private to your session and cannot be seen or overwritten by other testers.'
                                : 'Want to test your own data without being interrupted with full privacy? Turn on data isolation to keep your uploads private to your session.'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap shrink-0 items-center gap-2.5 sm:self-center">
                    {user?.role !== 'admin' && (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleApplyAdmin}
                            disabled={isApplying || adminRequested}
                            className={`gap-1.5 font-semibold text-xs transition-all ${
                                adminRequested
                                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
                            }`}
                            title="Want admin access to view all projects that have been pushed? Apply for admin access now"
                        >
                            <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                            <span>
                                {isApplying
                                    ? 'Applying...'
                                    : adminRequested
                                    ? '✓ Alert Sent to #pod-1-agent-alerts'
                                    : 'Apply for Admin Access'}
                            </span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        variant={isolationEnabled ? 'outline' : 'default'}
                        onClick={handleToggle}
                        className={`gap-2 font-semibold shadow-sm transition-all ${
                            isolationEnabled
                                ? 'border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                    >
                        {isolationEnabled ? (
                            <>
                                <Users className="h-4 w-4" />
                                <span>Switch to Shared Mode</span>
                            </>
                        ) : (
                            <>
                                <Lock className="h-4 w-4" />
                                <span>Turn on Data Isolation</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
export default DataIsolationBanner
