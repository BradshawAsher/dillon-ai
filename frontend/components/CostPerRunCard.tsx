import { DollarSign } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    documentsProcessed: number
    synthesisRuns: number
}

const ESTIMATED_COST_PER_DOC = 0.08
const ESTIMATED_COST_PER_SYNTHESIS = 0.15

export default function CostPerRunCard({ documentsProcessed, synthesisRuns }: Props) {
    const estimatedDocCost = documentsProcessed * ESTIMATED_COST_PER_DOC
    const estimatedSynthesisCost = synthesisRuns * ESTIMATED_COST_PER_SYNTHESIS
    const totalEstimated = estimatedDocCost + estimatedSynthesisCost

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Estimated cost per run</CardTitle>
                        </div>
                        <CardDescription>Estimated LLM API costs based on document count and synthesis runs. Actual costs will show once the Pod 1 API key is configured with usage tracking.</CardDescription>
                    </div>
                    <Badge variant="warning">Estimated</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents processed</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{documentsProcessed}</p>
                        <p className="mt-1 text-xs text-muted-foreground">~${ESTIMATED_COST_PER_DOC.toFixed(2)}/doc</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Synthesis runs</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{synthesisRuns}</p>
                        <p className="mt-1 text-xs text-muted-foreground">~${ESTIMATED_COST_PER_SYNTHESIS.toFixed(2)}/run</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Doc analysis cost</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">${estimatedDocCost.toFixed(2)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Per-document extraction + reconciliation</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total estimated</p>
                        <p className="mt-1 text-lg font-semibold text-success">${totalEstimated.toFixed(2)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">All runs this project</p>
                    </div>
                </div>
                <div className="mt-4 rounded-md border border-dashed border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                        <strong>Note:</strong> These are rough estimates based on typical GPT-4o token usage (~$0.08 per document analysis, ~$0.15 per synthesis).
                        Actual costs depend on document length, retry count, and model pricing. Connect the Pod 1 API key with usage tracking to see real costs.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
