import React from 'react'
import { FolderKanban, Moon, Sun, Key, Globe, Play, Compass, Sparkles } from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import DealStageIndicator from '../DealStageIndicator'
import PipelineStatusIndicator from '../PipelineStatusIndicator'
import ExportDealButton from '../ExportDealButton'
import KeyboardShortcutsDialog from '../KeyboardShortcutsDialog'
import NotificationCenter, { type Notification } from '../NotificationCenter'
import LoginButton from '../AuthGate'

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
}: WorkspaceHeaderProps) {
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
                        <LoginButton />
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
                        const fontSize =
                            verdict.length <= 4
                                ? 'text-xl sm:text-2xl'
                                : verdict.length <= 7
                                ? 'text-lg sm:text-xl'
                                : verdict.length <= 10
                                ? 'text-[15px] sm:text-base'
                                : verdict.length <= 14
                                ? 'text-sm sm:text-[15px]'
                                : 'text-xs sm:text-sm'

                        return (
                            <div className="rounded-lg border border-border bg-background px-3 py-2.5 min-w-0 flex flex-col justify-between">
                                <p className="text-[11px] font-medium uppercase tracking-tight text-muted-foreground whitespace-normal leading-tight">
                                    Synthesis verdict
                                </p>
                                <p
                                    className={`my-0.5 font-bold tracking-tight text-foreground whitespace-nowrap leading-tight ${fontSize}`}
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
