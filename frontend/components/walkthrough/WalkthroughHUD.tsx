import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
    Play,
    Pause,
    ChevronLeft,
    ChevronRight,
    Volume2,
    VolumeX,
    X,
    Sparkles,
    Gauge,
    CheckCircle2,
    Compass,
    Target,
    GripHorizontal,
    Move,
    RotateCcw,
    Building2,
} from 'lucide-react'
import { Badge } from '../../lib/shadcn/badge'
import { Button } from '../../lib/shadcn/button'
import type { TourPlaylist, WalkthroughStep, HUDPosition } from './walkthroughTypes'

interface WalkthroughHUDProps {
    isActive: boolean
    currentStepIndex: number
    currentStep?: WalkthroughStep
    activePlaylist: TourPlaylist
    isPlaying: boolean
    playbackSpeed: 1 | 1.5 | 2
    isVoiceEnabled: boolean
    stepProgress: number
    questSuccess: boolean
    dealName?: string
    onNext: () => void
    onPrev: () => void
    onGoToStep: (index: number) => void
    onTogglePlay: () => void
    onSetSpeed: (speed: 1 | 1.5 | 2) => void
    onToggleVoice: () => void
    onClose: () => void
}

export function WalkthroughHUD({
    isActive,
    currentStepIndex,
    currentStep,
    activePlaylist,
    isPlaying,
    playbackSpeed,
    isVoiceEnabled,
    stepProgress,
    questSuccess,
    dealName,
    onNext,
    onPrev,
    onGoToStep,
    onTogglePlay,
    onSetSpeed,
    onToggleVoice,
    onClose,
}: WalkthroughHUDProps) {
    const [customPos, setCustomPos] = useState<HUDPosition | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
    const hudRef = useRef<HTMLDivElement>(null)

    if (!isActive || !currentStep) return null

    const totalSteps = activePlaylist.steps.length
    const isFirstStep = currentStepIndex === 0
    const isLastStep = currentStepIndex === totalSteps - 1
    const isQuestMode = activePlaylist.id === 'interactive-quest'

    const nextSpeedMap: Record<1 | 1.5 | 2, 1 | 1.5 | 2> = {
        1: 1.5,
        1.5: 2,
        2: 1,
    }

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return
        const hudEl = hudRef.current
        if (!hudEl) return

        const rect = hudEl.getBoundingClientRect()
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        })
        setIsDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return
        const hudEl = hudRef.current
        const width = hudEl ? hudEl.offsetWidth : 640
        const height = hudEl ? hudEl.offsetHeight : 240

        const minX = 16
        const maxX = Math.max(16, window.innerWidth - width - 16)
        const minY = 16
        const maxY = Math.max(16, window.innerHeight - height - 16)

        const nextX = Math.min(maxX, Math.max(minX, e.clientX - dragOffset.x))
        const nextY = Math.min(maxY, Math.max(minY, e.clientY - dragOffset.y))

        setCustomPos({ x: nextX, y: nextY })
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (isDragging) {
            setIsDragging(false)
            try {
                e.currentTarget.releasePointerCapture(e.pointerId)
            } catch { }
        }
    }

    const handleResetPosition = () => {
        setCustomPos(null)
    }

    const handleSnapTop = () => {
        const hudEl = hudRef.current
        const width = hudEl ? hudEl.offsetWidth : 640
        setCustomPos({
            x: Math.max(16, (window.innerWidth - width) / 2),
            y: 24,
        })
    }

    const handleSnapTopRight = () => {
        const hudEl = hudRef.current
        const width = hudEl ? hudEl.offsetWidth : 640
        setCustomPos({
            x: Math.max(16, window.innerWidth - width - 24),
            y: 24,
        })
    }

    const customStyle: React.CSSProperties = customPos
        ? {
            position: 'fixed',
            left: `${customPos.x}px`,
            top: `${customPos.y}px`,
            bottom: 'auto',
            transform: 'none',
            zIndex: 60,
        }
        : {}

    return (
        <aside
            ref={hudRef}
            aria-label="Interactive Walkthrough Controller"
            style={customStyle}
            className={`fixed ${!customPos ? 'bottom-6 left-1/2 -translate-x-1/2' : ''} z-50 w-[94vw] max-w-3xl animate-in fade-in-50 duration-200 pointer-events-auto select-none`}
        >
            <div className={`relative overflow-hidden rounded-2xl border-2 ${isDragging ? 'border-primary ring-4 ring-primary/20 cursor-grabbing' : 'border-primary/40'} bg-background/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-shadow`}>
                {/* Auto-Play Progress Bar at Top Edge */}
                {!isQuestMode && isPlaying && (
                    <div className="absolute left-0 top-0 h-1.5 w-full bg-muted/40">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-75 ease-linear"
                            style={{ width: `${stepProgress}%` }}
                        />
                    </div>
                )}

                {/* HUD Draggable Header Bar */}
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3 cursor-grab active:cursor-grabbing select-none"
                    title="Click and drag anywhere on this bar to reposition dialogue box"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 text-muted-foreground hover:text-primary pr-1">
                            <GripHorizontal className="h-4 w-4" />
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/70 hidden sm:inline">Drag</span>
                        </div>

                        <Badge variant="default" className="gap-1.5 bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-xs shadow-sm">
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{activePlaylist.title}</span>
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-border/80">
                            Step {currentStepIndex + 1} of {totalSteps}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-medium">
                            {currentStep.tag}
                        </Badge>
                        {dealName && (
                            <Badge variant="outline" className="hidden md:inline-flex text-[11px] bg-muted/60 text-foreground border-border/80 gap-1 font-mono">
                                <Building2 className="h-3 w-3 text-primary shrink-0" />
                                <span className="truncate max-w-[140px]">{dealName}</span>
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-1">
                        {customPos && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                                onClick={handleResetPosition}
                                title="Reset Dialogue to Bottom Center"
                            >
                                <RotateCcw className="h-3 w-3" />
                                <span className="hidden sm:inline">Reset Pos</span>
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={onClose}
                            title="Exit Walkthrough (Esc)"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Content Section: Title & PE Narrative */}
                <div className="mt-3.5 space-y-2">
                    <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl flex items-center gap-2">
                        <Compass className="h-5 w-5 text-primary shrink-0" />
                        <span>{currentStep.title}</span>
                    </h2>

                    <p className="text-sm leading-relaxed text-foreground/90 font-normal">
                        {currentStep.narrative}
                    </p>

                    {/* Key Takeaway Banner */}
                    <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-primary flex items-start gap-2">
                        <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        <span><strong>Key Diligence Insight:</strong> {currentStep.keyTakeaway}</span>
                    </div>

                    {/* Quest Challenge Prompt (If Quest Mode) */}
                    {isQuestMode && currentStep.questPrompt && (
                        <div className={`mt-2 rounded-lg border-2 p-3 transition-all ${questSuccess ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/60 bg-amber-500/10 text-amber-300'}`}>
                            <div className="flex items-start gap-2.5">
                                {questSuccess ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                                ) : (
                                    <Target className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                                )}
                                <div className="space-y-1">
                                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                        {questSuccess ? 'Mission Accomplished!' : 'Your Mission / Action'}
                                    </p>
                                    <p className="text-xs font-medium text-foreground">
                                        {currentStep.questPrompt.instruction}
                                    </p>
                                    {currentStep.questPrompt.hint && !questSuccess && (
                                        <p className="text-[11px] text-muted-foreground">
                                            💡 Hint: {currentStep.questPrompt.hint}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step Scrubber Dots */}
                <div className="mt-4 flex items-center justify-center gap-1.5 overflow-x-auto py-1">
                    {activePlaylist.steps.map((step, idx) => {
                        const isCurrent = idx === currentStepIndex
                        const isPast = idx < currentStepIndex
                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => onGoToStep(idx)}
                                className={`h-2 rounded-full transition-all ${
                                    isCurrent
                                        ? 'w-7 bg-primary'
                                        : isPast
                                            ? 'w-3 bg-primary/50 hover:bg-primary/80'
                                            : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                                }`}
                                title={`Jump to Step ${idx + 1}: ${step.title}`}
                                aria-label={`Jump to Step ${idx + 1}: ${step.title}`}
                            />
                        )
                    })}
                </div>

                {/* Bottom Control Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                    {/* Left: Speed & Voiceover Toggles */}
                    <div className="flex items-center gap-2">
                        {!isQuestMode && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs font-semibold px-2.5"
                                onClick={() => onSetSpeed(nextSpeedMap[playbackSpeed])}
                                title="Change Auto-Play Speed"
                            >
                                <Gauge className="h-3.5 w-3.5 text-primary" />
                                <span>{playbackSpeed}x</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`h-8 gap-1.5 text-xs font-semibold px-2.5 ${isVoiceEnabled ? 'border-primary text-primary bg-primary/10' : 'text-muted-foreground'}`}
                            onClick={onToggleVoice}
                            title={isVoiceEnabled ? 'Mute AI Voiceover' : 'Enable AI Voiceover Narration'}
                        >
                            {isVoiceEnabled ? <Volume2 className="h-3.5 w-3.5 text-primary" /> : <VolumeX className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isVoiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                        </Button>
                    </div>

                    {/* Center / Right: Step Navigation Controls */}
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            disabled={isFirstStep}
                            onClick={onPrev}
                            title="Previous Step (Left Arrow)"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Prev</span>
                        </Button>

                        {!isQuestMode && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`h-8 gap-1.5 text-xs font-semibold px-3 ${isPlaying ? 'border-primary/40 text-primary' : ''}`}
                                onClick={onTogglePlay}
                                title={isPlaying ? 'Pause Auto-Play (Space)' : 'Resume Auto-Play (Space)'}
                            >
                                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="h-8 gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 hover:bg-primary/90"
                            onClick={onNext}
                            title={isLastStep ? 'Finish Tour (Enter)' : 'Next Step (Right Arrow / Enter)'}
                        >
                            <span>{isLastStep ? 'Finish Tour' : 'Next Step'}</span>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    )
}
