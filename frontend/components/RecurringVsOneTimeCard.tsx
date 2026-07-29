import { RefreshCw } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    onOpenEvidence?: (evidence: EvidenceItem) => void
}

type ClassifiedItem = {
    text: string
    classification: 'recurring' | 'one-time' | 'unclear'
    source: 'red-flag' | 'yellow-flag' | 'green-flag' | 'open-question'
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    confidence?: number | null
    status?: string
}

const recurringKeywords = [
    'recurring', 'subscription', 'contract', 'retainer', 'annual', 'monthly',
    'repeat', 'ongoing', 'consistent', 'stable', 'base salary', 'rent',
    'lease', 'maintenance', 'regular', 'predictable',
]

const oneTimeKeywords = [
    'one-time', 'one time', 'non-recurring', 'nonrecurring', 'extraordinary',
    'unusual', 'lawsuit', 'settlement', 'relocation', 'renovation',
    'ppe', 'equipment purchase', 'write-off', 'write off', 'gain on sale',
    'loss on sale', 'insurance proceeds', 'severance', 'bonus',
    'covid', 'pandemic', 'one-off', 'oneoff', 'restructuring',
]

function classifyItem(text: string): 'recurring' | 'one-time' | 'unclear' {
    const lower = text.toLowerCase()
    const hasRecurring = recurringKeywords.some((kw) => lower.includes(kw))
    const hasOneTime = oneTimeKeywords.some((kw) => lower.includes(kw))
    if (hasOneTime && !hasRecurring) return 'one-time'
    if (hasRecurring && !hasOneTime) return 'recurring'
    return 'unclear'
}

function extractQualityItems(synthesis?: ProjectSynthesisItem): ClassifiedItem[] {
    if (!synthesis) return []
    const items: ClassifiedItem[] = []

    const structuredGroups = [
        ...synthesis.structuredFindings.redFlags.map((finding) => ({ finding, source: 'red-flag' as const })),
        ...synthesis.structuredFindings.yellowFlags.map((finding) => ({ finding, source: 'yellow-flag' as const })),
        ...synthesis.structuredFindings.greenFlags.map((finding) => ({ finding, source: 'green-flag' as const })),
        ...synthesis.structuredFindings.openQuestions.map((finding) => ({ finding, source: 'open-question' as const })),
    ]

    if (structuredGroups.length > 0) {
        for (const { finding, source } of structuredGroups) {
            const primaryCitation = finding.citations?.[0]
            items.push({
                text: finding.text,
                classification: classifyItem(finding.text),
                source,
                sourceFile: primaryCitation?.sourceFile,
                sourceLocation: primaryCitation?.sourceLocation,
                excerpt: primaryCitation?.excerpt,
                confidence: finding.confidence,
                status: finding.status,
            })
        }
    } else {
        for (const flag of synthesis.redFlags) {
            items.push({ text: flag, classification: classifyItem(flag), source: 'red-flag' })
        }
        for (const flag of synthesis.yellowFlags) {
            items.push({ text: flag, classification: classifyItem(flag), source: 'yellow-flag' })
        }
        for (const flag of synthesis.greenFlags) {
            items.push({ text: flag, classification: classifyItem(flag), source: 'green-flag' })
        }
        for (const q of synthesis.openQuestions) {
            items.push({ text: q, classification: classifyItem(q), source: 'open-question' })
        }
    }

    return items.filter((item) => item.classification !== 'unclear')
}

export default function RecurringVsOneTimeCard({ model, synthesis, onOpenEvidence }: Props) {
    const items = extractQualityItems(synthesis)
    const recurring = items.filter((i) => i.classification === 'recurring')
    const oneTime = items.filter((i) => i.classification === 'one-time')

    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null

    if (items.length === 0) return null

    const sourceVariant = (source: ClassifiedItem['source']) => {
        if (source === 'red-flag') return 'destructive' as const
        if (source === 'yellow-flag') return 'warning' as const
        if (source === 'green-flag') return 'success' as const
        return 'outline' as const
    }

    const itemStyle = (source: ClassifiedItem['source'], defaultClass: 'recurring' | 'one-time') => {
        if (source === 'red-flag') {
            return "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
        }
        if (source === 'yellow-flag') {
            return "border-warning/20 bg-warning/5 hover:bg-warning/10"
        }
        if (source === 'green-flag') {
            return "border-success/20 bg-success/5 hover:bg-success/10"
        }
        return defaultClass === 'recurring'
            ? "border-success/20 bg-success/5 hover:bg-success/10"
            : "border-warning/20 bg-warning/5 hover:bg-warning/10"
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-primary" />
                            <CardTitle className="text-lg">Recurring vs one-time findings</CardTitle>
                        </div>
                        <CardDescription>Quality-of-earnings classification: which findings represent ongoing economics vs one-time events that distort trailing financials.</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="success">{recurring.length} recurring</Badge>
                        <Badge variant="warning">{oneTime.length} one-time</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {ebitda !== null && oneTime.length > 0 && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                        <p className="text-sm font-semibold text-foreground">Earnings quality signal</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {oneTime.length} one-time item{oneTime.length > 1 ? 's' : ''} found.
                            {revenue !== null && ebitda !== null ? ` Current EBITDA margin: ${((ebitda / revenue) * 100).toFixed(1)}%. Removing one-time add-backs may reduce the sustainable margin.` : ''}
                        </p>
                    </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">Recurring / ongoing</p>
                        <p className="text-xs text-muted-foreground">These findings relate to sustainable, repeatable economics.</p>
                        {recurring.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No recurring-related findings detected.</p>
                        ) : (
                            <div className="space-y-2">
                                {recurring.map((item, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`w-full rounded-md border p-3 text-left text-sm text-foreground transition-colors ${itemStyle(item.source, 'recurring')}`}
                                        onClick={() => onOpenEvidence?.({
                                            title: 'Recurring finding',
                                            sourceFile: item.sourceFile || 'Project synthesis',
                                            sourceLocation: item.sourceLocation || item.source.replace('-', ' '),
                                            excerpt: item.excerpt || item.text,
                                            confidence: item.confidence ?? undefined,
                                            status: item.status || 'Recurring',
                                            provenance: 'Quality-of-earnings classification',
                                        })}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span>{item.text}</span>
                                            <Badge variant={sourceVariant(item.source)} className="shrink-0 text-[10px]">{item.source.replace('-', ' ')}</Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">One-time / non-recurring</p>
                        <p className="text-xs text-muted-foreground">These findings relate to events unlikely to repeat — adjust EBITDA accordingly.</p>
                        {oneTime.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No one-time findings detected.</p>
                        ) : (
                            <div className="space-y-2">
                                {oneTime.map((item, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className={`w-full rounded-md border p-3 text-left text-sm text-foreground transition-colors ${itemStyle(item.source, 'one-time')}`}
                                        onClick={() => onOpenEvidence?.({
                                            title: 'One-time finding',
                                            sourceFile: item.sourceFile || 'Project synthesis',
                                            sourceLocation: item.sourceLocation || item.source.replace('-', ' '),
                                            excerpt: item.excerpt || item.text,
                                            confidence: item.confidence ?? undefined,
                                            status: item.status || 'One-time',
                                            provenance: 'Quality-of-earnings classification',
                                        })}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <span>{item.text}</span>
                                            <Badge variant={sourceVariant(item.source)} className="shrink-0 text-[10px]">{item.source.replace('-', ' ')}</Badge>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
