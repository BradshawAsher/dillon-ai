import { useMemo, useState } from 'react'
import { BookOpen, Check, Copy } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { copyToClipboard } from '../utils/clipboard'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
    projectName: string
}

function money(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

export default function InvestmentThesisCard({ model, synthesis, projectName }: Props) {
    const [copied, setCopied] = useState(false)

    const thesis = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const multiple = price && ebitda ? price / ebitda : null
        const margin = revenue && ebitda ? (ebitda / revenue) * 100 : null
        const redCount = synthesis?.redFlags?.length ?? 0
        const greenCount = synthesis?.greenFlags?.length ?? 0
        const signal = synthesis?.finalTrafficLight

        const sentences: string[] = []

        // Sentence 1: What is this deal?
        const descriptors: string[] = []
        if (revenue) descriptors.push(`${money(revenue)} revenue`)
        if (margin) descriptors.push(`${margin.toFixed(0)}% EBITDA margin`)
        if (descriptors.length > 0) {
            sentences.push(`${projectName || 'This target'} is a business generating ${descriptors.join(' with ')}.`)
        } else {
            sentences.push(`${projectName || 'This target'} is a business under initial evaluation.`)
        }

        // Sentence 2: Why is it interesting?
        if (multiple && multiple <= 4) {
            sentences.push(`At ${multiple.toFixed(1)}x EBITDA (${money(price!)}), the entry price is below market medians, suggesting potential value creation through operational improvements or multiple expansion.`)
        } else if (multiple && multiple <= 6) {
            sentences.push(`At ${multiple.toFixed(1)}x EBITDA (${money(price!)}), the entry price reflects fair market value. Returns will depend on growth execution and exit timing.`)
        } else if (multiple) {
            sentences.push(`At ${multiple.toFixed(1)}x EBITDA (${money(price!)}), the entry premium requires a strong growth thesis or strategic synergy to justify.`)
        } else if (price) {
            sentences.push(`The asking price is ${money(price)}; EBITDA confirmation is needed to assess valuation multiples.`)
        } else {
            sentences.push(`Key financial data is still being gathered. Upload P&L statements and confirm the asking price for a complete thesis.`)
        }

        // Sentence 3: What's the risk/reward balance?
        if (signal === 'GREEN') {
            sentences.push(`The risk profile is favorable${greenCount > 0 ? ` with ${greenCount} positive signal${greenCount > 1 ? 's' : ''}` : ''} — this deal warrants advancing to detailed due diligence.`)
        } else if (signal === 'RED') {
            sentences.push(`Elevated risk (${redCount} red flag${redCount > 1 ? 's' : ''}) makes this deal a conditional proceed — resolution of key concerns is required before advancing.`)
        } else if (signal === 'YELLOW') {
            sentences.push(`Moderate risk (${redCount} flag${redCount > 1 ? 's' : ''}) — manageable with proper diligence. Focus on resolving open questions before committing.`)
        } else {
            sentences.push(`Risk assessment pending — complete the synthesis by uploading core financial documents.`)
        }

        return sentences.join(' ')
    }, [model, synthesis, projectName])

    if (!thesis) return null

    const handleCopy = async () => {
        if (await copyToClipboard(thesis)) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Investment thesis</CardTitle>
                        <CardInfoPopover cardId="investment-thesis" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">Auto-generated</Badge>
                        <button
                            onClick={handleCopy}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Copy thesis"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <p className="text-sm leading-relaxed text-foreground">{thesis}</p>
            </CardContent>
        </Card>
    )
}
