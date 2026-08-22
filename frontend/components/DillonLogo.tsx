import React from 'react'

export interface DillonLogoProps {
    /** Size preset or numeric pixel dimension */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
    /** Whether to render icon badge only, mark only, or full with wordmark */
    variant?: 'badge' | 'mark' | 'full'
    /** Optional custom classes */
    className?: string
    /** Whether to render the precision emerald accent dot */
    showDot?: boolean
}

/**
 * DillonLogo (Concept 4: Minimalist Institutional Monolith D + Dot)
 * Renders the official Dillon AI brand logo as a high-precision vector SVG.
 */
export function DillonLogo({
    size = 'md',
    variant = 'badge',
    className = '',
    showDot = true,
}: DillonLogoProps) {
    const sizeMap = {
        xs: 24,
        sm: 32,
        md: 40,
        lg: 48,
        xl: 56,
    }

    const dimension = typeof size === 'number' ? size : sizeMap[size] || 40

    // Render mark only (transparent background, uses current text color / black)
    if (variant === 'mark') {
        return (
            <svg
                width={dimension}
                height={dimension}
                viewBox="0 0 128 128"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={`shrink-0 ${className}`}
                aria-label="Dillon AI Logo"
            >
                <path
                    d="M 30 20 L 70 20 C 94 20 108 36 108 64 C 108 92 94 108 70 108 L 30 108 Z M 52 42 L 52 86 L 68 86 C 81 86 87 77 87 64 C 87 51 81 42 68 42 Z"
                    className="fill-current text-black dark:text-white"
                />
                {showDot && <circle cx="106" cy="100" r="10" className="fill-emerald-500" />}
            </svg>
        )
    }

    // Render full with wordmark
    if (variant === 'full') {
        return (
            <div className={`flex items-center gap-3 shrink-0 select-none ${className}`}>
                <div
                    style={{ width: dimension, height: dimension }}
                    className="relative flex items-center justify-center rounded-xl bg-black dark:bg-zinc-900 border border-zinc-800 shadow-md shrink-0 overflow-hidden"
                >
                    <svg
                        viewBox="0 0 128 128"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-[72%] h-[72%]"
                    >
                        <path
                            d="M 30 20 L 70 20 C 94 20 108 36 108 64 C 108 92 94 108 70 108 L 30 108 Z M 52 42 L 52 86 L 68 86 C 81 86 87 77 87 64 C 87 51 81 42 68 42 Z"
                            fill="#ffffff"
                        />
                        {showDot && <circle cx="106" cy="100" r="10" fill="#10b981" />}
                    </svg>
                </div>
                <div className="flex flex-col justify-center">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-black dark:text-white leading-none">
                        Dillon AI
                    </span>
                    <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground tracking-wider uppercase mt-0.5 leading-none">
                        Autonomous M&amp;A Diligence
                    </span>
                </div>
            </div>
        )
    }

    // Default: Badge (Icon in crisp black squircle)
    return (
        <div
            style={{ width: dimension, height: dimension }}
            className={`relative flex items-center justify-center rounded-xl bg-black dark:bg-zinc-900 border border-zinc-800 shadow-md shrink-0 overflow-hidden ${className}`}
            aria-label="Dillon AI Badge"
        >
            <svg
                viewBox="0 0 128 128"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-[72%] h-[72%]"
            >
                <path
                    d="M 30 20 L 70 20 C 94 20 108 36 108 64 C 108 92 94 108 70 108 L 30 108 Z M 52 42 L 52 86 L 68 86 C 81 86 87 77 87 64 C 87 51 81 42 68 42 Z"
                    fill="#ffffff"
                />
                {showDot && <circle cx="106" cy="100" r="10" fill="#10b981" />}
            </svg>
        </div>
    )
}

export default DillonLogo
