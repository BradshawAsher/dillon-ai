import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileCheck, PenLine, BarChart2, Sliders, Calculator, Bot } from 'lucide-react'
import { useFloatingPosition } from '../../hooks/useFloatingPosition'

export type DataOrigin =
    | 'extracted'     // Documented facts from uploaded files (CIM, Tax Returns, P&L)
    | 'user_entered'  // Manually entered or saved by the analyst
    | 'benchmark'     // Industry / Sector benchmark or market standard (e.g. SBA, WSJ Prime)
    | 'assumption'    // Financial model underwriting assumption or heuristic proxy
    | 'calculated'    // Derived formula output (e.g. IRR, DSCR, Bridge Total)

export interface DataOriginBadgeProps {
    origin: DataOrigin
    label?: string
    citation?: string
    formula?: string
    description?: string
    metricLabel?: string
    metricValue?: string
    compact?: boolean
    interactive?: boolean
    className?: string
    onClick?: () => void
}

const ORIGIN_CONFIG: Record<
    DataOrigin,
    {
        defaultLabel: string
        icon: React.ComponentType<{ className?: string }>
        badgeClass: string
        description: string
    }
> = {
    extracted: {
        defaultLabel: 'Extracted',
        icon: FileCheck,
        badgeClass:
            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20',
        description: 'Verified historical financial fact extracted directly from uploaded diligence documents.',
    },
    user_entered: {
        defaultLabel: 'User Input',
        icon: PenLine,
        badgeClass:
            'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/20',
        description: 'Analyst-customized or manual override saved in the deal model.',
    },
    benchmark: {
        defaultLabel: 'Benchmark',
        icon: BarChart2,
        badgeClass:
            'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/20',
        description: 'Industry sector median dataset or standard institutional lending parameter.',
    },
    assumption: {
        defaultLabel: 'Assumption',
        icon: Sliders,
        badgeClass:
            'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-dashed border-amber-500/50 hover:bg-amber-500/20',
        description: 'Underwriting model hypothesis or illustrative proxy value.',
    },
    calculated: {
        defaultLabel: 'Calculated',
        icon: Calculator,
        badgeClass:
            'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/35 hover:bg-sky-500/25',
        description: 'Derived mathematical calculation computed deterministically from underlying deal inputs.',
    },
}

