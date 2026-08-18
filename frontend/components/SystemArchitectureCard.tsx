import { useState } from 'react'
import { Braces, ChevronDown, ChevronRight, Server } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'

type ArchitectureItem = {
    area: string
    description: string
    n8nWorkflow?: string
    n8nWorkflowId?: string
    frontendFiles: string[]
    edgeCases: string[]
}

const architecture: ArchitectureItem[] = [
    {
        area: 'Structured output parsing (why it sometimes fails)',
        description: 'The per-document LLM returns structured JSON. When it fails, the workflow retries with recovery prompts.',
        n8nWorkflow: '[Pod 1] - Financial DD Agent - Robust Per Document AI Analysis',
        n8nWorkflowId: 'W5Jp7CJIQbNy0qlY',
        frontendFiles: [
            'n8n structured output parser node in the per-document workflow',
            'Recovery attempt uses a separate "fix this JSON" prompt with the raw LLM output',
        ],
        edgeCases: [
            'Common cause: LLM returns markdown-wrapped JSON (```json...```) instead of raw JSON',
            'Common cause: LLM adds trailing commentary after the JSON object closes',
            'Common cause: Very long documents cause the LLM to truncate its response mid-JSON',
            'Common cause: Complex table structures confuse the model into nested arrays the schema rejects',
            'Mitigation: 3 retry attempts with escalating wait times (2s, 6s, 15s)',
            'Mitigation: Recovery prompt strips markdown fences and asks for just the JSON',
            'If all retries fail: document reaches "failed" status with the parse error message visible in audit trail',
            'NOT a frontend issue — this is purely LLM output quality vs schema validation in n8n',
        ],
    },
    {
        area: 'Document intake & upload',
        description: 'Accepts files from the browser, encodes to base64, and sends to n8n webhook for processing.',
        n8nWorkflow: '[Pod 1] - Financial DD Agent - MCP Test - Robust Per Document AI Analysis',
        n8nWorkflowId: 'W5Jp7CJIQbNy0qlY',
        frontendFiles: [
            'frontend/components/ProjectIntakeCard.tsx — upload form, file selection, project assignment',
            'frontend/pages/DueDiligenceDashboard.tsx — handleSubmit, batch orchestration',
            'frontend/utils/fileEncoding.ts — readFileAsBase64',
        ],
        edgeCases: [
            'Duplicate detection: same filename + size in same project is blocked before sending',
            'Large documents (>100K chars): analysis continues with an advisory, not rejection',
            'Provider parse failures: retries up to 3 times with exponential backoff',
            'Malformed CSV/table shapes: recorded as advisory, processing continues',
        ],
    },
    {
        area: 'Document counter & synthesis trigger',
        description: 'Tracks how many documents in a project have completed. Once all are terminal, starts synthesis asynchronously.',
        n8nWorkflow: '[Pod 1] Financial DD Agent - DOCUMENT COUNTER UTILITY SUBWORKFLOW',
        n8nWorkflowId: '0OVTAMMp2iMx53Aw',
        frontendFiles: [
            'frontend/pages/DueDiligenceDashboard.tsx — isCurrentProjectAwaitingSynthesis, currentSynthesisProgress',
        ],
        edgeCases: [
            'Failed documents do not block synthesis of usable ones',
            'Counter writes synthesis_pending then starts consolidator with waitForSubWorkflow: false',
            'Excluded (isConsidered=false) documents are not counted toward completion',
        ],
    },
    {
        area: 'Project synthesis (consolidator)',
        description: 'Cross-document reconciliation producing final acquisition judgment, valuation range, risk level, and structured findings.',
        n8nWorkflow: '[Pod 1] Financial DD Agent - SUBWORKFLOW PROJECT-WIDE CONSOLIDATOR WORKFLOW',
        n8nWorkflowId: 'IoSad3rTYJMk4Mon',
        frontendFiles: [
            'frontend/components/ProjectSynthesisCard.tsx — renders findings, flags, judgment',
            'frontend/components/AcquisitionJudgmentCallout.tsx — prominent buy/pass callout',
            'frontend/components/MaterialImpactView.tsx — finding impact categorization',
        ],
        edgeCases: [
            'Filters to considered + completed rows with nonempty extractedJson',
            'Valuation bounds may be absent if financial data is insufficient',
            'finalJudgmentJson preserves full structured output including per-finding citations',
            'Structured output parser failures are retried (format recovery attempts)',
        ],
    },
    {
        area: 'Deal Model & documented facts',
        description: 'Stores analyst assumptions and document-extracted financial facts. Facts are hydrated from completed documents on the frontend.',
        n8nWorkflow: 'Documented Facts Bridge (runs in per-document workflow after completion)',
        frontendFiles: [
            'frontend/pages/DueDiligenceDashboard.tsx — hydrateModelFactsFromDocuments, handleDealModelChange',
            'frontend/components/DealModelPendingCard.tsx — editable assumption inputs per area',
            'frontend/components/ModelAssumptionsSummary.tsx — read-only summary at top of tabs',
            'frontend/utils/evidence.ts — parseDocumentedFacts',
        ],
        edgeCases: [
            'Frontend hydration is display-only; n8n bridge is the source of truth',
            'Illustrative values are used when confirmed facts are missing (never saved)',
            'handleDealModelDefaults only fills null fields, never overwrites existing values',
        ],
    },
    {
        area: 'Document consideration (exclude/include)',
        description: 'Marks documents as excluded or re-included. Excluded documents are omitted from coverage and synthesis.',
        n8nWorkflow: 'Document Consideration',
        n8nWorkflowId: 'lXz9fVKY4RaTlDFM',
        frontendFiles: [
            'frontend/pages/DueDiligenceDashboard.tsx — handleExcludeDocument, handleIncludeDocument',
            'frontend/components/ProjectPortfolioCard.tsx — exclude/include buttons per document',
            'frontend/components/ProjectSynthesisCard.tsx — exclude/include in synthesis view',
        ],
        edgeCases: [
            'Exclude retains the audit row — permanent deletion is not supported',
            'Include triggers a counter refresh which may restart synthesis',
            'Accidental excludes are safely reversible',
        ],
    },
    {
        area: 'Valuation & returns modeling',
        description: 'Deterministic financial calculations from Deal Model assumptions and documented facts.',
        frontendFiles: [
            'frontend/components/DealValuationCard.tsx — 3-method comparison, sensitivity grid',
            'frontend/components/AllCashReturnsCard.tsx — unlevered baseline returns',
            'frontend/components/FinancedReturnsCard.tsx — levered returns with debt',
            'frontend/components/FinancedScenarioComparisonCard.tsx — bear/base/bull levered',
            'frontend/components/ScenarioComparisonCard.tsx — revenue growth scenarios',
            'frontend/components/DealStructureVisualCard.tsx — sources & uses, capital stack',
            'frontend/components/GrowthDecisionSummary.tsx — growth-at-a-glance hero card',
            'frontend/components/ReturnsDecisionSummary.tsx — returns-at-a-glance hero card',
        ],
        edgeCases: [
            'Charts refuse to render when required inputs are missing (never show NaN)',
            'Illustrative model preview: display-only values when confirmed facts missing',
            'Exit-value sensitivity needs revenue + growth + margin + exit multiple all set',
        ],
    },
    {
        area: 'Dillon AI Copilot & 3-Tier query engine',
        description: 'Interactive M&A diligence assistant with 3-tier routing: Cloud n8n Webhook -> Direct LLM Keys -> In-Browser Deterministic Engine.',
        n8nWorkflow: '[Pod 1] - Financial DD Agent - Chat & On-Demand Copilot Webhook',
        n8nWorkflowId: 'LBZVN8zeFT03Wn12',
        frontendFiles: [
            'frontend/components/DealChatPanel.tsx — floating chat panel, prompt builder, markdown parser, heuristic rules',
            'frontend/utils/evidence.ts — parses documented facts injected into AI context',
            'frontend/utils/dealMath.ts — financial sanity check helpers',
        ],
        edgeCases: [
            'Tier 1 (Cloud AI): Webhook call to n8n backed by GPT-4o / Claude / Gemini with complete deal context and cross-project portfolio state',
            'Tier 2 (Direct LLM): User-configured OpenAI/Anthropic/Gemini keys execute client-side API requests directly with zero intermediate server hops',
            'Tier 3 (In-Browser Deterministic): 0ms latency offline heuristic engine executing 20+ specialized M&A rule matchers',
            'Deterministic Disclaimer: Shows amber top banner when Tier 3 is triggered, with one-click "Run with Live LLM" action to force live AI execution',
            'Strict Link Cap: Caps deep-links to at most 1–2 card anchors per response to prevent cognitive overload',
            'What it is made to do: Auditing extracted financials, QoE add-backs, DSCR debt math, red flags, and 1-click workspace navigation',
            'What it is NOT made to do: Cannot provide legal CPA audit opinions, cannot hallucinate facts not in deal files, cannot modify database schemas or wire funds',
        ],
    },
]

