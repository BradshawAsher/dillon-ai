import { ArrowRight, FileUp, MessageCircleQuestion, Calculator, RefreshCw, CheckCircle2 } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import { parseDocumentedFacts } from '../utils/evidence'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documents: SubmissionHistoryItem[]
    onNavigate?: (target: string) => void
}

type ActionItem = {
    label: string
    description: string
    priority: 'high' | 'medium' | 'low'
    icon: React.ReactNode
    target?: string
}

export default function NextActionsCard({ model, synthesis, documents, onNavigate }: Props) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const hasRevenue = facts.revenue?.status === 'confirmed'
    const hasEbitda = facts.ebitda_sde?.status === 'confirmed'
    const hasPrice = model.askingPrice !== null || model.purchasePrice !== null
    const completedDocs = documents.filter(d => d.status === 'completed').length
    const hasSynthesis = !!synthesis?.finalJudgmentSummary

    const actions: ActionItem[] = []

    if (completedDocs === 0) {
        actions.push({
            label: 'Upload your first document',
            description: 'Upload a P&L, balance sheet, or tax return to start the analysis.',
            priority: 'high',
            icon: <FileUp className="h-4 w-4" />,
            target: 'upload',
        })
    } else if (!hasSynthesis && completedDocs > 0) {
        actions.push({
            label: 'Wait for synthesis to complete',
            description: `${completedDocs} doc${completedDocs > 1 ? 's' : ''} processed. Project synthesis runs automatically after processing.`,
            priority: 'medium',
            icon: <RefreshCw className="h-4 w-4" />,
            target: 'synthesis',
        })
    }

    if (!hasRevenue && completedDocs > 0) {
        actions.push({
            label: 'Upload income statement',
            description: 'Revenue hasn\'t been confirmed yet. A P&L or income statement will unlock valuation.',
            priority: 'high',
            icon: <FileUp className="h-4 w-4" />,
            target: 'upload',
        })
    }

    if (!hasEbitda && hasRevenue) {
        actions.push({
            label: 'Confirm EBITDA/SDE',
            description: 'EBITDA unlocks entry multiple, returns analysis, and deal structure calculations.',
            priority: 'high',
            icon: <Calculator className="h-4 w-4" />,
            target: 'valuation',
        })
    }

    if (!hasPrice && (hasRevenue || hasEbitda)) {
        actions.push({
            label: 'Set asking price',
            description: 'Enter the asking price to see your entry multiple and price premium/discount.',
            priority: 'medium',
            icon: <Calculator className="h-4 w-4" />,
            target: 'structure',
        })
    }

    if (hasSynthesis && synthesis && synthesis.openQuestions.length > 0) {
        actions.push({
            label: 'Resolve open questions',
            description: `${synthesis.openQuestions.length} question${synthesis.openQuestions.length > 1 ? 's' : ''} need answers from the seller or management.`,
            priority: 'medium',
            icon: <MessageCircleQuestion className="h-4 w-4" />,
            target: 'synthesis',
        })
    }

    if (hasSynthesis && synthesis && synthesis.missingDocuments.length > 0) {
        actions.push({
            label: 'Upload missing documents',
            description: `${synthesis.missingDocuments.length} document type${synthesis.missingDocuments.length > 1 ? 's' : ''} identified as needed for complete analysis.`,
            priority: 'medium',
            icon: <FileUp className="h-4 w-4" />,
            target: 'upload',
        })
    }

    if (hasSynthesis && hasPrice && hasEbitda && synthesis?.redFlags?.length === 0) {
        actions.push({
            label: 'Review returns analysis',
            description: 'Your deal model is ready. Check the Returns tab for MOIC, IRR, and payback.',
            priority: 'low',
            icon: <CheckCircle2 className="h-4 w-4" />,
            target: 'returns',
        })
    }

    const visible = actions.slice(0, 3)

    if (visible.length === 0) return null

    const priorityColors = {
        high: 'border-destructive/30 bg-destructive/5',
        medium: 'border-warning/30 bg-warning/5',
        low: 'border-success/30 bg-success/5',
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Recommended next steps</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pb-4">
                <div className="space-y-2">
                    {visible.map((action, i) => (
                        <button
                            key={i}
                            type="button"
                            className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 ${priorityColors[action.priority]}`}
                            onClick={() => action.target && onNavigate?.(action.target)}
                        >
                            <div className="mt-0.5 shrink-0 text-muted-foreground">{action.icon}</div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{action.label}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
                            </div>
                            <Badge variant="outline" className="shrink-0 text-[9px]">{action.priority}</Badge>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
