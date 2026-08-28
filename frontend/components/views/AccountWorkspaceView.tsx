import React, { useState, useEffect, useCallback } from 'react'
import {
    User,
    Shield,
    Key,
    Cpu,
    Briefcase,
    CheckCircle2,
    Database,
    HardDrive,
    Sparkles,
    LogOut,
    Lock,
    ExternalLink,
    FolderKanban,
    Mail,
    Sliders,
    Building2,
    Users,
    UserPlus,
    Copy,
    Check,
} from 'lucide-react'
import { Button } from '../../lib/shadcn/button'
import { Badge } from '../../lib/shadcn/badge'
import {
    getLocalAppAuth,
    saveAppAuth,
    signOutUser,
    AUTH_CHANGE_EVENT,
    type AppAuthUser,
} from '../../services/supabaseAuth'
import { sendAdminAccessRequestSlackAlert } from '../../services/slackAlertService'
import {
    isDataIsolationEnabled,
    setDataIsolation,
    DATA_ISOLATION_EVENT,
} from '../AuthGate'
import type { ProjectSummary } from '../../utils/projectWorkspace'
import { getOwnedProjects, getProjectsForTeam } from '../../utils/projectOwnership'

interface AccountWorkspaceViewProps {
    projectSummaries: ProjectSummary[]
    onSelectProject?: (projectKey: string) => void
    onSwitchTab?: (tab: any) => void
    onOpenApiKeyModal?: () => void
}