export default function SystemArchitectureCard() {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">System architecture reference</CardTitle>
                    <CardInfoPopover cardId="system-architecture" />
                </div>
                <CardDescription>What n8n workflows and frontend files are responsible for each area. Click to expand edge cases.</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
                {architecture.map((item, index) => {
                    const isExpanded = expandedIndex === index
                    return (
                        <button
                            key={item.area}
                            type="button"
                            className="w-full text-left px-4 py-3 transition-colors hover:bg-muted/30"
                            onClick={() => setExpandedIndex(isExpanded ? null : index)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                                        <p className="text-sm font-semibold text-foreground">{item.area}</p>
                                    </div>
                                    <p className="mt-1 ml-6 text-xs text-muted-foreground">{item.description}</p>
                                </div>
                                {item.n8nWorkflow && (
                                    <Badge variant="outline" className="shrink-0 text-[10px]">n8n</Badge>
                                )}
                            </div>
                            {isExpanded && (
                                <div className="mt-3 ml-6 space-y-3" onClick={(e) => e.stopPropagation()}>
                                    {item.n8nWorkflow && (
                                        <div className="rounded-md border border-border bg-background p-3">
                                            <p className="text-xs font-medium text-muted-foreground">n8n workflow</p>
                                            <p className="mt-1 text-sm text-foreground">{item.n8nWorkflow}</p>
                                            {item.n8nWorkflowId && <p className="mt-0.5 font-mono text-xs text-muted-foreground">ID: {item.n8nWorkflowId}</p>}
                                        </div>
                                    )}
                                    <div className="rounded-md border border-border bg-background p-3">
                                        <p className="text-xs font-medium text-muted-foreground">Frontend files</p>
                                        <ul className="mt-1 space-y-1">
                                            {item.frontendFiles.map((file) => (
                                                <li key={file} className="flex items-start gap-1.5 text-xs text-foreground">
                                                    <Braces className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                                    <span>{file}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="rounded-md border border-warning/20 bg-warning/5 p-3">
                                        <p className="text-xs font-medium text-muted-foreground">Edge cases & notes</p>
                                        <ul className="mt-1 space-y-1">
                                            {item.edgeCases.map((edge) => (
                                                <li key={edge} className="text-xs text-foreground">• {edge}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </button>
                    )
                })}
            </CardContent>
        </Card>
    )
}
