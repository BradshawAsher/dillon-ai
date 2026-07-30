import { Scale, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type RuleResult = {
    label: string
    value: string
    status: 'pass' | 'warn' | 'fail' | 'unknown'
    note: string
}

export default function DealRulesOfThumb({ model }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = (facts.ebitda_sde?.status === 'confirmed' || facts.ebitda_sde?.status === 'illustrative') && typeof facts.ebitda_sde.value === 'number' ? facts.ebitda_sde.value : null
    const revenue = (facts.revenue?.status === 'confirmed' || facts.revenue?.status === 'illustrative') && typeof facts.revenue.value === 'number' ? facts.revenue.value : null
    const price = model.purchasePrice ?? model.askingPrice

    const rules: RuleResult[] = []

    if (price && ebitda && ebitda > 0) {
        const multiple = price / ebitda
        rules.push({
            label: 'Entry multiple',
            value: `${multiple.toFixed(1)}x EBITDA`,
            status: multiple <= 3.5 ? 'pass' : multiple <= 5 ? 'warn' : 'fail',
            note: multiple <= 3.5 ? 'Strong buyer pricing (≤3.5x)' : multiple <= 5 ? 'Fair market range (3.5–5x)' : 'Premium pricing — ensure growth justifies it',
        })
    }

    if (revenue && ebitda) {
        const margin = ebitda / revenue
        rules.push({
            label: 'EBITDA margin',
            value: `${(margin * 100).toFixed(1)}%`,
            status: margin >= 0.20 ? 'pass' : margin >= 0.12 ? 'warn' : 'fail',
            note: margin >= 0.20 ? 'Healthy owner earnings (≥20%)' : margin >= 0.12 ? 'Adequate but limited cash conversion' : 'Thin margins — check add-backs and sustainability',
        })
    }

    if (price && ebitda && model.holdPeriodYears) {
        const years = model.holdPeriodYears
        const taxRate = model.taxRate ?? 0.25
        const annualCash = ebitda * (1 - taxRate) - (model.maintenanceCapex ?? 0)
        const payback = annualCash > 0 ? price / annualCash : null
        if (payback !== null) {
            rules.push({
                label: 'Simple payback',
                value: `${payback.toFixed(1)} years`,
                status: payback <= 3 ? 'pass' : payback <= 5 ? 'warn' : 'fail',
                note: payback <= 3 ? 'Fast capital return (≤3yr)' : payback <= 5 ? 'Moderate payback — typical for SMB' : 'Slow return — consider financing terms',
            })
        }
    }

    if (price && revenue) {
        const revMultiple = price / revenue
        rules.push({
            label: 'Revenue multiple',
            value: `${revMultiple.toFixed(2)}x revenue`,
            status: revMultiple <= 1.0 ? 'pass' : revMultiple <= 2.0 ? 'warn' : 'fail',
            note: revMultiple <= 1.0 ? 'Below 1x revenue — favorable' : revMultiple <= 2.0 ? 'Typical SMB range (1–2x)' : 'High revenue multiple — SaaS/tech/growth required',
        })
    }

    if (model.interestRate && model.equityContributionPercent && price) {
        const equity = price * normalizeEquityFraction(model.equityContributionPercent)
        const debt = price - equity
        const dscr = ebitda ? (ebitda * (1 - (model.taxRate ?? 0.25))) / (debt * model.interestRate + debt / (model.amortizationYears ?? 10)) : null
        if (dscr !== null && Number.isFinite(dscr)) {
            rules.push({
                label: 'Est. DSCR',
                value: `${dscr.toFixed(2)}x`,
                status: dscr >= 1.5 ? 'pass' : dscr >= 1.2 ? 'warn' : 'fail',
                note: dscr >= 1.5 ? 'Comfortable debt service coverage' : dscr >= 1.2 ? 'Tight — limited margin for error' : 'Below lender comfort zone (1.2x)',
            })
        }
    }

    if (rules.length === 0) {
        return null
    }

    const statusIcon = (status: RuleResult['status']) => {
        switch (status) {
            case 'pass': return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            case 'warn': return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            case 'fail': return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            default: return null
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl">Deal rules of thumb</CardTitle>
                </div>
                <CardDescription>Quick heuristics SMB buyers use to screen acquisition targets.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
                <div className="space-y-3">
                    {rules.map(rule => (
                        <div key={rule.label} className="flex items-start gap-3 rounded-lg border border-border p-3">
                            <div className="mt-0.5 shrink-0">{statusIcon(rule.status)}</div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-sm font-medium text-foreground">{rule.label}</span>
                                    <span className="shrink-0 text-sm font-bold tabular-nums">{rule.value}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-muted-foreground">{rule.note}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">
                    Based on common SMB acquisition screening criteria. These are general heuristics — industry, growth, and deal-specific factors may justify deviations.
                </p>
            </CardContent>
        </Card>
    )
}