export function AccountWorkspaceView({
    projectSummaries,
    onSelectProject,
    onSwitchTab,
    onOpenApiKeyModal,
}: AccountWorkspaceViewProps) {
    const [user, setUser] = useState<AppAuthUser | null>(getLocalAppAuth)
    const [isolation, setIsolation] = useState<boolean>(isDataIsolationEnabled)
    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState(user?.name || '')
    const [editTeam, setEditTeam] = useState(user?.team || 'External Member')
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [isSubmittingAdminRequest, setIsSubmittingAdminRequest] = useState(false)
    const [adminRequestSent, setAdminRequestSent] = useState(false)
    const [adminRequestError, setAdminRequestError] = useState<string | null>(null)
    const [customTeamInput, setCustomTeamInput] = useState('')
    const [isEditingTeam, setIsEditingTeam] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteSent, setInviteSent] = useState(false)
    const [inviteCopied, setInviteCopied] = useState(false)

    useEffect(() => {
        const handleIsolationChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ enabled: boolean }>
            if (customEvent.detail && typeof customEvent.detail.enabled === 'boolean') {
                setIsolation(customEvent.detail.enabled)
            } else {
                setIsolation(isDataIsolationEnabled())
            }
        }
        const handleAuthChange = (e: Event) => {
            const customEvent = e as CustomEvent<{ user: AppAuthUser | null }>
            if (customEvent.detail !== undefined) {
                setUser(customEvent.detail.user)
            }
        }
        window.addEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
        window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange)
        return () => {
            window.removeEventListener(DATA_ISOLATION_EVENT, handleIsolationChange)
            window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange)
        }
    }, [])

    const handleToggleIsolation = useCallback(() => {
        const next = !isolation
        setDataIsolation(next)
        setIsolation(next)
    }, [isolation])

    const handleSaveProfile = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        const updated: AppAuthUser = {
            ...user,
            name: editName.trim() || user.name,
            team: editTeam.trim() || user.team,
        }
        saveAppAuth(updated)
        setUser(updated)
        setIsEditing(false)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }, [user, editName, editTeam])

    const handleSignOut = useCallback(async () => {
        await signOutUser()
        setUser(null)
    }, [])

    const handleApplyAdminAccess = useCallback(async () => {
        if (!user) return
        setIsSubmittingAdminRequest(true)
        setAdminRequestError(null)
        try {
            const success = await sendAdminAccessRequestSlackAlert({
                fullName: user.name || 'MergeWorks User',
                email: user.email,
                team: user.team,
                reason: 'User requested administrator permissions to view all 62+ pushed projects and diligence syntheses across the firm.',
            })
            if (success) {
                setAdminRequestSent(true)
            } else {
                setAdminRequestError('Failed to dispatch alert to Slack. Please check network connectivity.')
            }
        } catch (err) {
            setAdminRequestError(err instanceof Error ? err.message : 'Error submitting request')
        } finally {
            setIsSubmittingAdminRequest(false)
        }
    }, [user])

    const userEmail = user?.email || 'localdev@mergeworks.io'
    const claimedKeys = getOwnedProjects(userEmail)
    const myProjects = projectSummaries.filter(
        (p) => claimedKeys.includes(p.projectKey) || (user?.email && p.projectKey.toLowerCase().includes(user.email.split('@')[0].toLowerCase()))
    )

    return (
        <div className="space-y-8 pb-16">
            {/* Header / Intro */}
            <div className="flex flex-col gap-2 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <User className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                Account & Diligence Workspace Settings
                            </h1>
                            <p className="text-xs text-muted-foreground sm:text-sm">
                                Manage user profile, data isolation boundaries, model parameters, and cloud integrations.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'} className="px-2.5 py-1 text-xs font-semibold uppercase">
                        {user?.role === 'admin' ? 'Administrator' : 'Deal Analyst / Tester'}
                    </Badge>
                </div>
            </div>

            {/* Main 2-column Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Left 2 Columns: User Info & Isolation */}
                <div className="space-y-6 lg:col-span-2">
                    {/* User Identity Card */}
                    <div id="profile" className="rounded-xl border border-border/80 bg-card p-6 shadow-sm scroll-mt-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-primary" />
                                <h2 className="text-base font-semibold text-foreground">User Identity & Authentication</h2>
                            </div>
                            {!isEditing && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setEditName(user?.name || '')
                                        setEditTeam(user?.team || 'External Member')
                                        setIsEditing(true)
                                    }}
                                >
                                    Edit Profile
                                </Button>
                            )}
                        </div>

                        {saveSuccess && (
                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Profile changes updated successfully.</span>
                            </div>
                        )}

                        {isEditing ? (
                            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Full Name</label>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Bradshaw Asher"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Team / Deal Pod</label>
                                        <input
                                            type="text"
                                            value={editTeam}
                                            onChange={(e) => setEditTeam(e.target.value)}
                                            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="External Member (or enter custom firm name)"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground">Email Address (Read-only)</label>
                                    <input
                                        type="email"
                                        value={user?.email || 'localdev@mergeworks.io'}
                                        disabled
                                        className="mt-1 w-full rounded-md border border-muted bg-muted/40 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <Button type="submit" size="sm">
                                        Save Changes
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-2">
                                        {user?.name || 'Local Diligence User'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Email</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5 truncate">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="truncate">{user?.email || 'localdev@mergeworks.io'}</span>
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Assigned Team / Organization</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                        {user?.team || 'External Member'}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Auth Provider</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground flex items-center gap-1.5">
                                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        Supabase Auth (Cloud Engine)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Custom Organization & Teams Hub Card */}
                    <div id="teams" className="rounded-xl border border-border/80 bg-card p-6 shadow-sm scroll-mt-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Organization &amp; Team Hub</h2>
                                    <p className="text-xs text-muted-foreground">Collaborate with colleagues in private firm workspaces</p>
                                </div>
                            </div>
                            <Badge
                                variant={user?.team && user.team !== 'External Member' ? 'default' : 'secondary'}
                                className="text-xs font-semibold"
                            >
                                {user?.team && user.team !== 'External Member' ? 'Custom Team Active' : 'External Member'}
                            </Badge>
                        </div>

                        <div className="mt-4 space-y-4">
                            {isEditingTeam ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        if (!user) return
                                        const cleanTeam = customTeamInput.trim() || 'External Member'
                                        const updated: AppAuthUser = {
                                            ...user,
                                            team: cleanTeam,
                                        }
                                        saveAppAuth(updated)
                                        setUser(updated)
                                        setIsEditingTeam(false)
                                    }}
                                    className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3"
                                >
                                    <div>
                                        <label className="text-xs font-semibold text-foreground">
                                            Custom Team / Firm Name
                                        </label>
                                        <p className="text-[11px] text-muted-foreground mb-1.5">
                                            Enter your firm name (e.g., <em>Acme Capital</em>, <em>Blue Ridge Search Fund</em>). Colleagues entering the same team name will share deal visibility in Team Mode.
                                        </p>
                                        <input
                                            type="text"
                                            value={customTeamInput}
                                            onChange={(e) => setCustomTeamInput(e.target.value)}
                                            placeholder="e.g. Acme Capital"
                                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button type="submit" size="sm">
                                            Save Team Name
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingTeam(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="rounded-lg border border-border/50 bg-muted/20 p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                                Active Team Workspace
                                            </p>
                                            <p className="text-base font-bold text-foreground flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                {user?.team || 'External Member'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {user?.team && user.team !== 'External Member'
                                                    ? 'Members on this team can access shared deal rooms and collaborative diligence packets.'
                                                    : 'You are currently in an individual workspace. Create or name a custom firm team to collaborate with associates.'}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setCustomTeamInput(user?.team === 'External Member' ? '' : (user?.team || ''))
                                                setIsEditingTeam(true)
                                            }}
                                            className="shrink-0 gap-1.5"
                                        >
                                            <Building2 className="h-3.5 w-3.5 text-primary" />
                                            {user?.team && user.team !== 'External Member' ? 'Rename Team' : '+ Create Custom Team'}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Invite Colleague Tool */}
                            <div className="rounded-lg border border-border/50 bg-muted/10 p-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                                            <UserPlus className="h-4 w-4 text-primary" />
                                            Invite Colleague to {user?.team || 'Workspace'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Share your team name or copy an onboarding link for your investment partners.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                if (typeof window !== 'undefined') {
                                                    const inviteUrl = `${window.location.origin}?team=${encodeURIComponent(user?.team || 'External Member')}`
                                                    navigator.clipboard.writeText(inviteUrl).catch(() => {})
                                                    setInviteCopied(true)
                                                    setTimeout(() => setInviteCopied(false), 2500)
                                                }
                                            }}
                                            className="gap-1.5 text-xs"
                                        >
                                            {inviteCopied ? (
                                                <>
                                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    <span>Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>Copy Invite Link</span>
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Apply for Admin Access Card (For Non-Admin Accounts) */}
                    {user?.role !== 'admin' && (
                        <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1.5 max-w-xl">
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                        <Shield className="h-5 w-5 shrink-0" />
                                        <h3 className="text-base font-bold text-foreground">
                                            Want admin access to view all projects that have been pushed?
                                        </h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Upgrade to an <strong>Administrator</strong> account to view all 62+ active and historical diligence projects, multi-document syntheses, and valuation matrices across all deal pods.
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    <Button
                                        type="button"
                                        variant={adminRequestSent ? 'outline' : 'default'}
                                        size="default"
                                        onClick={handleApplyAdminAccess}
                                        disabled={isSubmittingAdminRequest || adminRequestSent}
                                        className={adminRequestSent
                                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                                            : 'bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm'
                                        }
                                    >
                                        {isSubmittingAdminRequest
                                            ? 'Sending Alert...'
                                            : adminRequestSent
                                            ? '✓ Request Sent to #pod-1-agent-alerts'
                                            : 'Apply for Admin Access Now'}
                                    </Button>
                                </div>
                            </div>
                            {adminRequestSent && (
                                <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    Your request has been dispatched directly to <code>#pod-1-agent-alerts</code> on Slack. A Pod 1 administrator will review your account.
                                </p>
                            )}
                            {adminRequestError && (
                                <p className="mt-3 text-xs font-medium text-destructive">
                                    {adminRequestError}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Data Isolation Card */}
                    <div id="isolation" className="rounded-xl border border-border/80 bg-card p-6 shadow-sm scroll-mt-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-2">
                                <Sliders className="h-5 w-5 text-primary" />
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Data Isolation & Scope</h2>
                                    <p className="text-xs text-muted-foreground">Control visibility boundaries for proprietary deal packets</p>
                                </div>
                            </div>
                            <Badge
                                variant={isolation ? 'default' : 'secondary'}
                                className={isolation ? 'bg-primary text-primary-foreground' : ''}
                            >
                                {isolation ? 'Personal Isolation Active' : `Shared ${user?.team || 'Team'} Workspace`}
                            </Badge>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/20 p-4">
                            <div className="space-y-1 max-w-xl">
                                <p className="text-sm font-medium text-foreground">
                                    {isolation ? 'Strict Private Workspace Filter' : `Collaborative ${user?.team || 'Team'} Workspace`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {isolation
                                        ? 'Only projects claimed by or assigned to your email address are visible in the Projects and Synthesis tabs.'
                                        : `All deals uploaded by members of ${user?.team || 'your team'} are visible and collaborative in real time.`}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant={isolation ? 'outline' : 'default'}
                                size="sm"
                                onClick={handleToggleIsolation}
                                className="shrink-0 gap-1.5"
                            >
                                {isolation ? 'Switch to Shared' : 'Enable Isolation'}
                            </Button>
                        </div>
                    </div>

                    {/* AI Model & Pipeline Config */}
                    <div id="models" className="rounded-xl border border-border/80 bg-card p-6 shadow-sm scroll-mt-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-2">
                                <Cpu className="h-5 w-5 text-primary" />
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Production AI Extraction Models</h2>
                                    <p className="text-xs text-muted-foreground">Primary and fallback models per GEMINI.md protocol</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenApiKeyModal?.()}
                                className="gap-1.5 text-xs"
                            >
                                <Key className="h-3.5 w-3.5 text-primary" />
                                Custom API Keys
                            </Button>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                        Document Extraction Pass
                                    </p>
                                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        Active
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm font-bold text-foreground">OpenAI 5.6 Terra</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Backup: OpenAI 5.6 Sol (Automatic Fallback)</p>
                            </div>

                            <div className="rounded-lg border border-border/50 bg-muted/20 p-3.5">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                        Multi-Doc Synthesis Pass
                                    </p>
                                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                                        Active
                                    </Badge>
                                </div>
                                <p className="mt-1 text-sm font-bold text-foreground">OpenAI 5.6 Terra</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">Backup: OpenAI 5.6 Sol (Reconciliation)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Projects & Integrations */}
                <div className="space-y-6">
                    {/* Claimed Deals / My Portfolio */}
                    <div id="projects" className="rounded-xl border border-border/80 bg-card p-6 shadow-sm scroll-mt-6">
                        <div className="flex items-center justify-between border-b border-border/50 pb-4">
                            <div className="flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                <h2 className="text-base font-semibold text-foreground">Claimed Deals</h2>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                                {myProjects.length} {myProjects.length === 1 ? 'deal' : 'deals'}
                            </Badge>
                        </div>

                        <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
                            {myProjects.length === 0 ? (
                                <div className="text-center py-6 text-xs text-muted-foreground">
                                    <Briefcase className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
                                    No claimed deals yet. Submit a new deal or claim an existing project from the Documents tab.
                                </div>
                            ) : (
                                myProjects.map((p) => (
                                    <button
                                        key={p.projectKey}
                                        type="button"
                                        onClick={() => {
                                            onSelectProject?.(p.projectKey)
                                            onSwitchTab?.('overview')
                                        }}
                                        className="w-full text-left rounded-lg border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/60 hover:border-primary/40 group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                                {p.projectName || p.companyName || p.projectKey}
                                            </span>
                                            <Badge variant="outline" className="text-[9px]">
                                                {p.documentCount} docs
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                                            <span>{p.stage || 'Post-LOI'}</span>
                                            <span className="flex items-center gap-1 group-hover:text-primary">
                                                Open <ExternalLink className="h-2.5 w-2.5" />
                                            </span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full mt-3 text-xs gap-1.5"
                            onClick={() => onSwitchTab?.('documents')}
                        >
                            <FolderKanban className="h-3.5 w-3.5 text-primary" />
                            View All {projectSummaries.length} Projects
                        </Button>
                    </div>

                    {/* Connected Cloud Infrastructure */}
                    <div id="integrations" className="rounded-xl border border-border/80 bg-card p-6 shadow-sm scroll-mt-6">
                        <div className="flex items-center gap-2 border-b border-border/50 pb-4">
                            <Sparkles className="h-5 w-5 text-primary" />
                            <h2 className="text-base font-semibold text-foreground">Cloud Diligence Engine</h2>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 p-2.5">
                                <div className="flex items-center gap-2.5">
                                    <HardDrive className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-foreground">Supabase Storage</p>
                                        <p className="text-[10px] text-muted-foreground">Direct binary uploads (bucket: deal-documents)</p>
                                    </div>
                                </div>
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 p-2.5">
                                <div className="flex items-center gap-2.5">
                                    <Database className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-foreground">Supabase Postgres</p>
                                        <p className="text-[10px] text-muted-foreground">Data Tables & Diligence Records</p>
                                    </div>
                                </div>
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            </div>

                            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/10 p-2.5">
                                <div className="flex items-center gap-2.5">
                                    <Cpu className="h-4 w-4 text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-xs font-medium text-foreground">n8n Enterprise Agent</p>
                                        <p className="text-[10px] text-muted-foreground">Pod 1 Webhook Extraction & Synthesis</p>
                                    </div>
                                </div>
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            </div>
                        </div>
                    </div>

                    {/* Session Sign-Out */}
                    <div className="rounded-xl border border-border/80 bg-card p-6 shadow-sm">
                        <h2 className="text-sm font-semibold text-foreground">Session Controls</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Sign out of your active session on this device.
                        </p>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={handleSignOut}
                            className="mt-4 w-full gap-2"
                        >
                            <LogOut className="h-4 w-4" />
                            Sign Out of MergeWorks
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
export default AccountWorkspaceView
