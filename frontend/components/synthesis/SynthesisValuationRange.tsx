import { Landmark } from 'lucide-react'

import { Badge } from '../../lib/shadcn/badge'
import { formatCurrencyValue } from '../../utils/aiSubmissionData'

export type SynthesisValuationRangeProps = {
    hasValuation: boolean
    lowerBound?: string
    baseEstimate?: string
    upperBound?: string
    currency?: string
    confidence?: string
    targetAskingPrice?: string | number | null
    impliedDiscountAmount?: string | number | null
    impliedDiscountPercentage?: string | number | null
    valuationRationale?: string | null
}

export default function SynthesisValuationRange({
    hasValuation,
    lowerBound,
    baseEstimate,
    upperBound,
    currency,
    confidence,
    targetAskingPrice,
    impliedDiscountAmount,
    impliedDiscountPercentage,
    valuationRationale,
}: SynthesisValuationRangeProps) {
    return (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wide text-xs">
                    <Landmark className="h-4 w-4" />
                    <span>Buyer Intrinsic Valuation Range</span>
                </div>
                {targetAskingPrice ? (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Seller Ask: <strong className="text-foreground">{formatCurrencyValue(String(targetAskingPrice), currency || 'USD')}</strong></span>
                        {impliedDiscountAmount && Number(impliedDiscountAmount) > 0 ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                                -{formatCurrencyValue(String(impliedDiscountAmount), currency || 'USD')} ({Math.round(Number(impliedDiscountPercentage) || 0)}% Negotiation Spread)
                            </Badge>
                        ) : null}
                    </div>
                ) : null}
            </div>
            {hasValuation ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Lower Bound (Bear)</p>
                        <p className="mt-1 text-base font-bold text-foreground">{formatCurrencyValue(lowerBound || '', currency || 'USD') || 'Pending'}</p>
                    </div>
                    <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 shadow-xs">
                        <p className="text-xs font-semibold text-primary">Base Valuation (Buyer Fair Value)</p>
                        <p className="mt-1 text-lg font-extrabold text-foreground">{formatCurrencyValue(baseEstimate || '', currency || 'USD') || 'Pending'}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                        <p className="text-xs text-muted-foreground">Upper Bound (Bull)</p>
                        <p className="mt-1 text-base font-bold text-foreground">{formatCurrencyValue(upperBound || '', currency || 'USD') || 'Pending'}</p>
                    </div>
                </div>
            ) : (
                <p className="mt-2 text-sm text-muted-foreground">No supported valuation range has returned yet for this project.</p>
            )}
            {valuationRationale ? (
                <p className="text-xs text-muted-foreground italic">{valuationRationale}</p>
            ) : null}
            {confidence ? <p className="text-xs text-muted-foreground">Valuation Confidence: {confidence}</p> : null}
        </div>
    )
}

