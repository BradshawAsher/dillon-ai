import { ClipboardList, Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documents: SubmissionHistoryItem[]
    projectName: string
}

type RequestItem = {
    category: string
    request: string
    priority: 'required' | 'important' | 'nice-to-have'
    reason: string
}

const STANDARD_DOC_CATEGORIES = [
    { type: 'P&L', category: 'Financial', request: '3 years of profit & loss statements (audited or tax-return backed)', reason: 'Required to verify revenue trends and margins' },
    { type: 'Balance Sheet', category: 'Financial', request: 'Balance sheet as of most recent quarter-end', reason: 'Needed for working capital and asset valuation' },
    { type: 'Cash Flow', category: 'Financial', request: 'Statement of cash flows for the trailing 12 months', reason: 'Validates operating cash generation vs. reported earnings' },
    { type: 'Tax Returns', category: 'Financial', request: '3 years of business tax returns (1120/1120S/1065)', reason: 'Independent verification of reported financials' },
    { type: 'AR Aging', category: 'Operational', request: 'Accounts receivable aging report', reason: 'Assesses collection risk and customer payment behavior' },
    { type: 'Customer List', category: 'Operational', request: 'Revenue by customer (top 10 or all if <50)', reason: 'Required to assess customer concentration risk' },
    { type: 'Employee Data', category: 'People', request: 'Employee roster with roles, tenure, compensation', reason: 'Key person risk and compensation benchmarking' },
    { type: 'Lease/RE', category: 'Legal', request: 'Copy of facility lease or ownership documents', reason: 'Transfer/assignment considerations in deal structure' },
    { type: 'Legal', category: 'Legal', request: 'List of all contracts, licenses, and pending litigation', reason: 'Identifies transfer restrictions and legal exposure' },
]

export default function DDRequestListCard({ model, synthesis, documents, projectName }: Props) {
    const [copied, setCopied] = useState(false)
    const [expanded, setExpanded] = useState(false)
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const hasRevenue = facts.revenue?.status === 'confirmed'
    const hasEbitda = facts.ebitda_sde?.status === 'confirmed'

    const completedTypes = new Set(
        documents
            .filter(d => d.status === 'completed')
            .flatMap(d => {
                const types: string[] = []
                if (d.documentType) types.push(d.documentType)
                return types
            })
    )

    const requests: RequestItem[] = []

    STANDARD_DOC_CATEGORIES.forEach(doc => {
        const hasDoc = completedTypes.has(doc.type) ||
            Array.from(completedTypes).some(t => t.toLowerCase().includes(doc.type.toLowerCase()))
        if (!hasDoc) {
            requests.push({
                category: doc.category,
                request: doc.request,
                priority: ['P&L', 'Tax Returns', 'Balance Sheet'].includes(doc.type) ? 'required' : 'important',
                reason: doc.reason,
            })
        }
    })

    if (synthesis?.openQuestions?.length) {
        synthesis.openQuestions.slice(0, 4).forEach(q => {
            requests.push({
                category: 'Clarification',
                request: q,
                priority: 'important',
                reason: 'Open question from document analysis',
            })
        })
    }

    if (synthesis?.missingDocuments?.length) {
        synthesis.missingDocuments.forEach(doc => {
            const alreadyListed = requests.some(r => r.request.toLowerCase().includes(doc.toLowerCase()))
            if (!alreadyListed) {
                requests.push({
                    category: 'AI-identified',
                    request: doc,
                    priority: 'important',
                    reason: 'Identified as needed by AI synthesis',
                })
            }
        })
    }

    if (!hasRevenue && !requests.some(r => r.request.toLowerCase().includes('p&l'))) {
        requests.push({
            category: 'Financial',
            request: 'Income statement or P&L for most recent fiscal year',
            priority: 'required',
            reason: 'Revenue not yet confirmed — essential for valuation',
        })
    }

    if (!hasEbitda && hasRevenue) {
        requests.push({
            category: 'Financial',
            request: 'Add-back schedule or seller discretionary earnings worksheet',
            priority: 'required',
            reason: 'EBITDA/SDE needed for entry multiple calculation',
        })
    }

    const sortedRequests = [...requests].sort((a, b) => {
        const pOrder = { required: 0, important: 1, 'nice-to-have': 2 }
        return pOrder[a.priority] - pOrder[b.priority]
    })

    const buildText = useCallback(() => {
        const lines: string[] = []
        lines.push(`DUE DILIGENCE REQUEST LIST`)
        lines.push(`Project: ${projectName}`)
        lines.push(`Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`)
        lines.push(`Items: ${sortedRequests.length}`)
        lines.push('')
        let num = 1
        const grouped = sortedRequests.reduce<Record<string, RequestItem[]>>((acc, r) => {
            if (!acc[r.category]) acc[r.category] = []
            acc[r.category].push(r)
            return acc
        }, {})
        Object.entries(grouped).forEach(([cat, items]) => {
            lines.push(`--- ${cat.toUpperCase()} ---`)
            items.forEach(item => {
                lines.push(`${num}. [${item.priority.toUpperCase()}] ${item.request}`)
                lines.push(`   Reason: ${item.reason}`)
                num++
            })
            lines.push('')
        })
        lines.push('Generated by MergeWorks Due Diligence Dashboard')
        return lines.join('\n')
    }, [sortedRequests, projectName])

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(buildText())
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [buildText])

    if (sortedRequests.length === 0) return null

    const priorityColors = {
        required: 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
        important: 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        'nice-to-have': 'text-muted-foreground border-border',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">DD request list</CardTitle>
                        </div>
                        <CardDescription className="mt-1">{sortedRequests.length} items to request from seller based on gaps in current documentation.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                        {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy list'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div className="space-y-2">
                    {(expanded ? sortedRequests : sortedRequests.slice(0, 8)).map((item, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-lg border border-border p-3">
                            <span className="mt-0.5 shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{i + 1}</span>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground">{item.request}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{item.reason}</p>
                            </div>
                            <Badge variant="outline" className={`shrink-0 text-[9px] ${priorityColors[item.priority]}`}>
                                {item.priority}
                            </Badge>
                        </div>
                    ))}
                    {sortedRequests.length > 8 && (
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1.5 text-xs font-medium text-primary hover:underline transition-colors focus:outline-none"
                        >
                            {expanded ? 'Show less items' : `+${sortedRequests.length - 8} more items — click to show all`}
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
