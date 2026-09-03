import { useState, useId } from 'react'
import { AlertTriangle, Check, DollarSign, Edit3, X } from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../lib/shadcn/card'
import { OVERRIDE_CATEGORY_LABELS } from '../services/analystFeedbackService'
import type { OverrideCategory } from '../utils/documentedFacts'

export interface AnalystOverrideModalProps {
    open: boolean
    metricKey: string
    metricLabel: string
    currentValue: number | null
    currentFormatted: string
    onSave: (value: number, category: OverrideCategory, notes: string) => void
    onClose: () => void
}

export default function AnalystOverrideModal({
    open,
    metricKey,
    metricLabel,
    currentValue,
    currentFormatted,
    onSave,
    onClose,
}: AnalystOverrideModalProps) {
    const inputId = useId()
    const categoryId = useId()
    const notesId = useId()

    const [inputValue, setInputValue] = useState<string>(
        currentValue !== null && typeof currentValue === 'number' ? String(currentValue) : ''
    )
    const [category, setCategory] = useState<OverrideCategory>('disallowed_addback')
    const [notes, setNotes] = useState<string>('')
    const [validationError, setValidationError] = useState<string | null>(null)

    if (!open) return null

    const numericNewVal = parseFloat(inputValue.replace(/[^0-9.-]/g, ''))
    const isValidNumber = Number.isFinite(numericNewVal)

    const delta = (isValidNumber && currentValue !== null) ? numericNewVal - currentValue : null
    const deltaPct = (delta !== null && currentValue !== null && currentValue !== 0)
        ? (delta / Math.abs(currentValue)) * 100
        : null

    const handleSave = () => {
        if (!isValidNumber) {
            setValidationError('Please enter a valid numeric value.')
            return
        }
        setValidationError(null)
        onSave(numericNewVal, category, notes)
        onClose()
    }

    return (
        <div
            id="analyst-override-modal-backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-150"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <Card
                id="analyst-override-modal"
                className="relative w-full max-w-lg shadow-2xl border-purple-500/30 bg-card text-card-foreground"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none cursor-pointer"
                    aria-label="Close dialog"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                </button>

                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Edit3 className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold">
                                Calibrate & Override: {metricLabel}
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Adjust this metric with institutional forensic justification.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4 py-2 text-xs">
                    {/* Baseline vs Override Summary Banner */}
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-muted/40 p-2.5">
                        <div>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                                AI Extracted Baseline
                            </span>
                            <p className="text-sm font-bold text-foreground mt-0.5">
                                {currentFormatted || '—'}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                                Active Value Delta
                            </span>
                            <p className={`text-sm font-bold mt-0.5 ${
                                delta === null || delta === 0
                                    ? 'text-muted-foreground'
                                    : delta > 0
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                            }`}>
                                {delta !== null
                                    ? `${delta >= 0 ? '+' : ''}$${delta.toLocaleString()} (${deltaPct !== null ? deltaPct.toFixed(1) : '0'}%)`
                                    : '—'}
                            </p>
                        </div>
                    </div>

                    {/* New Value Input */}
                    <div className="space-y-1.5">
                        <label htmlFor={inputId} className="font-semibold text-foreground flex items-center justify-between">
                            <span>Adjusted Numerical Value ($ USD)</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Directly affects DSCR & valuation</span>
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                id={inputId}
                                type="text"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value)
                                    setValidationError(null)
                                }}
                                placeholder="e.g. 1250000"
                                className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm font-mono font-medium focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                                autoFocus
                            />
                        </div>
                        {validationError && (
                            <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                {validationError}
                            </p>
                        )}
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1.5">
                        <label htmlFor={categoryId} className="font-semibold text-foreground">
                            Forensic Override Rationale
                        </label>
                        <select
                            id={categoryId}
                            value={category}
                            onChange={(e) => setCategory(e.target.value as OverrideCategory)}
                            className="w-full rounded-md border border-border bg-background py-2 px-2.5 text-xs text-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                        >
                            {(Object.keys(OVERRIDE_CATEGORY_LABELS) as OverrideCategory[]).map((cat) => (
                                <option key={cat} value={cat}>
                                    {OVERRIDE_CATEGORY_LABELS[cat].label}
                                </option>
                            ))}
                        </select>
                        <p className="text-[11px] text-muted-foreground pl-0.5">
                            {OVERRIDE_CATEGORY_LABELS[category]?.description}
                        </p>
                    </div>

                    {/* Notes Field */}
                    <div className="space-y-1.5">
                        <label htmlFor={notesId} className="font-semibold text-foreground">
                            Audit Notes & Citations (Optional)
                        </label>
                        <textarea
                            id={notesId}
                            rows={2}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Disallowed $170k personal boat lease and adjusted officer comp to $250k market replacement."
                            className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                    </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border pt-3">
                    <p className="text-[10px] text-muted-foreground">
                        Logged in <code className="font-mono text-purple-600 dark:text-purple-400">analyst_feedback_ledger</code>
                    </p>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold cursor-pointer"
                            onClick={handleSave}
                        >
                            <Check className="h-3.5 w-3.5" />
                            Apply Override
                        </Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}
