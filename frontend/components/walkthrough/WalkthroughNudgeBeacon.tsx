import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Sparkles, ArrowRight, Clock, X, GripHorizontal } from 'lucide-react'
import { Button } from '../../lib/shadcn/button'

export interface WalkthroughNudgeBeaconProps {
    isOpen: boolean
    reason: 'new_user' | 'returning_user' | null
    onStartTour: () => void
    onSnooze: (days?: number) => void
    onDismiss: () => void
}

interface BeaconPosition {
    x: number
    y: number
}

interface BeaconSize {
    width: number
}

const MIN_WIDTH = 300
const MAX_WIDTH = 520

export function WalkthroughNudgeBeacon({
    isOpen,
    reason,
    onStartTour,
    onSnooze,
    onDismiss,
}: WalkthroughNudgeBeaconProps) {
    const beaconRef = useRef<HTMLDivElement>(null)
    const [position, setPosition] = useState<BeaconPosition | null>(null)
    const [size, setSize] = useState<BeaconSize>({ width: 384 }) // default ~384px (sm:w-96)
    const [isDragging, setIsDragging] = useState(false)
    const [isResizing, setIsResizing] = useState(false)

    const dragRef = useRef<{
        startX: number
        startY: number
        initialX: number
        initialY: number
    } | null>(null)

    const resizeRef = useRef<{
        startX: number
        startWidth: number
        direction: 'left' | 'right'
    } | null>(null)

    // Calculate safe initial position on mount (above data source toggle)
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (position !== null) return

        const screenW = window.innerWidth
        const screenH = window.innerHeight
        const defaultW = Math.min(384, screenW - 32)
        
        // Place bottom-right but high enough to clear bottom toggles & chat buttons (bottom: 104px)
        const initialX = Math.max(16, screenW - defaultW - 24)
        const initialY = Math.max(64, screenH - 220)

        setPosition({ x: initialX, y: initialY })
        setSize({ width: defaultW })
    }, [position])

    // Window resize bounds containment
    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleWindowResize = () => {
            setPosition((prev) => {
                if (!prev) return prev
                const screenW = window.innerWidth
                const screenH = window.innerHeight
                const currentW = size.width
                const clampedX = Math.max(12, Math.min(screenW - currentW - 12, prev.x))
                const clampedY = Math.max(12, Math.min(screenH - 160, prev.y))
                return { x: clampedX, y: clampedY }
            })
        }

        window.addEventListener('resize', handleWindowResize, { passive: true })
        return () => window.removeEventListener('resize', handleWindowResize)
    }, [size.width])

    // Dragging pointer handlers
    const handleDragPointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()

        const currentPos = position || { x: 24, y: 100 }
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: currentPos.x,
            initialY: currentPos.y,
        }
        setIsDragging(true)

        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {}
    }

    const handleDragPointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current || !isDragging) return
        const screenW = window.innerWidth
        const screenH = window.innerHeight

        const deltaX = e.clientX - dragRef.current.startX
        const deltaY = e.clientY - dragRef.current.startY

        const nextX = dragRef.current.initialX + deltaX
        const nextY = dragRef.current.initialY + deltaY

        const clampedX = Math.max(8, Math.min(screenW - size.width - 8, nextX))
        const clampedY = Math.max(8, Math.min(screenH - 120, nextY))

        setPosition({ x: clampedX, y: clampedY })
    }

    const handleDragPointerUp = (e: React.PointerEvent) => {
        dragRef.current = null
        setIsDragging(false)
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        } catch {}
    }

    // Resizing pointer handlers
    const handleResizePointerDown = (direction: 'left' | 'right', e: React.PointerEvent) => {
        if (e.button !== 0) return
        e.preventDefault()
        e.stopPropagation()

        resizeRef.current = {
            startX: e.clientX,
            startWidth: size.width,
            direction,
        }
        setIsResizing(true)

        try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        } catch {}
    }

    const handleResizePointerMove = (e: React.PointerEvent) => {
        if (!resizeRef.current || !isResizing) return
        const screenW = window.innerWidth
        const deltaX = e.clientX - resizeRef.current.startX

        let nextWidth = resizeRef.current.startWidth
        if (resizeRef.current.direction === 'right') {
            nextWidth = resizeRef.current.startWidth + deltaX
        } else {
            nextWidth = resizeRef.current.startWidth - deltaX
        }

        const maxAllowed = Math.min(MAX_WIDTH, screenW - 24)
        const clampedW = Math.max(MIN_WIDTH, Math.min(maxAllowed, nextWidth))

        setSize({ width: Math.round(clampedW) })
    }

    const handleResizePointerUp = (e: React.PointerEvent) => {
        resizeRef.current = null
        setIsResizing(false)
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        } catch {}
    }

    if (!isOpen) return null

    const isReturning = reason === 'returning_user'

    return (
        <aside
            ref={beaconRef}
            aria-label="Walkthrough Suggestion"
            style={
                position
                    ? {
                          position: 'fixed',
                          left: `${position.x}px`,
                          top: `${position.y}px`,
                          width: `${size.width}px`,
                          zIndex: 55,
                      }
                    : undefined
            }
            className={`pointer-events-auto select-none transition-shadow duration-200 animate-in fade-in slide-in-from-bottom-5 ${
                !position ? 'fixed bottom-28 right-6 z-55 max-w-sm w-[calc(100vw-3rem)] sm:w-96' : ''
            }`}
        >
            <div
                className={`relative rounded-2xl border bg-card/95 backdrop-blur-md p-4 shadow-2xl text-card-foreground transition-colors ${
                    isDragging
                        ? 'border-primary shadow-primary/25 cursor-grabbing ring-2 ring-primary/30'
                        : isResizing
                          ? 'border-primary shadow-primary/20 ring-1 ring-primary/30'
                          : 'border-primary/35 shadow-primary/10 hover:border-primary/50'
                }`}
            >
                {/* Drag Bar & Handle Header */}
                <div
                    onPointerDown={handleDragPointerDown}
                    onPointerMove={handleDragPointerMove}
                    onPointerUp={handleDragPointerUp}
                    onPointerCancel={handleDragPointerUp}
                    className="group -mt-2 -mx-2 mb-2 flex items-center justify-center py-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-primary transition-colors"
                    title="Click and drag anywhere to move this banner"
                >
                    <div className="flex items-center gap-1 px-3 py-0.5 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
                        <GripHorizontal className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-medium tracking-tight">Drag to Move</span>
                    </div>
                </div>

                {/* Close / Permanent Dismiss */}
                <button
                    type="button"
                    onClick={onDismiss}
                    className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/40"
                    title="Don't show again"
                    aria-label="Dismiss walkthrough suggestion permanently"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Content Section */}
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20 shadow-inner">
                        <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>

                    <div className="space-y-1 pr-6">
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            {isReturning ? '👋 Welcome Back!' : '✨ New to MergeWorks?'}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed select-text">
                            {isReturning
                                ? 'Catch up on our latest automated EBITDA reconstruction & deal synthesis engine.'
                                : 'Take a 60-second interactive tour to master AI deal diligence & forensic modeling.'}
                        </p>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSnooze(7)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 h-7 px-2 font-medium"
                        title="Snooze this reminder for 7 days"
                    >
                        <Clock className="h-3.5 w-3.5" />
                        <span>Remind in 7 days</span>
                    </Button>

                    <Button
                        type="button"
                        size="sm"
                        onClick={onStartTour}
                        className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 h-7 px-3 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                        <span>Start 60s Tour</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                </div>

                {/* Right Edge Resize Handle */}
                <div
                    onPointerDown={(e) => handleResizePointerDown('right', e)}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    onPointerCancel={handleResizePointerUp}
                    className="absolute right-0 top-6 bottom-6 w-2 cursor-ew-resize hover:bg-primary/30 rounded-r-2xl transition-colors"
                    title="Drag to resize width"
                />

                {/* Left Edge Resize Handle */}
                <div
                    onPointerDown={(e) => handleResizePointerDown('left', e)}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    onPointerCancel={handleResizePointerUp}
                    className="absolute left-0 top-6 bottom-6 w-2 cursor-ew-resize hover:bg-primary/30 rounded-l-2xl transition-colors"
                    title="Drag to resize width"
                />

                {/* Bottom-Right Corner Resize Grip */}
                <div
                    onPointerDown={(e) => handleResizePointerDown('right', e)}
                    onPointerMove={handleResizePointerMove}
                    onPointerUp={handleResizePointerUp}
                    onPointerCancel={handleResizePointerUp}
                    className="absolute bottom-1 right-1 h-3 w-3 cursor-nwse-resize opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Drag to resize"
                >
                    <svg viewBox="0 0 6 6" className="w-2 h-2 text-muted-foreground fill-current">
                        <circle cx="5" cy="5" r="1" />
                        <circle cx="5" cy="2" r="1" />
                        <circle cx="2" cy="5" r="1" />
                    </svg>
                </div>
            </div>
        </aside>
    )
}

export default WalkthroughNudgeBeacon
