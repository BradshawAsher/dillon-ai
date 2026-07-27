import { useMemo } from 'react'
import { ShieldCheck } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
}

type ChecklistItem = {
    label: string
    status: 'verified' | 'needs-review'
    detail: string
}

export default function SecondOpinionCard({ model, synthesis }: Props) {
    const checklist = useMemo((): ChecklistItem[] | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const hasRevenue = typeof facts.revenue?.value === 'number'
        const hasEbitda = typeof facts.ebitda_sde?.value === 'number'

        if (!hasRevenue && !hasEbitda && !synthesis) return null

        const allFlags = synthesis
            ? [...synthesis.redFlags, ...synthesis.yellowFlags, ...synthesis.greenFlags].join(' ').toLowerCase()
            : ''
        const allQuestions = synthesis
            ? synthesis.openQuestions.join(' ').toLowerCase()
            : ''

        // Count documented facts to check for multiple document sources
        const factKeys = Object.keys(facts)
        const hasMultipleDocs = factKeys.length >= 3

        const items: ChecklistItem[] = [
            {
                label: 'Cross-reference revenue against tax returns',
                status: hasMultipleDocs && hasRevenue ? 'verified' : 'needs-review',
                detail: hasMultipleDocs && hasRevenue
                    ? 'Multiple documents uploaded with revenue data'
                    : 'Upload tax returns to cross-reference',
            },
            {
                label: 'Verify add-backs with supporting documentation',
                status: allFlags.includes('add-back') || allFlags.includes('addback') ? 'verified' : 'needs-review',
                detail: allFlags.includes('add-back') || allFlags.includes('addback')
                    ? 'Add-backs referenced in synthesis findings'
                    : 'No add-back documentation detected',
            },
            {
                label: 'Confirm customer concentration data',
                status: allFlags.includes('concentration') || allFlags.includes('customer') ? 'verified' : 'needs-review',
                detail: allFlags.includes('concentration') || allFlags.includes('customer')
                    ? 'Customer data referenced in findings'
                    : 'Customer concentration data not confirmed',
            },
            {
                label: 'Validate working capital needs',
                status: model.workingCapitalRequirement !== null && model.workingCapitalRequirement !== undefined
                    ? 'verified' : 'needs-review',
                detail: model.workingCapitalRequirement !== null && model.workingCapitalRequirement !== undefined
                    ? `Working capital set: $${Math.round(model.workingCapitalRequirement).toLocaleString()}`
                    : 'Working capital requirement not specified',
            },
            {
                label: 'Review lease/contract obligations',
                status: 'needs-review',
                detail: 'Manual review recommended',
            },
            {
                label: 'Confirm employee cost structure',
                status: 'needs-review',
                detail: 'Manual review recommended',
            },
            {
                label: 'Verify inventory valuation method',
                status: 'needs-review',
                detail: 'Manual review recommended',
            },
            {
                label: 'Check accounts receivable aging',
                status: 'needs-review',
                detail: 'Manual review recommended',
            },
        ]

        return items
    }, [model, synthesis])

    if (!checklist) return null

    const verifiedCount = checklist.filter(item => item.status === 'verified').length
    const completeness = Math.round((verifiedCount / checklist.length) * 100)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Independent review checklist</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Verification steps for second-pass independent review
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Completeness bar */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-foreground">Verification completeness</span>
                        <span className="text-xs font-bold text-foreground">{completeness}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${completeness}%` }}
                        />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                        {verifiedCount} of {checklist.length} checks verified
                    </div>
                </div>

                {/* Checklist items */}
                <div className="space-y-1.5">
                    {checklist.map((item) => (
                        <div
                            key={item.label}
                            className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-2.5"
                        >
                            <div className={`mt-0.5 h-4 w-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                                item.status === 'verified'
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-amber-100 text-amber-600'
                            }`}>
                                {item.status === 'verified' ? (
                                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-foreground">{item.label}</div>
                                <div className="text-[10px] text-muted-foreground">{item.detail}</div>
                            </div>
                            <span className={`text-[10px] font-medium whitespace-nowrap ${
                                item.status === 'verified' ? 'text-green-600' : 'text-amber-600'
                            }`}>
                                {item.status === 'verified' ? 'Verified' : 'Needs review'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Note */}
                <div className="rounded-lg bg-muted/50 p-3 border border-dashed border-border">
                    <p className="text-[10px] text-muted-foreground">
                        Full independent LLM review coming soon — these checks can be automated
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
