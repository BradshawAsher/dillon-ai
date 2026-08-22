import React, { useState } from 'react'
import { FolderKanban, Moon, Sun, Key, Globe, Play, Compass, Sparkles, Keyboard, Link2, Check, User, Search, Bug, FolderPlus } from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import DealStageIndicator from '../DealStageIndicator'
import PipelineStatusIndicator from '../PipelineStatusIndicator'
import ExportDealButton from '../ExportDealButton'
import KeyboardShortcutsDialog from '../KeyboardShortcutsDialog'
import NotificationCenter, { type Notification } from '../NotificationCenter'
import LoginButton from '../AuthGate'
import { copyToClipboard } from '../../utils/clipboard'
import { buildProjectPermalink } from '../../utils/deepLinking'
import { DillonLogo } from '../DillonLogo'

import type { WalkthroughResumeState } from '../walkthrough/walkthroughTypes'

type WorkspaceHeaderProps = {
    isExampleMode: boolean
    activeProjectDocuments: any[]
    setIsProjectsPanelOpen: (open: boolean) => void
    projectSummaries: any[]
    currentTheme: any
    setCurrentTheme: (theme: any) => void
    setStoredTheme: (theme: any) => void
    hydratedDealModel: any
    activeProjectSynthesis: any
    dealName: string
    suggestedProjectName: string
    notifications: Notification[]
    handleMarkNotificationRead: (id: string) => void
    handleMarkAllNotificationsRead: () => void
    handleClearNotifications: () => void
    setActiveWorkspaceTab: (tab: any) => void
    setIsApiKeyModalOpen: (open: boolean) => void
    isActiveSubmissionStatus: (status: any) => boolean
    onReturnToLanding?: () => void
    onOpenWalkthrough?: () => void
    onOpenIntake?: () => void
    resumeState?: WalkthroughResumeState | null
    onResumeTour?: () => void
    activeProjectId?: string
    activeWorkspaceTab?: string
    onOpenSearch?: () => void
    onOpenReportIssue?: () => void
}

