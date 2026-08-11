import { useState } from 'react'

import { Archive, ArchiveRestore, Bot, BriefcaseBusiness, CheckCircle, Clock3, Cpu, DollarSign, Download, FileStack, Flag, FolderKanban, Layers, Plus, RefreshCw, Search, ShieldAlert, TriangleAlert } from 'lucide-react'
import ExpandableText from './ExpandableText'

import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { Switch } from '../lib/shadcn/switch'
import { cn } from '../lib/shadcn/utils'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { downloadSynthesisReport } from './ProjectSynthesisCard'
import {
    archiveProjectKey,
    createProjectSummaries,
    formatProjectStage,
    getProjectKey,
    getProjectStatusVariant,
    unarchiveProjectKey,
} from '../utils/projectWorkspace'
import { computeImpactMetrics, formatHours } from '../utils/impactMetrics'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import {
    calculateBatchTotalCost,
    calculateSynthesisCost,
} from '../utils/diligenceDashboardUtils'

type ProjectPortfolioCardProps = {
    rows: SubmissionHistoryItem[]
    syntheses: ProjectSynthesisItem[]
    activeProjectKey: string
    onProjectSelect: (projectKey: string) => void
    onExcludeDocument: (requestID: string) => void
    onIncludeDocument: (requestID: string) => void
    onRetryDocument: (requestID: string) => void
    onRequeueNewProject?: (requestID?: string) => void
    retryingRequestId: string | null
    onRunSynthesis: () => void
    runningSynthesis: boolean
    onAddDocuments?: (projectKey: string) => void
}

function SummaryMetric({
    label,
    value,
    icon: Icon,
}: {
    label: string
    value: string | number
    icon: typeof BriefcaseBusiness
}) {
    return (
        <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
    )
}

function resolveProjectAiModels(projectDocs: SubmissionHistoryItem[], synthesis: any, projectKey: string, companyName?: string, projectName?: string) {
    const combinedKey = `${projectKey || ''} ${companyName || ''} ${projectName || ''}`.toLowerCase()

    const isPreDD001Legacy = (
        combinedKey.includes('business 1') || combinedKey.includes('business-1') || combinedKey.includes('werkheiser') ||
        combinedKey.includes('business 2') || combinedKey.includes('business-2') || combinedKey.includes('iron tree') || combinedKey.includes('iron_tree') ||
        combinedKey.includes('business 3') || combinedKey.includes('business-3') || combinedKey.includes('turnkey') || combinedKey.includes('conversionxl') || combinedKey.includes('cxl') ||
        combinedKey.includes('business 4') || combinedKey.includes('business-4') || combinedKey.includes('renew health') || combinedKey.includes('renew_health') ||
        combinedKey.includes('mergeworks 1') || combinedKey.includes('mergeworks-1') ||
        combinedKey.includes('mergeworks 2') || combinedKey.includes('mergeworks-2') ||
        combinedKey.includes('widgetco')
    )

    if (isPreDD001Legacy) {
        return {
            docPrimaryModel: 'Gemini 3.1 Flash Lite',
            docBackupModel: 'Gemini 3.1 Flash Lite',
            synthPrimaryModel: 'Gemini 3.1 Flash Lite',
            synthBackupModel: 'Gemini 3.1 Flash Lite',
        }
    }

    // All projects starting from DD-001 Cascadia Climate Services, Inc. onwards
    return {
        docPrimaryModel: 'Claude Sonnet 5',
        docBackupModel: 'Claude Opus 5',
        synthPrimaryModel: 'OpenAI 5.6 Terra',
        synthBackupModel: 'OpenAI 5.6 Sol',
    }
}

