import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
    Play,
    Sparkles,
    Video,
    Layers,
    ChevronRight,
    ChevronLeft,
    Clock,
    Compass,
    Target,
    Zap,
    Calculator,
} from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import type { WalkthroughResumeState } from './walkthrough/walkthroughTypes'

export type DemoVariantId = 'native-core' | 'native-deep' | 'native-quest' | 'native-questionnaire' | 'short-yt' | 'short-supademo' | 'deep-supademo'

export interface DemoItem {
    id: DemoVariantId
    title: string
    shortTitle: string
    category: 'Native Tour' | 'Hands-On Quest' | 'Video Showcase' | 'Cloud Interactive'
    duration: string
    description: string
    status: 'active' | 'coming-soon'
    icon: React.ElementType
    badgeText: string
    badgeVariant?: 'default' | 'outline' | 'secondary'
}

export const WORKSPACE_DEMOS: DemoItem[] = [
    {
        id: 'native-core',
        title: 'Walkthrough #1: End-to-End Workflow',
        shortTitle: 'Walkthrough #1 (Core)',
        category: 'Native Tour',
        duration: '~75 sec',
        description: 'Auto-flying walkthrough: Upload Doc → Diligence Facts → Deal Synthesis → IC Memo → Dillon AI Chatbot → Export.',
        status: 'active',
        icon: Zap,
        badgeText: 'Recommended',
        badgeVariant: 'default',
    },
    {
        id: 'native-deep',
        title: 'Walkthrough #2: Deep Financial Tour',
        shortTitle: 'Walkthrough #2 (Deep)',
        category: 'Native Tour',
        duration: '~3.5 min',
        description: 'Multi-tab masterclass: Comps spread, EBITDA add-backs, solvency diagnostics, DSCR waterfall, and platform harness.',
        status: 'active',
        icon: Layers,
        badgeText: 'Institutional PE',
        badgeVariant: 'default',
    },
    {
        id: 'native-quest',
        title: 'Interactive Hands-On Quest',
        shortTitle: 'Hands-On Quest',
        category: 'Hands-On Quest',
        duration: 'Self-Paced',
        description: 'Gamified interactive tutorial missions. Adjust multiples and query Dillon AI live in your own deal sandbox.',
        status: 'active',
        icon: Target,
        badgeText: 'Try It Yourself',
        badgeVariant: 'secondary',
    },
    {
        id: 'native-questionnaire',
        title: 'Quick Deal Questionnaire Tutorial',
        shortTitle: 'Quick Deal Questionnaire',
        category: 'Native Tour',
        duration: '~1 min',
        description: 'Build an initial valuation and diligence workspace from structured deal assumptions without uploading files.',
        status: 'active',
        icon: Calculator,
        badgeText: 'No Uploads',
        badgeVariant: 'secondary',
    },
    {
        id: 'short-yt',
        title: '2-Min Video Walkthrough',
        shortTitle: 'YouTube Walkthrough',
        category: 'Video Showcase',
        duration: '~2 min',
        description: 'High-tempo video walkthrough of deal room OCR ingestion, QoE adjustments, and valuation matrices.',
        status: 'active',
        icon: Video,
        badgeText: 'YouTube HD',
        badgeVariant: 'outline',
    },
    {
        id: 'short-supademo',
        title: '10-Step Cloud Interactive Demo',
        shortTitle: '10-Step Supademo',
        category: 'Cloud Interactive',
        duration: '~2 min',
        description: 'Interactive cloud click-through of core document ingestion, normalized EBITDA, and Deal Memo generation.',
        status: 'active',
        icon: Play,
        badgeText: 'Supademo Cloud',
        badgeVariant: 'outline',
    },
    {
        id: 'deep-supademo',
        title: '30-Step Full Diligence Showcase',
        shortTitle: '30-Step Supademo',
        category: 'Cloud Interactive',
        duration: '~4 min',
        description: 'Comprehensive 30-milestone PE deal inspection with clickable hotspots, ground truth audit, and debt sizing.',
        status: 'active',
        icon: Sparkles,
        badgeText: '30-Step Showcase',
        badgeVariant: 'outline',
    },
]

interface WorkspaceDemoGalleryBarProps {
    onSelectDemo: (demoId: DemoVariantId) => void
    resumeState?: WalkthroughResumeState | null
    onResumeTour?: () => void
}

