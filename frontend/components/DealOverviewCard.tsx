import { useState } from 'react'
import { ArrowDownToLine, BadgeDollarSign, CircleAlert, FileCheck2, MessageCircleQuestion, Scale, ShieldAlert, UsersRound } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { formatCurrencyValue, getSubmissionInsightTone } from '../utils/aiSubmissionData'
import {
    debtToAssets as computeDebtToAssets,
    ebitdaMargin as computeEbitdaMargin,
    priceGapPercent as computePriceGapPercent,
    revenuePerEmployee as computeRevenuePerEmployee,
} from '../utils/dealMath'
import { formatHours, type ImpactMetrics } from '../utils/impactMetrics'
import type { ProjectSummary } from '../utils/projectWorkspace'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { buildDocumentLinkedEvidence, parseDocumentedFacts } from '../utils/evidence'
import type { EvidenceItem } from './EvidenceDrawer'
import ExpandableText from './ExpandableText'

type DealOverviewCardProps = {
    syntheses: ProjectSynthesisItem[]
    projects: ProjectSummary[]
    currentProjectId: string
    askingPrice: string
    onAskingPriceChange: (value: string) => void
    impact: ImpactMetrics
    model?: DealModel
    documents: SubmissionHistoryItem[]
    onOpenEvidence: (evidence: EvidenceItem) => void
    exampleMode?: boolean
}

function riskVariant(riskLevel: string): 'destructive' | 'warning' | 'secondary' | 'outline' {
    const normalized = riskLevel.trim().toLowerCase()

    if (normalized === 'critical' || normalized === 'high') return 'destructive'
    if (normalized === 'medium') return 'warning'
    if (normalized === 'low') return 'secondary'

    return 'outline'
}

function InsightList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
    const [expanded, setExpanded] = useState(false)
    if (items.length === 0) {
        return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    }

    const displayedItems = expanded ? items : items.slice(0, 2)

    return (
        <div className="space-y-2">
            <ul className="space-y-2.5 text-sm leading-6 text-foreground">
                {displayedItems.map((item, idx) => (
                    <li key={`${item}-${idx}`} className="border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                        <ExpandableText text={item} maxHeight={150} className="text-xs sm:text-sm leading-relaxed text-foreground" />
                    </li>
                ))}
            </ul>
            {items.length > 2 && (
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="mt-1.5 text-[11px] font-semibold text-primary hover:underline focus:outline-none"
                >
                    {expanded ? 'Show less items' : `Show all ${items.length} items`}
                </button>
            )}
        </div>
    )
}

