import React, { useState, useEffect } from 'react'
import {
    Play,
    Sparkles,
    CheckCircle2,
    Target,
    UserCheck,
    ChevronDown,
    ChevronUp,
    Compass,
    BookOpen,
    Info,
    HelpCircle,
    X,
} from 'lucide-react'
import type { WorkspaceTab } from '../DealWorkspaceNav'
import { TAB_METADATA } from './tabMetadata'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'

interface WorkspaceTabTutorialBannerProps {
    activeTab: WorkspaceTab
    onStartTabTour?: (tabId: WorkspaceTab) => void
    onOpenFullWalkthrough?: () => void
    className?: string
}

const STORAGE_KEY = 'mergeworks.tabTutorialBanner.collapsed'

export default function WorkspaceTabTutorialBanner({
    activeTab,
    onStartTabTour,
    onOpenFullWalkthrough,
    className = '',
}: WorkspaceTabTutorialBannerProps) {
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true'
        } catch {
            return false
        }
    })

    const [isGuideOpen, setIsGuideOpen] = useState(false)

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, String(isCollapsed))
        } catch { }
    }, [isCollapsed])

    const meta = TAB_METADATA[activeTab] || {
        id: activeTab,
        label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1),
        category: 'Deal Workspace',
        badge: 'Diligence',
        whatItIsFor: `Dedicated workspace section for analyzing ${activeTab} metrics and documentation.`,
        keyDeliverables: ['Structured analysis tables', 'Audit-grade financial schedules'],
        recommendedRole: 'Diligence Leads & Underwriters',
        tourStepCount: 3,
        suggestedFocus: 'Diligence evaluation',
    }

    if (isCollapsed) {
        return (
            <div className={`flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur-sm print:hidden ${className}`}>
                <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{meta.label} Tab</span>
                    </span>
                    <span className="text-muted-foreground/50 hidden sm:inline">•</span>
                    <span className="truncate hidden sm:inline text-muted-foreground/80">{meta.whatItIsFor}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {onStartTabTour && (
                        <button
                            type="button"
                            onClick={() => onStartTabTour(activeTab)}
                            className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
                            title={`Start interactive tutorial for ${meta.label} (${meta.tourStepCount} steps)`}
                        >
                            <Play className="h-3 w-3 fill-primary text-primary" />
                            <span>Start Tutorial ({meta.tourStepCount} steps)</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(false)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                        title="Expand Tab Guide & Tutorial Banner"
                        aria-label="Expand Tab Guide"
                    >
                        <ChevronDown className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className={`rounded-xl border border-border/80 bg-gradient-to-r from-card via-card/95 to-primary/5 p-3.5 sm:p-4 shadow-sm backdrop-blur-md transition-all duration-200 print:hidden ${className}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: Tab Title, Category Badge & Description */}
                <div className="space-y-1.5 min-w-0 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">
                            {meta.category}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider bg-primary/5 text-primary border-primary/25">
                            {meta.badge}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
                        <h2 className="text-sm sm:text-base font-bold text-foreground">
                            {meta.label} Workspace
                        </h2>
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {meta.whatItIsFor}
                    </p>
                </div>

                {/* Right: Actions (Tutorial, Guide, Collapse) */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-1 lg:pt-0">
                    {onStartTabTour && (
                        <Button
                            type="button"
                            size="sm"
                            onClick={() => onStartTabTour(activeTab)}
                            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs cursor-pointer"
                            title={`Start interactive step-by-step tutorial for ${meta.label} tab`}
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Start Tab Tutorial</span>
                            <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-white/20 text-white font-mono ml-0.5">
                                {meta.tourStepCount} steps
                            </Badge>
                        </Button>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsGuideOpen(!isGuideOpen)}
                        className={`gap-1.5 text-xs font-medium cursor-pointer ${isGuideOpen ? 'bg-muted border-primary/40 text-primary' : 'hover:bg-muted'}`}
                        title="View Key Deliverables and Diligence Focus for this tab"
                    >
                        <BookOpen className="h-3.5 w-3.5 text-primary" />
                        <span>{isGuideOpen ? 'Hide Guide' : 'Tab Guide'}</span>
                    </Button>

                    {onOpenFullWalkthrough && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={onOpenFullWalkthrough}
                            className="hidden sm:inline-flex gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Open Full Walkthrough Gallery & Interactive Quest"
                        >
                            <Compass className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>All Tours</span>
                        </Button>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                        title="Minimize banner"
                        aria-label="Minimize banner"
                    >
                        <ChevronUp className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Expandable Tab Guide Panel */}
            {isGuideOpen && (
                <div className="mt-3.5 pt-3.5 border-t border-border/60 grid grid-cols-1 md:grid-cols-3 gap-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                    {/* Key Deliverables */}
                    <div className="md:col-span-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Key Deliverables & Outputs Generated</span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground">
                            {meta.keyDeliverables.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                    <span className="text-primary font-bold mt-0.5">•</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Role & Diligence Focus */}
                    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2">
                        <div>
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                                <UserCheck className="h-3 w-3 text-primary" />
                                <span>Recommended Audience</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {meta.recommendedRole}
                            </p>
                        </div>
                        <div className="pt-1 border-t border-border/40">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                                <Target className="h-3 w-3 text-amber-500" />
                                <span>Suggested Focus</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {meta.suggestedFocus}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
