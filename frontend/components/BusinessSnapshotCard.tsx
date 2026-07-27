import { Building2, MapPin, Users } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

export default function BusinessSnapshotCard({ model, synthesis, projectName }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const employees = typeof facts.employees?.value === 'number' ? facts.employees.value : null
    const location = typeof facts.location?.value === 'string' ? facts.location.value : null
    const industry = typeof facts.industry?.value === 'string' ? facts.industry.value : null

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

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {location && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {location}
                        </span>
                    )}
                    {employees && (
                        <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {employees} employee{employees !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                <p className="text-sm text-foreground leading-relaxed">{summary}</p>

                {!location && !employees && !industry && (
                    <p className="text-[10px] text-muted-foreground italic">
                        Upload documents containing company info (employee count, location, industry) to populate this snapshot.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
