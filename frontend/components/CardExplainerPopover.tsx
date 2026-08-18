import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info, X, BookOpen, Lightbulb, Calculator, HelpCircle, Bot, Pin } from 'lucide-react'
import { useFloatingPosition } from '../hooks/useFloatingPosition'

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
    
    const isOpen = isPinned || isHovered
    const popoverRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const hoverTimeoutRef = useRef<number | null>(null)

    const coords = useFloatingPosition({
        isOpen,
        targetRef: buttonRef,
        popoverWidth: 360,
        preferredPlacement: 'bottom',
        margin: 8,
        padding: 16,
    })

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
            className={`relative inline-flex items-center shrink-0 ${className}`}
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

            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    {/* If pinned, show backdrop for click outside */}
                    {isPinned && (
                        <div
                            className="fixed inset-0 z-[99998] bg-black/10 dark:bg-black/25 backdrop-blur-[0.5px]"
                            onClick={handleClose}
                        />
                    )}

                    {/* Popover */}
                    <div
                        ref={popoverRef}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        role="dialog"
                        aria-label={`About ${title}`}
                        style={{
                            position: 'fixed',
                            top: coords.top !== undefined ? `${coords.top}px` : undefined,
                            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                            left: coords.left !== undefined ? `${coords.left}px` : undefined,
                            right: coords.right !== undefined ? `${coords.right}px` : undefined,
                            width: coords.width !== undefined ? `${coords.width}px` : undefined,
                            maxHeight: coords.maxHeight !== undefined ? `${coords.maxHeight}px` : '80vh',
                            zIndex: 99999,
                        }}
                        className="overflow-y-auto rounded-xl border border-border bg-popover p-4 shadow-2xl text-popover-foreground animate-in fade-in-0 zoom-in-95 duration-150 ring-1 ring-border/50"
                        onClick={(e) => e.stopPropagation()}
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
                </>,
                document.body
            )}
        </div>
    )
}
