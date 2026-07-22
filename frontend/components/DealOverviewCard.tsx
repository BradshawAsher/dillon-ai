import { ArrowDownToLine, BadgeDollarSign, CircleAlert, FileCheck2, MessageCircleQuestion, Scale, ShieldAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { formatCurrencyValue, getSubmissionInsightTone } from '../utils/aiSubmissionData'
import type { ProjectSummary } from '../utils/projectWorkspace'

type DealOverviewCardProps = {
    syntheses: ProjectSynthesisItem[]
    projects: ProjectSummary[]
    currentProjectId: string
}

function riskVariant(riskLevel: string): 'destructive' | 'warning' | 'secondary' | 'outline' {
    const normalized = riskLevel.trim().toLowerCase()

    if (normalized === 'critical' || normalized === 'high') return 'destructive'
    if (normalized === 'medium') return 'warning'
    if (normalized === 'low') return 'secondary'

    return 'outline'
}

function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function InsightList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    }

    return (
        <ul className="space-y-2 text-sm leading-6 text-foreground">
            {items.slice(0, 2).map((item) => <li key={item}>{item}</li>)}
        </ul>
    )
}

export default function DealOverviewCard({ syntheses, projects, currentProjectId }: DealOverviewCardProps) {
    const projectId = currentProjectId.trim()
    const synthesis = syntheses.find((item) => item.projectId === projectId)
    const project = projects.find((item) => (item.projectId || item.projectKey) === projectId)
    const projectName = project ? `${project.projectName} - ${project.companyName}` : projectId || 'Selected project'
    const hasValuation = Boolean(synthesis?.valuationLowerBound || synthesis?.valuationBaseEstimate || synthesis?.valuationUpperBound)

    return (
        <Card className="overflow-hidden border-primary/30">
            <CardHeader className="border-b border-primary/20 bg-primary/5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Deal overview</CardTitle>
                        </div>
                        <CardDescription>
                            Decision-first view for {projectName}. Metrics are drawn from the latest project synthesis and linked detail remains below.
                        </CardDescription>
                    </div>
                    {synthesis ? (
                        <div className="flex flex-wrap gap-2">
                            {synthesis.finalRecommendation ? <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>{synthesis.finalRecommendation}</Badge> : null}
                            {synthesis.finalRiskLevel ? <Badge variant={riskVariant(synthesis.finalRiskLevel)}>Risk: {synthesis.finalRiskLevel}</Badge> : null}
                            {synthesis.documentsReceivedCount > 0 ? <Badge variant="outline">{synthesis.documentsCompletedCount}/{synthesis.documentsReceivedCount} documents processed</Badge> : null}
                        </div>
                    ) : <Badge variant="outline">Awaiting synthesis</Badge>}
                </div>
            </CardHeader>

            <CardContent className="space-y-5 p-4">
                <nav aria-label="Deal workspace sections" className="flex flex-wrap gap-2 border-b border-border pb-4">
                    <button type="button" className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">Overview</button>
                    <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted" onClick={() => scrollToSection('project-synthesis')}>Diligence</button>
                    <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted" onClick={() => scrollToSection('project-synthesis')}>Valuation</button>
                    <button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted" onClick={() => scrollToSection('project-portfolio')}>Documents</button>
                    <span className="self-center text-xs text-muted-foreground">Returns, Growth, and Deal Structure unlock when their models are added.</span>
                </nav>

                {!synthesis ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                        Upload and process the project documents to generate an evidence-backed recommendation, valuation range, and negotiation plan here.
                    </div>
                ) : (
                    <>
                        {synthesis.finalJudgmentSummary ? (
                            <div className="rounded-lg border border-border bg-background p-4">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Executive assessment</p>
                                <p className="mt-2 text-sm leading-6 text-foreground">{synthesis.finalJudgmentSummary}</p>
                            </div>
                        ) : null}

                        <div className="grid gap-3 lg:grid-cols-3">
                            <div className="rounded-lg border border-border bg-background p-4">
                                <div className="flex items-center gap-2 text-muted-foreground"><BadgeDollarSign className="h-4 w-4" /><p className="text-xs font-medium uppercase tracking-wide">Supported valuation</p></div>
                                {hasValuation ? (
                                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                        <div><p className="text-xs text-muted-foreground">Low</p><p className="mt-1 font-semibold">{formatCurrencyValue(synthesis.valuationLowerBound, synthesis.valuationCurrency) || 'Pending'}</p></div>
                                        <div><p className="text-xs text-muted-foreground">Base</p><p className="mt-1 font-semibold">{formatCurrencyValue(synthesis.valuationBaseEstimate, synthesis.valuationCurrency) || 'Pending'}</p></div>
                                        <div><p className="text-xs text-muted-foreground">High</p><p className="mt-1 font-semibold">{formatCurrencyValue(synthesis.valuationUpperBound, synthesis.valuationCurrency) || 'Pending'}</p></div>
                                    </div>
                                ) : <p className="mt-3 text-sm text-muted-foreground">No supported valuation range has been returned yet.</p>}
                            </div>
                            <div className="rounded-lg border border-border bg-background p-4">
                                <div className="flex items-center gap-2 text-muted-foreground"><ArrowDownToLine className="h-4 w-4" /><p className="text-xs font-medium uppercase tracking-wide">Price position</p></div>
                                <p className="mt-3 text-sm font-medium text-foreground">Asking price not captured</p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">Add it to the deal model before showing a premium/discount against the supported range.</p>
                            </div>
                            <div className="rounded-lg border border-border bg-background p-4">
                                <div className="flex items-center gap-2 text-muted-foreground"><FileCheck2 className="h-4 w-4" /><p className="text-xs font-medium uppercase tracking-wide">Evidence coverage</p></div>
                                <p className="mt-3 text-sm font-medium text-foreground">{synthesis.documentsCompletedCount} of {synthesis.documentsReceivedCount} documents processed</p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">{synthesis.missingDocuments.length > 0 ? `${synthesis.missingDocuments.length} requested material${synthesis.missingDocuments.length === 1 ? '' : 's'} still missing.` : 'No missing core materials recorded.'}</p>
                            </div>
                        </div>

                        <div className="grid gap-3 xl:grid-cols-3">
                            <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
                                <div className="flex items-center gap-2"><CircleAlert className="h-4 w-4 text-destructive" /><p className="text-sm font-semibold">Top diligence risks</p></div>
                                <div className="mt-3"><InsightList items={synthesis.crossDocumentConflicts} emptyLabel="No cross-document conflicts recorded." /></div>
                            </div>
                            <div className="rounded-lg border border-border bg-muted/20 p-4">
                                <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-foreground" /><p className="text-sm font-semibold">Negotiation plan</p></div>
                                <div className="mt-3"><InsightList items={synthesis.negotiationLevers} emptyLabel="No negotiation levers surfaced yet." /></div>
                            </div>
                            <div className="rounded-lg border border-warning/25 bg-warning/5 p-4">
                                <div className="flex items-center gap-2"><MessageCircleQuestion className="h-4 w-4 text-warning" /><p className="text-sm font-semibold">Open questions</p></div>
                                <div className="mt-3"><InsightList items={synthesis.openQuestions} emptyLabel="No open management questions recorded." /></div>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
