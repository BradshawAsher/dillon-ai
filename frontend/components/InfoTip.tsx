import { Info, Bot, Calculator } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingPosition } from '../hooks/useFloatingPosition'

type Props = {
    term: string
    definition: string
    formula?: string
    align?: 'center' | 'left' | 'right'
}

export const FINANCIAL_TERMS: Record<string, string> = {
    'MOIC': 'Multiple on Invested Capital — total cash returned divided by total cash invested. A 2.5x MOIC means you got $2.50 back for every $1 invested.',
    'IRR': 'Internal Rate of Return — the annualized rate at which invested capital grows, accounting for the timing of cash flows. Higher is better; 20%+ is typically strong for acquisitions.',
    'DSCR': 'Debt Service Coverage Ratio — operating cash flow divided by required debt payments. Above 1.25x is generally considered safe; below 1.0x means cash flow cannot cover debt.',
    'Cash-on-cash': 'Cash-on-Cash Return — annual cash flow after debt service divided by equity invested at close. Shows what percentage of your equity you get back each year in cash.',
    'EBITDA': 'Earnings Before Interest, Taxes, Depreciation, and Amortization — a measure of operating profitability before financing and accounting decisions.',
    'SDE': "Seller's Discretionary Earnings — EBITDA plus the owner's salary and personal expenses run through the business. Used for small businesses where the buyer replaces the owner.",
    'Exit multiple': 'The EBITDA/SDE multiple the business is expected to sell for at the end of the hold period. Higher exit multiples mean a higher sale price.',
    'Hold period': 'The number of years between acquiring and selling the business. Longer hold periods compound growth but delay liquidity.',
    'Equity contribution': 'The percentage of the total purchase price funded by the buyer (not borrowed). Lower equity means more leverage but higher debt payments.',
    'Amortization': 'The number of years over which the acquisition loan is repaid through scheduled payments. Longer amortization means lower annual payments but more total interest.',
    'Levered': 'Returns calculated after accounting for debt (borrowed money). Levered returns are higher than unlevered when debt costs less than the return on assets.',
    'Unlevered': 'Returns calculated as if the entire purchase was funded with cash (no debt). Shows the pure business return independent of financing structure.',
    'Entry multiple': 'The EBITDA/SDE multiple being paid to acquire the business. Lower is better for the buyer — it means less is paid per dollar of earnings.',
    'Working capital': 'Cash tied up in day-to-day operations (inventory, receivables minus payables). The buyer usually needs to fund a working capital balance at close.',
    'Capex': 'Capital Expenditure — spending on equipment, facilities, or other long-lived assets needed to maintain or grow the business.',
    'Seller note': 'A portion of the purchase price the seller agrees to receive later (like a loan from seller to buyer). Reduces cash needed at close.',
    'Initial investment': 'Total cash required at close, combining purchase price, closing fees, and initial working capital reserve.',
    'Operating cash flow': 'Annual cash generated after paying taxes and required maintenance capex, available to the investor or for debt service.',
    'Simple annual ROI': 'Annual operating cash flow divided by total initial investment. Shows the uncompounded annual cash yield before exit.',
    'Payback period': 'The number of years of operating cash flows required to fully recover your initial cash investment.',
    'Cumulative cash flow': 'Total operating cash flow generated across the entire planned hold period before terminal sale proceeds.',
    'Net exit proceeds': 'Expected cash received from selling the business at exit (Exit Multiple × Final EBITDA minus transaction costs).',
    'Levered cash flow': 'Annual cash flow available to equity investors after paying operating expenses, taxes, capex, and annual debt service.',
    'Debt balance': 'The remaining principal balance on senior debt at the end of the hold period that must be paid off upon sale.',
}

export default function InfoTip({ term, definition, formula }: Props) {
    const [open, setOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const closeTimeoutRef = useRef<number | null>(null)

    const coords = useFloatingPosition({
        isOpen: open,
        targetRef: buttonRef,
        popoverWidth: 380,
        preferredPlacement: 'top',
        margin: 8,
        padding: 16,
    })

    const handleMouseEnter = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
        }
        setOpen(true)
    }

    const handleMouseLeave = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current)
        }
        closeTimeoutRef.current = window.setTimeout(() => {
            setOpen(false)
        }, 180)
    }

    useEffect(() => {
        return () => {
            if (closeTimeoutRef.current !== null) {
                window.clearTimeout(closeTimeoutRef.current)
            }
        }
    }, [])

    useEffect(() => {
        if (!open) return
        function handleClick(e: MouseEvent) {
            if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleKey)
        }
    }, [open])

    const handleAskAi = (e: React.MouseEvent) => {
        e.stopPropagation()
        setOpen(false)
        const projectName = (typeof window !== 'undefined' && (window as any).__mergeworks_active_project_name) || 'this deal'
        const formulaStr = formula ? ` (Formula: "${formula}")` : ''
        const question = `Can you explain what "${term}"${formulaStr} means in SMB M&A diligence on ${projectName}, how it affects deal value or risk, and what benchmark or threshold a buyer should target?`

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('mergeworks:open-chat-ask', {
                    detail: {
                        question,
                        topic: term,
                    },
                })
            )
        }
    }

    return (
        <span
            className="relative inline-flex items-center align-middle shrink-0"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                onFocus={handleMouseEnter}
                onBlur={handleMouseLeave}
                className="inline-flex items-center justify-center rounded-full p-1 text-muted-foreground/70 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer transition-all"
                aria-label={`What is ${term}?`}
                aria-expanded={open}
            >
                <Info className="h-3.5 w-3.5" />
            </button>
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    role="tooltip"
                    aria-label={`${term} definition and diligence context`}
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
                    className="overflow-y-auto rounded-xl border border-primary/30 bg-card text-card-foreground p-4 text-left shadow-2xl backdrop-blur-xl ring-1 ring-border/50 animate-in fade-in-0 zoom-in-95 duration-150"
                >
                    {/* Header */}
                    <div className="border-b border-border/60 pb-2.5">
                        <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                            Financial Diligence Term
                        </span>
                        <h4 className="text-sm font-bold text-foreground leading-tight">
                            {term}
                        </h4>
                    </div>

                    {/* Definition */}
                    <div className="mt-3 space-y-2.5 text-xs text-foreground/90 leading-relaxed">
                        <div>
                            <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
                                Definition
                            </p>
                            <p className="text-foreground/90">{definition}</p>
                        </div>

                        {formula ? (
                            <div className="rounded-lg bg-muted/50 p-2.5 border border-border/40">
                                <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-0.5">
                                    <Calculator className="h-3 w-3 text-primary" />
                                    <span>Calculation Formula</span>
                                </p>
                                <p className="font-mono text-xs text-foreground/90 leading-snug">
                                    {formula}
                                </p>
                            </div>
                        ) : null}

                        <div className="pt-2 mt-2 border-t border-border/50">
                            <button
                                type="button"
                                onClick={handleAskAi}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/50 transition-all cursor-pointer shadow-xs"
                            >
                                <Bot className="h-3.5 w-3.5" />
                                <span>Ask AI to Explain</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </span>
    )
}
