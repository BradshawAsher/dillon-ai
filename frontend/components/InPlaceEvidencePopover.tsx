import { useState, useRef, useEffect, ReactNode } from 'react'
import { FileText, CheckCircle2, AlertTriangle, ExternalLink, X, ShieldCheck } from 'lucide-react'

export interface EvidenceDetails {
    metricName: string
    valueFormatted: string
    sourceDoc?: string
    pageNumber?: number | string
    quoteSnippet?: string
    confidence?: 'high' | 'medium' | 'low' | string
    status?: 'confirmed' | 'disputed' | 'estimated' | 'unverified'
    notes?: string
}

export interface InPlaceEvidencePopoverProps {
    evidence: EvidenceDetails
    children: ReactNode
    className?: string
    align?: 'left' | 'right' | 'auto'
}

export default function InPlaceEvidencePopover({
    evidence,
    children,
    className = '',
    align = 'auto',
}: InPlaceEvidencePopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [computedAlign, setComputedAlign] = useState<'left' | 'right'>('left')
    const popoverRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!isOpen) return

        function handleClickOutside(e: MouseEvent) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen || !buttonRef.current) return

        if (align === 'left') {
            setComputedAlign('left')
            return
        }
        if (align === 'right') {
            setComputedAlign('right')
            return
        }

        const rect = buttonRef.current.getBoundingClientRect()
        const popoverWidth = 300
        if (rect.left + popoverWidth > window.innerWidth - 16) {
            setComputedAlign('right')
        } else {
            setComputedAlign('left')
        }
    }, [isOpen, align])

    const statusBadge = () => {
        const s = evidence.status || 'confirmed'
        if (s === 'confirmed') {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" />
                    Verified VDR Fact
                </span>
            )
        }
        if (s === 'disputed' || s === 'unverified') {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 border border-red-500/20">
                    <AlertTriangle className="h-3 w-3" />
                    Unverified / Disputed
                </span>
            )
        }
        return (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                ⚙ Model Assumption
            </span>
        )
    }

    return (
        <span className={`relative inline-flex items-center ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`View evidence for ${evidence.metricName}`}
                className="group inline-flex items-center gap-1 text-inherit hover:underline decoration-primary/40 underline-offset-2 cursor-pointer focus:outline-none"
            >
                {children}
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className={`absolute top-full z-50 mt-1.5 w-76 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-3.5 shadow-xl text-popover-foreground animate-in fade-in zoom-in-95 duration-150 ${
                        computedAlign === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {evidence.metricName}
                            </p>
                            <p className="text-sm font-bold text-foreground mt-0.5">
                                {evidence.valueFormatted}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {statusBadge()}
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-2.5 text-xs">
                        {evidence.quoteSnippet && (
                            <div className="rounded-md bg-muted/60 p-2 border-l-2 border-primary">
                                <p className="text-[11px] italic text-foreground leading-relaxed">
                                    &ldquo;{evidence.quoteSnippet}&rdquo;
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                            {evidence.sourceDoc && (
                                <div className="flex items-center gap-1 truncate">
                                    <FileText className="h-3 w-3 shrink-0 text-primary" />
                                    <span className="truncate font-medium text-foreground">{evidence.sourceDoc}</span>
                                </div>
                            )}
                            {evidence.pageNumber && (
                                <div className="text-right">
                                    <span>Page / Section: </span>
                                    <span className="font-semibold text-foreground">{evidence.pageNumber}</span>
                                </div>
                            )}
                        </div>

                        {evidence.notes && (
                            <p className="text-[10px] text-muted-foreground leading-normal border-t border-border/40 pt-1.5">
                                {evidence.notes}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </span>
    )
}
