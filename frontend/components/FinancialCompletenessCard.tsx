import { CheckCircle2, Circle, CircleAlert, FileBarChart } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts, type EvidenceItem, buildFactEvidence } from '../utils/evidence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'

type FactSpec = {
    key: string
    label: string
    category: 'income' | 'balance' | 'operational'
    critical: boolean
}

const EXPECTED_FACTS: FactSpec[] = [
    { key: 'revenue', label: 'Revenue / TTM Sales', category: 'income', critical: true },
    { key: 'ebitda_sde', label: 'EBITDA / SDE', category: 'income', critical: true },
    { key: 'gross_profit', label: 'Gross Profit', category: 'income', critical: false },
    { key: 'cogs', label: 'Cost of Goods Sold', category: 'income', critical: false },
    { key: 'add_backs', label: 'Owner Add-backs', category: 'income', critical: false },
    { key: 'depreciation', label: 'Depreciation & Amortization', category: 'income', critical: false },
    { key: 'interest_expense', label: 'Interest Expense', category: 'income', critical: false },
    { key: 'taxes', label: 'Tax Expense', category: 'income', critical: false },
    { key: 'debt', label: 'Total Debt', category: 'balance', critical: true },
    { key: 'cash', label: 'Cash & Equivalents', category: 'balance', critical: false },
    { key: 'total_assets', label: 'Total Assets', category: 'balance', critical: false },
    { key: 'total_liabilities', label: 'Total Liabilities', category: 'balance', critical: false },
    { key: 'working_capital', label: 'Working Capital', category: 'balance', critical: false },
    { key: 'accounts_receivable', label: 'Accounts Receivable', category: 'balance', critical: false },
    { key: 'inventory', label: 'Inventory', category: 'balance', critical: false },
    { key: 'employee_count', label: 'Employee Count', category: 'operational', critical: false },
    { key: 'customer_count', label: 'Customer Count', category: 'operational', critical: false },
]

const CATEGORY_LABELS: Record<string, string> = {
    income: 'Income Statement',
    balance: 'Balance Sheet',
    operational: 'Operational Metrics',
}

type FactStatus = 'confirmed' | 'estimated' | 'missing'

function getFactStatus(facts: Record<string, { value?: number; status?: string }>, key: string): FactStatus {
    const fact = facts[key]
    if (!fact) return 'missing'
    if (fact.status === 'confirmed' && typeof fact.value === 'number') return 'confirmed'
    if (typeof fact.value === 'number') return 'estimated'
    return 'missing'
}

export default function FinancialCompletenessCard({ model, documents, onOpenEvidence }: { model: DealModel; documents: SubmissionHistoryItem[]; onOpenEvidence?: (item: EvidenceItem) => void }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)

    const statuses = EXPECTED_FACTS.map((spec) => ({
        ...spec,
        status: getFactStatus(facts, spec.key),
    }))

    const confirmed = statuses.filter((s) => s.status === 'confirmed').length
    const estimated = statuses.filter((s) => s.status === 'estimated').length
    const missing = statuses.filter((s) => s.status === 'missing').length
    const criticalMissing = statuses.filter((s) => s.critical && s.status === 'missing')
    const completeness = Math.round((confirmed / EXPECTED_FACTS.length) * 100)

    const categories = ['income', 'balance', 'operational'] as const

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileBarChart className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Financial data completeness</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                            Which core financial facts are confirmed from uploaded documents versus still missing.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={completeness >= 60 ? 'success' : completeness >= 30 ? 'warning' : 'destructive'}>
                            {completeness}% complete
                        </Badge>
                        <Badge variant="outline">{confirmed}/{EXPECTED_FACTS.length} confirmed</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                            <div className="flex h-full">
                                <div className="h-full bg-success transition-all" style={{ width: `${(confirmed / EXPECTED_FACTS.length) * 100}%` }} />
                                <div className="h-full bg-warning transition-all" style={{ width: `${(estimated / EXPECTED_FACTS.length) * 100}%` }} />
                            </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-success" />{confirmed} confirmed</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-warning" />{estimated} estimated</span>
                            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />{missing} missing</span>
                        </div>
                    </div>
                </div>

                {criticalMissing.length > 0 && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {criticalMissing.length} critical fact{criticalMissing.length > 1 ? 's' : ''} missing
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {criticalMissing.map((f) => f.label).join(', ')} — needed for returns and valuation calculations.
                            </p>
                        </div>
                    </div>
                )}

                {categories.map((category) => {
                    const items = statuses.filter((s) => s.category === category)
                    const catConfirmed = items.filter((s) => s.status === 'confirmed').length
                    return (
                        <div key={category}>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[category]}</p>
                                <span className="text-xs text-muted-foreground">{catConfirmed}/{items.length}</span>
                            </div>
                            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                {items.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        disabled={item.status === 'missing'}
                                        onClick={() => {
                                            if (item.status !== 'missing') {
                                                onOpenEvidence?.(buildFactEvidence({ field: item.key, title: `${item.label} evidence`, facts, documents }))
                                            }
                                        }}
                                        className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors enabled:hover:border-primary/40 disabled:opacity-60"
                                    >
                                        {item.status === 'confirmed' ? (
                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                                        ) : item.status === 'estimated' ? (
                                            <CircleAlert className="h-4 w-4 shrink-0 text-warning" />
                                        ) : (
                                            <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                                        )}
                                        <span className={item.status === 'missing' ? 'text-muted-foreground' : 'text-foreground'}>{item.label}</span>
                                        {item.critical && item.status === 'missing' && <Badge variant="destructive" className="ml-auto text-[9px]">Required</Badge>}
                                        {item.status === 'confirmed' && <Badge variant="success" className="ml-auto text-[9px]">Confirmed</Badge>}
                                        {item.status === 'estimated' && <Badge variant="warning" className="ml-auto text-[9px]">Estimated</Badge>}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })}

                <p className="text-xs text-muted-foreground">
                    Facts populate as documents complete analysis. Click any confirmed or estimated fact to see its source evidence.
                </p>
            </CardContent>
        </Card>
    )
}