export default function ProjectPortfolioCard({ rows, syntheses, activeProjectKey, onProjectSelect, onExcludeDocument, onIncludeDocument, onRetryDocument, onRequeueNewProject, retryingRequestId, onRunSynthesis, runningSynthesis, onAddDocuments }: ProjectPortfolioCardProps) {
    const [hideDuplicateDocs, setHideDuplicateDocs] = useState(true)
    const [projectSearch, setProjectSearch] = useState('')
    const [workstreamFilter, setWorkstreamFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [riskFilter, setRiskFilter] = useState('all')
    const [portfolioTab, setPortfolioTab] = useState<'active' | 'archived'>('active')
    const [, setArchiveUpdateTick] = useState(0)

    const workstreams = [...new Set(rows.map((row) => row.workstream.trim()).filter(Boolean))].sort()
    const filteredRows = rows.filter((row) => {
        const status = row.status.trim().toLowerCase()
        const risk = `${row.trafficLight} ${row.riskLevel}`.trim().toLowerCase()
        const workstreamMatches = workstreamFilter === 'all' || row.workstream.trim() === workstreamFilter
        const statusMatches = statusFilter === 'all' || status === statusFilter
        const riskMatches = riskFilter === 'all'
            || (riskFilter === 'attention' && /red|high|yellow|medium/.test(risk))
            || (riskFilter === 'high' && /red|high/.test(risk))
        return workstreamMatches && statusMatches && riskMatches
    })
    const allProjects = createProjectSummaries(filteredRows, null, syntheses)

    const activeProjects = allProjects.filter((project) => !project.isArchived)
    const archivedProjects = allProjects.filter((project) => project.isArchived)
    const targetProjects = portfolioTab === 'active' ? activeProjects : archivedProjects

    const activeProjectCount = activeProjects.filter((project) => project.activeCount > 0).length
    const reviewProjectCount = activeProjects.filter((project) => project.reviewCount > 0).length
    const readyProjectCount = activeProjects.filter((project) => project.statusLabel === 'Ready for synthesis').length
    const totalDocuments = activeProjects.reduce((sum, project) => sum + project.documentCount, 0)
    const normalizedProjectSearch = projectSearch.trim().toLowerCase()

    const visibleProjects = normalizedProjectSearch.length === 0
        ? targetProjects
        : targetProjects.filter((project) => {
            const searchableProjectText = [
                project.projectName,
                project.projectId,
                project.companyName,
                project.stage,
                ...project.documents.map((document) => document.fileName),
            ].join(' ').toLowerCase()

            return searchableProjectText.includes(normalizedProjectSearch)
        })

    const handleArchive = (projectKey: string) => {
        archiveProjectKey(projectKey)
        setArchiveUpdateTick((prev) => prev + 1)
    }

    const handleUnarchive = (projectKey: string) => {
        unarchiveProjectKey(projectKey)
        setArchiveUpdateTick((prev) => prev + 1)
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Project portfolio</CardTitle>
                        <CardDescription>
                            Group uploaded documents by project so diligence can move from file-by-file extraction to project-level synthesis.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant="outline">Portfolio view</Badge>
                        <Badge variant="secondary">Project-centric workflow</Badge>
                        <label className="flex cursor-pointer items-center gap-2">
                            <Switch
                                checked={hideDuplicateDocs}
                                onCheckedChange={setHideDuplicateDocs}
                                aria-label="Hide duplicate documents in project lists"
                            />
                            <span>Hide duplicate uploads</span>
                        </label>
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
                    <Button
                        type="button"
                        variant={portfolioTab === 'active' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPortfolioTab('active')}
                        className="gap-2"
                    >
                        <FolderKanban className="h-4 w-4" />
                        Active Projects ({activeProjects.length})
                    </Button>
                    <Button
                        type="button"
                        variant={portfolioTab === 'archived' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPortfolioTab('archived')}
                        className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                        <Archive className="h-4 w-4" />
                        Archived Projects ({archivedProjects.length})
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryMetric label="Active Projects" value={activeProjects.length} icon={FolderKanban} />
                    <SummaryMetric label="Documents" value={totalDocuments} icon={FileStack} />
                    <SummaryMetric label="In progress" value={activeProjectCount} icon={Clock3} />
                    <SummaryMetric label="Needs review" value={reviewProjectCount} icon={ShieldAlert} />
                </div>

                {targetProjects.length > 0 ? (
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={projectSearch}
                            onChange={(event) => setProjectSearch(event.target.value)}
                            placeholder={portfolioTab === 'active' ? 'Search active projects, IDs, stages, or document names' : 'Search archived projects...'}
                            className="pl-9"
                            aria-label="Search project portfolio"
                        />
                    </div>
                ) : null}

                {rows.length > 0 ? (
                    <div className="grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-3">
                        <label className="space-y-1"><span className="text-xs font-medium text-muted-foreground">Workstream</span><select value={workstreamFilter} onChange={(event) => setWorkstreamFilter(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="all">All workstreams</option>{workstreams.map((workstream) => <option key={workstream} value={workstream}>{workstream}</option>)}</select></label>
                        <label className="space-y-1"><span className="text-xs font-medium text-muted-foreground">Document status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="all">All statuses</option><option value="completed">Completed</option><option value="processing">Processing</option><option value="failed">Failed</option><option value="needs_review">Needs review</option></select></label>
                        <label className="space-y-1"><span className="text-xs font-medium text-muted-foreground">Risk signal</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="all">All risk signals</option><option value="attention">Any attention</option><option value="high">High / red only</option></select></label>
                    </div>
                ) : null}

                {targetProjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        {portfolioTab === 'active'
                            ? 'No active projects found. Once uploads are submitted or unarchived, they will appear here.'
                            : 'No archived projects yet. You can archive failed or completed projects anytime to keep your active workspace clean.'}
                    </div>
                ) : visibleProjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        No projects match “{projectSearch}”.
                    </div>
                ) : (
                    <div className="h-[calc(100vh-280px)] min-h-[600px] overflow-y-auto pr-2 pb-10">
                        <div className="grid gap-4 xl:grid-cols-2">
                            {visibleProjects.map((project) => {
                                const projectImpact = computeImpactMetrics(rows.filter((row) => row.isConsidered && getProjectKey(row) === project.projectKey))
                                const missingCoverage = project.coverage.filter((item) => !item.matched)
                                const hasStoppedDocuments = rows.some((row) => getProjectKey(row) === project.projectKey && row.status.trim().toLowerCase() === 'stopped')
                                const visibleDocuments = hideDuplicateDocs
                                    ? project.documents.filter((document, index, all) => {
                                        const normalizedName = document.fileName.trim().toLowerCase()
                                        return all.findIndex((candidate) => candidate.fileName.trim().toLowerCase() === normalizedName) === index
                                    })
                                    : project.documents
                                const hiddenDuplicateCount = project.documents.length - visibleDocuments.length
                                const synthesis = syntheses.find((candidate) => candidate.projectId === (project.projectId || project.projectKey))
                                const hasFailedOrIncompleteDocs = project.documents.some((d) => ['failed', 'error', 'rejected'].includes(d.status.trim().toLowerCase())) || project.documents.some((d) => ['processing', 'queued', 'pending'].includes(d.status.trim().toLowerCase()))
                                const allDocsCompleted = project.documents.length > 0 && project.documents.every((d) => d.status.trim().toLowerCase() === 'completed')
                                const hasLiveSynthesis = synthesis !== undefined && (synthesis.projectStatus === 'synthesized' || synthesis.finalJudgmentSummary.trim().length > 0)

                                const cardHealthBorder = hasFailedOrIncompleteDocs
                                    ? 'border-destructive/80 bg-destructive/5 dark:bg-destructive/10 ring-1 ring-destructive/30'
                                    : (allDocsCompleted && !hasLiveSynthesis)
                                        ? 'border-amber-500/80 bg-amber-500/5 dark:bg-amber-950/20 ring-1 ring-amber-500/30'
                                        : 'border-emerald-500/80 bg-emerald-500/5 dark:bg-emerald-950/20 ring-1 ring-emerald-500/30'

                                const healthBadge = hasFailedOrIncompleteDocs ? (
                                    <Badge variant="destructive" className="gap-1 shadow-xs">
                                        <ShieldAlert className="h-3 w-3" /> Batch Incomplete / Errors
                                    </Badge>
                                ) : (allDocsCompleted && !hasLiveSynthesis) ? (
                                    <Badge variant="warning" className="gap-1 bg-amber-500/20 text-amber-800 dark:text-amber-200 border-amber-500/50 shadow-xs">
                                        <Clock3 className="h-3 w-3" /> Docs Processed · Synthesis Pending
                                    </Badge>
                                ) : (
                                    <Badge variant="success" className="gap-1 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/50 shadow-xs">
                                        <CheckCircle className="h-3 w-3" /> Fully Synthesized
                                    </Badge>
                                )

                                const effectiveStatusLabel = synthesis ? 'Synthesized' : project.statusLabel
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
                                    <div
                                        key={project.projectKey}
                                        className={cn(
                                            'rounded-xl border bg-background p-4 transition-all shadow-xs hover:shadow-md',
                                            cardHealthBorder,
                                            project.projectKey === activeProjectKey ? 'ring-2 ring-primary' : ''
                                        )}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-foreground">{project.projectName}</h3>
                                                    {healthBadge}
                                                    {synthesis?.finalRecommendation ? (
                                                        <Badge variant={getVerdictVariant(synthesis.finalRecommendation, synthesis.finalTrafficLight)}>
                                                            Verdict: {synthesis.finalRecommendation}
                                                        </Badge>
                                                    ) : null}
                                                    {hasStoppedDocuments ? <Badge variant="secondary">Stopped by user</Badge> : null}
                                                    {project.stage.trim().length > 0 && project.stage !== 'Stage not captured' ? (
                                                        <Badge variant="outline">{formatProjectStage(project.stage)}</Badge>
                                                    ) : null}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{project.companyName}</p>
                                                <p className="text-xs text-muted-foreground">Latest activity: {project.latestActivity}</p>
                                                {project.projectId.trim().length > 0 ? (
                                                    <p className="font-mono text-xs text-muted-foreground">Project ID: {project.projectId}</p>
                                                ) : null}
                                                {(() => {
                                                    const projectDocs = rows.filter((r) => (r.projectId || getProjectKey(r)) === project.projectKey || r.workstream === project.projectName)
                                                    const docBatchCost = calculateBatchTotalCost(projectDocs)
                                                    const synthCost = calculateSynthesisCost(synthesis)
                                                    const totalRunCost = docBatchCost + synthCost
                                                    const { docPrimaryModel, docBackupModel, synthPrimaryModel, synthBackupModel } = resolveProjectAiModels(projectDocs, synthesis, project.projectKey, project.companyName, project.projectName)
                                                    const passCycles = (projectDocs[0] as any)?.passCycles || (projectDocs[0] as any)?.cycleCount || '1/3'

                                                    return (
                                                        <div className="space-y-1.5 pt-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant="outline" className="gap-1 font-mono text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/60 py-0.5 px-2">
                                                                    <FileText className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                                                    <span>Total Per-Doc Cost: ${docBatchCost.toFixed(4)}</span>
                                                                </Badge>
                                                                <Badge variant="outline" className="gap-1 font-mono text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300/60 py-0.5 px-2">
                                                                    <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                                                                    <span>Total Synthesis Cost: ${synthCost.toFixed(4)}</span>
                                                                </Badge>
                                                                <Badge variant="outline" className="gap-1 font-mono text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/60 py-0.5 px-2">
                                                                    <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                                                    <span>Total Run Cost: ${totalRunCost.toFixed(4)}</span>
                                                                </Badge>
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                                <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-card border-border">
                                                                    <Cpu className="h-3 w-3 text-primary shrink-0" />
                                                                    Doc Primary: {docPrimaryModel}
                                                                </Badge>
                                                                <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-card border-border">
                                                                    <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                    Doc Backup: {docBackupModel}
                                                                </Badge>
                                                                <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-card border-border">
                                                                    <Bot className="h-3 w-3 text-primary shrink-0" />
                                                                    Synth Primary: {synthPrimaryModel}
                                                                </Badge>
                                                                <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-card border-border">
                                                                    <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
                                                                    Synth Backup: {synthBackupModel}
                                                                </Badge>
                                                                <Badge variant="outline" className="gap-1 font-mono text-[11px] bg-card border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                                                                    <RefreshCw className="h-3 w-3 text-emerald-600 shrink-0" />
                                                                    Cycles: {passCycles}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    )
                                                })()}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {portfolioTab === 'active' ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className={project.isFailedAbandoned ? 'border-destructive/40 text-destructive hover:bg-destructive/10' : 'text-muted-foreground hover:text-foreground'}
                                                        onClick={() => handleArchive(project.projectKey)}
                                                        title={project.isFailedAbandoned ? 'Archive failed project to clean up active workspace' : 'Archive project'}
                                                    >
                                                        <Archive className="h-3.5 w-3.5 mr-1" />
                                                        {project.isFailedAbandoned ? 'Archive Failed Project' : 'Archive'}
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-primary border-primary/30 hover:bg-primary/10"
                                                        onClick={() => handleUnarchive(project.projectKey)}
                                                    >
                                                        <ArchiveRestore className="h-3.5 w-3.5 mr-1" />
                                                        Unarchive
                                                    </Button>
                                                )}

                                                {onAddDocuments && portfolioTab === 'active' && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="lg"
                                                        onClick={() => onAddDocuments(project.projectKey)}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                        Add documents
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="lg"
                                                    disabled={!synthesis}
                                                    title={synthesis ? 'Download project synthesis' : 'Synthesis is not ready to download yet'}
                                                    onClick={() => {
                                                        if (synthesis) {
                                                            downloadSynthesisReport(synthesis, project.projectName)
                                                        }
                                                    }}
                                                >
                                                    <Download />
                                                    Download synthesis
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={project.projectKey === activeProjectKey ? 'secondary' : 'default'}
                                                    size="lg"
                                                    className="shadow-sm"
                                                    onClick={() => onProjectSelect(project.projectKey)}
                                                >
                                                    {project.projectKey === activeProjectKey ? 'Viewing project' : 'View this project'}
                                                </Button>
                                                {project.projectKey === activeProjectKey ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="lg"
                                                        className="shadow-sm"
                                                        disabled={runningSynthesis}
                                                        onClick={onRunSynthesis}
                                                    >
                                                        {runningSynthesis ? 'Synthesizing…' : 'Run synthesis'}
                                                    </Button>
                                                ) : null}
                                                {project.documentTypes.slice(0, 3).map((documentType) => (
                                                    <Badge key={documentType} variant="outline">{documentType}</Badge>
                                                ))}
                                                {project.documentTypes.length > 3 ? (
                                                    <Badge variant="secondary">+{project.documentTypes.length - 3} more</Badge>
                                                ) : null}
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Documents</p>
                                                <p className="mt-1 text-lg font-semibold text-foreground">{project.documentCount}</p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Completed</p>
                                                <p className="mt-1 text-lg font-semibold text-foreground">{project.completedCount}</p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Needs review</p>
                                                <p className="mt-1 text-lg font-semibold text-foreground">{project.reviewCount}</p>
                                            </div>
                                            <div className="rounded-lg border border-border bg-muted/30 p-3">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Red-risk docs</p>
                                                <p className="mt-1 text-lg font-semibold text-foreground">{project.redRiskCount}</p>
                                            </div>
                                            <div className="rounded-lg border border-success/25 bg-success/5 p-3">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Analyst time saved</p>
                                                <p className="mt-1 text-lg font-semibold text-success">
                                                    {projectImpact.completedDocuments > 0 ? `~${formatHours(projectImpact.timeSavedHours)}` : '—'}
                                                </p>
                                                <p className="mt-1 text-xs text-muted-foreground">40m baseline per completed doc</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
                                            <div className="flex items-center gap-2">
                                                <Flag className="h-4 w-4 text-muted-foreground" />
                                                <p className="text-sm font-semibold text-foreground">Recommended next action</p>
                                            </div>
                                            <ExpandableText text={project.recommendation} maxHeight={80} className="mt-2 text-sm leading-6 text-foreground" />
                                        </div>

                                        <details className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
                                            <summary className="cursor-pointer text-sm font-semibold text-foreground">
                                                Documents in this project ({visibleDocuments.length}
                                                {hiddenDuplicateCount > 0 ? ` shown · ${hiddenDuplicateCount} duplicate${hiddenDuplicateCount === 1 ? '' : 's'} hidden` : ''})
                                            </summary>
                                            <div className="mt-3 space-y-2">
                                                {visibleDocuments.map((document) => {
                                                    const status = document.status.trim().toLowerCase()
                                                    const canRetry = ['failed', 'error', 'rejected', 'needs_review', 'needs review', 'stopped'].includes(status) && document.requestID
                                                    return (
                                                        <div key={`${document.requestID}-${document.fileName}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/70 px-3 py-2 text-sm">
                                                            <div>
                                                                <p className="font-medium text-foreground">{document.fileName}</p>
                                                                <p className="text-xs text-muted-foreground">{document.documentType} · {document.status}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant={document.isConsidered ? 'outline' : 'secondary'}>{document.isConsidered ? (document.processedAt || 'Pending') : 'Excluded'}</Badge>
                                                                {canRetry ? (
                                                                    <>
                                                                        <Button type="button" size="sm" variant="outline" disabled={retryingRequestId === document.requestID} onClick={() => onRetryDocument(document.requestID)}>
                                                                            {retryingRequestId === document.requestID ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Retry
                                                                        </Button>
                                                                        {onRequeueNewProject && (
                                                                            <Button type="button" size="sm" variant="secondary" onClick={() => onRequeueNewProject(document.requestID)}>
                                                                                Try in new project
                                                                            </Button>
                                                                        )}
                                                                    </>
                                                                ) : null}
                                                                {document.isConsidered ? (
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            const autoReRun = window.confirm(
                                                                                `⚠️ Exclude document from synthesis?\n\nExcluding "${document.fileName}" will update the project scope.\n\nDo you want to re-run project synthesis now without this document?`
                                                                            )
                                                                            onExcludeDocument(document.requestID)
                                                                            if (autoReRun && onRunSynthesis) {
                                                                                onRunSynthesis()
                                                                            }
                                                                        }}
                                                                    >
                                                                        Exclude
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        type="button"
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            const autoReRun = window.confirm(
                                                                                `✨ Include document back into synthesis?\n\nIncluding "${document.fileName}" will add it back to the project scope.\n\nDo you want to re-run project synthesis now with this document?`
                                                                            )
                                                                            onIncludeDocument(document.requestID)
                                                                            if (autoReRun && onRunSynthesis) {
                                                                                onRunSynthesis()
                                                                            }
                                                                        }}
                                                                    >
                                                                        Include again
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </details>

                                        {project.synthesisFields.length > 0 ? (
                                            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/10 p-4">
                                                <p className="text-sm font-semibold text-foreground">Final synthesis results</p>
                                                <div className="mt-3 grid gap-3 md:grid-cols-2">
                                                    {project.synthesisFields.map((field) => (
                                                        <div key={field.label} className="rounded-md border border-border bg-background/70 p-3">
                                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{field.label}</p>
                                                            <p className="mt-1 text-sm font-medium text-foreground">{field.value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}

                                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                                            <div className="rounded-lg border border-border bg-muted/20 p-4">
                                                <p className="text-sm font-semibold text-foreground">Coverage checklist</p>
                                                <div className="mt-3 space-y-2">
                                                    {project.coverage.map((item) => (
                                                        <div
                                                            key={item.label}
                                                            className={cn(
                                                                'flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm',
                                                                item.matched
                                                                    ? 'border-success/30 bg-success/5 text-foreground'
                                                                    : 'border-warning/30 bg-warning/5 text-foreground'
                                                            )}
                                                        >
                                                            <span>{item.label}</span>
                                                            <Badge variant={item.matched ? 'success' : 'warning'}>
                                                                {item.matched ? `${item.count} doc${item.count === 1 ? '' : 's'}` : 'Missing'}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-border bg-muted/20 p-4">
                                                <p className="text-sm font-semibold text-foreground">Project synthesis readiness</p>
                                                <div className="mt-3 space-y-3 text-sm text-foreground">
                                                    <div className="flex items-start gap-2">
                                                        <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="font-medium">Cross-document reconciliation</p>
                                                            <p className="text-muted-foreground">
                                                                {project.documentCount > 1
                                                                    ? 'Enough documents are present to start comparing numbers, claims, and support across files.'
                                                                    : 'This completed document can be synthesized now. Add more files when you want cross-document reconciliation.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <ShieldAlert className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="font-medium">Negotiation leverage</p>
                                                            <p className="text-muted-foreground">
                                                                {project.redRiskCount > 0 || project.reviewCount > 0
                                                                    ? 'Risk signals already exist. A project-level workflow should consolidate these into management questions and price-adjustment leverage.'
                                                                    : 'Once risks emerge across multiple files, surface them here as negotiation themes.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <FileStack className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                                        <div>
                                                            <p className="font-medium">Missing diligence materials</p>
                                                            <p className="text-muted-foreground">
                                                                {missingCoverage.length > 0
                                                                    ? `Still missing: ${missingCoverage.map((item) => item.label).join(', ')}.`
                                                                    : 'Core document coverage looks strong enough for a project-level draft conclusion.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {readyProjectCount > 0 && portfolioTab === 'active' ? (
                    <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
                        {readyProjectCount} project{readyProjectCount === 1 ? '' : 's'} appear ready for a second-pass synthesis workflow that reconciles all uploaded materials into one acquisition judgment.
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}
