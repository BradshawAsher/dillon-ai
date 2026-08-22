import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, Scale } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { Input } from '../lib/shadcn/input'
import { formatCurrencyValue } from '../utils/aiSubmissionData'
import { buildDocumentLinkedEvidence, type EvidenceItem } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'

type BridgeItem = {
    id: string
    finding: string
    mechanism: string
    amount: string
    sourceFile?: string
    sourceLocation?: string
    excerpt?: string
    confidence?: number | null
    status?: string
}

function classifyMechanism(finding: string) {
    const text = finding.toLowerCase()
    if (/working capital|inventory|receivable|payable/.test(text)) return 'Purchase-price adjustment / closing adjustment'
    if (/debt|liabilit|tax/.test(text)) return 'Debt payoff or escrow'
    if (/customer|concentration|retention|churn/.test(text)) return 'Earn-out or diligence condition'
    if (/add.?back|ebitda|margin|revenue/.test(text)) return 'Price reduction or seller note'
    return 'Diligence condition / analyst review'
}

function storageKey(projectId: string) { return `mergeworks.valuationImpactBridge.${projectId}` }

export default function ValuationImpactBridge({ synthesis, baseValue, documents = [], onOpenEvidence }: { synthesis?: ProjectSynthesisItem | null; baseValue: number | null; documents?: SubmissionHistoryItem[]; onOpenEvidence?: (item: EvidenceItem) => void }) {
    const suggested = useMemo(() => {
        if (!synthesis) return []
        const structuredConflicts = synthesis.structuredFindings?.crossDocumentConflicts || []

        if (structuredConflicts.length > 0) {
            return structuredConflicts
                .filter((finding) => Boolean(finding && finding.text))
                .map((finding, index) => {
                    const primaryCitation = finding.citations?.[0]
                    return {
                        id: `${index}-${finding.text}`,
                        finding: finding.text,
                        mechanism: classifyMechanism(finding.text),
                        amount: '',
                        sourceFile: primaryCitation?.sourceFile,
                        sourceLocation: primaryCitation?.sourceLocation,
                        excerpt: primaryCitation?.excerpt,
                        confidence: finding?.confidence ?? undefined,
                        status: finding?.status ?? undefined,
                    }
                })
        }

        return (synthesis.crossDocumentConflicts || []).map((finding, index) => ({ id: `${index}-${finding}`, finding, mechanism: classifyMechanism(finding), amount: '' }))
    }, [synthesis])
    const [items, setItems] = useState<BridgeItem[]>([])

    const currentProjectId = synthesis?.projectId || 'default'

    useEffect(() => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(storageKey(currentProjectId)) || '[]') as BridgeItem[]
            const byId = new Map(saved.map((item) => [item.id, item]))
            setItems(suggested.map((item) => byId.get(item.id) ?? item))
        } catch { setItems(suggested) }
    }, [currentProjectId, suggested])
    useEffect(() => { try { window.localStorage.setItem(storageKey(currentProjectId), JSON.stringify(items)) } catch { } }, [items, currentProjectId])

    const adjustmentTotal = items.reduce((sum, item) => sum + (Number(item.amount.replace(/[$,\s]/g, '')) || 0), 0)
    const adjustedBase = baseValue === null ? null : Math.max(0, baseValue - adjustmentTotal)

    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    async function handleSaveBridge() {
        if (!synthesis?.projectId) {
            setSaveError('No project selected')
            return
        }
        setSaving(true)
        setSaveError(null)
        try {
            const resp = await fetch('/api/diligence/deal-models', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: synthesis.projectId, valuationBridgeJson: JSON.stringify(items) }),
            })
            if (!resp.ok) throw new Error(`Save failed: ${resp.statusText}`)
            setSaving(false)
            // best-effort: keep local copy in case the backend is slow
            try { window.localStorage.setItem(storageKey(synthesis.projectId), JSON.stringify(items)) } catch { }
        } catch (err) {
            setSaving(false)
            setSaveError(err instanceof Error ? err.message : String(err))
        }
    }

    const currency = synthesis?.valuationCurrency || 'USD'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Scale className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Evidence-linked value bridge</CardTitle>
                            <CardInfoPopover cardId="valuation-impact-bridge" />
                        </div>
                        <CardDescription className="mt-1">
                            Translate evidence into a proposed price or terms mechanism. Amounts are analyst-entered assumptions, never LLM-generated values.
                        </CardDescription>
                    </div>
                    <Badge variant="warning">Analyst review required</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                {items.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                        No cross-document conflicts are available to translate into a price or terms adjustment.
                    </p>
                ) : (
                    <>
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div key={item.id} className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_160px]">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onOpenEvidence?.({
                                                title: 'Value-bridge evidence',
                                                sourceFile: item.sourceFile || synthesis?.citations?.[0] || 'Project synthesis',
                                                sourceLocation: item.sourceLocation || 'Project-level synthesis',
                                                excerpt: item.excerpt || item.finding,
                                                confidence: item.confidence ?? undefined,
                                                status: item.status || 'Synthesized',
                                                provenance: 'Project synthesis',
                                            })
                                        }
                                        className="text-left text-sm leading-6 text-foreground hover:text-primary"
                                    >
                                        {item.finding}
                                        <span className="ml-2 text-xs font-medium text-primary">View evidence</span>
                                    </button>
                                    <select
                                        value={item.mechanism}
                                        onChange={(event) =>
                                            setItems((current) =>
                                                current.map((candidate) =>
                                                    candidate.id === item.id ? { ...candidate, mechanism: event.target.value } : candidate
                                                )
                                            )
                                        }
                                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                        <option>Price reduction or seller note</option>
                                        <option>Purchase-price adjustment / closing adjustment</option>
                                        <option>Debt payoff or escrow</option>
                                        <option>Earn-out or diligence condition</option>
                                        <option>Diligence condition / analyst review</option>
                                    </select>
                                    <label className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
                                        <span className="text-xs text-muted-foreground">$</span>
                                        <Input
                                            value={item.amount}
                                            onChange={(event) =>
                                                setItems((current) =>
                                                    current.map((candidate) =>
                                                        candidate.id === item.id ? { ...candidate, amount: event.target.value } : candidate
                                                    )
                                                )
                                            }
                                            inputMode="decimal"
                                            placeholder="Amount"
                                            className="border-0 px-0 focus-visible:ring-0"
                                        />
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/[0.04] p-4 sm:grid-cols-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Base value</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{baseValue === null ? 'Pending' : formatCurrencyValue(String(baseValue), currency)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Bridge adjustments</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{adjustmentTotal === 0 ? '$0' : `-${formatCurrencyValue(String(adjustmentTotal), currency)}`}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Illustrative adjusted value</p>
                                <p className="mt-1 text-lg font-semibold text-foreground">{adjustedBase === null ? 'Pending' : formatCurrencyValue(String(adjustedBase), currency)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={saving}
                                onClick={handleSaveBridge}
                                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-white"
                            >
                                {saving ? 'Saving…' : 'Save bridge to Deal Model'}
                            </button>
                            {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    )
}
