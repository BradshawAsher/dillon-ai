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
        popoverWidth: 280,
        preferredPlacement: 'top',
        margin: 6,
        padding: 12,
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
                    if (!onClick) setShowPopover(true)
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
                        maxHeight: coords.maxHeight !== undefined ? `${coords.maxHeight}px` : undefined,
                        zIndex: 99999,
                    }}
                    className="overflow-y-auto rounded-lg border border-border bg-popover p-2.5 text-left text-xs text-popover-foreground shadow-xl ring-1 ring-border/50 animate-in fade-in-0 zoom-in-95"
                >
                    <div className="flex items-center justify-between gap-1.5 font-bold">
                        <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            <span>{metricLabel || config.defaultLabel}</span>
                        </div>
                        {metricValue ? (
                            <span className="text-[11px] font-extrabold text-foreground">{metricValue}</span>
                        ) : null}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {activeDescription}
                    </p>
                    {formula ? (
                        <div className="mt-1.5 rounded bg-muted/60 px-2 py-1 font-mono text-[10px] text-foreground border border-border/50">
                            <span className="font-semibold font-sans text-muted-foreground mr-1">Formula:</span>
                            {formula}
                        </div>
                    ) : null}
                    {citation ? (
                        <div className="mt-1.5 border-t border-border/60 pt-1 text-[10px] text-foreground">
                            <span className="font-semibold text-muted-foreground">Source: </span>
                            {citation}
                        </div>
                    ) : null}
                    {interactive ? (
                        <div className="mt-2 border-t border-border/60 pt-1.5">
                            <button
                                type="button"
                                onClick={handleAskAi}
                                className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                            >
                                <Bot className="h-3 w-3" />
                                <span>Ask AI to Explain</span>
                            </button>
                        </div>
                    ) : null}
                </div>,
                document.body
            )}
        </span>
    )
}