export function WorkspaceHeader({
    isExampleMode,
    activeProjectDocuments,
    setIsProjectsPanelOpen,
    projectSummaries,
    currentTheme,
    setCurrentTheme,
    setStoredTheme,
    hydratedDealModel,
    activeProjectSynthesis,
    dealName,
    suggestedProjectName,
    notifications,
    handleMarkNotificationRead,
    handleMarkAllNotificationsRead,
    handleClearNotifications,
    setActiveWorkspaceTab,
    setIsApiKeyModalOpen,
    isActiveSubmissionStatus,
    onReturnToLanding,
    onOpenWalkthrough,
    onOpenIntake,
    resumeState,
    onResumeTour,
    activeProjectId,
    activeWorkspaceTab,
    onOpenSearch,
    onOpenReportIssue,
}: WorkspaceHeaderProps) {
    const [copiedLink, setCopiedLink] = useState(false)

    const handleShareLink = async () => {
        const permalink = buildProjectPermalink({
            projectKey: activeProjectId || dealName || suggestedProjectName,
            tab: activeWorkspaceTab || 'overview',
        })
        if (await copyToClipboard(permalink)) {
            setCopiedLink(true)
            setTimeout(() => setCopiedLink(false), 2000)
        }
    }
    return (
        <header className="dashboard-header-mesh border-b border-border/40 py-6">
            <div className="mx-auto flex max-w-[1440px] flex-col items-center text-center gap-4 px-4 sm:px-6 lg:px-8">
                {/* Brand & Cockpit Title */}
                <div className="space-y-2 max-w-3xl">
                    <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                        Dillon AI by MergeWorks • M&amp;A Due Diligence Workspace
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <DillonLogo size="lg" />
                        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-3">
                            <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-black dark:text-white">
                                Dillon AI
                            </span>
                            <span className="text-muted-foreground/30 font-light text-2xl sm:text-3xl">|</span>
                            <span className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
                                Project Diligence Cockpit
                            </span>
                        </h1>
                        <div className="flex items-center gap-2">
                            <DealStageIndicator />
                            <PipelineStatusIndicator
                                isPolling={!isExampleMode}
                                hasActiveSubmissions={activeProjectDocuments.some((d) => isActiveSubmissionStatus(d.status))}
                                hasErrors={activeProjectDocuments.some((d) => ['failed', 'error', 'rejected'].includes(String(d.status ?? '').trim().toLowerCase()))}
                            />
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground mx-auto leading-relaxed max-w-2xl">
                        Shift from one-off document extraction to project-level diligence. Group uploads into a shared project, poll n8n for document progress, and prepare the agent to reconcile multiple files into one acquisition judgment.
                    </p>
                </div>

                {/* Prominent Centered Global Search Bar */}
                {onOpenSearch && (
                    <button
                        type="button"
                        onClick={onOpenSearch}
                        className="w-full max-w-xl flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-primary/30 bg-background/90 hover:bg-background hover:border-primary/60 text-muted-foreground hover:text-foreground text-sm shadow-xs transition-all cursor-pointer group hover:shadow-md"
                        title="Global Search across projects, tabs, metrics, flags, and actions (⌘K or Ctrl+K)"
                    >
                        <span className="flex items-center gap-2.5">
                            <Search className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                            <span className="font-medium text-foreground/80">Search deals, tabs, metrics, findings, actions...</span>
                        </span>
                        <kbd className="inline-flex items-center gap-1 rounded bg-muted/90 px-2 py-0.5 text-[11px] font-mono font-semibold border border-border text-foreground shadow-2xs">
                            ⌘K
                        </kbd>
                    </button>
                )}

                {/* Centered Actions Ribbon */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {resumeState && onResumeTour && (
                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="gap-2 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-primary-foreground font-semibold shadow-md animate-pulse hover:animate-none"
                            onClick={onResumeTour}
                            title={`Resume ${resumeState.playlistTitle} from Step ${resumeState.stepIndex + 1}: ${resumeState.stepTitle}`}
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span className="hidden sm:inline">Resume Tour</span>
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-white/20 text-white font-mono">
                                Step {resumeState.stepIndex + 1}/{resumeState.totalSteps}
                            </Badge>
                        </Button>
                    )}
                    {onOpenWalkthrough && (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-semibold shadow-xs"
                            onClick={onOpenWalkthrough}
                            title="Open Native Guided Walkthroughs & Interactive Demos"
                        >
                            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                            <span className="hidden sm:inline">Guided Tour</span>
                            <Badge variant="default" className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-semibold">
                                Interactive
                            </Badge>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/15 text-foreground font-semibold shadow-xs cursor-pointer"
                        onClick={() => {
                            if (onOpenIntake) {
                                onOpenIntake()
                            } else {
                                const intakeEl = document.querySelector('[data-project-intake]') || document.getElementById('deal-intake')
                                if (intakeEl) {
                                    intakeEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                } else {
                                    setActiveWorkspaceTab('documents')
                                }
                            }
                        }}
                        title="Jump to Project Intake & Uploads"
                    >
                        <FolderPlus className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Project Intake</span>
                    </Button>
                    {onReturnToLanding && (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 font-semibold cursor-pointer"
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
                                }
                                onReturnToLanding()
                            }}
                            title="Return to Product Landing Page"
                        >
                            <Globe className="h-4 w-4 text-primary" />
                            <span className="hidden sm:inline">Landing Page</span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 font-semibold"
                        onClick={() => setIsProjectsPanelOpen(true)}
                        title="Open Projects Portfolio Panel (Ctrl+Shift+P)"
                        aria-label={`Open projects portfolio panel (${projectSummaries.length} projects)`}
                    >
                        <FolderKanban className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Projects</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                            {projectSummaries.length}
                        </Badge>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-2 px-3.5 py-2 text-sm"
                        onClick={() => {
                            const next = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark'
                            setCurrentTheme(next)
                            setStoredTheme(next)
                        }}
                        aria-label={`Switch color theme (currently ${currentTheme === 'system' ? 'auto' : currentTheme})`}
                    >
                        {currentTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        <span className="hidden sm:inline">{currentTheme === 'system' ? 'Auto theme' : currentTheme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
                    </Button>
                    <ExportDealButton model={hydratedDealModel} synthesis={activeProjectSynthesis} projectName={dealName || suggestedProjectName} />
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 px-3 py-2 text-sm"
                        onClick={handleShareLink}
                        title="Copy permanent share link for this project and active tab"
                    >
                        {copiedLink ? (
                            <>
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="hidden sm:inline">Link Copied!</span>
                            </>
                        ) : (
                            <>
                                <Link2 className="h-4 w-4 text-primary" />
                                <span className="hidden sm:inline">Share Deal</span>
                            </>
                        )}
                    </Button>
                    <KeyboardShortcutsDialog />
                    <NotificationCenter
                        notifications={notifications}
                        onMarkRead={handleMarkNotificationRead}
                        onMarkAllRead={handleMarkAllNotificationsRead}
                        onClear={handleClearNotifications}
                        onSelectNotification={(notif) => {
                            handleMarkNotificationRead(notif.id)
                            if (notif.type === 'synthesis_complete' || notif.description.toLowerCase().includes('synthesis')) {
                                setActiveWorkspaceTab('synthesis')
                                setTimeout(() => {
                                    const el = document.getElementById('project-synthesis') || document.getElementById('deal-workspace')
                                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }, 100)
                            } else if (notif.type === 'document_processed' || notif.description.toLowerCase().includes('document')) {
                                setActiveWorkspaceTab('diligence')
                                setTimeout(() => {
                                    const el = document.getElementById('deal-diligence') || document.getElementById('deal-workspace')
                                    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }, 100)
                            }
                        }}
                    />
                    {onOpenReportIssue && (
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-1.5 px-3 py-2 text-sm border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold"
                            onClick={onOpenReportIssue}
                            title="Report a bug or UI improvement directly to #pod-1-agent-alerts on Slack"
                        >
                            <Bug className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="hidden sm:inline">Report Issue</span>
                        </Button>
                    )}
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 px-3 py-2 text-sm"
                        onClick={() => setIsApiKeyModalOpen(true)}
                        title="Configure custom Anthropic API Key (BYOK)"
                    >
                        <Key className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">API Key</span>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 px-3 py-2 text-sm"
                        onClick={() => setActiveWorkspaceTab('shortcuts')}
                        title="Keyboard Shortcuts Cheatsheet & Interactive Tester"
                    >
                        <Keyboard className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Shortcuts</span>
                        <kbd className="hidden md:inline-flex rounded bg-muted px-1 py-0.2 text-[10px] font-mono border border-border">?</kbd>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5 px-3 py-2 text-sm"
                        onClick={() => setActiveWorkspaceTab('account')}
                        title="Account & Workspace Settings"
                    >
                        <User className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Account</span>
                    </Button>
                    <LoginButton onNavigateAccount={() => setActiveWorkspaceTab('account')} />
                </div>
            </div>
        </header>
    )
}
