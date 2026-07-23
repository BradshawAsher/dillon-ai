import { useEffect, useMemo, useState } from 'react'
import { ArrowDownToLine, Scale } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'
import { formatCurrencyValue } from '../utils/aiSubmissionData'
import type { EvidenceItem } from '../utils/evidence'

type BridgeItem = { id: string; finding: string; mechanism: string; amount: string }

function classifyMechanism(finding: string) {
    const text = finding.toLowerCase()
    if (/working capital|inventory|receivable|payable/.test(text)) return 'Purchase-price adjustment / closing adjustment'
    if (/debt|liabilit|tax/.test(text)) return 'Debt payoff or escrow'
    if (/customer|concentration|retention|churn/.test(text)) return 'Earn-out or diligence condition'
    if (/add.?back|ebitda|margin|revenue/.test(text)) return 'Price reduction or seller note'
    return 'Diligence condition / analyst review'
}

function storageKey(projectId: string) { return `mergeworks.valuationImpactBridge.${projectId}` }

export default function ValuationImpactBridge({ synthesis, baseValue, onOpenEvidence }: { synthesis: ProjectSynthesisItem; baseValue: number | null; onOpenEvidence?: (item: EvidenceItem) => void }) {
    const suggested = useMemo(() => synthesis.crossDocumentConflicts.map((finding, index) => ({ id: `${index}-${finding}`, finding, mechanism: classifyMechanism(finding), amount: '' })), [synthesis.crossDocumentConflicts])
    const [items, setItems] = useState<BridgeItem[]>([])

    useEffect(() => {
        try {
            const saved = JSON.parse(window.localStorage.getItem(storageKey(synthesis.projectId)) || '[]') as BridgeItem[]
            const byId = new Map(saved.map((item) => [item.id, item]))
            setItems(suggested.map((item) => byId.get(item.id) ?? item))
        } catch { setItems(suggested) }
    }, [synthesis.projectId, suggested])
    useEffect(() => { try { window.localStorage.setItem(storageKey(synthesis.projectId), JSON.stringify(items)) } catch {} }, [items, synthesis.projectId])

    const adjustmentTotal = items.reduce((sum, item) => sum + (Number(item.amount.replace(/[$,\s]/g, '')) || 0), 0)
    const adjustedBase = baseValue === null ? null : Math.max(0, baseValue - adjustmentTotal)

    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Evidence-linked value bridge</CardTitle></div><CardDescription className="mt-1">Translate evidence into a proposed price or terms mechanism. Amounts are analyst-entered assumptions, never LLM-generated values.</CardDescription></div><Badge variant="warning">Analyst review required</Badge></div></CardHeader><CardContent className="space-y-4 p-4">{items.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No cross-document conflicts are available to translate into a price or terms adjustment.</p> : <><div className="space-y-3">{items.map((item) => <div key={item.id} className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)_160px]"><button type="button" onClick={() => onOpenEvidence?.({ title: 'Value-bridge evidence', sourceFile: synthesis.citations?.[0] || 'Project synthesis', sourceLocation: 'Project-level synthesis', excerpt: item.finding, status: 'Synthesized', provenance: 'Project synthesis' })} className="text-left text-sm leading-6 text-foreground hover:text-primary">{item.finding}<span className="ml-2 text-xs font-medium text-primary">View evidence</span></button><select value={item.mechanism} onChange={(event) => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, mechanism: event.target.value } : candidate))} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option>Price reduction or seller note</option><option>Purchase-price adjustment / closing adjustment</option><option>Debt payoff or escrow</option><option>Earn-out or diligence condition</option><option>Diligence condition / analyst review</option></select><Input inputMode="decimal" value={item.amount} onChange={(event) => setItems((current) => current.map((candidate) => candidate.id === item.id ? { ...candidate, amount: event.target.value } : candidate))} placeholder="Adjustment $" /></div>)}</div><div className="flex flex-col gap-2 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-foreground">Proposed analyst adjustments</p><p className="mt-1 text-xs text-muted-foreground">Amounts reduce the supported base value for negotiation planning only; they do not overwrite workflow valuation.</p></div><div className="text-right"><p className="text-lg font-semibold text-foreground">−{formatCurrencyValue(String(adjustmentTotal), synthesis.valuationCurrency || 'USD')}</p><p className="text-xs text-muted-foreground">Adjusted base: {adjustedBase === null ? 'Not available' : formatCurrencyValue(String(adjustedBase), synthesis.valuationCurrency || 'USD')}</p></div></div></>}</CardContent></Card>
}
