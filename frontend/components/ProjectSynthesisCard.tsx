import { Download, FileText, Landmark, Loader2, MessageCircleQuestion, RefreshCw, Scale, ShieldAlert, TriangleAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import ExpandableInsightGroup from './ExpandableInsightGroup'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Progress } from '../lib/shadcn/progress'
import { getSubmissionInsightTone } from '../utils/aiSubmissionData'
import { downloadTextFile, fileSafeName } from '../utils/downloadFile'
import type { ProjectSummary } from '../utils/projectWorkspace'

type ProjectSynthesisCardProps = {
    syntheses: ProjectSynthesisItem[]
    projects: ProjectSummary[]
    currentProjectId: string
    synthesisPending: boolean
    synthesisProgress: number
    synthesisStage: string
    loading: boolean
    error: string | null
    onRefresh: () => void
}

function getRiskVariant(riskLevel: string): 'destructive' | 'warning' | 'secondary' | 'outline' {
    const normalized = riskLevel.trim().toLowerCase()

    if (normalized === 'critical' || normalized === 'high') {
        return 'destructive'
    }

    if (normalized === 'medium') {
        return 'warning'
    }

    if (normalized === 'low') {
        return 'secondary'
    }

    return 'outline'
}

function formatTimestamp(value: string) {
    if (value.trim().length === 0) {
        return 'Pending'
    }

    const parsed = Date.parse(value)

    if (Number.isNaN(parsed)) {
        return value
    }

    return new Date(parsed).toLocaleString()
}

function downloadSynthesisReport(synthesis: ProjectSynthesisItem, projectName: string) {
    const section = (title: string, items: string[]) => [
        '## ' + title,
        ...(items.length > 0 ? items.map((item) => '- ' + item) : ['- None recorded.']),
        '',
    ]

    const report = [
        '# ' + projectName + ' — Project Synthesis',
        '',
        'Generated: ' + new Date().toLocaleString(),
        'Recommendation: ' + (synthesis.finalRecommendation || 'Pending'),
        'Risk level: ' + (synthesis.finalRiskLevel || 'Pending'),
        'Documents processed: ' + synthesis.documentsCompletedCount + '/' + synthesis.documentsReceivedCount,
        '',
        '## Acquisition judgment',
        synthesis.finalJudgmentSummary || 'No final judgment recorded.',
        '',
        '## Valuation range',
        'Lower: ' + (synthesis.valuationLowerBound || 'Pending') + ' ' + synthesis.valuationCurrency,
        'Base: ' + (synthesis.valuationBaseEstimate || 'Pending') + ' ' + synthesis.valuationCurrency,
        'Upper: ' + (synthesis.valuationUpperBound || 'Pending') + ' ' + synthesis.valuationCurrency,
        '',
        ...section('Cross-document conflicts', synthesis.crossDocumentConflicts),
        ...section('Negotiation levers', synthesis.negotiationLevers),
        ...section('Missing diligence materials', synthesis.missingDocuments),
        ...section('Open questions for management', synthesis.openQuestions),
        ...section('Citations', synthesis.citations ?? []),
    ].join('\n')

    downloadTextFile(fileSafeName(projectName) + '-project-synthesis.md', report, 'text/markdown;charset=utf-8')
}

