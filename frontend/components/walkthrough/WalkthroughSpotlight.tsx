import React from 'react'

interface WalkthroughSpotlightProps {
    targetRect: DOMRect | null
    isActive: boolean
    onBackdropClick?: () => void
}

export function WalkthroughSpotlight({
    targetRect,
    isActive,
    onBackdropClick,
}: WalkthroughSpotlightProps) {
    if (!isActive) return null

    const padding = 10
    const rx = 12

    const box = targetRect
        ? {
            x: Math.max(0, targetRect.left - padding),
            y: Math.max(0, targetRect.top - padding),
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
        }
        : null

    return (
        <div className="fixed inset-0 z-40 pointer-events-none transition-opacity duration-300">
            <svg className="h-full w-full pointer-events-none" onClick={onBackdropClick}>
                <defs>
                    <mask id="walkthrough-spotlight-mask">
                        {/* White base fills entire screen (masked = transparent) */}
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {/* Black cutout over target element (cutout = punch hole) */}
                        {box && (
                            <rect
                                x={box.x}
                                y={box.y}
                                width={box.width}
                                height={box.height}
                                rx={rx}
                                ry={rx}
                                fill="black"
                                className="transition-all duration-200 ease-out"
                            />
                        )}
                    </mask>
                </defs>

                {/* Dark semi-transparent backdrop with mask punch-hole */}
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(8, 12, 24, 0.72)"
                    mask="url(#walkthrough-spotlight-mask)"
                />

                {/* Glowing accent border around the cutout */}
                {box && (
                    <rect
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        rx={rx}
                        ry={rx}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2.5"
                        strokeDasharray="6 4"
                        className="transition-all duration-200 ease-out animate-pulse"
                    />
                )}
            </svg>
        </div>
    )
}
