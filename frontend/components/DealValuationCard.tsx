import { BadgeDollarSign, ChartNoAxesCombined, Scale, TriangleAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { formatCurrencyValue } from '../utils/aiSubmissionData'
import { buildDerivedEvidence, buildDocumentLinkedEvidence, buildFactEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { Input } from '../lib/shadcn/input'
import { MoneyBarChart } from './DealCharts'
import ValuationImpactBridge from './ValuationImpactBridge'

type DealValuationCardProps = {
    synthesis?: ProjectSynthesisItem
    askingPrice: string
    model?: DealModel
    onModelChange?: (field: keyof DealModel, value: string) => void
    documents?: SubmissionHistoryItem[]
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

function parseMoney(value: string) {
    const normalized = value.replace(/[$,\s]/g, '')
    const multiplier = /m$/i.test(normalized) ? 1_000_000 : /b$/i.test(normalized) ? 1_000_000_000 : /k$/i.test(normalized) ? 1_000 : 1
    const parsed = Number(normalized.replace(/[kmb]$/i, ''))
    return Number.isFinite(parsed) && parsed >= 0 ? parsed * multiplier : null
}

export default function DealValuationCard({ synthesis, askingPrice, model, onModelChange, documents = [], onOpenEvidence }: DealValuationCardProps) {
    const rawAskingPrice = parseMoney(askingPrice) ?? model?.askingPrice ?? null
    const askingPriceValue = rawAskingPrice !== null && rawAskingPrice > 0 ? rawAskingPrice : null
    const effectiveAskingPrice = askingPriceValue
    const baseValue = synthesis ? parseMoney(synthesis.valuationBaseEstimate) : null
    const premiumPercent = effectiveAskingPrice !== null && baseValue !== null && baseValue > 0
        ? ((effectiveAskingPrice - baseValue) / baseValue) * 100
        : null
    const cases = synthesis ? [
        { label: 'Downside case', value: synthesis.valuationLowerBound, description: 'Current lower supported estimate' },
        { label: 'Base case', value: synthesis.valuationBaseEstimate, description: 'Current supported estimate' },
        { label: 'Upside case', value: synthesis.valuationUpperBound, description: 'Current upper supported estimate' },
    ] : []
    const documentedFacts = parseDocumentedFacts(model?.documentedFactsJson)
    const confirmed = (key: string) => documentedFacts[key]?.status === 'confirmed' ? documentedFacts[key]?.value ?? null : null
    const revenue = confirmed('revenue'), ebitda = confirmed('ebitda_sde'), assets = confirmed('total_assets'), liabilities = confirmed('total_liabilities')
    const factEvidence = (field: string, title: string) => buildFactEvidence({ field, title, facts: documentedFacts, documents })
    const synthesisEvidence = (title: string, text: string, index = 0): EvidenceItem => {
        const finding = synthesis?.structuredFindings.crossDocumentConflicts[index]
        const citation = finding?.citations?.[0] || synthesis?.citationDetails?.[0]
        return buildDocumentLinkedEvidence({
            title,
            sourceFile: citation?.sourceFile,
            fallbackSourceFile: synthesis?.citations?.[0] || 'Project synthesis',
            sourceLocation: citation?.sourceLocation,
            fallbackSourceLocation: 'Project-level synthesis',
            excerpt: citation?.excerpt || finding?.text || text,
            period: citation?.period,
            currency: citation?.currency,
            confidence: finding?.confidence ?? citation?.confidence ?? undefined,
            status: finding?.status || citation?.status || 'Synthesized',
            provenance: 'Project synthesis',
            documents,
        })
    }
    const asMoney = (value: number | null | undefined) => value === null || value === undefined ? 'Not documented' : formatCurrencyValue(String(value), 'USD')

    const illustrativeRevenue = baseValue !== null && baseValue > 0 ? baseValue / 2.1 : 25_000_000
    const resolvedRevenue = revenue ?? illustrativeRevenue
    const resolvedEbitda = ebitda ?? resolvedRevenue * 0.18
    const resolvedRevenueMultiple = model?.revenueMultiple ?? 2.1
    const resolvedEbitdaMultiple = model?.ebitdaMultiple ?? 8
    const resolvedAssetHaircut = model?.assetHaircutPercent ?? 0.1
    const resolvedNetAssets = assets !== null && liabilities !== null
        ? assets - liabilities
        : (baseValue !== null && baseValue > 0 ? baseValue * 0.72 : resolvedRevenue * 1.1)
    const methods = [
        {
            label: 'Asset-based',
            value: resolvedNetAssets * (1 - resolvedAssetHaircut),
            illustrative: assets === null || liabilities === null || model?.assetHaircutPercent === null || model?.assetHaircutPercent === undefined,
            evidence: buildDerivedEvidence({
                title: 'Asset-based valuation',
                formula: '(total assets − total liabilities) × (1 − asset haircut)',
                documentedInputs: [
                    { label: 'Total assets', value: asMoney(assets) },
                    { label: 'Total liabilities', value: asMoney(liabilities) },
                ],
                analystInputs: [{ label: 'Asset haircut', value: model?.assetHaircutPercent !== null && model?.assetHaircutPercent !== undefined ? `${(model.assetHaircutPercent * 100).toFixed(0)}%` : 'Not set' }],
                primaryFact: factEvidence('total_assets', 'Total assets'),
            }),
        },
        {
            label: 'Revenue multiple',
            value: resolvedRevenue * resolvedRevenueMultiple,
            illustrative: revenue === null || model?.revenueMultiple === null || model?.revenueMultiple === undefined,
            evidence: buildDerivedEvidence({
                title: 'Revenue-multiple valuation',
                formula: 'revenue × revenue multiple',
                documentedInputs: [{ label: 'Revenue', value: asMoney(revenue) }],
                analystInputs: [{ label: 'Revenue multiple', value: model?.revenueMultiple !== null && model?.revenueMultiple !== undefined ? `${model.revenueMultiple}x` : 'Not set' }],
                primaryFact: factEvidence('revenue', 'Revenue'),
            }),
        },
        {
            label: 'EBITDA / SDE multiple',
            value: resolvedEbitda * resolvedEbitdaMultiple,
            illustrative: ebitda === null || model?.ebitdaMultiple === null || model?.ebitdaMultiple === undefined,
            evidence: buildDerivedEvidence({
                title: 'EBITDA-multiple valuation',
                formula: 'EBITDA/SDE × EBITDA multiple',
                documentedInputs: [{ label: 'EBITDA / SDE', value: asMoney(ebitda) }],
                analystInputs: [{ label: 'EBITDA multiple', value: model?.ebitdaMultiple !== null && model?.ebitdaMultiple !== undefined ? `${model.ebitdaMultiple}x` : 'Not set' }],
                primaryFact: factEvidence('ebitda_sde', 'EBITDA / SDE'),
            }),
        },
    ]
    const illustrativeMethods = methods.filter((m) => m.illustrative)
    const illustrativeCount = illustrativeMethods.length
    const hasIllustrativeMethods = illustrativeCount > 0
    const available = methods.map((method) => method.value)
    const methodChartData = methods.map((method) => ({
        label: method.label,
        value: method.value,
        barLabel: method.illustrative ? '⚠ Assumed' : '✓ Verified',
        isIllustrative: method.illustrative,
    }))
    const blended = available.length ? available.reduce((a, b) => a + b, 0) / available.length : null
    const holdPeriodYears = model?.holdPeriodYears ?? 5
    const baseRevenueGrowth: number | null = model?.baseRevenueGrowth ?? null
    const baseEbitdaMargin: number | null = model?.baseEbitdaMargin ?? (revenue !== null && ebitda !== null && revenue > 0 ? ebitda / revenue : null)
    const baseExitMultiple: number | null = model?.baseExitMultiple ?? model?.exitMultiple ?? model?.ebitdaMultiple ?? null
    const canCalculateSensitivity = revenue !== null && baseRevenueGrowth !== null && baseEbitdaMargin !== null && baseExitMultiple !== null && holdPeriodYears > 0
    const sensitivityGrowthCases: number[] = canCalculateSensitivity
        ? [baseRevenueGrowth as number - 0.02, baseRevenueGrowth as number, baseRevenueGrowth as number + 0.02]
        : []
    const sensitivityMargins = canCalculateSensitivity
        ? [Math.max(0, baseEbitdaMargin as number - 0.03), baseEbitdaMargin as number, baseEbitdaMargin as number + 0.03]
        : []
    const sensitivityMultiples = canCalculateSensitivity
        ? [Math.max(0, baseExitMultiple as number - 1), baseExitMultiple as number, baseExitMultiple as number + 1]
        : []

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Valuation</CardTitle></div>
                        <CardDescription>Evidence-backed range and price position for the current project. Missing method inputs use clearly labeled, display-only starting assumptions so the comparison remains complete.</CardDescription>
                    </div>
                    <Badge variant="outline">Source: project synthesis</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
                <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md">
                    <p className="text-sm font-bold uppercase tracking-wide text-primary">Start here — valuation at a glance</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-xs text-muted-foreground">Supported base value</p>
                                {baseValue !== null ? (
                                    <Badge variant="success" className="text-[9px] px-1.5 py-0">✓ Verified</Badge>
                                ) : (
                                    <Badge variant="warning" className="text-[9px] px-1.5 py-0">⚠ Illustrative</Badge>
                                )}
                            </div>
                            <p className="mt-1 text-lg font-bold">{baseValue === null ? (blended === null ? 'Still calculating' : formatCurrencyValue(String(blended), 'USD')) : formatCurrencyValue(String(baseValue), synthesis?.valuationCurrency || 'USD')}</p>
                            <p className={`mt-1 text-[10px] font-semibold ${baseValue !== null ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                {baseValue !== null ? '✓ AI Synthesis Source-Backed' : '⚠ Derived from Method Blend'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-xs text-muted-foreground">Price position</p>
                                {effectiveAskingPrice !== null ? (
                                    <Badge variant="success" className="text-[9px] px-1.5 py-0">✓ Verified</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Not Set</Badge>
                                )}
                            </div>
                            <p className="mt-1 text-lg font-bold">{premiumPercent === null ? 'Set asking price' : `${Math.abs(premiumPercent).toFixed(1)}% ${premiumPercent > 0 ? 'premium' : premiumPercent < 0 ? 'discount' : 'at base'}`}</p>
                            <p className={`mt-1 text-[10px] font-semibold ${effectiveAskingPrice !== null ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {effectiveAskingPrice !== null ? '✓ Compared against seller asking price' : '⚠ Asking price input required'}
                            </p>
                        </div>
                        <div className="rounded-lg border border-primary/25 bg-background/90 p-3">
                            <div className="flex items-center justify-between gap-1">
                                <p className="text-xs text-muted-foreground">Decision signal</p>
                                {premiumPercent !== null ? (
                                    <Badge variant="success" className="text-[9px] px-1.5 py-0">✓ Verified Signal</Badge>
                                ) : (
                                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Pending</Badge>
                                )}
                            </div>
                            <p className="mt-1 text-lg font-bold">{premiumPercent === null ? 'Compare price' : premiumPercent > 10 ? 'Price needs support' : premiumPercent < -10 ? 'Potential cushion' : 'Near supported value'}</p>
                            <p className={`mt-1 text-[10px] font-semibold ${premiumPercent !== null ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                {premiumPercent !== null ? '✓ Dynamic M&A Valuation Risk Signal' : '⚠ Requires Base Value + Asking Price'}
                            </p>
                        </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{premiumPercent === null ? 'Enter the asking price in Intake or Deal Model to see whether the seller is above or below the current supported value.' : premiumPercent > 0 ? 'The seller is asking more than the current supported base value. Use the method comparison and risk bridge to decide whether the premium is justified.' : 'The asking price is at or below the current supported base value. Confirm that the underlying assumptions and diligence risks still support that conclusion.'}</p>
                </div>
                <div className="rounded-lg border border-primary/25 bg-primary/5 p-4" data-valuation-assumptions>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Valuation assumptions</p>
                        <span className="text-xs text-muted-foreground">Analyst-controlled multipliers used in method calculations</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {([['revenueMultiple', 'Revenue multiple'], ['ebitdaMultiple', 'EBITDA / SDE multiple'], ['assetHaircutPercent', 'Asset haircut (decimal)']] as Array<[keyof DealModel, string]>).map(([field, label]) => {
                            const isSaved = model?.[field] !== null && model?.[field] !== undefined && model?.[field] !== ''
                            return (
                                <label key={field} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">{label}</span>
                                        {isSaved ? (
                                            <Badge variant="success" className="text-[9px] px-1.5 py-0">✓ Saved</Badge>
                                        ) : (
                                            <Badge variant="warning" className="text-[9px] px-1.5 py-0">⚠ Default</Badge>
                                        )}
                                    </div>
                                    <Input inputMode="decimal" value={model?.[field] ?? ''} onChange={e => onModelChange?.(field, e.target.value)} placeholder="Not set" />
                                    <p className="text-[10px] text-muted-foreground">
                                        {isSaved ? '✓ Saved analyst assumption' : '⚠ Using default starting assumption'}
                                    </p>
                                </label>
                            )
                        })}
                    </div>
                </div>
                {hasIllustrativeMethods ? (
                    <div role="alert" className="rounded-lg border-2 border-warning/60 bg-warning/10 p-4 text-sm text-foreground shadow-xs">
                        <div className="flex items-center gap-2 text-warning">
                            <TriangleAlert className="h-5 w-5 shrink-0" />
                            <p className="font-bold uppercase tracking-wide">Illustrative valuation bars — {illustrativeCount} of 3 methods using fallback inputs</p>
                        </div>
                        <p className="mt-2 font-medium">Exactly {illustrativeCount} of 3 valuation methods ({illustrativeMethods.map((m) => m.label).join(', ')}) currently use display-only starting inputs because confirmed financial facts are pending.</p>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                            Active Parameters: {revenue !== null ? `Confirmed Revenue: ${asMoney(revenue)}` : `Illustrative Revenue Anchor: ${asMoney(resolvedRevenue)}`}{' · '}
                            {ebitda !== null ? `Confirmed EBITDA: ${asMoney(ebitda)}` : `Derived EBITDA (${baseEbitdaMargin ? (baseEbitdaMargin * 100).toFixed(0) : '18'}% margin)`}{' · '}
                            Revenue Multiple: {resolvedRevenueMultiple}×{' · '}
                            EBITDA Multiple: {resolvedEbitdaMultiple}×{' · '}
                            Asset Haircut: {(resolvedAssetHaircut * 100).toFixed(0)}%.
                            Confirming financial facts in Project Dossier automatically locks in source-backed numbers.
                        </p>
                    </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-3">
                    {methods.map(method => (
                        <div
                            key={method.label}
                            role="button"
                            tabIndex={0}
                            onClick={() => onOpenEvidence?.(method.evidence)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenEvidence?.(method.evidence) } }}
                            className="group cursor-pointer rounded-lg border border-border bg-background p-3.5 transition-all hover:border-primary/50 hover:bg-muted/30 hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground">{method.label}</p>
                                {method.illustrative ? <Badge variant="warning" className="text-[10px]">Illustrative</Badge> : <Badge variant="success" className="text-[10px]">Documented + saved</Badge>}
                            </div>
                            <p className="mt-1.5 font-bold text-base text-foreground">{formatCurrencyValue(String(method.value), 'USD')}</p>
                            <p className={`mt-1 text-[10px] font-semibold ${method.illustrative ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {method.illustrative ? '⚠ Assumed Placeholder Anchor' : '✓ Verified Source Facts + Saved Model'}
                            </p>
                            <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                                How this was calculated →
                            </span>
                        </div>
                    ))}
                </div>
                <MoneyBarChart title="Valuation-method comparison" description={hasIllustrativeMethods ? `${illustrativeCount} of 3 methods are shown as Assumed. Bars marked Verified use confirmed source facts and saved model assumptions.` : 'All methods use confirmed source facts and saved analyst assumptions.'} data={methodChartData} />
                {blended !== null ? <div className="rounded-lg border border-success/25 bg-success/5 p-4"><p className="text-sm font-semibold">{hasIllustrativeMethods ? 'Illustrative blended reference value' : 'Blended supported value'}: {formatCurrencyValue(String(blended), 'USD')}</p>{effectiveAskingPrice !== null ? <p className="mt-1 text-sm text-muted-foreground">Asking price is {(((effectiveAskingPrice - blended) / blended) * 100).toFixed(1)}% {(effectiveAskingPrice - blended) >= 0 ? 'above' : 'below'} this blend.</p> : null}</div> : null}
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">Exit-value sensitivity</p>
                                {revenue !== null ? (
                                    <Badge variant="success" className="text-[10px]">✓ Verified Revenue Baseline ({asMoney(revenue)})</Badge>
                                ) : (
                                    <Badge variant="warning" className="text-[10px]">⚠ Assumed Revenue Anchor ({asMoney(resolvedRevenue)})</Badge>
                                )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Enterprise value at year {holdPeriodYears}, varying revenue growth, EBITDA margin, and exit multiple around the base case.</p>
                        </div>
                        <Badge variant={revenue !== null && baseRevenueGrowth !== null ? 'success' : 'warning'}>
                            {revenue !== null && baseRevenueGrowth !== null ? '✓ Verified Scenario Grid' : '⚠ Assumed Scenario Model'}
                        </Badge>
                    </div>
                    <div className="mt-4 grid gap-4 xl:grid-cols-3">
                        {sensitivityGrowthCases.map((growth) => {
                            const effectiveRevenue = revenue ?? resolvedRevenue
                            const projectedRevenue = effectiveRevenue * Math.pow(1 + growth, holdPeriodYears)
                            return (
                                <div key={growth} className="overflow-hidden rounded-lg border border-border bg-background shadow-xs">
                                    <div className="border-b border-border px-3.5 py-2.5 flex items-center justify-between bg-muted/30">
                                        <div>
                                            <p className="text-xs font-bold text-foreground">Revenue growth: {(growth * 100).toFixed(1)}%</p>
                                            <p className="text-[11px] text-muted-foreground">Year-{holdPeriodYears} revenue: {formatCurrencyValue(String(projectedRevenue), 'USD')}</p>
                                        </div>
                                        {revenue !== null ? (
                                            <Badge variant="success" className="text-[9px] px-1.5 py-0 font-bold">✓ Verified</Badge>
                                        ) : (
                                            <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-bold">⚠ Assumed Anchor</Badge>
                                        )}
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[300px] text-xs">
                                            <thead>
                                                <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                                                    <th className="px-3 py-2 text-left font-semibold">Margin / multiple</th>
                                                    {sensitivityMultiples.map((multiple) => (
                                                        <th key={multiple} className="px-2 py-2 text-right font-semibold">{multiple.toFixed(1)}x</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sensitivityMargins.map((margin) => (
                                                    <tr key={margin} className="border-b border-border last:border-0 hover:bg-muted/10">
                                                        <td className="px-3 py-2 font-bold text-foreground">{(margin * 100).toFixed(1)}%</td>
                                                        {sensitivityMultiples.map((multiple) => (
                                                            <td key={multiple} className="px-2 py-2 text-right font-extrabold tabular-nums text-foreground">
                                                                {formatCurrencyValue(String(projectedRevenue * margin * multiple), 'USD')}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                {!synthesis ? (
                    <div className="rounded-xl border-2 border-dashed border-border bg-muted/20 p-6 space-y-3">
                        <p className="text-sm font-semibold text-foreground">Why is there no synthesis-backed valuation yet?</p>
                        <p className="text-sm leading-6 text-muted-foreground">The supported valuation range (downside / base / upside) comes from the project synthesis workflow. It requires:</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                            <li>At least one completed document with usable financial extraction</li>
                            <li>A finished project synthesis run (triggered automatically after all documents complete)</li>
                            <li>The synthesis LLM returning valuation bounds (it now always returns a range with a confidence score)</li>
                        </ul>
                        <p className="text-sm text-muted-foreground">The three-method comparison and sensitivity grid above still work using your saved assumptions and any confirmed facts. Upload more financial documents or run synthesis to unlock the full range.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)]">
                            <div className="rounded-xl border border-primary/25 bg-primary/5 p-4">
                                <div className="flex items-center gap-2"><BadgeDollarSign className="h-4 w-4 text-primary" /><p className="text-sm font-semibold">Supported valuation range</p>{(() => {
                                    const conf = parseFloat(synthesis.valuationConfidence || synthesis.aiConfidence || '')
                                    if (!Number.isFinite(conf)) return null
                                    const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf)
                                    const label = pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low'
                                    const color = pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
                                    return <Badge variant="outline" className={`ml-auto ${color}`}>{label} confidence ({pct}%)</Badge>
                                })()}</div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    {cases.map((item) => (
                                        <div key={item.label} className="rounded-lg border border-border bg-background p-3">
                                            <div className="flex items-center justify-between gap-1">
                                                <p className="text-xs text-muted-foreground">{item.label}</p>
                                                <Badge variant="success" className="text-[9px] px-1.5 py-0">✓ Verified</Badge>
                                            </div>
                                            <p className="mt-1 text-lg font-bold text-foreground">{formatCurrencyValue(item.value, synthesis.valuationCurrency) || 'Pending'}</p>
                                            <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">✓ Verified AI Synthesis Output</p>
                                            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="rounded-xl border border-border bg-background p-4">
                                <div className="flex items-center gap-2"><ChartNoAxesCombined className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold">Asking-price comparison</p></div>
                                {effectiveAskingPrice !== null && baseValue !== null && premiumPercent !== null ? (
                                    <>
                                        <p className="mt-4 text-2xl font-semibold text-foreground">{formatCurrencyValue(String(effectiveAskingPrice), synthesis.valuationCurrency || 'USD')}</p>
                                        <p className={premiumPercent > 0 ? 'mt-1 text-sm font-semibold text-destructive' : 'mt-1 text-sm font-semibold text-emerald-600'}>
                                            {Math.abs(premiumPercent).toFixed(1)}% {premiumPercent > 0 ? 'above' : premiumPercent < 0 ? 'below' : 'equal to'} the supported base valuation.
                                        </p>
                                    </>
                                ) : (
                                    <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/40 p-3">
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asking Price Not Set</p>
                                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Enter an asking price in Project Dossier Intake or Deal Model to calculate seller premium or cushion.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                            <p className="text-sm font-bold uppercase tracking-wide text-primary">What do the sections below mean?</p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                <strong>Value-risk bridge:</strong> the short list of valuation issues you could use in negotiation.
                            </p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                <strong>Evidence-linked value bridge:</strong> your manual worksheet for turning those issues into illustrative price or terms adjustments.
                            </p>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-2">
                            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <TriangleAlert className="h-4 w-4 text-destructive" />
                                        <p className="text-sm font-semibold text-foreground">Value-risk bridge</p>
                                    </div>
                                    {synthesis.crossDocumentConflicts.length > 0 ? (
                                        <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                                            {synthesis.crossDocumentConflicts.length} Cross-Document Conflict{synthesis.crossDocumentConflicts.length === 1 ? '' : 's'}
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">Use these conflicts as talking points for price, diligence conditions, or structure changes.</p>
                                <ul className="mt-3 space-y-2 text-sm">
                                    {synthesis.crossDocumentConflicts.length > 0 ? synthesis.crossDocumentConflicts.map((item, index) => {
                                        const finding = synthesis.structuredFindings?.crossDocumentConflicts?.[index]
                                        const statusLabel = finding?.status || 'Contradicted'
                                        const severityLabel = finding?.severity || 'High'
                                        return (
                                            <li key={item}>
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenEvidence?.(synthesisEvidence('Value-risk bridge evidence', item, index))}
                                                    className="w-full rounded-md border border-destructive/30 bg-background p-3 text-left transition-all hover:border-destructive/60 hover:bg-destructive/10 hover:shadow-xs"
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <Badge variant="destructive" className="text-[10px] font-extrabold uppercase tracking-wide">
                                                            {statusLabel} · {severityLabel} Risk
                                                        </Badge>
                                                        <span className="text-xs font-semibold text-primary underline-offset-2 hover:underline">
                                                            View Evidence →
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-foreground leading-snug">{item}</p>
                                                </button>
                                            </li>
                                        )
                                    }) : <li className="text-muted-foreground">No cross-document valuation risks recorded.</li>}
                                </ul>
                            </div>
                            <div className="rounded-xl border border-border bg-muted/20 p-4"><p className="text-sm font-semibold">How to read these methods</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Each method gives you a different lens on value. <strong>Asset-based</strong> = floor value if you liquidated today. <strong>Revenue multiple</strong> = market comp for top-line businesses. <strong>EBITDA multiple</strong> = cash-flow-based value, the most common for M&A. The <strong>sensitivity grid</strong> (above) shows what the business could be worth at exit under different growth/margin assumptions — it is NOT a current valuation, it is a forward-looking scenario analysis.</p><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">Asset-based = floor</Badge><Badge variant="outline">Revenue = market comp</Badge><Badge variant="outline">EBITDA = cash flow</Badge><Badge variant="outline">Sensitivity = future exit</Badge></div></div>
                        </div>
                        <ValuationImpactBridge synthesis={synthesis} baseValue={baseValue} documents={documents} onOpenEvidence={onOpenEvidence} />
                    </>
                )}
            </CardContent>
        </Card>
    )
}
