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
    RotateCcw,
    Building2,
    Minimize2,
    Maximize2,
    ArrowUpToLine,
    ArrowDownToLine,
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
    const [hudSize, setHudSize] = useState<{ width: number; height?: number } | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const hudRef = useRef<HTMLDivElement>(null)
    const rafIdRef = useRef<number | null>(null)

    const dragRef = useRef<{
        isDragging: boolean
        startPointerX: number
        startPointerY: number
        startLeft: number
        startTop: number
        width: number
        height: number
        lastX: number
        lastY: number
    }>({
        isDragging: false,
        startPointerX: 0,
        startPointerY: 0,
        startLeft: 0,
        startTop: 0,
        width: 560,
        height: 200,
        lastX: 0,
        lastY: 0,
    })

    type ResizeDirection =
        | 'top'
        | 'bottom'
        | 'left'
        | 'right'
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right'

    const resizeRef = useRef<{
        isResizing: boolean
        direction: ResizeDirection
        startX: number
        startY: number
        startWidth: number
        startHeight: number
        startLeft: number
        startTop: number
        lastWidth: number
        lastHeight: number
        lastX: number
        lastY: number
    } | null>(null)

    // Cleanup any pending animation frames on unmount
    useEffect(() => {
        return () => {
            if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        }
    }, [])

    const clampHUDSize = (width: number, height: number) => {
        const minW = Math.min(320, window.innerWidth - 16)
        const maxW = Math.min(960, window.innerWidth - 16)
        const minH = 140
        const maxH = Math.min(750, window.innerHeight - 16)
        return {
            width: Math.min(Math.max(Math.round(width), minW), maxW),
            height: Math.min(Math.max(Math.round(height), minH), maxH),
        }
    }

    const handleResizePointerDown = (direction: ResizeDirection, e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const hudEl = hudRef.current
        if (!hudEl) return

        const rect = hudEl.getBoundingClientRect()
        const initialLeft = Math.round(rect.left)
        const initialTop = Math.round(rect.top)

        // Lock immediate inline transform to prevent layout recalculations
        hudEl.style.transition = 'none'
        hudEl.style.left = '0px'
        hudEl.style.top = '0px'
        hudEl.style.bottom = 'auto'
        hudEl.style.transform = `translate3d(${initialLeft}px, ${initialTop}px, 0)`

        resizeRef.current = {
            isResizing: true,
            direction,
            startX: e.clientX,
            startY: e.clientY,
            startWidth: rect.width,
            startHeight: rect.height,
            startLeft: initialLeft,
            startTop: initialTop,
            lastWidth: rect.width,
            lastHeight: rect.height,
            lastX: initialLeft,
            lastY: initialTop,
        }
        setIsResizing(true)

        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch { }
    }

    const handleResizePointerMove = (e: React.PointerEvent) => {
        if (!resizeRef.current?.isResizing || !hudRef.current) return
        const r = resizeRef.current

        const deltaX = e.clientX - r.startX
        const deltaY = e.clientY - r.startY

        let targetWidth = r.startWidth
        let targetHeight = r.startHeight
        let targetLeft = r.startLeft
        let targetTop = r.startTop

        if (r.direction.includes('right')) {
            targetWidth = r.startWidth + deltaX
        } else if (r.direction.includes('left')) {
            targetWidth = r.startWidth - deltaX
        }

        if (r.direction.includes('bottom')) {
            targetHeight = r.startHeight + deltaY
        } else if (r.direction.includes('top')) {
            targetHeight = r.startHeight - deltaY
        }

        const clamped = clampHUDSize(targetWidth, targetHeight)

        if (r.direction.includes('left')) {
            targetLeft = r.startLeft + (r.startWidth - clamped.width)
        }
        if (r.direction.includes('top')) {
            targetTop = r.startTop + (r.startHeight - clamped.height)
        }

        const nextX = Math.round(Math.max(8, Math.min(window.innerWidth - clamped.width - 8, targetLeft)))
        const nextY = Math.round(Math.max(8, Math.min(window.innerHeight - clamped.height - 8, targetTop)))

        r.lastWidth = clamped.width
        r.lastHeight = clamped.height
        r.lastX = nextX
        r.lastY = nextY

        // 120fps hardware-accelerated RAF pipeline (zero React re-render lag)
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = requestAnimationFrame(() => {
            if (!hudRef.current) return
            hudRef.current.style.width = `${clamped.width}px`
            hudRef.current.style.minHeight = `${clamped.height}px`
            if (r.direction.includes('left') || r.direction.includes('top')) {
                hudRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`
            }
        })
    }

    const handleResizePointerUp = (e: React.PointerEvent) => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
        }
        if (resizeRef.current) {
            const { lastWidth, lastHeight, lastX, lastY, direction } = resizeRef.current
            try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
            } catch { }
            resizeRef.current = null
            setIsResizing(false)

            setHudSize({ width: lastWidth, height: lastHeight })
            if (direction.includes('left') || direction.includes('top') || !customPos) {
                setCustomPos({ x: lastX, y: lastY })
            }
            if (hudRef.current) {
                hudRef.current.style.transition = ''
            }
        }
    }

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
        const initialLeft = Math.round(rect.left)
        const initialTop = Math.round(rect.top)

        // Immediately apply absolute inline transform before drag starts
        hudEl.style.transition = 'none'
        hudEl.style.left = '0px'
        hudEl.style.top = '0px'
        hudEl.style.bottom = 'auto'
        hudEl.style.transform = `translate3d(${initialLeft}px, ${initialTop}px, 0)`

        dragRef.current = {
            isDragging: true,
            startPointerX: e.clientX,
            startPointerY: e.clientY,
            startLeft: initialLeft,
            startTop: initialTop,
            width: rect.width || 560,
            height: rect.height || 200,
            lastX: initialLeft,
            lastY: initialTop,
        }
        setIsDragging(true)
        try {
            e.currentTarget.setPointerCapture(e.pointerId)
        } catch { }
    }

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current.isDragging || !hudRef.current) return

        const deltaX = e.clientX - dragRef.current.startPointerX
        const deltaY = e.clientY - dragRef.current.startPointerY

        const minX = 8
        const maxX = Math.max(8, window.innerWidth - dragRef.current.width - 8)
        const minY = 8
        const maxY = Math.max(8, window.innerHeight - dragRef.current.height - 8)

        const nextX = Math.round(Math.min(maxX, Math.max(minX, dragRef.current.startLeft + deltaX)))
        const nextY = Math.round(Math.min(maxY, Math.max(minY, dragRef.current.startTop + deltaY)))

        dragRef.current.lastX = nextX
        dragRef.current.lastY = nextY

        // 120fps hardware-accelerated RAF transform update (0 React re-renders during movement)
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = requestAnimationFrame(() => {
            if (!hudRef.current) return
            hudRef.current.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`
        })
    }

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
        }
        if (dragRef.current.isDragging) {
            dragRef.current.isDragging = false
            setIsDragging(false)
            try {
                e.currentTarget.releasePointerCapture(e.pointerId)
            } catch { }

            if (dragRef.current.lastX != null && dragRef.current.lastY != null) {
                setCustomPos({ x: dragRef.current.lastX, y: dragRef.current.lastY })
            }
            if (hudRef.current) {
                hudRef.current.style.transition = ''
            }
        }
    }

    const handleResetPosition = () => {
        if (rafIdRef.current) {
            cancelAnimationFrame(rafIdRef.current)
            rafIdRef.current = null
        }
        setCustomPos(null)
        setHudSize(null)
        if (hudRef.current) {
            hudRef.current.style.transition = ''
            hudRef.current.style.transform = ''
            hudRef.current.style.left = ''
            hudRef.current.style.top = ''
            hudRef.current.style.bottom = ''
            hudRef.current.style.width = ''
            hudRef.current.style.minHeight = ''
        }
    }

    const handleSnapTop = () => {
        const hudEl = hudRef.current
        const width = hudEl ? hudEl.offsetWidth : 560
        setCustomPos({
            x: Math.max(12, (window.innerWidth - width) / 2),
            y: 70,
        })
    }

    const isDockedTop = customPos?.y === 70

    const handleToggleDock = () => {
        if (isDockedTop || customPos || hudSize) {
            handleResetPosition()
        } else {
            handleSnapTop()
        }
    }

    const isCustomPositioned = customPos !== null || isDragging || isResizing

    const customStyle: React.CSSProperties = {
        ...(customPos
            ? {
                position: 'fixed',
                left: 0,
                top: 0,
                bottom: 'auto',
                transform: `translate3d(${customPos.x}px, ${customPos.y}px, 0)`,
                zIndex: 60,
            }
            : {}),
        ...(hudSize
            ? {
                width: `${hudSize.width}px`,
                maxWidth: '95vw',
                ...(hudSize.height ? { minHeight: `${hudSize.height}px` } : {}),
            }
            : {}),
    }

    // Minimized Floating Pill Bar
    if (isMinimized) {
        return (
            <aside
                ref={hudRef}
                aria-label="Walkthrough Controller Minimized"
                style={customStyle}
                className={`fixed ${!isCustomPositioned ? 'bottom-2 left-1/2 -translate-x-1/2' : ''} z-50 animate-in fade-in-50 duration-150 pointer-events-auto select-none`}
            >
                <div
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    className="flex items-center gap-2 rounded-full border border-primary/50 bg-background/95 px-3 py-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-primary/20 cursor-grab active:cursor-grabbing select-none touch-none"
                    title="Click and drag anywhere on this bar to reposition"
                >
                    <Badge variant="default" className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 font-bold shadow-xs">
                        Step {currentStepIndex + 1}/{totalSteps}
                    </Badge>

                    <span className="text-xs font-bold text-foreground truncate max-w-[180px] sm:max-w-[300px]">
                        {currentStep.title}
                    </span>

                    <div className="flex items-center gap-1 border-l border-border/60 pl-2">
                        {!isQuestMode && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-foreground hover:text-primary"
                                onClick={onTogglePlay}
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-foreground hover:text-primary"
                            disabled={isFirstStep}
                            onClick={onPrev}
                            title="Previous Step"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-foreground hover:text-primary"
                            onClick={onNext}
                            title={isLastStep ? 'Finish' : 'Next Step'}
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[10.5px] font-bold gap-1 border-primary/50 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer shadow-xs ml-1"
                            onClick={() => setIsMinimized(false)}
                            title="Expand details and narrative"
                        >
                            <Maximize2 className="h-3 w-3" />
                            <span>Expand View</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={onClose}
                            title="Exit Tour"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </aside>
        )
    }

    return (
        <aside
            ref={hudRef}
            aria-label="Interactive Walkthrough Controller"
            style={customStyle}
            className={`fixed ${!isCustomPositioned ? 'bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2' : ''} z-50 ${!hudSize ? 'w-[95vw] sm:w-[580px] max-w-xl' : ''} animate-in fade-in-50 duration-200 pointer-events-auto select-none ${isDragging || isResizing ? 'will-change-transform' : ''}`}
        >
            <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`relative overflow-hidden rounded-xl border-2 cursor-grab active:cursor-grabbing select-none touch-none ${isDragging || isResizing ? 'border-primary ring-4 ring-primary/20 bg-background shadow-lg backdrop-blur-none transition-none' : 'border-primary/40 bg-background/95 shadow-2xl backdrop-blur-xl transition-shadow'} p-3 sm:p-3.5`}
                title="Click and drag anywhere on this box to reposition"
            >
                {/* Auto-Play Progress Bar at Top Edge */}
                {!isQuestMode && isPlaying && (
                    <div className="absolute left-0 top-0 h-1 w-full bg-muted/40">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-75 ease-linear"
                            style={{ width: `${stepProgress}%`, transition: 'width 200ms linear' }}
                        />
                    </div>
                )}

                {/* HUD Header Bar */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2 select-none">
                    <div className="flex items-center gap-1.5 min-w-0">
                        <Badge variant="default" className="gap-1 bg-primary text-primary-foreground font-semibold px-2 py-0.2 text-[11px] shadow-xs shrink-0">
                            <Sparkles className="h-3 w-3" />
                            <span className="truncate max-w-[120px] sm:max-w-[170px]">{activePlaylist.title}</span>
                        </Badge>
                        <Badge variant="outline" className="font-mono text-[10.5px] text-foreground border-border/80 px-1.5 py-0 shrink-0">
                            {currentStepIndex + 1}/{totalSteps}
                        </Badge>
                        <Badge variant="secondary" className="text-[10.5px] font-medium hidden sm:inline-flex px-1.5 py-0 truncate max-w-[120px]">
                            {currentStep.tag}
                        </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        {/* High-Visibility Minimize Button */}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-[11px] font-bold gap-1 border-primary/50 bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground shadow-xs transition-all cursor-pointer ring-1 ring-primary/20"
                            onClick={() => setIsMinimized(true)}
                            title="Minimize dialogue to view full dashboard unobstructed"
                        >
                            <Minimize2 className="h-3 w-3 shrink-0" />
                            <span className="font-bold">Minimize View</span>
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-foreground hover:text-primary"
                            onClick={handleToggleDock}
                            title={isDockedTop ? 'Dock Dialogue to Bottom' : 'Dock Dialogue to Top'}
                        >
                            {isDockedTop ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpToLine className="h-3.5 w-3.5" />}
                        </Button>

                        {(customPos || hudSize) && !isDockedTop && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-foreground hover:text-primary"
                                onClick={handleResetPosition}
                                title="Reset Position and Size to Default"
                            >
                                <RotateCcw className="h-3 w-3" />
                            </Button>
                        )}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground ml-0.5"
                            onClick={onClose}
                            title="Exit Walkthrough (Esc)"
                        >
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Content Section: Title & PE Narrative */}
                <div className="mt-2.5 space-y-1.5">
                    <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                        <Compass className="h-4 w-4 text-primary shrink-0" />
                        <span>{currentStep.title}</span>
                    </h2>

                    <p className="text-xs sm:text-[13px] text-foreground/90 leading-relaxed font-normal">
                        {currentStep.description || currentStep.narrative}
                    </p>

                    {/* Pro Tip Callout (if present) */}
                    {currentStep.proTip && (
                        <div className="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                            <span className="font-bold shrink-0 text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400">Pro Tip:</span>
                            <span className="text-[11.5px]">{currentStep.proTip}</span>
                        </div>
                    )}

                    {/* Quest Challenge Prompt (If Quest Mode) */}
                    {isQuestMode && currentStep.questPrompt && (
                        <div className={`mt-1.5 rounded-md border p-2 transition-all ${questSuccess ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/60 bg-amber-500/10 text-amber-300'}`}>
                            <div className="flex items-start gap-2">
                                {questSuccess ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                                ) : (
                                    <Target className="h-4 w-4 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                                )}
                                <div className="space-y-0.5">
                                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-amber-400">
                                        {questSuccess ? 'Mission Accomplished!' : 'Your Mission / Action'}
                                    </p>
                                    <p className="text-xs font-medium text-foreground">
                                        {currentStep.questPrompt.instruction}
                                    </p>
                                    {currentStep.questPrompt.hint && !questSuccess && (
                                        <p className="text-[10.5px] text-muted-foreground">
                                            💡 Hint: {currentStep.questPrompt.hint}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Step Scrubber Dots */}
                <div className="mt-2.5 flex items-center justify-center gap-1 overflow-x-auto py-0.5">
                    {activePlaylist.steps.map((step, idx) => {
                        const isCurrent = idx === currentStepIndex
                        const isPast = idx < currentStepIndex
                        return (
                            <button
                                key={step.id}
                                type="button"
                                onClick={() => onGoToStep(idx)}
                                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                    isCurrent
                                        ? 'w-6 bg-primary'
                                        : isPast
                                            ? 'w-2.5 bg-primary/50 hover:bg-primary/80'
                                            : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                                }`}
                                title={`Jump to Step ${idx + 1}: ${step.title}`}
                                aria-label={`Jump to Step ${idx + 1}: ${step.title}`}
                            />
                        )
                    })}
                </div>

                {/* Bottom Control Bar */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2">
                    {/* Left: Speed & Voiceover Toggles */}
                    <div className="flex items-center gap-1.5">
                        {!isQuestMode && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 text-[11px] font-semibold px-2"
                                onClick={() => onSetSpeed(nextSpeedMap[playbackSpeed])}
                                title="Change Auto-Play Speed"
                            >
                                <Gauge className="h-3 w-3 text-primary" />
                                <span>{playbackSpeed}x</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={`h-7 gap-1 text-[11px] font-semibold px-2 ${isVoiceEnabled ? 'border-primary text-primary bg-primary/10' : 'text-muted-foreground'}`}
                            onClick={onToggleVoice}
                            title={isVoiceEnabled ? 'Mute AI Voiceover' : 'Enable AI Voiceover Narration'}
                        >
                            {isVoiceEnabled ? <Volume2 className="h-3 w-3 text-primary" /> : <VolumeX className="h-3 w-3" />}
                            <span className="hidden sm:inline">{isVoiceEnabled ? 'Voice On' : 'Voice Off'}</span>
                        </Button>
                    </div>

                    {/* Center / Right: Step Navigation Controls */}
                    <div className="flex items-center gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs px-2.5"
                            disabled={isFirstStep}
                            onClick={onPrev}
                            title="Previous Step (Left Arrow)"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Prev</span>
                        </Button>

                        {!isQuestMode && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className={`h-7 gap-1 text-xs font-semibold px-2.5 ${isPlaying ? 'border-primary/40 text-primary' : ''}`}
                                onClick={onTogglePlay}
                                title={isPlaying ? 'Pause Auto-Play (Space)' : 'Resume Auto-Play (Space)'}
                            >
                                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 fill-current" />}
                                <span>{isPlaying ? 'Pause' : 'Play'}</span>
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="default"
                            size="sm"
                            className="h-7 gap-1 bg-primary text-primary-foreground text-xs font-semibold px-3 hover:bg-primary/90 cursor-pointer shadow-xs"
                            onClick={onNext}
                            title={isLastStep ? 'Finish Tour (Enter)' : 'Next Step (Right Arrow / Enter)'}
                        >
                            <span>{isLastStep ? 'Finish' : 'Next'}</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {/* Subtle Bottom-Right Corner Resize Grip Indicator */}
                <div
                    onPointerDown={(e) => handleResizePointerDown('bottom-right', e)}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    className="absolute bottom-1 right-1 flex h-3.5 w-3.5 items-end justify-end text-muted-foreground/40 hover:text-primary transition-colors cursor-nwse-resize z-30 touch-none"
                    title="Resize dialogue box from corner"
                >
                    <span className="font-mono text-[9px] leading-none">⤡</span>
                </div>
            </div>

            {/* 8-Direction Resizing Border & Corner Handles */}
            {/* Corners */}
            <div
                onPointerDown={(e) => handleResizePointerDown('top-left', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute -top-1.5 -left-1.5 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto touch-none"
                title="Resize from top-left corner"
            />
            <div
                onPointerDown={(e) => handleResizePointerDown('top-right', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto touch-none"
                title="Resize from top-right corner"
            />
            <div
                onPointerDown={(e) => handleResizePointerDown('bottom-left', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute -bottom-1.5 -left-1.5 w-4 h-4 cursor-nesw-resize z-30 pointer-events-auto touch-none"
                title="Resize from bottom-left corner"
            />
            <div
                onPointerDown={(e) => handleResizePointerDown('bottom-right', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute -bottom-1.5 -right-1.5 w-4 h-4 cursor-nwse-resize z-30 pointer-events-auto touch-none"
                title="Resize from bottom-right corner"
            />
            {/* Edges */}
            <div
                onPointerDown={(e) => handleResizePointerDown('top', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute -top-1.5 left-4 right-4 h-2.5 cursor-ns-resize z-20 pointer-events-auto touch-none"
                title="Resize height from top edge"
            />
            <div
                onPointerDown={(e) => handleResizePointerDown('bottom', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute -bottom-1.5 left-4 right-4 h-2.5 cursor-ns-resize z-20 pointer-events-auto touch-none"
                title="Resize height from bottom edge"
            />
            <div
                onPointerDown={(e) => handleResizePointerDown('left', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute top-4 bottom-4 -left-1.5 w-2.5 cursor-ew-resize z-20 pointer-events-auto touch-none"
                title="Resize width from left edge"
            />
            <div
                onPointerDown={(e) => handleResizePointerDown('right', e)}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                className="absolute top-4 bottom-4 -right-1.5 w-2.5 cursor-ew-resize z-20 pointer-events-auto touch-none"
                title="Resize width from right edge"
            />
        </aside>
    )
}
