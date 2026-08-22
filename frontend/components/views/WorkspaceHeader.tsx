import React, { useState } from 'react'
import { FolderKanban, Moon, Sun, Key, Globe, Play, Compass, Sparkles, Keyboard, Link2, Check, User, Search, Bug } from 'lucide-react'
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
        <header className="dashboard-header-mesh">
            <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
                <div className="space-y-2">
                    <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                        Dillon AI by MergeWorks • M&amp;A Due Diligence Workspace
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
                            <span className="font-bold text-primary">Dillon AI</span>
                            <span className="text-muted-foreground/40 font-normal">|</span>
                            <span>Project Diligence Cockpit</span>
                        </h1>
                        <DealStageIndicator />
                        <PipelineStatusIndicator
                            isPolling={!isExampleMode}
                            hasActiveSubmissions={activeProjectDocuments.some((d) => isActiveSubmissionStatus(d.status))}
                            hasErrors={activeProjectDocuments.some((d) => ['failed', 'error', 'rejected'].includes(String(d.status ?? '').trim().toLowerCase()))}
                        />
                        {onOpenSearch && (
                            <button
                                type="button"
                                onClick={onOpenSearch}
                                className="flex items-center justify-between gap-3 px-3.5 py-1.5 min-w-[220px] sm:min-w-[280px] lg:min-w-[340px] rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/50 text-muted-foreground hover:text-foreground text-xs shadow-xs transition-all cursor-pointer group"
                                title="Global Search across projects, tabs, metrics, flags, and actions (⌘K or Ctrl+K)"
                            >
                                <span className="flex items-center gap-2">
                                    <Search className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                                    <span className="font-medium text-foreground/80">Search deals, tabs, metrics...</span>
                                </span>
                                <kbd className="inline-flex items-center gap-0.5 rounded bg-background px-2 py-0.5 text-[10px] font-mono font-semibold border border-border/80 text-foreground shadow-2xs">
                                    ⌘K
                                </kbd>
                            </button>
                        )}
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
                        {onReturnToLanding && (
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 font-semibold"
                                onClick={onReturnToLanding}
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
                        {onOpenSearch && (
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 font-medium text-muted-foreground hover:text-foreground text-xs px-3 py-2 shadow-xs"
                                onClick={onOpenSearch}
                                title="Quick search projects, tabs, flags, and actions (Ctrl+K or ⌘K)"
                            >
                                <Search className="h-3.5 w-3.5 text-primary" />
                                <span className="hidden sm:inline">Search</span>
                                <kbd className="hidden sm:inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono border border-border text-muted-foreground">
                                    ⌘K
                                </kbd>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2 px-4 py-2 text-sm"
                            onClick={() => {
                                const next = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark'
                                setCurrentTheme(next)
                                setStoredTheme(next)
                            }}
                            aria-label={`Switch color theme (currently ${currentTheme === 'system' ? 'auto' : currentTheme})`}
                        >
                            {currentTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                            {currentTheme === 'system' ? 'Auto theme' : currentTheme === 'dark' ? 'Dark mode' : 'Light mode'}
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
                    <p className="max-w-4xl text-sm text-muted-foreground">
                        Shift from one-off document extraction to project-level diligence. Group uploads into a shared project, poll n8n for document progress, and prepare the agent to reconcile multiple files into one acquisition judgment.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projects</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">{projectSummaries.length}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Grouped from polled submissions</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active projects</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                            {projectSummaries.filter((p) => (p.activeCount ?? 0) > 0).length}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">In processing pipeline</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents</p>
                        <p className="mt-1 text-2xl font-semibold text-foreground">
                            {projectSummaries.reduce((sum, p) => sum + p.documentCount, 0)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Cross-project total</p>
                    </div>
                    {(() => {
                        const verdict = activeProjectSynthesis?.finalRecommendation || activeProjectSynthesis?.finalTrafficLight || 'Pending'
                        const upper = verdict.toUpperCase()
                        
                        let colorClass = 'text-foreground'
                        if (upper.includes('PROCEED WITH') || upper.includes('CONDITIONS') || upper.includes('YELLOW') || upper.includes('HOLD') || upper.includes('REVISE')) {
                            colorClass = 'text-amber-600 dark:text-amber-400'
                        } else if (upper.includes('PROCEED') || upper.includes('GREEN') || upper.includes('FAVORABLE')) {
                            colorClass = 'text-emerald-600 dark:text-emerald-400'
                        } else if (upper.includes('REJECT') || upper.includes('RED') || upper.includes('TERMINATE') || upper.includes('UNFAVORABLE')) {
                            colorClass = 'text-rose-600 dark:text-rose-400'
                        }

                        const fontSize =
                            verdict.length <= 4
                                ? 'text-xl sm:text-2xl font-bold'
                                : verdict.length <= 8
                                ? 'text-lg sm:text-xl font-bold'
                                : verdict.length <= 14
                                ? 'text-sm sm:text-base font-bold'
                                : 'text-xs sm:text-sm font-semibold'

                        return (
                            <div className="rounded-lg border border-border bg-background px-3 py-2.5 min-w-0 flex flex-col justify-between">
                                <p className="text-[11px] font-medium uppercase tracking-tight text-muted-foreground whitespace-normal leading-tight">
                                    Synthesis verdict
                                </p>
                                <p
                                    className={`my-0.5 tracking-tight break-words line-clamp-2 leading-tight ${fontSize} ${colorClass}`}
                                    title={verdict}
                                >
                                    {verdict}
                                </p>
                                <p className="text-[11px] text-muted-foreground whitespace-normal leading-tight">
                                    Current project state
                                </p>
                            </div>
                        )
                    })()}
                </div>
            </div>
        </header>
    )
}
