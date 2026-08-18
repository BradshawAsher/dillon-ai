import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info, X, HelpCircle, Calculator, ShieldAlert, Target } from 'lucide-react'
import { getCardDescription, CardDescription } from './cardDescriptions'
import { useFloatingPosition } from '../../hooks/useFloatingPosition'

interface CardInfoPopoverProps {
    cardId: string
    title?: string
    description?: string
    calculation?: string
    diligenceImpact?: string
    benchmark?: string
    className?: string
    buttonSize?: 'xs' | 'sm' | 'default'
}

export default function CardInfoPopover({
    cardId,
    title: customTitle,
    description: customDescription,
    calculation: customCalculation,
    diligenceImpact: customImpact,
    benchmark: customBenchmark,
    className = '',
    buttonSize = 'sm',
}: CardInfoPopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const popoverRef = useRef<HTMLDivElement | null>(null)
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const clearCloseTimer = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
        }
    }

    const handleMouseEnter = () => {
        clearCloseTimer()
        setIsOpen(true)
    }

    const handleMouseLeave = () => {
        clearCloseTimer()
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false)
        }, 220)
    }

    const coords = useFloatingPosition({
        isOpen,
        targetRef: buttonRef,
        popoverWidth: 384,
        preferredPlacement: 'bottom',
        margin: 8,
        padding: 16,
    })

    const meta: CardDescription = getCardDescription(cardId)
    const title = customTitle || meta.title
    const whatItIs = customDescription || meta.whatItIs
    const calculation = customCalculation || meta.calculation
    const diligenceImpact = customImpact || meta.diligenceImpact
    const benchmark = customBenchmark || meta.benchmarkOrTarget

    // Close on click outside or escape key
    useEffect(() => {
        if (!isOpen) return
        const handleClickOutside = (e: MouseEvent) => {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false)
            }
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
            clearCloseTimer()
        }
    }, [isOpen])

    const iconSizes = {
        xs: 'h-3 w-3',
        sm: 'h-3.5 w-3.5',
        default: 'h-4 w-4',
    }

    const btnSizes = {
        xs: 'h-5 w-5 p-0',
        sm: 'h-6 w-6 p-0',
        default: 'h-7 w-7 p-0',
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
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen((prev) => !prev)
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`inline-flex items-center justify-center rounded-full text-muted-foreground/70 transition-all hover:bg-primary/10 hover:text-primary hover:scale-110 active:scale-95 cursor-pointer ${btnSizes[buttonSize]}`}
                title={`What is ${title}? (Hover or click for diligence explanation)`}
                aria-label={`What is ${title}?`}
                aria-expanded={isOpen}
            >
                <Info className={iconSizes[buttonSize]} />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-label={`About ${title}`}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
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
                    className="overflow-y-auto rounded-xl border border-primary/30 bg-card text-card-foreground p-4 shadow-2xl backdrop-blur-xl animate-in fade-in-0 zoom-in-95 duration-150 ring-1 ring-border/50"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div>
                            {meta.category && (
                                <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                                    {meta.category}
                                </span>
                            )}
                            <h4 className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5">
                                <HelpCircle className="h-4 w-4 text-primary shrink-0" />
                                <span>{title}</span>
                                </h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                                aria-label="Close"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="mt-3 space-y-2.5 text-xs text-foreground/90 leading-relaxed">
                            {/* What it is */}
                            <div>
                                <p className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                    What it is
                                </p>
                                <p className="text-foreground/90">{whatItIs}</p>
                            </div>

                            {/* How it's calculated / sourced */}
                            {calculation && (
                                <div className="rounded-lg bg-muted/50 p-2 border border-border/40">
                                    <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                                        <Calculator className="h-3 w-3 text-primary" />
                                        <span>Calculation / Source</span>
                                    </p>
                                    <p className="font-mono text-[11px] text-muted-foreground leading-snug">
                                        {calculation}
                                    </p>
                                </div>
                            )}

                            {/* Diligence Impact */}
                            {diligenceImpact && (
                                <div className="rounded-lg bg-primary/5 p-2 border border-primary/20">
                                    <p className="font-semibold text-[10px] uppercase tracking-wider text-primary flex items-center gap-1 mb-0.5">
                                        <ShieldAlert className="h-3 w-3 text-primary" />
                                        <span>M&A Diligence Impact</span>
                                    </p>
                                    <p className="text-[11px] text-foreground/80 leading-snug">
                                        {diligenceImpact}
                                    </p>
                                </div>
                            )}

                            {/* Benchmark or Target */}
                            {benchmark && (
                                <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
                                    <Target className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                    <span><strong>Target / Benchmark:</strong> {benchmark}</span>
                                </div>
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    )
}