export default function DataOriginBadge({
    origin,
    label,
    citation,
    formula,
    description,
    metricLabel,
    metricValue,
    compact = false,
    interactive = true,
    className = '',
    onClick,
}: DataOriginBadgeProps) {
    const [showPopover, setShowPopover] = useState(false)
    const buttonRef = useRef<HTMLButtonElement | null>(null)
    const closeTimeoutRef = useRef<number | null>(null)
    const config = ORIGIN_CONFIG[origin] || ORIGIN_CONFIG.assumption
    const Icon = config.icon
    const displayLabel = label || config.defaultLabel
    const activeDescription = description || config.description

    const titleText = `${config.defaultLabel}: ${activeDescription}${
        citation ? ` Source: ${citation}` : ''
    }${formula ? ` Formula: ${formula}` : ''}`

    const hasDetails = Boolean(citation || formula || activeDescription || metricLabel || metricValue || interactive)

    const coords = useFloatingPosition({
        isOpen: showPopover,
        targetRef: buttonRef,
        popoverWidth: 380,
        preferredPlacement: 'top',
        margin: 8,
        padding: 16,
    })

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
        }
        if (hasDetails) setShowPopover(true)
    }

    const handleMouseLeave = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current)
        }
        closeTimeoutRef.current = window.setTimeout(() => {
            setShowPopover(false)
        }, 180)
    }

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current !== null) {
                window.clearTimeout(closeTimeoutRef.current)
            }
        }
    }, [])

    const handleAskAi = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowPopover(false)
        const projectName = (typeof window !== 'undefined' && (window as any).__mergeworks_active_project_name) || 'this deal'
        const termName = metricLabel || displayLabel
        const valStr = metricValue ? ` (currently modeled at ${metricValue})` : ''
        const formulaStr = formula ? ` Formula used: "${formula}".` : ''
        const question = `Can you explain how "${termName}"${valStr} is calculated on ${projectName}?${formulaStr} Its displayed data origin is "${displayLabel}": ${activeDescription}${citation ? ` Source shown: ${citation}.` : ''} What inputs does it rely on, is it based on verified facts or underwriting assumptions, and what are the main risks or sensitivity factors a buyer should check? Do not invent missing values or sources.`

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('mergeworks:open-chat-ask', {
                    detail: {
                        question,
                        topic: termName,
                    },
                })
            )
        }
    }

    return (
        <span
            className="relative inline-flex items-center"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleMouseEnter}
            onBlur={handleMouseLeave}
        >
            <button
                ref={buttonRef}
                type="button"
                data-origin-badge={origin}
                title={titleText}
                onClick={(event) => {
                    event.stopPropagation()
                    onClick?.()
                    if (!onClick) setShowPopover((current) => !current)
                }}
                onKeyDown={(event) => { if (event.key === 'Escape') setShowPopover(false) }}
                aria-expanded={hasDetails ? showPopover : undefined}
                aria-label={`${displayLabel} data origin details`}
                className={`inline-flex items-center gap-1 rounded-md border font-semibold tracking-tight transition-all select-none ${
                    config.badgeClass
                } ${
                    compact
                        ? 'px-1.5 py-0 text-[10px]'
                        : 'px-2 py-0.5 text-xs'
                } ${
                    hasDetails ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'
                } ${className}`}
            >
                <Icon className={compact ? 'h-2.5 w-2.5 shrink-0' : 'h-3 w-3 shrink-0'} />
                <span>{displayLabel}</span>
            </button>

            {showPopover && hasDetails && typeof document !== 'undefined' && createPortal(
                <div
                    role="dialog"
                    aria-label={`${metricLabel || displayLabel} explanation`}
                    onFocus={handleMouseEnter}
                    onBlur={handleMouseLeave}
                    onKeyDown={(event) => { if (event.key === 'Escape') setShowPopover(false) }}
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
                    className="overflow-y-auto rounded-xl border border-primary/30 bg-card text-card-foreground p-4 text-left shadow-2xl backdrop-blur-xl ring-1 ring-border/50 animate-in fade-in-0 zoom-in-95 duration-150"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="space-y-1">
                            <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badgeClass}`}>
                                {displayLabel} Data Origin
                            </span>
                            <h4 className="text-sm font-bold text-foreground leading-tight flex items-center gap-1.5">
                                <Icon className="h-4 w-4 text-primary shrink-0" />
                                <span>{metricLabel || config.defaultLabel}</span>
                            </h4>
                        </div>
                        {metricValue ? (
                            <span className="text-sm font-black text-primary shrink-0 rounded-md bg-primary/10 px-2 py-1 border border-primary/20">
                                {metricValue}
                            </span>
                        ) : null}
                    </div>

                    {/* What it is / Description */}
                    <div className="mt-3 space-y-2.5 text-xs text-foreground/90 leading-relaxed">
                        <div>
                            <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                Definition &amp; Diligence Context
                            </p>
                            <p className="text-foreground/90">{activeDescription}</p>
                        </div>

                        {formula ? (
                            <div className="rounded-lg bg-muted/50 p-2.5 border border-border/40">
                                <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                                    <Calculator className="h-3 w-3 text-primary" />
                                    <span>Calculation Formula</span>
                                </p>
                                <p className="font-mono text-xs text-foreground/90 leading-snug">
                                    {formula}
                                </p>
                            </div>
                        ) : null}

                        {citation ? (
                            <div className="rounded-lg bg-primary/5 p-2.5 border border-primary/20">
                                <p className="font-semibold text-[10px] uppercase tracking-wider text-primary flex items-center gap-1 mb-0.5">
                                    <span>Source Document / Provenance</span>
                                </p>
                                <p className="text-xs text-foreground/80 leading-snug">
                                    {citation}
                                </p>
                            </div>
                        ) : null}

                        {interactive ? (
                            <div className="pt-2 mt-2 border-t border-border/50">
                                <button
                                    type="button"
                                    onClick={handleAskAi}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer shadow-xs"
                                >
                                    <Bot className="h-3.5 w-3.5" />
                                    <span>Ask AI to Explain</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>,
                document.body
            )}
        </span>
    )
}
