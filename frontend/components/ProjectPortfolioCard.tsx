import { useState } from 'react'

import { BriefcaseBusiness, Clock3, Download, FileStack, Flag, FolderKanban, Plus, RefreshCw, Search, ShieldAlert } from 'lucide-react'
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
    createProjectSummaries,
    formatProjectStage,
    getProjectKey,
    getProjectStatusVariant,
} from '../utils/projectWorkspace'
import { computeImpactMetrics, formatHours } from '../utils/impactMetrics'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'

type ProjectPortfolioCardProps = {
    rows: SubmissionHistoryItem[]
    syntheses: ProjectSynthesisItem[]
    activeProjectKey: string
    onProjectSelect: (projectKey: string) => void
    onExcludeDocument: (requestID: string) => void
    onIncludeDocument: (requestID: string) => void
    onRetryDocument: (requestID: string) => void
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

export default function ProjectPortfolioCard({ rows, syntheses, activeProjectKey, onProjectSelect, onExcludeDocument, onIncludeDocument, onRetryDocument, retryingRequestId, onRunSynthesis, runningSynthesis, onAddDocuments }: ProjectPortfolioCardProps) {
    const [hideDuplicateDocs, setHideDuplicateDocs] = useState(true)
    const [projectSearch, setProjectSearch] = useState('')
    const [workstreamFilter, setWorkstreamFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [riskFilter, setRiskFilter] = useState('all')
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
    const projects = createProjectSummaries(filteredRows)
    const activeProjectCount = projects.filter((project) => project.activeCount > 0).length
    const reviewProjectCount = projects.filter((project) => project.reviewCount > 0).length
    const readyProjectCount = projects.filter((project) => project.statusLabel === 'Ready for synthesis').length
    const totalDocuments = projects.reduce((sum, project) => sum + project.documentCount, 0)
    const normalizedProjectSearch = projectSearch.trim().toLowerCase()
    const visibleProjects = normalizedProjectSearch.length === 0
        ? projects
        : projects.filter((project) => {
            const searchableProjectText = [
                project.projectName,
                project.projectId,
                project.companyName,
                project.stage,
                ...project.documents.map((document) => document.fileName),
            ].join(' ').toLowerCase()

            return searchableProjectText.includes(normalizedProjectSearch)
        })

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
            </CardHeader>

            <CardContent className="space-y-4 p-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryMetric label="Projects" value={projects.length} icon={FolderKanban} />
                    <SummaryMetric label="Documents" value={totalDocuments} icon={FileStack} />
                    <SummaryMetric label="Active projects" value={activeProjectCount} icon={Clock3} />
                    <SummaryMetric label="Needs review" value={reviewProjectCount} icon={ShieldAlert} />
                </div>

                {projects.length > 0 ? (
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={projectSearch}
                            onChange={(event) => setProjectSearch(event.target.value)}
                            placeholder="Search projects, IDs, stages, or document names"
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

                {projects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        No projects inferred yet. Once uploads include a project ID or stable deal/company naming, this portfolio view will group them automatically.
                    </div>
                ) : visibleProjects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        No projects match “{projectSearch}”.
                    </div>
                ) : (
                    <div className="max-h-[72rem] overflow-y-auto pr-2">
                        <div className="grid gap-4 xl:grid-cols-2">
                            {visibleProjects.map((project) => {
                                const projectImpact = computeImpactMetrics(rows.filter((row) => row.isConsidered && getProjectKey(row) === project.projectKey))
                                const missingCoverage = project.coverage.filter((item) => !item.matched)
                                const hasStoppedDocuments = rows.some((row) => getProjectKey(row) === project.projectKey && row.status.trim().toLowerCase() === 'stopped')
                                // project.documents is sorted latest-first, so keeping the first
                                // occurrence of each file name keeps the freshest upload.
                                const visibleDocuments = hideDuplicateDocs
                                    ? project.documents.filter((document, index, all) => {
                                        const normalizedName = document.fileName.trim().toLowerCase()
                                        return all.findIndex((candidate) => candidate.fileName.trim().toLowerCase() === normalizedName) === index
                                    })
                                    : project.documents
                                const hiddenDuplicateCount = project.documents.length - visibleDocuments.length
                                const synthesis = syntheses.find((candidate) => candidate.projectId === (project.projectId || project.projectKey))
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
                                            'rounded-xl border bg-background p-4 transition-colors',
                                            project.projectKey === activeProjectKey ? 'border-primary ring-1 ring-primary/20' : 'border-border',
                                        )}
                                    >
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold text-foreground">{project.projectName}</h3>
                                                    <Badge variant={getProjectStatusVariant(effectiveStatusLabel)}>{effectiveStatusLabel}</Badge>
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
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {onAddDocuments && (
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
                                                                {canRetry ? <Button type="button" size="sm" variant="outline" disabled={retryingRequestId === document.requestID} onClick={() => onRetryDocument(document.requestID)}>{retryingRequestId === document.requestID ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Retry</Button> : null}
                                                                {document.isConsidered ? <Button type="button" size="sm" variant="outline" onClick={() => onExcludeDocument(document.requestID)}>Exclude</Button> : <Button type="button" size="sm" variant="outline" onClick={() => onIncludeDocument(document.requestID)}>Include again</Button>}
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

                {readyProjectCount > 0 ? (
                    <div className="rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground">
                        {readyProjectCount} project{readyProjectCount === 1 ? '' : 's'} appear ready for a second-pass synthesis workflow that reconciles all uploaded materials into one acquisition judgment.
                    </div>
                ) : null}
            </CardContent>
        </Card>
    )
}
