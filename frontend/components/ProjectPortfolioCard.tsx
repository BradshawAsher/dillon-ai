import { BriefcaseBusiness, Clock3, FileStack, Flag, FolderKanban, ShieldAlert } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { cn } from '../lib/shadcn/utils'
import {
    createProjectSummaries,
    formatProjectStage,
    getProjectStatusVariant,
} from '../utils/projectWorkspace'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'

type ProjectPortfolioCardProps = {
    rows: SubmissionHistoryItem[]
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

export default function ProjectPortfolioCard({ rows }: ProjectPortfolioCardProps) {
    const projects = createProjectSummaries(rows)
    const activeProjectCount = projects.filter((project) => project.activeCount > 0).length
    const reviewProjectCount = projects.filter((project) => project.reviewCount > 0).length
    const readyProjectCount = projects.filter((project) => project.statusLabel === 'Ready for synthesis').length
    const totalDocuments = projects.reduce((sum, project) => sum + project.documentCount, 0)

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
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">Portfolio view</Badge>
                        <Badge variant="secondary">Project-centric workflow</Badge>
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

                {projects.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        No projects inferred yet. Once uploads include a project ID or stable deal/company naming, this portfolio view will group them automatically.
                    </div>
                ) : (
                    <div className="grid gap-4 xl:grid-cols-2">
                        {projects.map((project) => {
                            const missingCoverage = project.coverage.filter((item) => !item.matched)

                            return (
                                <div key={project.projectKey} className="rounded-xl border border-border bg-background p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-semibold text-foreground">{project.projectName}</h3>
                                                <Badge variant={getProjectStatusVariant(project.statusLabel)}>{project.statusLabel}</Badge>
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
                                            {project.documentTypes.slice(0, 3).map((documentType) => (
                                                <Badge key={documentType} variant="outline">{documentType}</Badge>
                                            ))}
                                            {project.documentTypes.length > 3 ? (
                                                <Badge variant="secondary">+{project.documentTypes.length - 3} more</Badge>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                                    </div>

                                    <div className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
                                        <div className="flex items-center gap-2">
                                            <Flag className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm font-semibold text-foreground">Recommended next action</p>
                                        </div>
                                        <p className="mt-2 text-sm leading-6 text-foreground">{project.recommendation}</p>
                                    </div>

                                    <details className="mt-4 rounded-lg border border-border bg-muted/20 p-4">
                                        <summary className="cursor-pointer text-sm font-semibold text-foreground">
                                            Documents in this project ({project.documents.length})
                                        </summary>
                                        <div className="mt-3 space-y-2">
                                            {project.documents.map((document) => (
                                                <div key={`${document.requestID}-${document.fileName}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background/70 px-3 py-2 text-sm">
                                                    <div>
                                                        <p className="font-medium text-foreground">{document.fileName}</p>
                                                        <p className="text-xs text-muted-foreground">{document.documentType} · {document.status}</p>
                                                    </div>
                                                    <Badge variant="outline">{document.processedAt || 'Pending'}</Badge>
                                                </div>
                                            ))}
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
                                                                : 'Upload more than one document so the agent can reconcile discrepancies instead of analyzing a single artifact.'}
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
