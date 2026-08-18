import React from 'react'

interface WalkthroughCursorProps {
    cursorPos: { x: number; y: number } | null
    isClicking: boolean
    isActive: boolean
    label?: string
}

export function WalkthroughCursor({
    cursorPos,
    isClicking,
    isActive,
    label,
}: WalkthroughCursorProps) {
    if (!isActive || !cursorPos) return null

    return (
        <div
            className="fixed pointer-events-none z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
                left: `${cursorPos.x}px`,
                top: `${cursorPos.y}px`,
                transform: 'translate(-4px, -4px)',
            }}
        >
            {/* Click Ripple Indicator */}
            {isClicking && (
                <div className="absolute -left-4 -top-4 h-12 w-12 rounded-full border-2 border-primary bg-primary/20 animate-ping" />
            )}

            {/* Glowing Cursor Aura */}
            <div className="absolute -left-2 -top-2 h-8 w-8 rounded-full bg-primary/30 blur-sm animate-pulse" />

            {/* Modern SVG Pointer Cursor */}
            <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`drop-shadow-lg transition-transform duration-200 ${isClicking ? 'scale-90' : 'scale-100'}`}
            >
                <path
                    d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z"
                    fill="hsl(var(--primary))"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>

            {/* Floating Label / Action Pill */}
            {label && (
                <div className="absolute left-6 top-4 whitespace-nowrap rounded-full bg-background/90 px-2.5 py-0.5 text-[11px] font-semibold text-foreground shadow-md border border-border/80 backdrop-blur-md animate-fade-in flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
                    <span>{label}</span>
                </div>
            )}
        </div>
    )
}
