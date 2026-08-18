import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info, X, Play, Sparkles, CheckCircle2, Target, UserCheck } from 'lucide-react'
import type { WorkspaceTab } from '../DealWorkspaceNav'
import { TAB_METADATA } from './tabMetadata'
import { useFloatingPosition } from '../../hooks/useFloatingPosition'

interface TabInfoPopoverProps {
    tabId: WorkspaceTab
    onStartTour?: (tabId: WorkspaceTab) => void
    className?: string
}

export default function TabInfoPopover({
    tabId,
    onStartTour,
    className = '',
}: TabInfoPopoverProps) {
    const [isOpen, setIsOpen] = useState(false)
    const popoverRef = useRef<HTMLDivElement | null>(null)
    const buttonRef = useRef<HTMLButtonElement | null>(null)

    const coords = useFloatingPosition({
        isOpen,
        targetRef: buttonRef,
        popoverWidth: 384,
        preferredPlacement: 'bottom',
        margin: 8,
        padding: 16,
    })

    const meta = TAB_METADATA[tabId] || {
        id: tabId,
        label: tabId.charAt(0).toUpperCase() + tabId.slice(1),
        category: 'Deal Workspace',
        badge: 'Diligence',
        whatItIsFor: `Dedicated workspace section for analyzing ${tabId} metrics and documentation.`,
        keyDeliverables: ['Structured analysis tables', 'Audit-grade financial schedules'],
        recommendedRole: 'Diligence Leads & Underwriters',
        tourStepCount: 1,
        suggestedFocus: 'Diligence evaluation',
    }

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
        }
    }, [isOpen])

    return (
        <div className={`relative inline-flex items-center shrink-0 ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                    e.stopPropagation()
                    setIsOpen((prev) => !prev)
                }}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground/60 transition-all hover:bg-primary/20 hover:text-primary hover:scale-110 active:scale-95 cursor-pointer"
                title={`What is the ${meta.label} tab for? (Click for info & tab tutorial)`}
                aria-label={`What is the ${meta.label} tab for?`}
                aria-expanded={isOpen}
            >
                <Info className="h-3 w-3" />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[99998] bg-black/10 dark:bg-black/25 backdrop-blur-[0.5px]"
                        onClick={(e) => {
                            e.stopPropagation()
                            setIsOpen(false)
                        }}
                    />

                    {/* Popover Card */}
                    <div
                        ref={popoverRef}
                        role="dialog"
                        aria-label={`About ${meta.label} Tab`}
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
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                                        {meta.category}
                                    </span>
                                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                        {meta.badge}
                                    </span>
                                </div>
                                <h4 className="text-sm font-bold text-foreground leading-tight">
                                    What is the {meta.label} Tab?
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

                        {/* Body */}
                        <div className="mt-3 space-y-3 text-xs text-foreground/90">
                            {/* What it is for */}
                            <p className="text-muted-foreground leading-relaxed">
                                {meta.whatItIsFor}
                            </p>

                            {/* Key Deliverables */}
                            <div>
                                <p className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1.5">
                                    <Target className="h-3 w-3 text-primary" />
                                    <span>Key Deliverables & Outputs</span>
                                </p>
                                <ul className="space-y-1 pl-1">
                                    {meta.keyDeliverables.map((item, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/90 leading-snug">
                                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Target Role & Focus */}
                            <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-2 border border-border/40 text-[11px]">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <UserCheck className="h-3 w-3 text-primary shrink-0" />
                                    <span><strong>Target Users:</strong> {meta.recommendedRole}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span><strong>Key Focus:</strong> {meta.suggestedFocus}</span>
                                </div>
                            </div>

                            {/* Action: Start Tab Tutorial */}
                            {onStartTour && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false)
                                        onStartTour(tabId)
                                    }}
                                    className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow active:scale-[0.98] cursor-pointer"
                                >
                                    <Play className="h-3.5 w-3.5 fill-current" />
                                    <span>Start {meta.label} Guided Tutorial</span>
                                    <span className="rounded bg-primary-foreground/20 px-1 py-0.2 text-[9px] font-mono">
                                        {meta.tourStepCount} {meta.tourStepCount === 1 ? 'Step' : 'Steps'}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}
