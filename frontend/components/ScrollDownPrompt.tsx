import { useState, useEffect } from 'react'
import { ChevronDown, Sparkles, X } from 'lucide-react'

export default function ScrollDownPrompt() {
    const [isVisible, setIsVisible] = useState(false)
    const [isDismissed, setIsDismissed] = useState(() => {
        try {
            return sessionStorage.getItem('mergeworks.hideScrollPrompt') === 'true'
        } catch {
            return false
        }
    })

    useEffect(() => {
        if (isDismissed) {
            setIsVisible(false)
            return
        }

        const checkScroll = () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop || 0
            setIsVisible(scrollY < 120)
        }

        checkScroll()
        window.addEventListener('scroll', checkScroll, { passive: true })
        return () => window.removeEventListener('scroll', checkScroll)
    }, [isDismissed])

    const handleScrollDown = () => {
        const workspace = document.getElementById('deal-workspace') || document.querySelector('[data-project-intake]')
        if (workspace) {
            workspace.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
            window.scrollBy({ top: 400, behavior: 'smooth' })
        }
    }

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsDismissed(true)
        setIsVisible(false)
        try {
            sessionStorage.setItem('mergeworks.hideScrollPrompt', 'true')
        } catch {
            // Ignore storage errors
        }
    }

    if (isDismissed) return null

    return (
        <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ease-out ${
                isVisible
                    ? 'opacity-100 translate-y-0 pointer-events-auto'
                    : 'opacity-0 translate-y-4 pointer-events-none'
            }`}
        >
            <div
                onClick={handleScrollDown}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleScrollDown()
                    }
                }}
                className="group flex items-center gap-2.5 rounded-full border border-primary/40 bg-background/90 px-4 py-2 text-xs font-semibold text-foreground shadow-xl backdrop-blur-md transition-all duration-200 hover:border-primary hover:bg-background hover:shadow-2xl hover:scale-105 cursor-pointer ring-1 ring-primary/20"
                title="Click to jump down to deal workspace and file intake"
            >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Sparkles className="h-3.5 w-3.5" />
                </span>
                <span className="text-foreground/90 group-hover:text-foreground">
                    Scroll down to explore diligence & intake
                </span>
                <ChevronDown className="h-4 w-4 text-primary animate-bounce group-hover:translate-y-0.5 transition-transform" />
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    title="Dismiss notification"
                    aria-label="Dismiss scroll prompt"
                >
                    <X className="h-3 w-3" />
                </button>
            </div>
        </div>
    )
}
