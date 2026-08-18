import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Info, X, ShieldAlert, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { useFloatingPosition } from '../hooks/useFloatingPosition'

interface ActionableRecommendationInfoButtonProps {
    recommendation?: string
    trafficLight?: string
    onSwitchTab?: (tab: any) => void
    className?: string
    size?: 'sm' | 'default'
    align?: 'left' | 'right' | 'auto'
}

interface VerdictDetails {
    posture: 'GREEN' | 'YELLOW' | 'RED'
    title: string
    variant: 'success' | 'warning' | 'destructive'
    icon: React.ReactNode
    summary: string
    recommendedAction: string
    triggerContext: string
}

export function getVerdictExplanation(recommendation = '', trafficLight = ''): VerdictDetails {
    const normRec = recommendation.toLowerCase().trim()
    const normLight = trafficLight.toUpperCase().trim()

    const isRed =
        normLight === 'RED' ||
        normRec.includes('escalat') ||
        normRec.includes('walk away') ||
        normRec.includes('abort') ||
        normRec.includes('pass') ||
        normRec.includes('reject') ||
        normRec.includes('no-go') ||
        normRec.includes('abandon')

    const isYellow =
        normLight === 'YELLOW' ||
        normRec.includes('renegotiat') ||
        normRec.includes('reprice') ||
        normRec.includes('caution') ||
        normRec.includes('hold') ||
        normRec.includes('warn') ||
        normRec.includes('conditional')

    if (isRed) {
        return {
            posture: 'RED',
            title: recommendation || 'ESCALATE / WALK AWAY',
            variant: 'destructive',
            icon: <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />,
            summary:
                'Critical structural deal-breakers or irreconcilable discrepancies detected that exceed standard commercial price negotiation.',
            recommendedAction:
                'Freeze LOI execution and earnest money release. Escalate immediately to the Senior Investment Committee and transaction legal counsel.',
            triggerContext:
                'Common triggers: severe customer concentration (>50%), undisclosed tax/payroll liabilities, or tax return Form 1120 revenue discrepancies.',
        }
    }

    if (isYellow) {
        return {
            posture: 'YELLOW',
            title: recommendation || 'RENEGOTIATE / REPRICE',
            variant: 'warning',
            icon: <AlertTriangle className="h-4 w-4 text-warning shrink-0" />,
            summary:
                'The business is fundamentally viable, but seller-claimed earnings contain unsupportable add-backs or valuation disconnects.',
            recommendedAction:
                'Formulate a purchase price re-trade using the Adjusted EBITDA Bridge and Negotiation Levers schedule before signing.',
            triggerContext:
                'Common triggers: rejected discretionary owner expenses, customer concentration between 25%–40%, or excessive multiple valuation gap.',
        }
    }

    return {
        posture: 'GREEN',
        title: recommendation || 'PROCEED TO LOI',
        variant: 'success',
        icon: <CheckCircle2 className="h-4 w-4 text-success shrink-0" />,
        summary:
            'Earnings quality, tax filings, and operating metrics satisfy core investment criteria within acceptable diligence tolerances.',
        recommendedAction:
            'Proceed with standard Letter of Intent (LOI) issuance, confirmatory legal diligence, and working capital peg finalization.',
        triggerContext:
            'Criteria met: audited add-backs verified, diversified customer base, and market-supported EBITDA purchase multiple.',
    }
}

export default function ActionableRecommendationInfoButton({
    recommendation,
    trafficLight,
    onSwitchTab,
    className = '',
    size = 'default',
    align = 'auto',
}: ActionableRecommendationInfoButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const popoverRef = useRef<HTMLDivElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const clearCloseTimer = () => {
        if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
        }
    }

    const handleMouseEnter = () => {
        clearCloseTimer()
        setIsOpen(true)
    }

    const handleMouseLeave = () => {
        clearCloseTimer()
        closeTimeoutRef.current = setTimeout(() => {
            setIsOpen(false)
        }, 220)
    }

    const coords = useFloatingPosition({
        isOpen,
        targetRef: buttonRef,
        popoverWidth: 384,
        preferredPlacement: 'bottom',
        margin: 8,
        padding: 16,
    })

    const details = getVerdictExplanation(recommendation, trafficLight)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false)
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            document.addEventListener('keydown', handleKeyDown)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
            clearCloseTimer()
        }
    }, [isOpen])

    const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
    const buttonPadding = size === 'sm' ? 'p-1' : 'p-1.5'

    return (
        <div 
            className={`relative inline-flex items-center align-middle shrink-0 ${className}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                aria-label={`Learn about recommendation: ${details.title}`}
                aria-expanded={isOpen}
                title="What does this actionable recommendation mean? (Hover or click)"
                className={`inline-flex items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer ${buttonPadding}`}
            >
                <Info className={iconSize} />
            </button>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={popoverRef}
                    role="dialog"
                    aria-label="Recommendation Explanation"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        position: 'fixed',
                        top: coords.top !== undefined ? `${coords.top}px` : undefined,
                        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                        left: coords.left !== undefined ? `${coords.left}px` : undefined,
                        right: coords.right !== undefined ? `${coords.right}px` : undefined,
                        width: coords.width !== undefined ? `${coords.width}px` : undefined,
                        maxHeight: coords.maxHeight !== undefined ? `${coords.maxHeight}px` : '80vh',
                        zIndex: 99999,
                    }}
                    className="overflow-y-auto rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl ring-1 ring-border/50 animate-in fade-in-0 zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                        <div className="flex items-center gap-2">
                            {details.icon}
                            <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Verdict Meaning
                                    </p>
                                    <p className="text-sm font-bold text-foreground leading-tight">{details.title}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Badge variant={details.variant} className="text-[10px] font-bold py-0.5 px-1.5">
                                    {details.posture}
                                </Badge>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                    aria-label="Close popover"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2.5 py-3 text-xs leading-relaxed">
                            <div>
                                <p className="font-semibold text-foreground">Core Diligence Meaning:</p>
                                <p className="mt-0.5 text-muted-foreground">{details.summary}</p>
                            </div>

                            <div className="rounded-lg border border-border/60 bg-muted/40 p-2.5">
                                <p className="font-semibold text-foreground flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                                    Recommended Deal Action:
                                </p>
                                <p className="mt-1 text-foreground/90 font-medium">{details.recommendedAction}</p>
                            </div>

                            <p className="text-[11px] text-muted-foreground/80 italic">{details.triggerContext}</p>
                        </div>

                        {onSwitchTab && (
                            <div className="border-t border-border/60 pt-2.5 flex justify-end">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setIsOpen(false)
                                        onSwitchTab('faqs')
                                    }}
                                    className="h-7 text-xs font-semibold text-primary hover:text-primary gap-1 px-2 cursor-pointer"
                                >
                                    <span>Read Full FAQs & Guide</span>
                                    <ArrowRight className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    )
}
