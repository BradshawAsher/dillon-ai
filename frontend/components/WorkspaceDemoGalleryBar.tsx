import React, { useState } from 'react'
import {
    Play,
    Sparkles,
    Video,
    Tv,
    Layers,
    ExternalLink,
    ChevronRight,
    Clock,
    Flame,
    Compass,
    Film,
} from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'

export interface DemoItem {
    id: 'short-supademo' | 'deep-supademo' | 'short-yt' | 'long-yt'
    title: string
    shortTitle: string
    category: 'Supademo' | 'YouTube Video'
    duration: string
    description: string
    status: 'active' | 'coming-soon'
    icon: React.ElementType
    badgeText: string
    badgeVariant?: 'default' | 'outline' | 'secondary'
    url?: string
}

export const WORKSPACE_DEMOS: DemoItem[] = [
    {
        id: 'short-supademo',
        title: '10-Step Interactive Tour',
        shortTitle: '10-Step Tour',
        category: 'Supademo',
        duration: '2 min',
        description: 'Guided M&A case study: Ingestion → Valuation Matrix → IC Memo.',
        status: 'active',
        icon: Sparkles,
        badgeText: 'Interactive Live',
        badgeVariant: 'default',
        url: 'https://app.supademo.com/demo/cmsxjva3k02qnqmzskc587vyg?utm_source=link',
    },
    {
        id: 'deep-supademo',
        title: 'Full Workspace Deep-Dive',
        shortTitle: 'Full Deal Room',
        category: 'Supademo',
        duration: '8 min',
        description: 'Comprehensive walkthrough across all 9 diligence & negotiation tabs.',
        status: 'coming-soon',
        icon: Layers,
        badgeText: 'Extended Tour',
        badgeVariant: 'secondary',
    },
    {
        id: 'short-yt',
        title: 'Executive Video Summary',
        shortTitle: '3-Min Video',
        category: 'YouTube Video',
        duration: '3 min',
        description: 'High-speed overview of deterministic extraction and OCR.',
        status: 'coming-soon',
        icon: Video,
        badgeText: 'Video Clip',
        badgeVariant: 'outline',
    },
    {
        id: 'long-yt',
        title: 'Complete M&A Masterclass',
        shortTitle: '15-Min Masterclass',
        category: 'YouTube Video',
        duration: '15 min',
        description: 'In-depth webinar: EBITDA reconstruction, debt waterfalls, & broker scripts.',
        status: 'coming-soon',
        icon: Film,
        badgeText: 'Masterclass',
        badgeVariant: 'outline',
    },
]

interface WorkspaceDemoGalleryBarProps {
    onSelectDemo: (demoId: DemoItem['id']) => void
}

export function WorkspaceDemoGalleryBar({ onSelectDemo }: WorkspaceDemoGalleryBarProps) {
    return (
        <section aria-label="Interactive Product Demos and Walkthroughs" className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Compass className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                        Product Walkthroughs &amp; Video Demos
                    </h3>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                        4 GUIDED TOURS
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground hidden sm:block">
                    Explore interactive clickthroughs and video walkthroughs of Dillon AI.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {WORKSPACE_DEMOS.map((demo) => {
                    const Icon = demo.icon
                    const isActive = demo.status === 'active'

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
                                isActive
                                    ? 'border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card hover:border-primary hover:shadow-md hover:shadow-primary/10 hover:-translate-y-0.5'
                                    : 'border-border/80 bg-card/60 hover:border-primary/30 hover:bg-card/90 hover:-translate-y-0.5'
                            }`}
                        >
                            {/* Top row */}
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : 'bg-muted text-muted-foreground group-hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge
                                            variant={demo.badgeVariant ?? 'outline'}
                                            className={`text-[10px] font-semibold px-2 py-0.5 ${
                                                isActive
                                                    ? 'bg-primary/20 text-primary border-primary/40 animate-pulse'
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
                                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                    }`}
                                >
                                    {isActive ? 'Launch' : 'Preview'}
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
