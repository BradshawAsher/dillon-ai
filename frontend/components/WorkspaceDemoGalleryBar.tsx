import React from 'react'
import {
    Play,
    Sparkles,
    Video,
    Layers,
    ChevronRight,
    Clock,
    Compass,
    Target,
    Zap,
} from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import type { WalkthroughResumeState } from './walkthrough/walkthroughTypes'

export type DemoVariantId = 'native-core' | 'native-deep' | 'native-quest' | 'short-yt' | 'short-supademo' | 'deep-supademo'

export interface DemoItem {
    id: DemoVariantId
    title: string
    shortTitle: string
    category: 'Native Tour' | 'Hands-On Quest' | 'Video Showcase'
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
        title: '10-Step Core Guided Tour',
        shortTitle: '10-Step Tour',
        category: 'Native Tour',
        duration: '~90 sec',
        description: 'Auto-flying cursor tour through Ingestion → QoE → Valuation Matrix → IC Memo.',
        status: 'active',
        icon: Zap,
        badgeText: 'Native In-App',
        badgeVariant: 'default',
    },
    {
        id: 'native-deep',
        title: '28-Step Diligence Masterclass',
        shortTitle: '28-Step Deep Dive',
        category: 'Native Tour',
        duration: '~3.5 min',
        description: 'Comprehensive deep dive across all 8 tabs, 30+ cards, DSCR, and holdback escrow.',
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
        description: 'Gamified interactive tutorial missions. Adjust multiples and query Dillon AI live.',
        status: 'active',
        icon: Target,
        badgeText: 'Try It Yourself',
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
        badgeText: 'YouTube',
        badgeVariant: 'outline',
    },
]

interface WorkspaceDemoGalleryBarProps {
    onSelectDemo: (demoId: DemoVariantId) => void
    resumeState?: WalkthroughResumeState | null
    onResumeTour?: () => void
}

export function WorkspaceDemoGalleryBar({ onSelectDemo, resumeState, onResumeTour }: WorkspaceDemoGalleryBarProps) {
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

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Compass className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                        Interactive Walkthroughs &amp; Masterclasses
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                        NATIVE IN-APP
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                    Experience simulated auto-navigation or complete hands-on diligence missions.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {WORKSPACE_DEMOS.map((demo) => {
                    const Icon = demo.icon
                    const isNative = demo.category === 'Native Tour'
                    const isQuest = demo.category === 'Hands-On Quest'

                    return (
                        <div
                            key={demo.id}
                            onClick={() => onSelectDemo(demo.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    onSelectDemo(demo.id)
                                }
                            }}
                            className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all cursor-pointer select-none ${
                                isNative
                                    ? 'border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5'
                                    : isQuest
                                        ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/10 hover:-translate-y-0.5'
                                        : 'border-border/80 bg-card/60 hover:border-primary/30 hover:bg-card/90 hover:-translate-y-0.5'
                            }`}
                        >
                            {/* Top row */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
                                            isNative
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : isQuest
                                                    ? 'bg-amber-500 text-white shadow-xs'
                                                    : 'bg-muted text-muted-foreground group-hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge
                                            variant={demo.badgeVariant ?? 'outline'}
                                            className={`text-[10px] font-semibold px-2 py-0.5 ${
                                                isNative
                                                    ? 'bg-primary/20 text-primary border-primary/40 animate-pulse'
                                                    : isQuest
                                                        ? 'bg-amber-500/20 text-amber-500 border-amber-500/40'
                                                        : 'text-muted-foreground'
                                            }`}
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
                                    className={`inline-flex items-center gap-0.5 font-bold text-[11px] transition-transform group-hover:translate-x-0.5 ${
                                        isNative ? 'text-primary' : isQuest ? 'text-amber-500' : 'text-muted-foreground group-hover:text-foreground'
                                    }`}
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
