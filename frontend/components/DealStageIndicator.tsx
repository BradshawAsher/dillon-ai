import { useState, useEffect } from 'react'
import { Milestone } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'

const STAGES = [
    { id: 'discovery', label: 'Discovery', description: 'Evaluating whether to pursue' },
    { id: 'pre-loi', label: 'Pre-LOI', description: 'Building the case for an offer' },
    { id: 'loi', label: 'LOI Signed', description: 'Letter of intent submitted' },
    { id: 'diligence', label: 'Under DD', description: 'Active due diligence period' },
    { id: 'negotiation', label: 'Negotiation', description: 'Finalizing price and terms' },
    { id: 'closing', label: 'Closing', description: 'Deal under contract' },
] as const

type Stage = typeof STAGES[number]['id']

const STORAGE_KEY = 'mergeworks.dealStage'

export default function DealStageIndicator() {
    const [stage, setStage] = useState<Stage>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            return (stored as Stage) || 'discovery'
        } catch { return 'discovery' }
    })
    const [open, setOpen] = useState(false)

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, stage)
    }, [stage])

    const currentIndex = STAGES.findIndex(s => s.id === stage)
    const current = STAGES[currentIndex]

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
            >
                <Milestone className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{current.label}</span>
                <Badge variant="outline" className="text-[9px]">{currentIndex + 1}/{STAGES.length}</Badge>
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-border bg-popover p-2 shadow-lg">
                        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Deal stage</p>
                        {STAGES.map((s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => { setStage(s.id); setOpen(false) }}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${s.id === stage ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'}`}
                            >
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i <= currentIndex ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
                                    {i + 1}
                                </span>
                                <div>
                                    <p className="font-medium">{s.label}</p>
                                    <p className="text-[10px] text-muted-foreground">{s.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
