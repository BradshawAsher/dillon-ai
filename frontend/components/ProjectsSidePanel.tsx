import { useEffect, useState } from 'react'
import { FolderKanban, Search, X, Plus, Download, ArrowRight, Archive, ArchiveRestore, Shield, CheckCircle2 } from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import type { ProjectSummary } from '../utils/projectWorkspace'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { downloadSynthesisReport } from './ProjectSynthesisCard'
import { archiveProjectKey, getProjectStatusVariant, unarchiveProjectKey } from '../utils/projectWorkspace'
import { getLocalAppAuth } from '../services/supabaseAuth'
import { sendAdminAccessRequestSlackAlert } from '../services/slackAlertService'

interface ProjectsSidePanelProps {
    isOpen: boolean
    onClose: () => void
    projects: ProjectSummary[]
    activeProjectKey: string
    syntheses: ProjectSynthesisItem[]
    onSelectProject: (projectKey: string) => void
    onOpenIntake: () => void
}

export function ProjectsSidePanel({
    isOpen,
    onClose,
    projects,
    activeProjectKey,
    syntheses,
    onSelectProject,
    onOpenIntake,
}: ProjectsSidePanelProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [showArchived, setShowArchived] = useState(false)
    const [, setUpdateTick] = useState(0)
    const [adminApplied, setAdminApplied] = useState(false)
    const [isApplying, setIsApplying] = useState(false)
    const authUser = getLocalAppAuth()

    const handleApplyAdmin = async () => {
        if (!authUser) return
        setIsApplying(true)
        try {
            await sendAdminAccessRequestSlackAlert({
                fullName: authUser.name || 'MergeWorks User',
                email: authUser.email,
                team: authUser.team,
                reason: 'User applied from Projects Drawer to view all 62+ pushed projects firm-wide.',
            })
            setAdminApplied(true)
        } finally {
            setIsApplying(false)
        }
    }

    // Close panel on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    if (!isOpen) return null

    const activeProjects = projects.filter((project) => !project.isArchived)
    const archivedProjects = projects.filter((project) => project.isArchived)
    const currentProjects = showArchived ? archivedProjects : activeProjects

    const filteredProjects = currentProjects.filter((project) => {
        const query = searchTerm.trim().toLowerCase()
        if (!query) return true
        return (
            project.projectName.toLowerCase().includes(query) ||
            project.companyName.toLowerCase().includes(query) ||
            project.projectId.toLowerCase().includes(query) ||
            project.stage.toLowerCase().includes(query)
        )
    })

    const getVerdictVariant = (rec?: string, light?: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' => {
        const normLight = (light || '').trim().toUpperCase()
        if (normLight === 'RED') return 'destructive'
        if (normLight === 'YELLOW') return 'warning'
        if (normLight === 'GREEN') return 'success'

        const normRec = (rec || '').trim().toLowerCase()
        if (normRec.includes('renegotiat') || normRec.includes('caution') || normRec.includes('warn') || normRec.includes('yellow')) return 'warning'
        if (normRec.includes('abort') || normRec.includes('escalat') || normRec.includes('risk') || normRec.includes('red')) return 'destructive'
        if (normRec.includes('proceed') || normRec.includes('buy') || normRec.includes('acquire') || normRec.includes('green')) return 'success'
        return 'outline'
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-over Drawer Panel */}
            <aside
                className="fixed right-0 top-0 bottom-0 z-50 flex w-full sm:w-[480px] md:w-[520px] max-w-[95vw] flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out"
                role="dialog"
                aria-modal="true"
                aria-label="Projects drawer"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/80 p-3.5 bg-muted/40">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <FolderKanban className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground">Project Portfolio</h2>
                            <p className="text-xs text-muted-foreground">
                                {showArchived ? `Archived (${archivedProjects.length})` : `Active (${activeProjects.length})`}
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 rounded-full"
                        aria-label="Close projects panel"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Quick Action, View Switcher & Search */}
                <div className="space-y-3 border-b border-border bg-muted/20 p-4">
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            onClick={() => {
                                onOpenIntake()
                                onClose()
                            }}
                            className="flex-1 gap-2 font-semibold shadow-xs"
                        >
                            <Plus className="h-4 w-4" />
                            New project intake
                        </Button>
                        <Button
                            type="button"
                            variant={showArchived ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowArchived(!showArchived)}
                            className="gap-1.5"
                            title={showArchived ? 'View active projects' : 'View archived projects'}
                        >
                            <Archive className="h-3.5 w-3.5" />
                            {showArchived ? 'Active' : `Archived (${archivedProjects.length})`}
                        </Button>
                    </div>

                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={showArchived ? 'Search archived projects...' : 'Search by project name, ID, or company...'}
                            className="pl-9 text-sm"
                            aria-label="Search projects in side panel"
                        />
                    </div>

                    {/* Admin Access Callout for Non-Admin Users */}
                    {authUser?.role !== 'admin' && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-semibold">
                                    <Shield className="h-3.5 w-3.5 shrink-0" />
                                    <span>Want admin access to view all projects that have been pushed?</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-muted-foreground">
                                    {adminApplied ? 'Alert dispatched to #pod-1-agent-alerts' : 'Request full portfolio visibility firm-wide'}
                                </span>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleApplyAdmin}
                                    disabled={isApplying || adminApplied}
                                    className={`h-6 px-2.5 text-[11px] font-bold shrink-0 ${
                                        adminApplied
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                                    }`}
                                >
                                    {isApplying ? 'Sending...' : adminApplied ? '✓ Request Sent' : 'Apply for admin access now'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Project List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredProjects.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-muted/10 p-8 text-center">
                            <p className="text-sm font-medium text-muted-foreground">
                                {showArchived ? 'No archived projects found' : 'No matching active projects found'}
                            </p>
                        </div>
                    ) : (
                        filteredProjects.map((project) => {
                            const isSelected = project.projectKey === activeProjectKey
                            const synthesis = syntheses.find(
                                (c) => c.projectId === (project.projectId || project.projectKey)
                            )
                            const effectiveStatusLabel = synthesis ? 'Synthesized' : project.statusLabel

                            return (
                                <div
                                    key={project.projectKey}
                                    onClick={() => {
                                        onSelectProject(project.projectKey)
                                    }}
                                    className={`group relative flex flex-col rounded-xl border p-4 transition-all cursor-pointer hover:border-primary/50 hover:shadow-md ${
                                        isSelected
                                            ? 'border-primary bg-primary/[0.03] ring-2 ring-primary/20 shadow-sm'
                                            : 'border-border bg-card'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1 min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-bold text-foreground text-base truncate">
                                                    {project.projectName}
                                                </h3>
                                                {isSelected && (
                                                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                                                        Active
                                                    </Badge>
                                                )}
                                                {project.isFailedAbandoned && (
                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                                        Failed
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate">{project.companyName}</p>
                                        </div>

                                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-primary mt-1" />
                                    </div>

                                    {/* Badges */}
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <Badge variant={getProjectStatusVariant(effectiveStatusLabel)} className="text-xs">
                                            {effectiveStatusLabel}
                                        </Badge>

                                        {synthesis?.finalRecommendation ? (
                                            <Badge
                                                variant={getVerdictVariant(
                                                    synthesis.finalRecommendation,
                                                    synthesis.finalTrafficLight
                                                )}
                                                className="text-xs"
                                            >
                                                Verdict: {synthesis.finalRecommendation}
                                            </Badge>
                                        ) : null}
                                    </div>

                                    {/* Footer details */}
                                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5 text-xs text-muted-foreground">
                                        <span>{project.documentCount} doc{project.documentCount === 1 ? '' : 's'}</span>
                                        <div className="flex items-center gap-1.5">
                                            {!showArchived ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        archiveProjectKey(project.projectKey)
                                                        setUpdateTick((c) => c + 1)
                                                    }}
                                                    title="Archive project"
                                                >
                                                    <Archive className="mr-1 h-3 w-3" />
                                                    Archive
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        unarchiveProjectKey(project.projectKey)
                                                        setUpdateTick((c) => c + 1)
                                                    }}
                                                    title="Unarchive project"
                                                >
                                                    <ArchiveRestore className="mr-1 h-3 w-3" />
                                                    Restore
                                                </Button>
                                            )}

                                            {synthesis ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        downloadSynthesisReport(synthesis, project.projectName)
                                                    }}
                                                >
                                                    <Download className="mr-1 h-3 w-3" />
                                                    Report
                                                </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Footer hint */}
                <div className="border-t border-border p-3 text-center bg-muted/10 text-xs text-muted-foreground">
                    Tip: Press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Ctrl</kbd> + <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">Shift</kbd> + <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">P</kbd> to toggle this panel anytime.
                </div>
            </aside>
        </>
    )
}
