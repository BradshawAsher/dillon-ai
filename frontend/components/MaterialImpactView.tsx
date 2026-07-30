import { useMemo, useState } from 'react'
import { ArrowRight, Scale, ShieldAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { buildDocumentLinkedEvidence, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'

type ImpactCategory = 'valuation' | 'cash_flow' | 'closing' | 'negotiation' | 'risk'

type StructuredCitation = {
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    period?: string
    currency?: string
    confidence?: number | null
    status?: string
}

type CategorizedFinding = {
    id: string
    text: string
    sourceGroup: string
    severity: 'critical' | 'medium' | 'low'
    impact: ImpactCategory
    confidence?: number
    citation?: StructuredCitation
    status?: string
}

const IMPACT_LABELS: Record<ImpactCategory, string> = {
    valuation: 'Valuation impact',
    cash_flow: 'Cash-flow impact',
    closing: 'Closing condition',
    negotiation: 'Negotiation action',
    risk: 'Risk / diligence gap',
}

const IMPACT_STYLES: Record<ImpactCategory, string> = {
    valuation: 'border-destructive/25 bg-destructive/5',
    cash_flow: 'border-warning/25 bg-warning/5',
    closing: 'border-primary/25 bg-primary/5',
    negotiation: 'border-success/25 bg-success/5',
    risk: 'border-border bg-muted/20',
}

function classifyImpact(text: string, sourceGroup: string): ImpactCategory {
    const lower = text.toLowerCase()
    if (/working.?capital|escrow|closing|condition|contingent|indemnit/.test(lower)) return 'closing'
    if (/negotiat|lever|seller|earn.?out|term|concession/.test(lower)) return 'negotiation'
    if (/revenue|growth|margin|ebitda|cash.?flow|capex|recurring/.test(lower)) return 'cash_flow'
    if (/valuation|multiple|price|discount|premium|add.?back/.test(lower)) return 'valuation'

    if (sourceGroup === 'negotiation-lever') return 'negotiation'
    if (sourceGroup === 'missing-document' || sourceGroup === 'open-question') return 'closing'
    if (sourceGroup === 'conflict') return 'valuation'
    if (sourceGroup === 'red-flag') return 'risk'
    if (sourceGroup === 'yellow-flag') return 'risk'
    return 'risk'
}

function getSeverity(sourceGroup: string): 'critical' | 'medium' | 'low' {
    if (sourceGroup === 'red-flag' || sourceGroup === 'conflict') return 'critical'
    if (sourceGroup === 'yellow-flag' || sourceGroup === 'missing-document' || sourceGroup === 'open-question') return 'medium'
    return 'low'
}

export default function MaterialImpactView({ synthesis, onOpenEvidence, documents = [] }: { synthesis: ProjectSynthesisItem; onOpenEvidence?: (item: EvidenceItem) => void; documents?: SubmissionHistoryItem[] }) {
    const [selectedCategory, setSelectedCategory] = useState<ImpactCategory | 'all'>('all')

    const findings = useMemo(() => {
        const result: CategorizedFinding[] = []
        const groups: Array<{ key: string; items: typeof synthesis.structuredFindings.redFlags | string[] }> = [
            { key: 'red-flag', items: synthesis.structuredFindings?.redFlags?.length ? synthesis.structuredFindings.redFlags : synthesis.redFlags },
            { key: 'yellow-flag', items: synthesis.structuredFindings?.yellowFlags?.length ? synthesis.structuredFindings.yellowFlags : synthesis.yellowFlags },
            { key: 'conflict', items: synthesis.structuredFindings?.crossDocumentConflicts?.length ? synthesis.structuredFindings.crossDocumentConflicts : synthesis.crossDocumentConflicts },
            { key: 'negotiation-lever', items: synthesis.structuredFindings?.negotiationLevers?.length ? synthesis.structuredFindings.negotiationLevers : synthesis.negotiationLevers },
            { key: 'missing-document', items: synthesis.structuredFindings?.missingDocuments?.length ? synthesis.structuredFindings.missingDocuments : synthesis.missingDocuments },
            { key: 'open-question', items: synthesis.structuredFindings?.openQuestions?.length ? synthesis.structuredFindings.openQuestions : synthesis.openQuestions },
        ]
        for (const group of groups) {
            for (let i = 0; i < group.items.length; i++) {
                const item = group.items[i]
                const text = typeof item === 'string' ? item : item.text
                const firstCitation = typeof item === 'string' ? undefined : item.citations?.[0]
                result.push({
                    id: `${group.key}-${i}`,
                    text,
                    sourceGroup: group.key,
                    severity: (typeof item === 'string' ? getSeverity(group.key) : (item.severity === 'critical' || item.severity === 'high') ? 'critical' : (item.severity === 'medium') ? 'medium' : getSeverity(group.key)),
                    impact: typeof item === 'string' ? classifyImpact(text, group.key) : ((item.impact as ImpactCategory) || classifyImpact(text, group.key)),
                    confidence: typeof item === 'string' ? undefined : item.confidence ?? undefined,
                    citation: firstCitation ? {
                        sourceFile: firstCitation.sourceFile,
                        sourceLocation: firstCitation.sourceLocation,
                        excerpt: firstCitation.excerpt,
                        period: firstCitation.period,
                        currency: firstCitation.currency,
                        confidence: firstCitation.confidence,
                        status: firstCitation.status,
                    } : undefined,
                    status: typeof item === 'string' ? undefined : item.status,
                })
            }
        }
        return result
    }, [synthesis])

    const filtered = selectedCategory === 'all' ? findings : findings.filter((f) => f.impact === selectedCategory)
    const countByCategory = useMemo(() => {
        const counts: Record<ImpactCategory, number> = { valuation: 0, cash_flow: 0, closing: 0, negotiation: 0, risk: 0 }
        for (const f of findings) counts[f.impact]++
        return counts
    }, [findings])

    if (findings.length === 0) return null

    return <Card className="overflow-hidden">
        <CardHeader className="border-b border-border bg-card/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Material-impact mapping</CardTitle></div>
                    <CardDescription className="mt-1">Each finding is auto-classified by its likely deal impact. Click any finding for source evidence.</CardDescription>
                </div>
                <Badge variant="outline">{findings.length} findings mapped</Badge>
            </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setSelectedCategory('all')} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedCategory === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>All ({findings.length})</button>
                {(Object.keys(IMPACT_LABELS) as ImpactCategory[]).map((cat) => (
                    <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${selectedCategory === cat ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>{IMPACT_LABELS[cat]} ({countByCategory[cat]})</button>
                ))}
            </div>

            <div className="space-y-2">
                {filtered.map((finding) => {
                    return (
                        <button
                            key={finding.id}
                            type="button"
                            onClick={() => onOpenEvidence?.(buildDocumentLinkedEvidence({
                                title: `${IMPACT_LABELS[finding.impact]}: finding`,
                                sourceFile: finding.citation?.sourceFile,
                                fallbackSourceFile: synthesis.citations?.[0] || 'Project synthesis',
                                sourceLocation: finding.citation?.sourceLocation,
                                fallbackSourceLocation: 'Project synthesis',
                                excerpt: finding.citation?.excerpt || finding.text,
                                period: finding.citation?.period,
                                currency: finding.citation?.currency,
                                status: finding.status || (finding.severity === 'critical' ? 'Risk' : finding.severity === 'medium' ? 'Needs review' : 'Confirmed'),
                                provenance: 'Material-impact mapping',
                                confidence: finding.confidence,
                                documents,
                            }))}
                            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/40 ${IMPACT_STYLES[finding.impact]}`}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={finding.severity === 'critical' ? 'destructive' : finding.severity === 'medium' ? 'warning' : 'secondary'}>
                                        {finding.severity === 'critical' ? 'Critical' : finding.severity === 'medium' ? 'Medium' : 'Low'}
                                    </Badge>
                                    <Badge variant="outline">{IMPACT_LABELS[finding.impact]}</Badge>
                                    {finding.confidence !== undefined ? <Badge variant="secondary">{finding.confidence}% confidence</Badge> : null}
                                    <span className="text-xs text-muted-foreground">{finding.sourceGroup.replace('-', ' ')}</span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-foreground">{finding.text}</p>
                                {finding.citation?.sourceFile ? <p className="mt-1 text-xs text-muted-foreground">Source: {finding.citation.sourceFile}{finding.citation.sourceLocation ? ` · ${finding.citation.sourceLocation}` : ''}</p> : null}
                            </div>
                            <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-primary" />
                        </button>
                    )
                })}
                {filtered.length === 0 ? <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">No findings in this category.</p> : null}
            </div>

            <div className="grid gap-2 sm:grid-cols-5">
                {(Object.keys(IMPACT_LABELS) as ImpactCategory[]).map((cat) => (
                    <div key={cat} className={`rounded-lg border p-3 ${IMPACT_STYLES[cat]}`}>
                        <p className="text-xs font-medium text-muted-foreground">{IMPACT_LABELS[cat]}</p>
                        <p className="mt-1 text-lg font-semibold text-foreground">{countByCategory[cat]}</p>
                        <p className="text-xs text-muted-foreground">{countByCategory[cat] === 0 ? 'No findings' : `${((countByCategory[cat] / findings.length) * 100).toFixed(0)}% of total`}</p>
                    </div>
                ))}
            </div>
        </CardContent>
    </Card>
}
