import { Clock3, DollarSign } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { MEASURED_COST_PER_DOCUMENT, MEASURED_ROUTING_SAVINGS } from '../utils/costModel'
import { estimateProcessingSeconds, formatDuration } from '../utils/processingTime'
import InfoTip from './InfoTip'

type Props = {
    documentsProcessed: number
    synthesisRuns: number
}

// Per-document cost is measured from token telemetry (see utils/costModel.ts).
// Synthesis token usage is not yet logged end to end, so it stays an estimate.
const ESTIMATED_COST_PER_DOC = MEASURED_COST_PER_DOCUMENT
const ESTIMATED_COST_PER_SYNTHESIS = 0.12
const ROUTING_SAVINGS_PCT = Math.round(MEASURED_ROUTING_SAVINGS * 100)

export default function CostPerRunCard({ documentsProcessed, synthesisRuns }: Props) {
    const estimatedDocCost = documentsProcessed * ESTIMATED_COST_PER_DOC
    const estimatedSynthesisCost = synthesisRuns * ESTIMATED_COST_PER_SYNTHESIS
    const totalEstimated = estimatedDocCost + estimatedSynthesisCost

    // Typical wall-clock time for a batch this size, so a multi-minute run does
    // not read as a stall. Assumes one synthesis when any documents are present.
    const typicalTime = formatDuration(
        estimateProcessingSeconds({ documentCount: documentsProcessed, includeSynthesis: documentsProcessed > 0 }).totalSeconds,
    )

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Estimated cost per run</CardTitle>
                        </div>
                        <CardDescription>Anthropic Claude API costs: per-document cost measured from token telemetry, synthesis runs estimated. Pod 1 credential is active.</CardDescription>
                    </div>
                    <Badge variant="secondary">Pod 1 Active</Badge>
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
                        <div className="flex items-center gap-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Synthesis runs</p>
                            <InfoTip term="Synthesis run" definition="One Sonnet pass that consolidates all of a project's documents into a single judgment. This per-run cost is still an estimate — synthesis token usage is not yet logged end to end." />
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">{synthesisRuns}</p>
                        <p className="mt-1 text-xs text-muted-foreground">~${ESTIMATED_COST_PER_SYNTHESIS.toFixed(2)}/run (est.)</p>
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
                {documentsProcessed > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        Typical processing time for {documentsProcessed} document{documentsProcessed === 1 ? '' : 's'} + synthesis:{' '}
                        <span className="font-medium text-foreground">{typicalTime}</span>
                        <span className="text-muted-foreground/70">(varies with document length and retries)</span>
                    </div>
                )}
                <div className="mt-4 rounded-md border border-dashed border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                        <strong>Provider:</strong> Anthropic Claude — Haiku 4.5 for validation/classification passes and Sonnet 4.6 for financial analysis and synthesis. Per-document cost is measured from token telemetry (Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15 per 1M tokens); two-model routing saves ~{ROUTING_SAVINGS_PCT}% versus an all-Sonnet pipeline.
                        Actual costs vary with document length, retry count, and context size.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
