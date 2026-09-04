import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Layers, HelpCircle } from 'lucide-react'
import DataOriginBadge, { type DataOrigin } from './DataOriginBadge'

interface DataLineageLegendProps {
    className?: string
    defaultExpanded?: boolean
}

export default function DataLineageLegend({
    className = '',
    defaultExpanded = false,
}: DataLineageLegendProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    const categories: Array<{
        origin: DataOrigin
        title: string
        summary: string
        example: string
    }> = [
        {
            origin: 'extracted',
            title: 'Extracted Facts',
            summary: 'Source-backed historical figures parsed from verified tax returns, CIMs, and financial statements with document citations.',
            example: 'Historical Revenue ($12.4M), Reported EBITDA ($2.1M), Balance Sheet Debt',
        },
        {
            origin: 'user_entered',
            title: 'User Inputs & Overrides',
            summary: 'Custom parameters entered, adjusted, or saved directly by the analyst for this specific deal.',
            example: 'Custom Asking Price, Target Counter-Offer, Saved Purchase Price',
        },
        {
            origin: 'benchmark',
            title: 'Industry Benchmarks',
            summary: 'Curated market medians across 11 sector datasets and standard institutional banking parameters.',
            example: 'B2B SaaS 6.5x EV / HVAC 4.2x EV, WSJ Prime Rate, SBA 10-Yr Term',
        },
        {
            origin: 'assumption',
            title: 'Model Assumptions',
            summary: 'Standard underwriting hypotheses and illustrative starting proxies used to project forward financials.',
            example: '5-Year Hold Period, 25% Tax Rate, 5% Revenue CAGR, 60/30/10 Decomposition',
        },
        {
            origin: 'calculated',
            title: 'Derived Formulas',
            summary: 'Mathematical outputs dynamically computed by the financial engine from the underlying inputs above.',
            example: 'Levered IRR (24.5%), MOIC (2.4x), DSCR (1.35x), Valuation Bridge Counter-Offer',
        },
    ]

    return (
        <div
            className={`rounded-xl border border-border/80 bg-card/60 p-3.5 shadow-2xs backdrop-blur-xs transition-all ${className}`}
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Layers className="h-3.5 w-3.5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-foreground">
                                Financial Data Lineage &amp; Provenance
                            </span>
                            <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[10px] font-semibold text-primary">
                                Audit Standard
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Every number in this workspace is tagged by origin so you always know what is verified fact vs. model assumption.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-1.5">
                        <DataOriginBadge origin="extracted" compact />
                        <DataOriginBadge origin="user_entered" compact />
                        <DataOriginBadge origin="benchmark" compact />
                        <DataOriginBadge origin="assumption" compact />
                        <DataOriginBadge origin="calculated" compact />
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsExpanded((prev) => !prev)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                        aria-expanded={isExpanded}
                    >
                        <span>{isExpanded ? 'Hide Details' : 'View Legend'}</span>
                        {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                        ) : (
                            <ChevronDown className="h-3 w-3" />
                        )}
                    </button>
                </div>
            </div>

            {isExpanded ? (
                <div className="mt-3.5 grid gap-2.5 border-t border-border/60 pt-3 sm:grid-cols-2 lg:grid-cols-5 animate-in fade-in-0 duration-200">
                    {categories.map((cat) => (
                        <div
                            key={cat.origin}
                            className="rounded-lg border border-border/60 bg-background/80 p-2.5 flex flex-col justify-between"
                        >
                            <div>
                                <div className="mb-1.5 flex items-center justify-between gap-1">
                                    <span className="text-xs font-bold text-foreground">{cat.title}</span>
                                    <DataOriginBadge origin={cat.origin} compact />
                                </div>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    {cat.summary}
                                </p>
                            </div>
                            <div className="mt-2 border-t border-border/40 pt-1.5 text-[10px] text-foreground/80">
                                <span className="font-semibold text-muted-foreground">Examples: </span>
                                {cat.example}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
