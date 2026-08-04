import { Landmark } from 'lucide-react'

import { formatCurrencyValue } from '../../utils/aiSubmissionData'

export type SynthesisValuationRangeProps = {
    hasValuation: boolean
    lowerBound?: string
    baseEstimate?: string
    upperBound?: string
    currency?: string
    confidence?: string
}

export default function SynthesisValuationRange({
    hasValuation,
    lowerBound,
    baseEstimate,
    upperBound,
    currency,
    confidence,
}: SynthesisValuationRangeProps) {
    return (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wide text-xs">
                <Landmark className="h-4 w-4" />
                <span>Supported Valuation Range</span>
            </div>
            {hasValuation ? (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Lower Bound</p>
                        <p className="mt-1 text-base font-bold text-foreground">{formatCurrencyValue(lowerBound || '', currency || 'USD') || 'Pending'}</p>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 shadow-xs">
                        <p className="text-xs font-semibold text-primary">Base Valuation</p>
                        <p className="mt-1 text-lg font-extrabold text-foreground">{formatCurrencyValue(baseEstimate || '', currency || 'USD') || 'Pending'}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Upper Bound</p>
                        <p className="mt-1 text-base font-bold text-foreground">{formatCurrencyValue(upperBound || '', currency || 'USD') || 'Pending'}</p>
                    </div>
                </div>
            ) : (
                <p className="mt-2 text-sm text-muted-foreground">No supported valuation range has returned yet for this project.</p>
            )}
            {confidence ? <p className="mt-2 text-xs text-muted-foreground">Valuation Confidence: {confidence}</p> : null}
        </div>
    )
}
