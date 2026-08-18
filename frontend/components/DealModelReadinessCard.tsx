import { CheckCircle2, CircleAlert, Database, FileSearch } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { buildFactEvidence, getEvidenceStatusPresentation, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import CardInfoPopover from './common/CardInfoPopover'

const factLabels: Array<[string, string]> = [
    ['revenue', 'Revenue'],
    ['ebitda_sde', 'EBITDA / SDE'],
    ['debt', 'Debt'],
    ['cash', 'Cash'],
    ['working_capital', 'Working capital'],
]

const assumptionLabels: Array<[keyof DealModel, string]> = [
    ['askingPrice', 'Asking price'],
    ['taxRate', 'Tax rate'],
    ['holdPeriodYears', 'Hold period'],
    ['exitMultiple', 'Exit multiple'],
]

import { safeFormatCurrency } from '../utils/diligenceDashboardUtils'

function formatFact(value: number | undefined, currency?: string) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'Not returned'
    return safeFormatCurrency(value, currency)
}

export default function DealModelReadinessCard({ model, documents, onOpenEvidence }: { model: DealModel; documents: SubmissionHistoryItem[]; onOpenEvidence: (evidence: EvidenceItem) => void }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const confirmedCount = factLabels.filter(([key]) => facts[key]?.status === 'confirmed' && typeof facts[key]?.value === 'number').length
    const assumptionsSet = assumptionLabels.filter(([key]) => model[key] !== null && model[key] !== undefined).length

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Deal Model readiness</CardTitle><CardInfoPopover cardId="deal-model-readiness" /></div>
                        <CardDescription className="mt-1">See exactly what arrived from documents versus what still needs an analyst assumption.</CardDescription>
                    </div>
                    <Badge variant={confirmedCount > 0 ? 'success' : 'warning'}>{confirmedCount}/{factLabels.length} core facts confirmed</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3 text-sm text-foreground">
                    <p className="font-medium">Documented-facts bridge: {model.documentedFactsStatus || 'Awaiting first completed document'}</p>
                    <p className="mt-1 text-muted-foreground">Confirmed facts can feed deterministic calculations. Price, tax, financing, and scenario settings remain analyst-controlled assumptions.</p>
                </div>
                <div>
                    <p className="text-sm font-semibold text-foreground">Documented facts</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        {factLabels.map(([key, label]) => {
                            const fact = facts[key]
                            const confirmed = fact?.status === 'confirmed' && typeof fact.value === 'number'
                            const status = getEvidenceStatusPresentation(fact?.status, fact?.provenance)
                            return <button key={key} type="button" disabled={!fact} onClick={() => onOpenEvidence(buildFactEvidence({ field: key, title: `${label} evidence`, facts, documents }))} className="rounded-lg border border-border bg-background p-3 text-left transition-colors enabled:hover:border-primary/40 disabled:cursor-default">
                                <div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{label}</span>{confirmed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <CircleAlert className="h-4 w-4 text-warning" />}</div>
                                <p className="mt-2 text-sm font-semibold text-foreground">{formatFact(fact?.value, fact?.currency)}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5"><Badge variant={status.variant}>{status.label}</Badge><span className="text-xs text-muted-foreground">{confirmed ? `${fact.period || 'Period missing'} · View evidence` : fact?.status || 'Not documented'}</span></div>
                            </button>
                        })}
                    </div>
                </div>
                <div>
                    <div className="flex items-center gap-2"><FileSearch className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Analyst assumptions</p><Badge variant={assumptionsSet === assumptionLabels.length ? 'success' : 'outline'}>{assumptionsSet}/{assumptionLabels.length} set</Badge></div>
                    <p className="mt-1 text-xs text-muted-foreground">Enter or confirm these in the workspace tabs before relying on returns or scenario results.</p>
                    <div className="mt-3 flex flex-wrap gap-2">{assumptionLabels.map(([key, label]) => <Badge key={key} variant={model[key] !== null && model[key] !== undefined ? 'secondary' : 'warning'}>{model[key] !== null && model[key] !== undefined ? `${label} set` : `${label} needed`}</Badge>)}</div>
                </div>
            </CardContent>
        </Card>
    )
}
