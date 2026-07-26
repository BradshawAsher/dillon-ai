import { CheckCircle2, Circle, FileQuestion } from 'lucide-react'

import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    documents: SubmissionHistoryItem[]
}

const EXPECTED_CATEGORIES = [
    { key: 'income_statement', label: 'Income Statement / P&L' },
    { key: 'balance_sheet', label: 'Balance Sheet' },
    { key: 'cash_flow', label: 'Cash Flow Statement' },
    { key: 'tax_return', label: 'Tax Returns' },
    { key: 'accounts_receivable', label: 'Accounts Receivable Aging' },
    { key: 'customer_list', label: 'Customer List / Contracts' },
    { key: 'employee', label: 'Employee / Payroll Data' },
    { key: 'lease', label: 'Lease / Real Estate' },
    { key: 'legal', label: 'Legal / Compliance' },
    { key: 'operational', label: 'Operational Metrics' },
]

function matchesCategory(doc: SubmissionHistoryItem, categoryKey: string): boolean {
    const docType = (doc.detectedDocumentType || doc.documentType || '').toLowerCase()
    const allTypes = doc.detectedDocumentTypesJson ? (JSON.parse(doc.detectedDocumentTypesJson) as string[]).join(' ').toLowerCase() : ''
    const combined = `${docType} ${allTypes} ${doc.fileName.toLowerCase()}`

    switch (categoryKey) {
        case 'income_statement': return combined.includes('income') || combined.includes('p&l') || combined.includes('profit') || combined.includes('loss') || combined.includes('revenue')
        case 'balance_sheet': return combined.includes('balance') || combined.includes('asset') || combined.includes('liabilit')
        case 'cash_flow': return combined.includes('cash flow') || combined.includes('cashflow')
        case 'tax_return': return combined.includes('tax') || combined.includes('1120') || combined.includes('schedule')
        case 'accounts_receivable': return combined.includes('receivable') || combined.includes('aging') || combined.includes('ar ')
        case 'customer_list': return combined.includes('customer') || combined.includes('client') || combined.includes('contract')
        case 'employee': return combined.includes('employee') || combined.includes('payroll') || combined.includes('staff') || combined.includes('team')
        case 'lease': return combined.includes('lease') || combined.includes('real estate') || combined.includes('property')
        case 'legal': return combined.includes('legal') || combined.includes('compliance') || combined.includes('litigation') || combined.includes('regulatory')
        case 'operational': return combined.includes('operational') || combined.includes('kpi') || combined.includes('metric')
        default: return false
    }
}

export default function DocumentCoverageMatrix({ documents }: Props) {
    const coverage = EXPECTED_CATEGORIES.map(cat => ({
        ...cat,
        covered: documents.some(doc => matchesCategory(doc, cat.key)),
        docCount: documents.filter(doc => matchesCategory(doc, cat.key)).length,
    }))

    const coveredCount = coverage.filter(c => c.covered).length
    const percentage = Math.round((coveredCount / EXPECTED_CATEGORIES.length) * 100)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileQuestion className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-semibold">Document coverage</CardTitle>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{coveredCount}/{EXPECTED_CATEGORIES.length} ({percentage}%)</span>
                </div>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-5">
                    {coverage.map(cat => (
                        <div key={cat.key} className="flex items-center gap-1.5" title={cat.covered ? `${cat.docCount} document${cat.docCount > 1 ? 's' : ''}` : 'Not yet uploaded'}>
                            {cat.covered
                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                                : <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                            }
                            <span className={`text-[11px] leading-tight ${cat.covered ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {cat.label}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
