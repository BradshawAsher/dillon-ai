import { Info } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useFloatingPosition } from '../hooks/useFloatingPosition'

type Props = {
    term: string
    definition: string
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

export default function InfoTip({ term, definition }: Props) {
    const [open, setOpen] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    const coords = useFloatingPosition({
        isOpen: open,
        targetRef: buttonRef,
        popoverWidth: 260,
        preferredPlacement: 'top',
        margin: 6,
        padding: 12,
    })

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

    return (
        <span className="relative inline-flex items-center align-middle shrink-0">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setOpen(o => !o)}
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/60 hover:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                aria-label={`What is ${term}?`}
                aria-expanded={open}
            >
                <Info className="h-3 w-3" />
            </button>
            {open && typeof document !== 'undefined' && createPortal(
                <span
                    role="tooltip"
                    style={{
                        position: 'fixed',
                        top: coords.top !== undefined ? `${coords.top}px` : undefined,
                        bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
                        left: coords.left !== undefined ? `${coords.left}px` : undefined,
                        right: coords.right !== undefined ? `${coords.right}px` : undefined,
                        width: coords.width !== undefined ? `${coords.width}px` : undefined,
                        maxHeight: coords.maxHeight !== undefined ? `${coords.maxHeight}px` : undefined,
                        zIndex: 99999,
                    }}
                    className="overflow-y-auto rounded-lg border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground shadow-xl ring-1 ring-border/50 animate-in fade-in-0 zoom-in-95 duration-100 pointer-events-none"
                >
                    <span className="font-semibold block mb-0.5 text-foreground">{term}</span>
                    <span className="text-muted-foreground">{definition}</span>
                </span>,
                document.body
            )}
        </span>
    )
}
