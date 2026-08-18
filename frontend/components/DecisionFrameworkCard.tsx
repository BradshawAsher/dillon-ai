import { useMemo } from 'react'
import { CheckCircle2, HelpCircle, XCircle } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

type CriterionResult = {
    question: string
    answer: 'yes' | 'no' | 'unknown'
    explanation: string
}

export default function DecisionFrameworkCard({ model, synthesis }: Props) {
    const criteria = useMemo(() => {
        const results: CriterionResult[] = []
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const redCount = synthesis?.redFlags?.length ?? 0

        // Can I afford it?
        if (!price) {
            results.push({ question: 'Can I afford this deal?', answer: 'unknown', explanation: 'Set the asking/purchase price to evaluate affordability.' })
        } else if (ebitda && price / ebitda <= 5) {
            results.push({ question: 'Can I afford this deal?', answer: 'yes', explanation: `At ${(price / ebitda).toFixed(1)}x EBITDA, payback is achievable within a standard hold period.` })
        } else if (ebitda && price / ebitda > 5) {
            results.push({ question: 'Can I afford this deal?', answer: 'no', explanation: `At ${(price / ebitda).toFixed(1)}x EBITDA, the entry multiple stretches affordability. Negotiate or confirm growth thesis.` })
        } else {
            results.push({ question: 'Can I afford this deal?', answer: 'unknown', explanation: 'EBITDA not yet confirmed — upload financial statements to assess.' })
        }

        // Is the business healthy?
        if (!revenue || !ebitda) {
            results.push({ question: 'Is the business fundamentally healthy?', answer: 'unknown', explanation: 'Revenue and EBITDA data needed to assess business health.' })
        } else {
            const margin = (ebitda / revenue) * 100
            if (margin >= 15 && redCount <= 2) {
                results.push({ question: 'Is the business fundamentally healthy?', answer: 'yes', explanation: `${margin.toFixed(0)}% margin with ${redCount === 0 ? 'no' : 'manageable'} red flags indicates sound fundamentals.` })
            } else if (margin < 10 || redCount > 4) {
                results.push({ question: 'Is the business fundamentally healthy?', answer: 'no', explanation: `${margin.toFixed(0)}% margin${redCount > 4 ? ` and ${redCount} red flags` : ''} — operational concerns need resolution.` })
            } else {
                results.push({ question: 'Is the business fundamentally healthy?', answer: 'yes', explanation: `${margin.toFixed(0)}% margin is acceptable. ${redCount} flag${redCount !== 1 ? 's' : ''} should be investigated but aren't deal-breaking.` })
            }
        }

        // Can I grow it?
        if (!synthesis) {
            results.push({ question: 'Can I grow or improve this business?', answer: 'unknown', explanation: 'Complete synthesis needed to identify growth opportunities.' })
        } else if (synthesis.greenFlags && synthesis.greenFlags.length >= 2 && synthesis.negotiationLevers && synthesis.negotiationLevers.length >= 1) {
            results.push({ question: 'Can I grow or improve this business?', answer: 'yes', explanation: `${synthesis.greenFlags.length} positive signals and ${synthesis.negotiationLevers.length} lever${synthesis.negotiationLevers.length > 1 ? 's' : ''} suggest improvement potential.` })
        } else if (synthesis.finalTrafficLight === 'RED') {
            results.push({ question: 'Can I grow or improve this business?', answer: 'no', explanation: 'High-risk profile suggests fundamental issues that may limit upside potential.' })
        } else {
            results.push({ question: 'Can I grow or improve this business?', answer: 'unknown', explanation: 'Mixed signals — more diligence needed to assess growth potential.' })
        }

        // Do I understand the risks?
        if (!synthesis) {
            results.push({ question: 'Do I understand all material risks?', answer: 'unknown', explanation: 'Synthesis not complete — risks cannot be fully assessed yet.' })
        } else if (synthesis.openQuestions && synthesis.openQuestions.length > 3) {
            results.push({ question: 'Do I understand all material risks?', answer: 'no', explanation: `${synthesis.openQuestions.length} open questions remain. Request additional documentation.` })
        } else if (synthesis.openQuestions && synthesis.openQuestions.length <= 1 && synthesis.documentsCompletedCount >= 3) {
            results.push({ question: 'Do I understand all material risks?', answer: 'yes', explanation: `${synthesis.documentsCompletedCount} documents analyzed with ${synthesis.openQuestions?.length ?? 0} unresolved questions. Good visibility.` })
        } else {
            results.push({ question: 'Do I understand all material risks?', answer: 'unknown', explanation: `${synthesis.openQuestions?.length ?? 0} open question${synthesis.openQuestions?.length !== 1 ? 's' : ''} — additional documents would improve confidence.` })
        }

        return results
    }, [model, synthesis])

    const yesCount = criteria.filter(c => c.answer === 'yes').length
    const verdict = yesCount === criteria.length ? 'Proceed' : yesCount >= criteria.length - 1 ? 'Conditional proceed' : yesCount >= 2 ? 'Needs work' : 'Not ready'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Decision framework</CardTitle>
                        <CardInfoPopover cardId="decision-framework" />
                    </div>
                    <Badge variant={yesCount === criteria.length ? 'success' : yesCount >= 2 ? 'warning' : 'destructive'}>
                        {verdict}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {criteria.map((criterion, i) => (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                            {criterion.answer === 'yes' ? (
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                            ) : criterion.answer === 'no' ? (
                                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                            ) : (
                                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                            )}
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{criterion.question}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{criterion.explanation}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
