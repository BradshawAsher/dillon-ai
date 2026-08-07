import { Info } from 'lucide-react'

import type { ResolvedInput } from '../utils/dealMath'
import { safeFormatCurrency } from '../utils/diligenceDashboardUtils'

type AssumptionNoticeProps = {
    assumedInputs: ResolvedInput[]
    currency?: string
}

function formatAssumedValue(input: ResolvedInput, currency: string) {
    if (input.field === 'taxRate') {
        return `${(input.value * 100).toFixed(0)}%`
    }

    if (input.field === 'holdPeriodYears') {
        return `${input.value} year${input.value === 1 ? '' : 's'}`
    }

    if (input.field === 'exitMultiple') {
        return `${input.value}x`
    }

    if (input.value === 0) {
        return 'zero'
    }

    return safeFormatCurrency(input.value, currency)
}

/**
 * Lists the inputs that fell back to a default. Without this, a payback period
 * resting on "capex assumed zero" is indistinguishable from one backed by
 * documented figures — which would overstate returns silently.
 */
export default function AssumptionNotice({ assumedInputs, currency = 'USD' }: AssumptionNoticeProps) {
    if (assumedInputs.length === 0) {
        return null
    }

    return (
        <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-warning" />
                <p className="text-sm font-medium text-foreground">
                    {assumedInputs.length} assumed input{assumedInputs.length === 1 ? '' : 's'} — not documented
                </p>
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {assumedInputs.map((input) => (
                    <li key={input.field} className="text-xs text-muted-foreground">
                        {input.label}: <span className="font-medium text-foreground">{formatAssumedValue(input, currency)}</span>
                    </li>
                ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
                These figures rest on defaults, not source documents. Confirm them in the Deal Model before relying on the returns above.
            </p>
        </div>
    )
}
