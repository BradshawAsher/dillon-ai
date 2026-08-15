import { useState, useRef, useEffect } from 'react'
import { Info, X, BookOpen, Lightbulb, Calculator, HelpCircle, Bot, Pin } from 'lucide-react'

export interface CardExplainerPopoverProps {
    title: string
    whatIsIt: string
    howItWorks?: string
    whyItMatters?: string
    align?: 'left' | 'right' | 'auto'
    className?: string
}

export default function CardExplainerPopover({
    title,
    whatIsIt,
    howItWorks,
    whyItMatters,
    align = 'auto',
    className = '',
}: CardExplainerPopoverProps) {
    const [isPinned, setIsPinned] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [computedAlign, setComputedAlign] = useState<'left' | 'right'>('right')
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

    // Handle outside click and Escape key
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

    // Compute alignment and vertical placement to avoid screen cutoff
    useEffect(() => {
        if (!isOpen || !buttonRef.current) return

        const rect = buttonRef.current.getBoundingClientRect()
        const popoverWidth = 340
        const popoverHeight = 320

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
                        question: `Can you explain what "${title}" means in SMB M&A diligence, how it is calculated or evaluated on this deal, and what key red flags or buyer risks I should watch out for?`,
                        topic: title,
                    },
                })
            )
        }
    }

    return (
        <div
            className={`relative inline-flex items-center ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                ref={buttonRef}
                type="button"
                onClick={handleTogglePin}
                aria-label={`Learn about ${title}`}
                title={`What is ${title}? (Hover to preview, click to pin)`}
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer ${
                    isPinned
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
            >
                <HelpCircle className="h-3.5 w-3.5" />
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className={`absolute z-50 w-84 max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-2xl text-popover-foreground animate-in fade-in zoom-in-95 duration-150 ${
                        verticalPlacement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                    } ${computedAlign === 'right' ? 'right-0' : 'left-0'}`}
                >
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-primary shrink-0" />
                            <h4 className="text-xs font-bold text-foreground leading-snug">{title}</h4>
                        </div>
                        <div className="flex items-center gap-1">
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
                                aria-label="Close explainer"
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 pt-3 text-xs leading-relaxed">
                        {/* What is it */}
                        <div>
                            <div className="flex items-center gap-1 text-[11px] font-semibold text-primary mb-1">
                                <Info className="h-3 w-3" />
                                <span>What is this?</span>
                            </div>
                            <p className="text-muted-foreground">{whatIsIt}</p>
                        </div>

                        {/* How it works */}
                        {howItWorks && (
                            <div>
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground mb-1">
                                    <Calculator className="h-3 w-3 text-amber-500" />
                                    <span>How it works</span>
                                </div>
                                <p className="text-muted-foreground">{howItWorks}</p>
                            </div>
                        )}

                        {/* Why it matters */}
                        {whyItMatters && (
                            <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5">
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-primary mb-1">
                                    <Lightbulb className="h-3 w-3 text-primary" />
                                    <span>Why it matters to a buyer</span>
                                </div>
                                <p className="text-[11px] text-foreground/90 leading-normal">{whyItMatters}</p>
                            </div>
                        )}

                        {/* Ask AI Button */}
                        <div className="pt-1 border-t border-border/50">
                            <button
                                type="button"
                                onClick={handleAskAi}
                                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                            >
                                <Bot className="h-3.5 w-3.5" />
                                <span>Ask AI Assistant to Explain More</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
