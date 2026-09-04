import React, { useState } from 'react'
import { FileCheck, PenLine, BarChart2, Sliders, Calculator } from 'lucide-react'

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
            'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/15',
        description: 'Verified historical financial fact extracted directly from uploaded diligence documents.',
    },
    user_entered: {
        defaultLabel: 'User Input',
        icon: PenLine,
        badgeClass:
            'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 hover:bg-blue-500/15',
        description: 'Analyst-customized or manual override saved in the deal model.',
    },
    benchmark: {
        defaultLabel: 'Benchmark',
        icon: BarChart2,
        badgeClass:
            'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30 hover:bg-purple-500/15',
        description: 'Industry sector median dataset or standard institutional lending parameter.',
    },
    assumption: {
        defaultLabel: 'Assumption',
        icon: Sliders,
        badgeClass:
            'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-dashed border-amber-500/50 hover:bg-amber-500/15',
        description: 'Underwriting model hypothesis or illustrative proxy value.',
    },
    calculated: {
        defaultLabel: 'Calculated',
        icon: Calculator,
        badgeClass:
            'bg-muted/80 text-foreground border-border hover:bg-muted',
        description: 'Derived mathematical calculation computed from underlying inputs.',
    },
}

export default function DataOriginBadge({
    origin,
    label,
    citation,
    formula,
    description,
    compact = false,
    interactive = true,
    className = '',
    onClick,
}: DataOriginBadgeProps) {
    const [showPopover, setShowPopover] = useState(false)
    const config = ORIGIN_CONFIG[origin] || ORIGIN_CONFIG.assumption
    const Icon = config.icon
    const displayLabel = label || config.defaultLabel
    const activeDescription = description || config.description

    const titleText = `${config.defaultLabel}: ${activeDescription}${
        citation ? ` Source: ${citation}` : ''
    }${formula ? ` Formula: ${formula}` : ''}`

    const hasDetails = Boolean(citation || formula || description || interactive)

    return (
        <span
            className="relative inline-flex items-center"
            onMouseEnter={() => hasDetails && setShowPopover(true)}
            onMouseLeave={() => setShowPopover(false)}
        >
            <button
                type="button"
                data-origin-badge={origin}
                title={titleText}
                onClick={onClick}
                disabled={!onClick}
                className={`inline-flex items-center gap-1 rounded-md border font-semibold tracking-tight transition-all select-none ${
                    config.badgeClass
                } ${
                    compact
                        ? 'px-1.5 py-0 text-[10px]'
                        : 'px-2 py-0.5 text-xs'
                } ${
                    onClick ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'
                } ${className}`}
            >
                <Icon className={compact ? 'h-2.5 w-2.5 shrink-0' : 'h-3 w-3 shrink-0'} />
                <span>{displayLabel}</span>
            </button>

            {showPopover && (citation || formula || description) ? (
                <div
                    role="tooltip"
                    className="absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover p-2.5 text-left text-xs text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 pointer-events-none"
                >
                    <div className="flex items-center gap-1.5 font-bold">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                        <span>{config.defaultLabel}</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        {activeDescription}
                    </p>
                    {citation ? (
                        <div className="mt-1.5 border-t border-border/60 pt-1 text-[10px] text-foreground">
                            <span className="font-semibold text-muted-foreground">Source: </span>
                            {citation}
                        </div>
                    ) : null}
                    {formula ? (
                        <div className="mt-1 border-t border-border/60 pt-1 font-mono text-[10px] text-foreground">
                            <span className="font-semibold font-sans text-muted-foreground">Formula: </span>
                            {formula}
                        </div>
                    ) : null}
                </div>
            ) : null}
        </span>
    )
}
