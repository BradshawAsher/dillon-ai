import { Building2, CalendarClock, Clock3, FileCheck2, MapPin, Users } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

/** Formats an ISO timestamp as a short, human-readable "last updated" label. */
function formatUpdated(value: string | undefined): string | null {
    if (!value) return null
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return null
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function BusinessSnapshotCard({ model, synthesis, projectName }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const employees = typeof facts.employees?.value === 'number' ? facts.employees.value : null
    const location = typeof facts.location?.value === 'string' ? facts.location.value : null
    const industry = typeof facts.industry?.value === 'string' ? facts.industry.value : null

    // Reporting period is worth surfacing so a viewer knows which year the
    // headline financials describe — a metric without a period is undefendable.
    const period = facts.revenue?.period || facts.ebitda_sde?.period || null

    // Document-completeness summary: how much of the received document set has
    // finished processing. Falls back to synthesis counts when present.
    const received = synthesis?.documentsReceivedCount ?? 0
    const completed = synthesis?.documentsCompletedCount ?? 0
    const hasCoverage = received > 0

    const lastUpdated = formatUpdated(model.modelUpdatedAt) || formatUpdated(synthesis?.updatedAt)

    const summary = synthesis?.finalRecommendation
        || (synthesis?.greenFlags?.length ? synthesis.greenFlags[0] : null)
        || 'Upload more documents to generate a business summary.'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Business snapshot</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">{projectName || 'Target Company'}</h3>
                    {industry && <Badge variant="outline">{industry}</Badge>}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    {location && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {location}
                        </span>
                    )}
                    {employees && (
                        <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {employees.toLocaleString()} employee{employees !== 1 ? 's' : ''}
                        </span>
                    )}
                    {period && (
                        <span className="flex items-center gap-1.5">
                            <CalendarClock className="h-3.5 w-3.5" />
                            Reporting period: {period}
                        </span>
                    )}
                    {hasCoverage && (
                        <span className="flex items-center gap-1.5">
                            <FileCheck2 className="h-3.5 w-3.5" />
                            {completed}/{received} document{received !== 1 ? 's' : ''} processed
                        </span>
                    )}
                </div>

                <p className="text-sm text-foreground leading-relaxed">{summary}</p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {!location && !employees && !industry && !period && (
                        <p className="text-[10px] text-muted-foreground italic">
                            Upload documents containing company info (employee count, location, industry, reporting period) to populate this snapshot.
                        </p>
                    )}
                    {lastUpdated && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock3 className="h-3 w-3" />
                            Updated {lastUpdated}
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
