import { useMemo, useState } from 'react'
import { Check, Copy, MessageSquareText } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    synthesis?: ProjectSynthesisItem
    model: DealModel
}

function generateQuestions(synthesis: ProjectSynthesisItem | undefined, model: DealModel): string[] {
    const questions: string[] = []
    if (!synthesis) return ['What are the trailing 12-month revenue and EBITDA figures?']

    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const hasRevenue = typeof facts.revenue?.value === 'number'
    const hasEbitda = typeof facts.ebitda_sde?.value === 'number'

    for (const flag of synthesis.redFlags.slice(0, 3)) {
        const lower = flag.toLowerCase()
        if (lower.includes('customer') || lower.includes('concentration')) {
            questions.push('Can you provide a customer revenue breakdown showing the top 10 customers by revenue contribution and their contract renewal dates?')
        } else if (lower.includes('decline') || lower.includes('decreasing')) {
            questions.push('What is driving the revenue/margin decline, and what steps have been taken to address it?')
        } else if (lower.includes('owner') || lower.includes('key person')) {
            questions.push('What does the typical day-to-day look like for the owner, and which responsibilities could be delegated or documented for a transition?')
        } else if (lower.includes('legal') || lower.includes('lawsuit') || lower.includes('regulatory')) {
            questions.push('Are there any pending or threatened legal matters, regulatory actions, or compliance issues we should be aware of?')
        } else if (lower.includes('debt') || lower.includes('liability')) {
            questions.push('Can you provide a complete schedule of all debt obligations, including balances, rates, maturity dates, and any personal guarantees?')
        } else {
            questions.push(`Can you provide documentation or context regarding: "${flag.length > 80 ? flag.slice(0, 77) + '...' : flag}"?`)
        }
    }

    for (const q of (synthesis.openQuestions ?? []).slice(0, 2)) {
        if (!questions.some(existing => existing.toLowerCase().includes(q.toLowerCase().slice(0, 20)))) {
            questions.push(q.endsWith('?') ? q : `${q}?`)
        }
    }

    if (!hasRevenue) {
        questions.push('Can you provide the trailing 12-month P&L statement showing gross revenue, cost of goods sold, and operating expenses?')
    }
    if (!hasEbitda) {
        questions.push('What is the current owner\'s discretionary earnings (SDE/EBITDA), including a breakdown of add-backs?')
    }

    if (questions.length < 3) {
        questions.push('What are the key growth opportunities you see that a new owner could capitalize on in the first 12 months?')
    }

    const seen = new Set<string>()
    return questions.filter(q => {
        const key = q.toLowerCase().slice(0, 40)
        if (seen.has(key)) return false
        seen.add(key)
        return true
    }).slice(0, 5)
}

export default function SellerQuestionsCard({ synthesis, model }: Props) {
    const [copied, setCopied] = useState(false)
    const questions = useMemo(() => generateQuestions(synthesis, model), [synthesis, model])

    if (questions.length === 0) return null

    const handleCopy = () => {
        const text = questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquareText className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Questions for seller</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">{questions.length} questions</Badge>
                        <button
                            onClick={handleCopy}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Copy all questions"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {questions.map((q, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {i + 1}
                            </span>
                            <p className="text-sm text-foreground">{q}</p>
                        </div>
                    ))}
                </div>
                <p className="mt-3 text-[10px] text-muted-foreground">Auto-generated from red flags, open questions, and missing data. Copy and send to the seller or broker.</p>
            </CardContent>
        </Card>
    )
}
