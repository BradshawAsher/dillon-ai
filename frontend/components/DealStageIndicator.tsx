import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Milestone } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { useFloatingPosition } from '../hooks/useFloatingPosition'

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
    const buttonRef = useRef<HTMLButtonElement | null>(null)

    const coords = useFloatingPosition({
        isOpen: open,
        targetRef: buttonRef,
        popoverWidth: 260,
        preferredPlacement: 'bottom',
        margin: 6,
        padding: 12,
    })

    useEffect(() => {
        // The initial read is guarded; the write must be too, so a
        // disabled/unavailable localStorage can't throw out of this effect.
        try {
            localStorage.setItem(STORAGE_KEY, stage)
        } catch {
            // best effort; the selected stage still lives in component state
        }
    }, [stage])

    const currentIndex = STAGES.findIndex(s => s.id === stage)
    const current = STAGES[currentIndex]

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 rounded-lg border border-border bg-card/80 px-3 py-1.5 text-sm transition-colors hover:bg-muted/50 cursor-pointer"
            >
                <Milestone className="h-3.5 w-3.5 text-primary" />
                <span className="font-medium text-foreground">{current.label}</span>
                <Badge variant="outline" className="text-[9px]">{currentIndex + 1}/{STAGES.length}</Badge>
            </button>
            {open && typeof document !== 'undefined' && createPortal(
                <>
                    <div className="fixed inset-0 z-[99998]" onClick={() => setOpen(false)} />
                    <div
                        style={{
                            position: 'fixed',
                            top: coords.top !== undefined ? `${coords.top}px` : undefined,
                            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                            left: coords.left !== undefined ? `${coords.left}px` : undefined,
                            right: coords.right !== undefined ? `${coords.right}px` : undefined,
                            width: coords.width !== undefined ? `${coords.width}px` : undefined,
                            maxHeight: coords.maxHeight !== undefined ? `${coords.maxHeight}px` : '75vh',
                            zIndex: 99999,
                        }}
                        className="overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 ring-1 ring-border/50"
                    >
                        <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Deal stage</p>
                        {STAGES.map((s, i) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => { setStage(s.id); setOpen(false) }}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors cursor-pointer ${s.id === stage ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/50'}`}
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
                </>,
                document.body
            )}
        </div>
    )
}