export function WorkspaceDemoGalleryBar({ onSelectDemo, resumeState, onResumeTour }: WorkspaceDemoGalleryBarProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScrollBounds = useCallback(() => {
        const el = scrollContainerRef.current
        if (!el) return
        setCanScrollLeft(el.scrollLeft > 10)
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
    }, [])

    useEffect(() => {
        const el = scrollContainerRef.current
        if (!el) return
        checkScrollBounds()
        window.addEventListener('resize', checkScrollBounds)
        return () => window.removeEventListener('resize', checkScrollBounds)
    }, [checkScrollBounds])

    const handleScroll = (direction: 'left' | 'right') => {
        const el = scrollContainerRef.current
        if (!el) return
        const scrollAmount = 320
        el.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        })
        setTimeout(checkScrollBounds, 350)
    }

    return (
        <section aria-label="Interactive Product Demos and Walkthroughs" className="space-y-3">
            {/* Resume Tour Alert Banner */}
            {resumeState && onResumeTour && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-emerald-500/10 to-primary/5 p-3.5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm animate-pulse">
                            <Play className="h-4 w-4 fill-current ml-0.5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                                    Continue Left-Off Walkthrough
                                </p>
                                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                    Step {resumeState.stepIndex + 1} of {resumeState.totalSteps}
                                </Badge>
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                                {resumeState.playlistTitle}: <span className="font-normal text-muted-foreground">{resumeState.stepTitle}</span>
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onResumeTour}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Resume Tour Now</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Header with Title and Carousel Scroll Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Compass className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                        Interactive Walkthroughs &amp; Masterclasses
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                        {WORKSPACE_DEMOS.length} DEMOS AVAILABLE
                    </Badge>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3">
                    <p className="text-xs text-muted-foreground hidden md:block">
                        Scroll horizontally to explore live tours, quests, and recorded demos
                    </p>
                    <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleScroll('left')}
                            disabled={!canScrollLeft}
                            className="h-7 w-7 rounded-full border-border/80 bg-background/80 hover:bg-muted disabled:opacity-30 cursor-pointer shadow-2xs"
                            aria-label="Scroll left"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => handleScroll('right')}
                            disabled={!canScrollRight}
                            className="h-7 w-7 rounded-full border-border/80 bg-background/80 hover:bg-muted disabled:opacity-30 cursor-pointer shadow-2xs"
                            aria-label="Scroll right"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Horizontally Scrollable Carousel */}
            <div
                ref={scrollContainerRef}
                onScroll={checkScrollBounds}
                className="flex items-stretch gap-3.5 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
            >
                {WORKSPACE_DEMOS.map((demo) => {
                    const Icon = demo.icon
                    const isCore = demo.id === 'native-core'
                    const isDeep = demo.id === 'native-deep'
                    const isQuest = demo.id === 'native-quest'
                    const isQuestionnaire = demo.id === 'native-questionnaire'
                    const isYt = demo.id === 'short-yt'
                    const isSupademoShort = demo.id === 'short-supademo'
                    const isSupademoDeep = demo.id === 'deep-supademo'

                    let borderClass = 'border-border/80 bg-card/60 hover:border-primary/30 hover:bg-card/90'
                    let iconBgClass = 'bg-muted text-muted-foreground group-hover:text-foreground'
                    let badgeClass = 'text-muted-foreground'
                    let actionText = 'text-muted-foreground group-hover:text-foreground'

                    if (isCore) {
                        borderClass = 'border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary hover:shadow-md hover:shadow-primary/10'
                        iconBgClass = 'bg-primary text-primary-foreground shadow-xs'
                        badgeClass = 'bg-primary/20 text-primary border-primary/40 animate-pulse'
                        actionText = 'text-primary'
                    } else if (isDeep) {
                        borderClass = 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-card to-card hover:border-emerald-500 hover:shadow-md hover:shadow-emerald-500/10'
                        iconBgClass = 'bg-emerald-600 text-white shadow-xs'
                        badgeClass = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                        actionText = 'text-emerald-600 dark:text-emerald-400'
                    } else if (isQuest) {
                        borderClass = 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/10'
                        iconBgClass = 'bg-amber-500 text-white shadow-xs'
                        badgeClass = 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                        actionText = 'text-amber-500'
                    } else if (isQuestionnaire) {
                        borderClass = 'border-violet-500/40 bg-gradient-to-br from-violet-500/10 via-card to-card hover:border-violet-500 hover:shadow-md hover:shadow-violet-500/10'
                        iconBgClass = 'bg-violet-600 text-white shadow-xs'
                        badgeClass = 'bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/40'
                        actionText = 'text-violet-600 dark:text-violet-400'
                    } else if (isYt) {
                        borderClass = 'border-red-500/30 bg-gradient-to-br from-red-500/5 via-card to-card hover:border-red-500/70 hover:shadow-md hover:shadow-red-500/10'
                        iconBgClass = 'bg-red-500 text-white shadow-xs'
                        badgeClass = 'bg-red-500/15 text-red-500 border-red-500/30'
                        actionText = 'text-red-500'
                    } else if (isSupademoShort) {
                        borderClass = 'border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-card to-card hover:border-purple-500/70 hover:shadow-md hover:shadow-purple-500/10'
                        iconBgClass = 'bg-purple-600 text-white shadow-xs'
                        badgeClass = 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30'
                        actionText = 'text-purple-600 dark:text-purple-400'
                    } else if (isSupademoDeep) {
                        borderClass = 'border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-card to-card hover:border-cyan-500/70 hover:shadow-md hover:shadow-cyan-500/10'
                        iconBgClass = 'bg-cyan-600 text-white shadow-xs'
                        badgeClass = 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                        actionText = 'text-cyan-600 dark:text-cyan-400'
                    }

                    return (
                        <div
                            key={demo.id}
                            data-demo-id={demo.id}
                            onClick={() => onSelectDemo(demo.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    onSelectDemo(demo.id)
                                }
                            }}
                            className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer select-none min-w-[270px] sm:min-w-[290px] md:min-w-[310px] max-w-[320px] shrink-0 snap-start hover:-translate-y-0.5 ${borderClass}`}
                        >
                            {/* Top row */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${iconBgClass}`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge
                                            variant={demo.badgeVariant ?? 'outline'}
                                            className={`text-[10px] font-semibold px-2 py-0.5 ${badgeClass}`}
                                        >
                                            {demo.badgeText}
                                        </Badge>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                                        <span>{demo.title}</span>
                                    </h4>
                                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                        {demo.description}
                                    </p>
                                </div>
                            </div>

                            {/* Bottom row */}
                            <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-border/50 text-xs">
                                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {demo.duration} • {demo.category}
                                </span>
                                <span
                                    className={`inline-flex items-center gap-0.5 font-bold text-[11px] transition-transform group-hover:translate-x-0.5 ${actionText}`}
                                >
                                    <span>Launch</span>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}
