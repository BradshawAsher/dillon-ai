import { useState, useRef, useEffect } from 'react'
import { Info, X, BookOpen, Lightbulb, Calculator, HelpCircle, Bot } from 'lucide-react'

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
    const [isOpen, setIsOpen] = useState(false)
    const [computedAlign, setComputedAlign] = useState<'left' | 'right'>('right')
    const popoverRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)

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

    // Compute alignment to avoid screen cutoff
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
        const popoverWidth = 320
        if (rect.left + popoverWidth > window.innerWidth - 16) {
            setComputedAlign('right')
        } else {
            setComputedAlign('left')
        }
    }, [isOpen, align])

    const handleAskAi = () => {
        setIsOpen(false)
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
        <div className={`relative inline-flex items-center ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Learn about ${title}`}
                title={`What is ${title}?`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
                <HelpCircle className="h-3.5 w-3.5" />
            </button>

            {isOpen && (
                <div
                    ref={popoverRef}
                    className={`absolute top-full z-50 mt-1.5 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-4 shadow-xl text-popover-foreground animate-in fade-in zoom-in-95 duration-150 ${
                        computedAlign === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4 text-primary shrink-0" />
                            <h4 className="text-xs font-bold text-foreground leading-snug">{title}</h4>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close explainer"
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
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