function parseMoney(value: string) {
    const normalized = value.replace(/[$,\s]/g, '')
    const multiplier = /m$/i.test(normalized) ? 1_000_000 : /b$/i.test(normalized) ? 1_000_000_000 : /k$/i.test(normalized) ? 1_000 : 1
    const parsed = Number(normalized.replace(/[kmb]$/i, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed * multiplier : null
}

export default function DealOverviewCard({ syntheses, projects, currentProjectId, askingPrice, onAskingPriceChange, impact, model, documents, onOpenEvidence, exampleMode = false }: DealOverviewCardProps) {
    const projectId = currentProjectId.trim()
    const synthesis = syntheses.find((item) => item.projectId === projectId)
    const project = projects.find((item) => (item.projectId || item.projectKey) === projectId)
    const projectName = project ? `${project.projectName} - ${project.companyName}` : projectId || 'Selected project'
    const employeeCount = project?.employeeCount ?? (exampleMode ? 84 : null)
    const employeeCountLabel = employeeCount === null
        ? 'Not confirmed'
        : `${employeeCount.toLocaleString()} ${project?.employeeType || 'employees'}`
    const hasValuation = Boolean(synthesis?.valuationLowerBound || synthesis?.valuationBaseEstimate || synthesis?.valuationUpperBound)
    const askingPriceValue = parseMoney(askingPrice) ?? (exampleMode ? 110_000_000 : null)
    const baseValue = synthesis ? parseMoney(synthesis.valuationBaseEstimate) : null
    const priceGapPercent = computePriceGapPercent(askingPriceValue, baseValue)
    const priceGapLabel = priceGapPercent === null
        ? ''
        : priceGapPercent === 0
            ? 'matches the supported base valuation'
            : priceGapPercent > 0
                ? `${Math.abs(priceGapPercent).toFixed(1)}% above the supported base valuation`
                : `${Math.abs(priceGapPercent).toFixed(1)}% below the supported base valuation`
    let documentedFacts: Record<string, { value?: number; status?: string; currency?: string; period?: string; provenance?: string; confidence?: number; citations?: Array<{ source_file?: string; row_or_cell?: string; excerpt?: string }> }> = parseDocumentedFacts(model?.documentedFactsJson)
    if (exampleMode && Object.keys(documentedFacts).length === 0) documentedFacts = {
        revenue: { value: 48_100_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', confidence: 87, citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 18', excerpt: 'FY23 revenue reported as $48.1M; bank-deposit support remains under review.' }] },
        ebitda_sde: { value: 12_400_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', confidence: 87, citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 18', excerpt: 'EBITDA of $12.4M is within 4% of the target model.' }] },
        debt: { value: 13_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', confidence: 82, citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22', excerpt: 'Debt balance used for the demonstration debt-to-assets calculation.' }] },
        total_assets: { value: 60_000_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', confidence: 82, citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22', excerpt: 'Total assets used for the demonstration debt-to-assets calculation.' }] },
    }
    const confirmedFact = (field: string) => documentedFacts[field]?.status === 'confirmed' && typeof documentedFacts[field]?.value === 'number' ? documentedFacts[field].value ?? null : null
    const revenue = confirmedFact('revenue')
    const ebitda = confirmedFact('ebitda_sde')
    const debt = confirmedFact('debt')
    const assets = confirmedFact('total_assets')
    const purchasePrice = model?.purchasePrice ?? model?.askingPrice ?? askingPriceValue
    const initialInvestment = purchasePrice === null || purchasePrice === undefined ? null : purchasePrice + (model?.transactionFees ?? (exampleMode ? 1_500_000 : 0)) + (model?.workingCapitalRequirement ?? (exampleMode ? 2_000_000 : 0))
    const taxRate = model?.taxRate ?? (exampleMode ? 0.25 : null)
    const annualOperatingCashFlow = ebitda === null || taxRate === null ? null : ebitda * (1 - taxRate) - (model?.maintenanceCapex ?? (exampleMode ? 1_200_000 : 0))
    const annualRoi = initialInvestment !== null && initialInvestment > 0 && annualOperatingCashFlow !== null ? annualOperatingCashFlow / initialInvestment : null
    const paybackYears = initialInvestment !== null && annualOperatingCashFlow !== null && annualOperatingCashFlow > 0 ? initialInvestment / annualOperatingCashFlow : null
    const ebitdaMargin = computeEbitdaMargin(ebitda, revenue)
    const debtToAssets = computeDebtToAssets(debt, assets)
    const revenuePerEmployee = computeRevenuePerEmployee(revenue, employeeCount)
    const metricCurrency = documentedFacts.revenue?.currency || documentedFacts.ebitda_sde?.currency || synthesis?.valuationCurrency || 'USD'
    const evidenceForFact = (field: string, title: string): EvidenceItem => {
        const fact = documentedFacts[field]
        const citation = fact?.citations?.[0]
        return buildDocumentLinkedEvidence({
            title,
            sourceFile: citation?.source_file,
            fallbackSourceFile: 'Source file was not returned',
            sourceLocation: citation?.row_or_cell,
            excerpt: citation?.excerpt,
            period: fact?.period,
            currency: fact?.currency,
            confidence: fact?.confidence,
            status: fact?.status,
            provenance: fact?.provenance || 'Documented',
            documents,
        })
    }
    const evidenceForSynthesis = (title: string): EvidenceItem => {
        const citation = synthesis?.citationDetails?.[0]
        return buildDocumentLinkedEvidence({
            title,
            sourceFile: citation?.sourceFile,
            fallbackSourceFile: synthesis?.citations?.[0] || 'Project synthesis',
            sourceLocation: citation?.sourceLocation,
            fallbackSourceLocation: 'Project-level synthesis',
            excerpt: citation?.excerpt || synthesis?.finalJudgmentSummary,
            period: citation?.period,
            currency: citation?.currency,
            confidence: citation?.confidence ?? undefined,
            status: citation?.status || 'Synthesized',
            provenance: 'Project synthesis',
            documents,
        })
    }
    const kpis = [
        { label: 'Price vs. base value', value: priceGapPercent === null ? 'Not available' : `${Math.abs(priceGapPercent).toFixed(1)}% ${priceGapPercent > 0 ? 'above' : priceGapPercent < 0 ? 'below' : 'at'} base`, detail: 'Asking price ÷ supported base value − 1', source: exampleMode ? 'Example data' : 'Synthesis + assumption', evidence: evidenceForSynthesis('Price vs. supported base value') },
        { label: 'Simple annual ROI', value: annualRoi === null ? 'Not available' : `${(annualRoi * 100).toFixed(1)}%`, detail: 'Annual operating cash flow ÷ initial investment', source: exampleMode ? 'Example data' : 'Documented + assumptions', evidence: evidenceForFact('ebitda_sde', 'Simple annual ROI input evidence') },
        { label: 'Payback period', value: paybackYears === null ? 'Not available' : `${paybackYears.toFixed(1)} years`, detail: 'Initial investment ÷ annual operating cash flow', source: exampleMode ? 'Example data' : 'Documented + assumptions', evidence: evidenceForFact('ebitda_sde', 'Payback-period input evidence') },
        { label: 'EBITDA margin', value: ebitdaMargin === null ? 'Not available' : `${(ebitdaMargin * 100).toFixed(1)}%`, detail: 'Documented EBITDA/SDE ÷ documented revenue', source: exampleMode ? 'Example data' : 'Documented', evidence: evidenceForFact('ebitda_sde', 'EBITDA margin evidence') },
        { label: 'Debt to assets', value: debtToAssets === null ? 'Not available' : `${(debtToAssets * 100).toFixed(1)}%`, detail: 'Documented debt ÷ documented total assets', source: exampleMode ? 'Example data' : 'Documented', evidence: evidenceForFact('debt', 'Debt-to-assets evidence') },
        { label: 'Revenue per employee', value: revenuePerEmployee === null ? 'Not available' : formatCurrencyValue(String(revenuePerEmployee), metricCurrency), detail: 'Documented revenue ÷ documented employee count', source: exampleMode ? 'Example data' : 'Documented', evidence: evidenceForFact('revenue', 'Revenue-per-employee evidence') },
    ]
    const decisionDrivers = synthesis ? [
        {
            label: 'Primary risk',
            value: synthesis.crossDocumentConflicts[0] || 'No cross-document conflict recorded.',
            evidence: (() => {
                const finding = synthesis.structuredFindings.crossDocumentConflicts[0]
                const citation = finding?.citations?.[0]
                return buildDocumentLinkedEvidence({
                    title: 'Primary risk evidence',
                    sourceFile: citation?.sourceFile,
                    fallbackSourceFile: synthesis.citationDetails?.[0]?.sourceFile || synthesis.citations?.[0] || 'Project synthesis',
                    sourceLocation: citation?.sourceLocation,
                    fallbackSourceLocation: synthesis.citationDetails?.[0]?.sourceLocation || 'Project-level synthesis',
                    excerpt: citation?.excerpt || finding?.text || synthesis.crossDocumentConflicts[0],
                    period: citation?.period,
                    currency: citation?.currency,
                    confidence: finding?.confidence ?? citation?.confidence ?? undefined,
                    status: finding?.status || citation?.status || 'Contradicted',
                    provenance: 'Project synthesis',
                    documents,
                })
            })(),
        },
        {
            label: 'Negotiation leverage',
            value: synthesis.negotiationLevers[0] || 'No negotiation lever surfaced yet.',
            evidence: (() => {
                const finding = synthesis.structuredFindings.negotiationLevers[0]
                const citation = finding?.citations?.[0]
                return buildDocumentLinkedEvidence({
                    title: 'Negotiation leverage evidence',
                    sourceFile: citation?.sourceFile,
                    fallbackSourceFile: synthesis.citationDetails?.[0]?.sourceFile || synthesis.citations?.[0] || 'Project synthesis',
                    sourceLocation: citation?.sourceLocation,
                    fallbackSourceLocation: synthesis.citationDetails?.[0]?.sourceLocation || 'Project-level synthesis',
                    excerpt: citation?.excerpt || finding?.text || synthesis.negotiationLevers[0],
                    period: citation?.period,
                    currency: citation?.currency,
                    confidence: finding?.confidence ?? citation?.confidence ?? undefined,
                    status: finding?.status || citation?.status || 'Synthesized',
                    provenance: 'Project synthesis',
                    documents,
                })
            })(),
        },
        {
            label: 'Open diligence question',
            value: synthesis.openQuestions[0] || 'No open management question recorded.',
            evidence: (() => {
                const finding = synthesis.structuredFindings.openQuestions[0]
                const citation = finding?.citations?.[0]
                return buildDocumentLinkedEvidence({
                    title: 'Open diligence question evidence',
                    sourceFile: citation?.sourceFile,
                    fallbackSourceFile: synthesis.citationDetails?.[0]?.sourceFile || synthesis.citations?.[0] || 'Project synthesis',
                    sourceLocation: citation?.sourceLocation,
                    fallbackSourceLocation: synthesis.citationDetails?.[0]?.sourceLocation || 'Project-level synthesis',
                    excerpt: citation?.excerpt || finding?.text || synthesis.openQuestions[0],
                    period: citation?.period,
                    currency: citation?.currency,
                    confidence: finding?.confidence ?? citation?.confidence ?? undefined,
                    status: finding?.status || citation?.status || 'Needs review',
                    provenance: 'Project synthesis',
                    documents,
                })
            })(),
        },
    ] : []
    const nextAction = !synthesis
        ? 'Process project documents to generate an evidence-backed recommendation and next action.'
        : synthesis.missingDocuments[0]
            ? `Request or confirm: ${synthesis.missingDocuments[0]}`
            : synthesis.negotiationLevers[0]
                ? `Use the leading negotiation lever: ${synthesis.negotiationLevers[0]}`
                : synthesis.openQuestions[0]
                    ? `Resolve the leading management question: ${synthesis.openQuestions[0]}`
                    : 'Review the supported valuation and confirm the next diligence owner.'

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
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project review impact</p>
                        <p className="text-sm font-semibold text-success">
                            {impact.completedDocuments > 0 ? `~${formatHours(impact.timeSavedHours)} saved` : 'Awaiting completed documents'}
                        </p>
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                        {impact.completedDocuments > 0
                            ? `${impact.completedDocuments} completed document${impact.completedDocuments === 1 ? '' : 's'} · ${formatHours(impact.analystHours)} estimated manual review`
                            : 'Each completed document is currently estimated at 40 minutes of analyst review.'}
                    </p>
                    {impact.completedDocuments > 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                            Agent runtime: {impact.agentMinutes >= 1 ? `${Math.round(impact.agentMinutes)}m` : '<1m'}.
                        </p>
                    ) : null}
                </div>

                <button type="button" onClick={() => { const sourceFile = exampleMode ? 'northwind-q4-financials.pdf' : project?.employeeCitation; onOpenEvidence(buildDocumentLinkedEvidence({ title: 'Employee count evidence', sourceFile, fallbackSourceFile: 'Source file was not returned', sourceLocation: exampleMode ? 'Page 6' : project?.employeeCitation, excerpt: exampleMode ? 'Northwind Analytics employs 84 full-time employees as of the FY23 reporting period.' : undefined, period: exampleMode ? 'FY23' : project?.employeeAsOfDate, confidence: exampleMode ? 89 : project?.employeeConfidence ?? undefined, status: employeeCount === null ? 'Not confirmed' : 'Confirmed', provenance: exampleMode ? 'Example data' : project?.employeeEvidenceStatus || 'Documented', documents })) }} className="w-full rounded-lg border border-border bg-background p-4 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="flex items-center gap-2 text-muted-foreground"><UsersRound className="h-4 w-4" /><p className="text-xs font-medium uppercase tracking-wide">Employee count</p></div>
                    <p className="mt-2 text-lg font-semibold text-foreground">{employeeCountLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {employeeCount === null
                            ? 'No evidence-backed headcount has been found in the processed documents.'
                            : `${project?.employeeEvidenceStatus === 'estimated' ? 'Estimated' : 'Documented'}${project?.employeeAsOfDate ? ` · as of ${project.employeeAsOfDate}` : ''}`}
                    </p>
                </button>

                <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold">Document coverage</p><p className="mt-1 text-xs text-muted-foreground">Coverage helps guide diligence, but does not block a synthesis or recommendation.</p></div><Badge variant={project?.coverage.every((item) => item.matched) ? 'success' : 'warning'}>{project?.coverage.filter((item) => item.matched).length ?? 0}/{project?.coverage.length ?? 0} covered</Badge></div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{project?.coverage.map((item) => <div key={item.label} className={item.matched ? 'rounded-md border border-success/25 bg-success/5 p-3' : 'rounded-md border border-warning/25 bg-warning/5 p-3'}><p className="text-sm font-medium">{item.label}</p><p className="mt-1 text-xs text-muted-foreground">{item.matched ? `${item.count} document${item.count === 1 ? '' : 's'} detected` : 'Missing / not detected'}</p></div>)}</div>
                    {synthesis?.missingDocuments.length ? <div className="mt-3 rounded-md border border-warning/25 bg-warning/5 p-3 text-sm text-foreground"><span className="font-medium">Synthesis requests:</span><div className="mt-2 flex flex-wrap gap-2">{synthesis.missingDocuments.map((item, index) => { const finding = synthesis.structuredFindings.missingDocuments[index]; const citation = finding?.citations?.[0]; return <button key={`${item}-${index}`} type="button" onClick={() => onOpenEvidence(buildDocumentLinkedEvidence({ title: 'Missing diligence material', sourceFile: citation?.sourceFile, fallbackSourceFile: synthesis.citationDetails?.[0]?.sourceFile || synthesis.citations?.[0] || 'Project synthesis', sourceLocation: citation?.sourceLocation, fallbackSourceLocation: synthesis.citationDetails?.[0]?.sourceLocation || 'Project-level synthesis', excerpt: citation?.excerpt || finding?.text || item, period: citation?.period, currency: citation?.currency, confidence: finding?.confidence ?? citation?.confidence ?? undefined, status: finding?.status || citation?.status || 'Needs review', provenance: 'Project synthesis', documents }))} className="rounded-full border border-warning/30 bg-background px-3 py-1 text-left text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/30">{item}</button> })}</div></div> : null}
                </div>

                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Decision metrics</p><p className="mt-1 text-xs text-muted-foreground">Formula and provenance are visible for every metric; unavailable means its required evidence or assumptions are not ready.</p></div><Badge variant="outline">Evidence-backed</Badge></div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{kpis.map((kpi) => <button type="button" key={kpi.label} title={`View evidence: ${kpi.detail}`} onClick={() => onOpenEvidence(kpi.evidence)} className="rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="text-xs text-muted-foreground">{kpi.label}</p><p className="mt-1 text-lg font-semibold text-foreground">{kpi.value}</p><p className="mt-1 text-xs text-muted-foreground">{kpi.detail}</p><Badge variant={kpi.source === 'Documented' ? 'secondary' : 'outline'} className="mt-2 text-[10px]">{kpi.source} · View evidence</Badge></button>)}</div>
                </div>

                {!synthesis ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                        Upload and process the project documents to generate an evidence-backed recommendation, valuation range, and negotiation plan here.
                    </div>
                ) : (
                    <>
                        {synthesis.finalRecommendation ? (
                            <div className="rounded-xl border border-border bg-muted/20 p-5">
                                <div className="pb-3 border-b border-border/40 mb-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Recommendation</p>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">{synthesis.finalRecommendation}</p>
                                        {synthesis.finalTrafficLight ? (
                                            <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>{synthesis.finalTrafficLight}</Badge>
                                        ) : null}
                                        {synthesis.finalRiskLevel ? (
                                            <Badge variant={riskVariant(synthesis.finalRiskLevel)}>Risk: {synthesis.finalRiskLevel}</Badge>
                                        ) : null}
                                    </div>
                                </div>
                                {synthesis.finalJudgmentSummary ? (() => {
                                    let cleanText = synthesis.finalJudgmentSummary.trim();
                                    cleanText = cleanText.replace(/^(?:###\s+)?Summary:?\s*/i, '').trim();

                                    const uppercaseMatch = cleanText.match(/^([A-Z\s&,-]{4,}\.?)\s*([\s\S]*)/);
                                    let recText = '';
                                    let remainder = cleanText;
                                    if (uppercaseMatch) {
                                        recText = uppercaseMatch[1].replace(/\.$/, '').trim();
                                        remainder = uppercaseMatch[2].trim();
                                    }

                                    const bullets = remainder.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

                                    const getActionColor = (text: string) => {
                                        const lower = text.toLowerCase();
                                        if (lower.includes('escalat') || lower.includes('renegotiat') || lower.includes('abort') || lower.includes('avoid') || lower.includes('risk') || lower.includes('warning')) {
                                            return 'text-destructive';
                                        }
                                        if (lower.includes('proceed') || lower.includes('buy') || lower.includes('acquire') || lower.includes('accept') || lower.includes('approve')) {
                                            return 'text-success';
                                        }
                                        return 'text-primary';
                                    };

                                    return (
                                        <div className="space-y-4 mt-4">
                                            {recText && (
                                                <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                                                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Actionable Recommendation</p>
                                                    <p className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight ${getActionColor(recText)}`}>
                                                        {recText}
                                                    </p>
                                                </div>
                                            )}
                                            <div className="space-y-3 bg-background/50 rounded-xl p-4 border border-border/40">
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-2 mb-2">Key Assessment Details</p>
                                                {bullets.map((point, index) => (
                                                    <div key={index} className="flex items-start gap-2.5">
                                                        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${recText ? getActionColor(recText).replace('text-', 'bg-') : 'bg-primary'}`} />
                                                        <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-medium">{point}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })() : null}
                            </div>
                        ) : synthesis.finalJudgmentSummary ? (() => {
                            let cleanText = synthesis.finalJudgmentSummary.trim();
                            cleanText = cleanText.replace(/^(?:###\s+)?Summary:?\s*/i, '').trim();

                            const uppercaseMatch = cleanText.match(/^([A-Z\s&,-]{4,}\.?)\s*([\s\S]*)/);
                            let recText = '';
                            let remainder = cleanText;
                            if (uppercaseMatch) {
                                recText = uppercaseMatch[1].replace(/\.$/, '').trim();
                                remainder = uppercaseMatch[2].trim();
                            }

                            const bullets = remainder.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);

                            const getActionColor = (text: string) => {
                                const lower = text.toLowerCase();
                                if (lower.includes('escalat') || lower.includes('renegotiat') || lower.includes('abort') || lower.includes('avoid') || lower.includes('risk') || lower.includes('warning')) {
                                    return 'text-destructive';
                                }
                                if (lower.includes('proceed') || lower.includes('buy') || lower.includes('acquire') || lower.includes('accept') || lower.includes('approve')) {
                                    return 'text-success';
                                }
                                return 'text-primary';
                            };

                            return (
                                <div className="rounded-lg border border-border bg-background p-4">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Executive assessment</p>
                                    <div className="space-y-4 mt-4">
                                        {recText && (
                                            <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Actionable Recommendation</p>
                                                <p className={`text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight ${getActionColor(recText)}`}>
                                                    {recText}
                                                </p>
                                            </div>
                                        )}
                                        <div className="space-y-3 bg-background/50 rounded-xl p-4 border border-border/40">
                                            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/30 pb-2 mb-2">Key Assessment Details</p>
                                            {bullets.map((point, index) => (
                                                <div key={index} className="flex items-start gap-2.5">
                                                    <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${recText ? getActionColor(recText).replace('text-', 'bg-') : 'bg-primary'}`} />
                                                    <p className="text-sm sm:text-base leading-relaxed text-foreground/90 font-medium">{point}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : null}

                        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
                            <div className="rounded-xl border border-border bg-muted/20 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">Three decision drivers</p><Badge variant="outline">Project synthesis</Badge></div><div className="mt-3 grid gap-3 md:grid-cols-3">{decisionDrivers.map((driver) => <div key={driver.label} className="flex flex-col rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/30"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{driver.label}</p><ExpandableText text={driver.value} maxHeight={72} className="mt-2 text-sm leading-6 text-foreground" /><button type="button" onClick={() => onOpenEvidence(driver.evidence)} className="mt-2 self-start text-xs font-medium text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">View evidence</button></div>)}</div></div>
                            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recommended next action</p><ExpandableText text={nextAction} maxHeight={72} className="mt-2 text-sm leading-6 font-medium text-foreground" /><p className="mt-3 text-xs text-muted-foreground">Prioritized from missing materials, negotiation levers, and open questions.</p><div className="mt-3 flex flex-wrap gap-2">{synthesis.missingDocuments[0] ? <button type="button" onClick={() => document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Go to uploads</button> : null}{!synthesis.missingDocuments[0] && synthesis.openQuestions[0] ? <button type="button" onClick={() => document.querySelector('[placeholder="Question for management"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Open management tracker</button> : null}{!synthesis.missingDocuments[0] && !synthesis.openQuestions[0] && synthesis.negotiationLevers[0] ? <button type="button" onClick={() => document.getElementById('synthesis-negotiation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Review negotiation levers</button> : null}</div></div>
                        </div>

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
                                <label htmlFor="overview-asking-price" className="sr-only">Asking price in USD</label>
                                <Input
                                    id="overview-asking-price"
                                    inputMode="decimal"
                                    value={askingPrice}
                                    onChange={(event) => onAskingPriceChange(event.target.value)}
                                    placeholder="Enter asking price in USD"
                                    className="mt-3"
                                />
                                {askingPriceValue !== null && baseValue !== null ? (
                                    <>
                                        <p className="mt-3 text-sm font-semibold text-foreground">{formatCurrencyValue(String(askingPriceValue), synthesis.valuationCurrency || 'USD')}</p>
                                        <p className={priceGapPercent !== null && priceGapPercent > 0 ? 'mt-1 text-sm leading-6 text-destructive' : 'mt-1 text-sm leading-6 text-success'}>{priceGapLabel}</p>
                                    </>
                                ) : <p className="mt-2 text-sm leading-6 text-muted-foreground">Enter the asking price to compare it with the supported base valuation.</p>}
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
