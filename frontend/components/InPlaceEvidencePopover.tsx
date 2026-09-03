import { useState, useRef, useEffect, ReactNode } from 'react'
import { FileText, AlertTriangle, X, ShieldCheck, Bot, Pin, Edit3, RotateCcw } from 'lucide-react'

export interface EvidenceDetails {
    metricName: string
    valueFormatted: string
    sourceDoc?: string
    pageNumber?: number | string
    quoteSnippet?: string
    confidence?: 'high' | 'medium' | 'low' | string
    status?: 'confirmed' | 'disputed' | 'estimated' | 'unverified'
    notes?: string
    // Bi-temporal audit override fields:
    isOverridden?: boolean
    originalAiValueFormatted?: string
    overrideReason?: string
    overriddenBy?: string
    overriddenAt?: string
    deltaFormatted?: string
}

export interface InPlaceEvidencePopoverProps {
    evidence: EvidenceDetails
    children: ReactNode
    className?: string
    align?: 'left' | 'right' | 'auto'
    onOpenOverride?: () => void
    onRevertOverride?: () => void
}

export default function InPlaceEvidencePopover({
    evidence,
    children,
    className = '',
    align = 'auto',
    onOpenOverride,
    onRevertOverride,
}: InPlaceEvidencePopoverProps) {
    const [isPinned, setIsPinned] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [computedAlign, setComputedAlign] = useState<'left' | 'right'>('left')
    const [verticalPlacement, setVerticalPlacement] = useState<'bottom' | 'top'>('bottom')
    
    const isOpen = isPinned || isHovered
    const popoverRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const hoverTimeoutRef = useRef<number | null>(null)

    const clearHoverTimer = () => {
        if (hoverTimeoutRef.current !== null) {
            window.clearTimeout(hoverTimeoutRef.current)
            hoverTimeoutRef.current = null
        }
    }

    const handleMouseEnter = () => {
        clearHoverTimer()
        setIsHovered(true)
    }

    const handleMouseLeave = () => {
        clearHoverTimer()
        hoverTimeoutRef.current = window.setTimeout(() => {
            setIsHovered(false)
        }, 180)
    }

    const handleTogglePin = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsPinned((prev) => !prev)
    }

    const handleClose = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        clearHoverTimer()
        setIsPinned(false)
        setIsHovered(false)
    }

    useEffect(() => {
        return () => clearHoverTimer()
    }, [])

    useEffect(() => {
        if (!isOpen) return

        function handleClickOutside(e: MouseEvent) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                handleClose()
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                handleClose()
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

        const rect = buttonRef.current.getBoundingClientRect()
        const popoverWidth = 320
        const popoverHeight = 320

        // Horizontal alignment check
        if (align === 'left') {
            setComputedAlign('left')
        } else if (align === 'right') {
            setComputedAlign('right')
        } else {
            if (rect.left + popoverWidth > window.innerWidth - 20) {
                setComputedAlign('right')
            } else {
                setComputedAlign('left')
            }
        }

        // Vertical placement check to prevent bottom-of-screen cutoff
        if (rect.bottom + popoverHeight > window.innerHeight - 20 && rect.top > popoverHeight + 20) {
            setVerticalPlacement('top')
        } else {
            setVerticalPlacement('bottom')
        }
    }, [isOpen, align])

    const handleAskAi = (e: React.MouseEvent) => {
        e.stopPropagation()
        handleClose()
        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('mergeworks:open-chat-ask', {
                    detail: {
                        question: `Can you explain the diligence evidence behind ${evidence.metricName} (${evidence.valueFormatted})? Source: "${evidence.sourceDoc || 'VDR File'}" (Page/Section: ${evidence.pageNumber || 'N/A'}), Status: ${evidence.status || 'documented'}. Quote: "${evidence.quoteSnippet || 'None'}". What are the key buyer implications or validation steps?`,
                        topic: evidence.metricName,
                    },
                })
            )
        }
    }

    const statusBadge = () => {
        if (evidence.isOverridden) {
            return (
                <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400 border border-purple-500/30">
                    <Edit3 className="h-3 w-3" />
                    Analyst Override
                </span>
            )
        }
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
        <span
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                ref={buttonRef}
                type="button"
                onClick={handleTogglePin}
                aria-label={`View evidence for ${evidence.metricName}`}
                className="group inline-flex items-center gap-1 text-inherit hover:underline decoration-primary/40 underline-offset-2 cursor-pointer focus:outline-none"
            >
                {children}
                {evidence.isOverridden ? (
                    <span
                        className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 ml-0.5"
                        title="Analyst calibrated value (active in calculations)"
                    >
                        ✏️ Override
                    </span>
                ) : null}
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className={`absolute z-50 w-80 max-w-[calc(100vw-2rem)] max-h-[75vh] overflow-y-auto rounded-xl border border-border bg-popover p-3.5 shadow-2xl text-popover-foreground animate-in fade-in zoom-in-95 duration-150 ${
                        verticalPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                    } ${computedAlign === 'right' ? 'right-0' : 'left-0'}`}
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
                                onClick={handleTogglePin}
                                title={isPinned ? 'Unpin popover' : 'Pin popover open'}
                                aria-label="Toggle pin"
                                className={`rounded p-1 transition-colors cursor-pointer ${
                                    isPinned
                                        ? 'bg-primary/20 text-primary font-bold'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                <Pin className="h-3 w-3" />
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                aria-label="Close"
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2.5 pt-2.5 text-xs">
                        {/* Bi-Temporal Override Provenance Card */}
                        {evidence.isOverridden && (
                            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-2.5 space-y-1.5">
                                <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-muted-foreground font-semibold">AI Baseline Extraction:</span>
                                    <span className="font-mono font-bold text-foreground">{evidence.originalAiValueFormatted || '—'}</span>
                                </div>
                                {evidence.deltaFormatted && (
                                    <div className="flex items-center justify-between text-[10px]">
                                        <span className="text-muted-foreground font-semibold">Variance Delta:</span>
                                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{evidence.deltaFormatted}</span>
                                    </div>
                                )}
                                {evidence.overrideReason && (
                                    <div className="text-[11px] text-foreground border-t border-purple-500/20 pt-1 leading-relaxed">
                                        <span className="font-semibold text-purple-700 dark:text-purple-300">Rationale: </span>
                                        <span>{evidence.overrideReason}</span>
                                    </div>
                                )}
                                {evidence.overriddenBy && (
                                    <div className="text-[9px] text-muted-foreground">
                                        Calibrated by {evidence.overriddenBy} {evidence.overriddenAt ? `• ${new Date(evidence.overriddenAt).toLocaleDateString()}` : ''}
                                    </div>
                                )}
                                {onRevertOverride && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onRevertOverride()
                                        }}
                                        className="flex items-center justify-center gap-1 w-full mt-1.5 rounded-md bg-muted/80 hover:bg-muted py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        Revert to AI Extraction
                                    </button>
                                )}
                            </div>
                        )}

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
                                    <span>Page / Row: </span>
                                    <span className="font-semibold text-foreground">{evidence.pageNumber}</span>
                                </div>
                            )}
                        </div>

                        {evidence.notes && (
                            <p className="text-[10px] text-muted-foreground leading-normal border-t border-border/40 pt-1.5">
                                {evidence.notes}
                            </p>
                        )}

                        <div className="pt-1.5 border-t border-border/50 flex flex-col gap-1.5">
                            {onOpenOverride && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleClose()
                                        onOpenOverride()
                                    }}
                                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 transition-all cursor-pointer shadow-2xs"
                                >
                                    <Edit3 className="h-3.5 w-3.5 shrink-0" />
                                    <span>{evidence.isOverridden ? 'Edit Analyst Override' : 'Calibrate / Override Value'}</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleAskAi}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                            >
                                <Bot className="h-3.5 w-3.5 shrink-0" />
                                <span>Ask AI to Explain Evidence</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </span>
    )
}
