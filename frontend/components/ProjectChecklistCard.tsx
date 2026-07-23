import { useState } from 'react'
import { CheckCircle2, ClipboardCheck } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Switch } from '../lib/shadcn/switch'

export type ProjectChecklistState = Record<string, boolean>

type ChecklistItem = { id: string; label: string; detail: string; recommended?: boolean }

export default function ProjectChecklistCard({ projectId, state, onChange, missingDocuments, employeeConfirmed, hasAskingPrice }: { projectId: string; state: ProjectChecklistState; onChange: (next: ProjectChecklistState) => void; missingDocuments: string[]; employeeConfirmed: boolean; hasAskingPrice: boolean }) {
    const [view, setView] = useState<'active' | 'completed'>('active')
    const items: ChecklistItem[] = [
        { id: 'financials_confirmed', label: 'Confirm core financial figures', detail: 'Review documented revenue, EBITDA/SDE, debt, and working-capital inputs before relying on model outputs.', recommended: true },
        { id: 'headcount_confirmed', label: 'Confirm employee count', detail: employeeConfirmed ? 'Evidence-backed headcount is available; confirm it is current and in scope.' : 'Request or verify current employee/FTE count.', recommended: !employeeConfirmed },
        { id: 'price_confirmed', label: 'Confirm asking price and transaction assumptions', detail: hasAskingPrice ? 'Asking price is entered; confirm fees, working capital, and deal structure assumptions.' : 'Enter the asking price before using price-gap and return metrics.', recommended: !hasAskingPrice },
        { id: 'materials_requested', label: 'Request missing diligence materials', detail: missingDocuments.length ? `Still requested: ${missingDocuments.slice(0, 2).join('; ')}.` : 'No missing core materials are currently recorded.', recommended: missingDocuments.length > 0 },
        { id: 'risks_reviewed', label: 'Review risks and management questions', detail: 'Confirm the highest-impact risks, assign follow-up, and reflect outcomes in the deal thesis.', recommended: true },
    ]
    const completed = items.filter((item) => state[item.id]).length
    const visibleItems = items.filter((item) => view === 'completed' ? state[item.id] : !state[item.id])
    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Project checklist</CardTitle></div><CardDescription className="mt-1">Optional analyst checklist for {projectId || 'this project'}. It does not block document processing or synthesis.</CardDescription></div><Badge variant={completed === items.length ? 'success' : 'outline'}>{completed}/{items.length} complete</Badge></div></CardHeader><CardContent className="space-y-3 p-4"><div className="flex gap-2 border-b border-border pb-3"><button type="button" onClick={() => setView('active')} className={view === 'active' ? 'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground' : 'rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted'}>To do ({items.length - completed})</button><button type="button" onClick={() => setView('completed')} className={view === 'completed' ? 'rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground' : 'rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted'}>Completed ({completed})</button></div>{visibleItems.length ? visibleItems.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors hover:bg-muted/30"><Switch checked={Boolean(state[item.id])} onCheckedChange={(checked) => onChange({ ...state, [item.id]: checked })} /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-foreground">{item.label}</span>{item.recommended ? <Badge variant="warning" className="text-[10px]">Recommended</Badge> : null}{state[item.id] ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span></span></label>) : <p className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">{view === 'completed' ? 'No checklist items have been completed yet.' : 'All checklist items are complete. You can move an item back from the Completed tab if needed.'}</p>}</CardContent></Card>
}