export default function ProjectSynthesisCard({ syntheses, projects, currentProjectId, synthesisPending, synthesisProgress, synthesisStage, loading, error, onRefresh }: ProjectSynthesisCardProps) {
    const projectNameById = new Map(
        projects.map((project) => [project.projectId || project.projectKey, `${project.projectName} • ${project.companyName}`])
    )

    const normalizedProjectId = currentProjectId.trim()
    const visibleSyntheses = syntheses.filter((synthesis) => synthesis.projectId === normalizedProjectId)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Project synthesis — final acquisition judgment</CardTitle>
                        <CardDescription>
                            Cross-document reconciliation written by the n8n consolidator workflow: one judgment per project, with
                            conflicts, gaps, and negotiation levers pulled from every uploaded document.
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={onRefresh} disabled={loading}>
                        <RefreshCw className={loading ? 'animate-spin' : undefined} />
                        Refresh synthesis
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 p-4">
                {error ? (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                        <p className="font-medium">Synthesis endpoint not reachable yet.</p>
                        <p className="mt-1 text-muted-foreground">
                            The dashboard expects an n8n webhook that returns project-level rows — see{' '}
                            <span className="font-mono">docs/n8n-webhooks.md</span> in the repo for the 5-minute setup. Error:{' '}
                            {error}
                        </p>
                    </div>
                ) : null}

                {!error && synthesisPending ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                        <div>
                            <p className="font-medium">Synthesizing project findings…</p>
                            <p className="mt-1 text-muted-foreground">All submitted documents are complete. The n8n consolidator is preparing the project-level judgment and this page will refresh automatically.</p>
                        </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>{synthesisStage}</span>
                            <span>{synthesisProgress}%</span>
                        </div>
                        <Progress value={synthesisProgress} className="mt-2 h-2.5" />
                    </div>
                ) : null}

                {!error && visibleSyntheses.length === 0 && !synthesisPending ? (
                    <p className="text-sm text-muted-foreground">
                        No project-level syntheses yet. Once the consolidator workflow has processed a project&apos;s documents,
                        its final judgment appears here.
                    </p>
                ) : null}

                {visibleSyntheses.map((synthesis) => {
                    const displayName = projectNameById.get(synthesis.projectId) ?? synthesis.projectId ?? 'Unknown project'

                    return (
                        <div key={`${synthesis.projectId}-${synthesis.id}`} className="space-y-4 rounded-xl border border-border bg-card p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                    <p className="text-lg font-semibold text-foreground">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {synthesis.documentsCompletedCount} of {synthesis.documentsReceivedCount} documents processed ·
                                        synthesized {formatTimestamp(synthesis.projectProcessedAt)}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button size="lg" onClick={() => downloadSynthesisReport(synthesis, displayName)}>
                                        <Download />
                                        Download project report
                                    </Button>
                                    {synthesis.finalRecommendation ? (
                                        <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>
                                            {synthesis.finalRecommendation}
                                        </Badge>
                                    ) : null}
                                    {synthesis.finalRiskLevel ? (
                                        <Badge variant={getRiskVariant(synthesis.finalRiskLevel)}>Risk: {synthesis.finalRiskLevel}</Badge>
                                    ) : null}
                                    {synthesis.finalTrafficLight ? (
                                        <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>
                                            {synthesis.finalTrafficLight}
                                        </Badge>
                                    ) : null}
                                    {synthesis.projectStatus ? <Badge variant="outline">{synthesis.projectStatus}</Badge> : null}
                                </div>
                            </div>

                            {synthesis.finalJudgmentSummary ? (
                                <div className="rounded-lg border border-border bg-background p-4">
                                    <div className="flex items-center gap-2">
                                        <Scale className="h-4 w-4 text-muted-foreground" />
                                        <p className="text-sm font-medium text-foreground">Acquisition judgment</p>
                                    </div>
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                        {synthesis.finalJudgmentSummary}
                                    </p>
                                </div>
                            ) : null}

                            {synthesis.valuationBaseEstimate || synthesis.valuationLowerBound || synthesis.valuationUpperBound ? (
                                <div className="grid gap-2 md:grid-cols-3">
                                    <div className="rounded-md border border-border bg-background px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lower bound</p>
                                            {synthesis.valuationCurrency ? <Badge variant="outline">{synthesis.valuationCurrency}</Badge> : null}
                                        </div>
                                        <p className="mt-1 text-sm text-foreground">{synthesis.valuationLowerBound || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-background px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base estimate</p>
                                        <p className="mt-1 text-sm text-foreground">{synthesis.valuationBaseEstimate || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-background px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upper bound</p>
                                        <p className="mt-1 text-sm text-foreground">{synthesis.valuationUpperBound || 'Pending'}</p>
                                    </div>
                                </div>
                            ) : null}

                            <div className="grid gap-3 xl:grid-cols-2">
                                <ExpandableInsightGroup
                                    title="Cross-document conflicts"
                                    icon={<TriangleAlert className="h-4 w-4 text-destructive" />}
                                    items={synthesis.crossDocumentConflicts}
                                    emptyLabel="No contradictions detected across the uploaded documents."
                                    badgeVariant="destructive"
                                    className="border-destructive/30 bg-destructive/5"
                                    itemClassName="border-destructive/20"
                                    defaultOpen
                                />
                                <ExpandableInsightGroup
                                    title="Negotiation levers"
                                    icon={<Landmark className="h-4 w-4 text-foreground" />}
                                    items={synthesis.negotiationLevers}
                                    emptyLabel="No negotiation levers surfaced yet."
                                />
                                <ExpandableInsightGroup
                                    title="Missing diligence materials"
                                    icon={<ShieldAlert className="h-4 w-4 text-warning" />}
                                    items={synthesis.missingDocuments}
                                    emptyLabel="All core diligence materials appear to be present."
                                    badgeVariant="warning"
                                    className="border-warning/30 bg-warning/5"
                                    itemClassName="border-warning/20"
                                />
                                <ExpandableInsightGroup
                                    title="Open questions for management"
                                    icon={<MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />}
                                    items={synthesis.openQuestions}
                                    emptyLabel="No open questions recorded."
                                />
                                {(synthesis.citations?.length ?? 0) > 0 ? (
                                    <ExpandableInsightGroup
                                        title="Synthesis citations"
                                        icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                                        items={synthesis.citations ?? []}
                                        emptyLabel="No synthesis citations recorded."
                                    />
                                ) : null}
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
