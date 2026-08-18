import React, { useState } from 'react'
import {
    Zap,
    Layers,
    Target,
    Play,
    Sparkles,
    X,
    Clock,
    ChevronRight,
    Video,
    Compass,
    ShieldCheck,
    CheckCircle2,
} from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import {
    SUPADEMO_DEMO_ID,
    SUPADEMO_DIRECT_URL,
    SUPADEMO_EMBED_URL,
    SUPADEMO_DEEP_DEMO_ID,
    SUPADEMO_DEEP_DIRECT_URL,
    SUPADEMO_DEEP_EMBED_URL,
} from '../SupademoModal'
import { TOUR_PLAYLISTS } from './walkthroughStepsData'
import type { TourPlaylistId, WalkthroughResumeState } from './walkthroughTypes'

interface WalkthroughLauncherModalProps {
    isOpen: boolean
    onClose: () => void
    onStartTour: (tourId: TourPlaylistId) => void
    resumeState?: WalkthroughResumeState | null
    onResumeTour?: () => void
}

export function WalkthroughLauncherModal({
    isOpen,
    onClose,
    onStartTour,
    resumeState,
    onResumeTour,
}: WalkthroughLauncherModalProps) {
    const [activeTab, setActiveTab] = useState<'interactive' | 'video'>('interactive')
    const [videoMode, setVideoMode] = useState<'quick' | 'deep'>('quick')

    if (!isOpen) return null

    const playlists = Object.values(TOUR_PLAYLISTS)

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="launcher-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-2xl sm:p-8 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    aria-label="Close Walkthrough Launcher"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Header Banner */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-xs">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Interactive Experience Engine</span>
                        </Badge>
                        <Badge variant="outline" className="text-xs text-muted-foreground border-border/80">
                            v2.5 Live
                        </Badge>
                    </div>
                    <h2 id="launcher-modal-title" className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                        Dillon AI Guided Walkthroughs &amp; Demos
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-2xl">
                        Experience the M&amp;A due diligence pipeline natively in your browser. Choose an interactive guided tour with automated cursor navigation or watch the recorded high-res video showcase.
                    </p>
                </div>

                {/* Resume Tour Alert Banner */}
                {resumeState && onResumeTour && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/40 bg-gradient-to-r from-primary/15 via-emerald-500/10 to-primary/5 p-3.5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                                <Play className="h-4 w-4 fill-current ml-0.5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                                    Saved In-Progress Walkthrough
                                </p>
                                <p className="text-sm font-semibold text-foreground">
                                    {resumeState.playlistTitle} — <span className="font-normal text-muted-foreground">Step {resumeState.stepIndex + 1} of {resumeState.totalSteps}: {resumeState.stepTitle}</span>
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-1.5"
                            onClick={() => {
                                onClose()
                                onResumeTour()
                            }}
                        >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Resume Progress</span>
                        </Button>
                    </div>
                )}

                {/* Mode Selector Tabs */}
                <div className="mt-6 flex items-center gap-2 border-b border-border pb-3">
                    <Button
                        type="button"
                        variant={activeTab === 'interactive' ? 'default' : 'ghost'}
                        className={`gap-2 font-semibold text-xs sm:text-sm ${activeTab === 'interactive' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('interactive')}
                    >
                        <Compass className="h-4 w-4" />
                        <span>Native Interactive Guided Tours</span>
                        <Badge variant="secondary" className="ml-1 text-[10px] bg-background/30 text-foreground">
                            Live In-App
                        </Badge>
                    </Button>
                    <Button
                        type="button"
                        variant={activeTab === 'video' ? 'default' : 'ghost'}
                        className={`gap-2 font-semibold text-xs sm:text-sm ${activeTab === 'video' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                        onClick={() => setActiveTab('video')}
                    >
                        <Video className="h-4 w-4" />
                        <span>Recorded Video Demos (Supademo)</span>
                    </Button>
                </div>

                {/* Tab 1: Interactive Guided Tours */}
                {activeTab === 'interactive' && (
                    <div className="mt-6 grid gap-4 sm:grid-cols-3">
                        {playlists.map((playlist) => {
                            const isCore = playlist.id === 'core-fast'
                            const isDeep = playlist.id === 'deep-dive'
                            const isQuest = playlist.id === 'interactive-quest'

                            return (
                                <div
                                    key={playlist.id}
                                    className={`group relative flex flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:shadow-lg ${
                                        isCore
                                            ? 'border-primary/50 bg-primary/[0.04] hover:border-primary'
                                            : isDeep
                                                ? 'border-emerald-500/40 bg-emerald-500/[0.03] hover:border-emerald-500'
                                                : 'border-amber-500/40 bg-amber-500/[0.03] hover:border-amber-500'
                                    }`}
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div
                                                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${playlist.color} text-white shadow-sm`}
                                            >
                                                {isCore && <Zap className="h-5 w-5" />}
                                                {isDeep && <Layers className="h-5 w-5" />}
                                                {isQuest && <Target className="h-5 w-5" />}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Badge variant="outline" className="text-[11px] font-mono">
                                                    <Clock className="h-3 w-3 mr-1" />
                                                    {playlist.durationLabel}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base font-bold text-foreground">
                                                    {playlist.title}
                                                </h3>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                                {playlist.subtitle}
                                            </p>
                                        </div>

                                        <p className="text-xs text-foreground/80 leading-relaxed">
                                            {playlist.description}
                                        </p>
                                    </div>

                                    <div className="mt-5 pt-3 border-t border-border/50">
                                        <Button
                                            type="button"
                                            variant={isCore ? 'default' : 'outline'}
                                            className="w-full gap-2 font-semibold text-xs shadow-xs group-hover:scale-[1.02] transition-transform"
                                            onClick={() => {
                                                onClose()
                                                onStartTour(playlist.id)
                                            }}
                                        >
                                            <Play className="h-3.5 w-3.5 fill-current" />
                                            <span>Launch Tour ({playlist.stepCount} Steps)</span>
                                            <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Tab 2: Recorded Video Demos (Supademo) */}
                {activeTab === 'video' && (
                    <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between gap-3 bg-muted/40 p-2 rounded-lg border border-border">
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={videoMode === 'quick' ? 'default' : 'ghost'}
                                    className="text-xs"
                                    onClick={() => setVideoMode('quick')}
                                >
                                    10-Step Quick Demo (1.5 min)
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={videoMode === 'deep' ? 'default' : 'ghost'}
                                    className="text-xs"
                                    onClick={() => setVideoMode('deep')}
                                >
                                    30-Step Full Diligence (3.5 min)
                                </Button>
                            </div>
                            <a
                                href={videoMode === 'quick' ? SUPADEMO_DIRECT_URL : SUPADEMO_DEEP_DIRECT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                            >
                                <span>Open Fullscreen</span>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </a>
                        </div>

                        <div className="relative w-full rounded-xl overflow-hidden border border-border bg-black aspect-video">
                            <iframe
                                src={videoMode === 'quick' ? SUPADEMO_EMBED_URL : SUPADEMO_DEEP_EMBED_URL}
                                loading="lazy"
                                title="Supademo M&A Diligence Engine"
                                allow="clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture"
                                className="absolute inset-0 h-full w-full border-0"
                            />
                        </div>
                    </div>
                )}

                {/* Footer Notes */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span>All walkthroughs run on live workspace state without modifying uploaded deal files.</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Shortcuts:</span>
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">Space</Badge> Play/Pause
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">→</Badge> Next
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">Esc</Badge> Exit
                    </div>
                </div>
            </div>
        </div>
    )
}
