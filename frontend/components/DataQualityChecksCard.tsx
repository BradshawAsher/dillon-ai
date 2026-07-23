import { BadgeCheck, CircleAlert, ShieldAlert } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'

type Check = { title: string; detail: string; severity: 'warning' | 'destructive' }

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function confirmedValue(facts: ReturnType<typeof parseDocumentedFacts>, field: string) {
    const fact = facts[field]
    return fact?.status === 'confirmed' && typeof fact.value === 'number' && Number.isFinite(fact.value) ? fact.value : null
}

export default function DataQualityChecksCard({ model }: { model: DealModel }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenue = confirmedValue(facts, 'revenue')
    const ebitda = confirmedValue(facts, 'ebitda_sde')
    const debt = confirmedValue(facts, 'debt')
    const assets = confirmedValue(facts, 'total_assets')
    const price = model.purchasePrice ?? model.askingPrice
    const checks: Check[] = []

    if (revenue !== null && revenue <= 0) checks.push({ title: 'Revenue is zero or negative', detail: 'Confirm the period, sign, and whether this is a statement total rather than a line item.', severity: 'destructive' })
    if (ebitda !== null && revenue !== null && revenue > 0) {
        const margin = ebitda / revenue
        if (margin > 1) checks.push({ title: 'EBITDA/SDE exceeds revenue', detail: `Reported margin is ${(margin * 100).toFixed(0)}%. This often indicates a swapped field, a unit mismatch, or an extraction error.`, severity: 'destructive' })
        else if (margin > 0.75 || margin < -0.5) checks.push({ title: 'Unusual EBITDA/SDE margin', detail: `Reported margin is ${(margin * 100).toFixed(0)}%. Verify units, period alignment, and add-backs before using returns.`, severity: 'warning' })
    }
    if (price !== null && ebitda !== null && ebitda > 0) {
        const multiple = price / ebitda
        if (multiple > 30 || multiple < 0.5) checks.push({ title: 'Unusual entry multiple', detail: `${multiple.toFixed(1)}x purchase price / EBITDA-SDE. Confirm that both values use the same currency, period, and scale.`, severity: 'warning' })
    }
    if (debt !== null && assets !== null && assets > 0 && debt > assets * 1.25) checks.push({ title: 'Debt materially exceeds total assets', detail: `Debt is ${money(debt)} versus ${money(assets)} total assets. This can be valid, but review the balance-sheet classification and reporting period.`, severity: 'warning' })
    if (model.taxRate !== null && model.taxRate !== undefined && (model.taxRate < 0 || model.taxRate > 0.6)) checks.push({ title: 'Tax assumption is outside the expected range', detail: `Saved tax rate is ${(model.taxRate * 100).toFixed(1)}%. Check whether it was entered as a decimal.`, severity: 'warning' })
    if (model.interestRate !== null && model.interestRate !== undefined && (model.interestRate < 0 || model.interestRate > 0.3)) checks.push({ title: 'Interest-rate assumption is outside the expected range', detail: `Saved interest rate is ${(model.interestRate * 100).toFixed(1)}%. Check whether it was entered as a decimal.`, severity: 'warning' })

    const factCount = [revenue, ebitda, debt, assets].filter((value) => value !== null).length
    return <Card className="overflow-hidden"><CardHeader className="border-b border-border bg-card/80"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Numerical integrity checks</CardTitle></div><CardDescription className="mt-1">Non-blocking checks for common extraction and input errors. They flag values for review; they do not overwrite documents or model inputs.</CardDescription></div><Badge variant={checks.some((check) => check.severity === 'destructive') ? 'destructive' : checks.length ? 'warning' : 'success'}>{checks.length ? `${checks.length} review item${checks.length === 1 ? '' : 's'}` : 'No issues detected'}</Badge></div></CardHeader><CardContent className="space-y-3 p-4">{checks.length ? checks.map((check) => <div key={check.title} className={check.severity === 'destructive' ? 'flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3' : 'flex gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3'}><CircleAlert className={check.severity === 'destructive' ? 'mt-0.5 h-4 w-4 shrink-0 text-destructive' : 'mt-0.5 h-4 w-4 shrink-0 text-warning'} /><div><p className="text-sm font-semibold text-foreground">{check.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{check.detail}</p></div></div>) : <div className="flex gap-3 rounded-lg border border-success/25 bg-success/5 p-3"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" /><p className="text-sm text-foreground">No obvious scale, sign, margin, leverage, or assumption-range issue was found in the {factCount} confirmed core fact{factCount === 1 ? '' : 's'} currently available. This is a sanity check, not an audit.</p></div>}<p className="text-xs text-muted-foreground">Missing values are not treated as failures. The checks become more useful as the document-facts bridge supplies revenue, EBITDA/SDE, debt, and assets.</p></CardContent></Card>
}
