import { useState, useRef, useEffect } from 'react'
import { Info, X, BookOpen, Lightbulb, Calculator, HelpCircle } from 'lucide-react'

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

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Learn about ${title}`}
                title={`What is ${title}?`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus:outline-none focus:ring-1 focus:ring-primary"
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
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                    </div>
                </div>
            )}
        </div>
    )
}
