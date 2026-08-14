import { Clock3, DollarSign, TrendingUp } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { estimateMonthlyCost, MEASURED_COST_PER_DOCUMENT, MEASURED_ROUTING_SAVINGS, SAMPLE_DOCUMENT_LEGS, topSpendDrivers } from '../utils/costModel'
import { estimateProcessingSeconds, formatDuration } from '../utils/processingTime'
import InfoTip from './InfoTip'

type Props = {
    documentsProcessed: number
    synthesisRuns: number
    actualDocCost?: number
    actualSynthesisCost?: number
    actualTotalTokens?: number
}

// Per-document cost is measured from token telemetry (see utils/costModel.ts).
const ESTIMATED_COST_PER_DOC = MEASURED_COST_PER_DOCUMENT
const ESTIMATED_COST_PER_SYNTHESIS = 0.12
const ROUTING_SAVINGS_PCT = Math.round(MEASURED_ROUTING_SAVINGS * 100)

export default function CostPerRunCard({
    documentsProcessed,
    synthesisRuns,
    actualDocCost,
    actualSynthesisCost,
    actualTotalTokens,
}: Props) {
    const hasLiveDocCost = typeof actualDocCost === 'number' && actualDocCost > 0
    const hasLiveSynthCost = typeof actualSynthesisCost === 'number' && actualSynthesisCost > 0
    const estimatedDocCost = hasLiveDocCost ? actualDocCost : documentsProcessed * ESTIMATED_COST_PER_DOC
    const estimatedSynthesisCost = hasLiveSynthCost ? actualSynthesisCost : synthesisRuns * ESTIMATED_COST_PER_SYNTHESIS
    const totalEstimated = estimatedDocCost + estimatedSynthesisCost

    // Typical wall-clock time for a batch this size, so a multi-minute run does
    // not read as a stall. Assumes one synthesis when any documents are present.
    const typicalTime = formatDuration(
        estimateProcessingSeconds({ documentCount: documentsProcessed, includeSynthesis: documentsProcessed > 0 }).totalSeconds,
    )

    // Track A: where the money actually goes per document, and a monthly
    // projection at the current throughput so spend is legible at scale.
    const spendDrivers = topSpendDrivers(SAMPLE_DOCUMENT_LEGS, 3)
    const monthlyAtCurrentPace = estimateMonthlyCost(documentsProcessed, synthesisRuns, ESTIMATED_COST_PER_SYNTHESIS)

    const handleOpenSpendingTab = () => {
        window.location.hash = 'spending'
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">
                                {hasLiveDocCost || hasLiveSynthCost ? 'Cost per run (active project live tokens)' : 'Estimated cost per run (active project)'}
                            </CardTitle>
                        </div>
                        <CardDescription>
                            {hasLiveDocCost || hasLiveSynthCost
                                ? `Calculated directly from live token telemetry for this active project (${actualTotalTokens ? `${actualTotalTokens.toLocaleString()} total tokens logged` : 'from n8n executions'}).`
                                : 'Active deal execution cost: per-document extraction measured from token telemetry, synthesis pass estimated. Pod 1 credential active.'}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={hasLiveDocCost || hasLiveSynthCost ? 'success' : 'secondary'}>
                            {hasLiveDocCost || hasLiveSynthCost ? 'Live Token Telemetry' : 'Pod 1 Active'}
                        </Badge>
                        <button
                            onClick={handleOpenSpendingTab}
                            className="text-xs font-semibold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
                        >
                            View Spending &amp; Billing Report →
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active deal documents</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{documentsProcessed}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {hasLiveDocCost ? `$${(actualDocCost / (documentsProcessed || 1)).toFixed(3)}/doc (live)` : `~${ESTIMATED_COST_PER_DOC.toFixed(2)}/doc`}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center gap-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Synthesis passes</p>
                            <InfoTip term="Synthesis run" definition="One OpenAI 5.6 Terra pass that consolidates all of a project's documents into a single judgment." />
                        </div>
                        <p className="mt-1 text-lg font-semibold text-foreground">{synthesisRuns}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {hasLiveSynthCost ? `$${actualSynthesisCost.toFixed(3)}/run (live)` : `~${ESTIMATED_COST_PER_SYNTHESIS.toFixed(2)}/run (est.)`}
                        </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Doc analysis cost</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">${estimatedDocCost.toFixed(3)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{hasLiveDocCost ? 'Sum of live document runs' : 'Per-document extraction + reconciliation'}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {hasLiveDocCost || hasLiveSynthCost ? 'Total deal cost' : 'Total estimated'}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-success">${totalEstimated.toFixed(3)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Active project total</p>
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
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5 text-primary" />
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top spend drivers (per doc)</p>
                            <InfoTip term="Spend drivers" definition="The largest cost contributors in a typical document run, split by model and by input vs. output tokens. Output tokens cost the most, so they usually dominate." />
                        </div>
                        <ol className="mt-2 space-y-1.5">
                            {spendDrivers.map((driver, i) => (
                                <li key={driver.label} className="flex items-center justify-between gap-2 text-xs">
                                    <span className="flex items-center gap-1.5 text-foreground">
                                        <span className="text-muted-foreground">{i + 1}.</span>
                                        {driver.label}
                                    </span>
                                    <span className="font-medium text-foreground">{Math.round(driver.share * 100)}%</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projected monthly deal spend</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">${monthlyAtCurrentPace.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            At scale: 1,000 docs/mo ≈ <span className="font-medium text-foreground">${estimateMonthlyCost(1000, 200, ESTIMATED_COST_PER_SYNTHESIS).toFixed(0)}</span> (with ~200 syntheses)
                        </p>
                    </div>
                </div>
                <div className="mt-4 rounded-md border border-dashed border-border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">
                        <strong>Models &amp; Provider Architecture:</strong> Document analysis uses <strong>Claude Sonnet 5</strong> (Primary) with <strong>Claude Opus 5</strong> (Backup). Project synthesis uses <strong>OpenAI 5.6 Terra</strong> (Primary) with <strong>OpenAI 5.6 Sol</strong> (Backup). Multi-model routing saves ~{ROUTING_SAVINGS_PCT}% versus an all-Sonnet/Opus pipeline.
                        Actual costs vary with document length, retry count, and context size.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
