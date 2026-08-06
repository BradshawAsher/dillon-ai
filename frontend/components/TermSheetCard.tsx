import { useState, useMemo } from 'react'
import { FileText, Copy, Check } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { normalizeEquityFraction } from '../utils/dealMath'
import { copyToClipboard } from '../utils/clipboard'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    projectName: string
}

export default function TermSheetCard({ model, synthesis, projectName }: Props) {
    const [copied, setCopied] = useState(false)

    const termSheet = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price) return null

        const equityPct = Math.round(normalizeEquityFraction(model.equityContributionPercent) * 100)
        const equity = price * (equityPct / 100)
        const sellerNote = model.sellerNoteAmount ?? 0
        const seniorDebt = price - equity - sellerNote
        const rate = model.interestRate ? `${(model.interestRate * 100).toFixed(1)}%` : '7.0%'
        const term = model.amortizationYears ?? 10
        const holdPeriod = model.holdPeriodYears ?? 5

        const lines: { label: string; value: string }[] = [
            { label: 'Target', value: projectName || 'Undisclosed' },
            { label: 'Purchase Price', value: `$${price.toLocaleString()}` },
        ]

        if (ebitda) {
            lines.push({ label: 'Trailing EBITDA/SDE', value: `$${ebitda.toLocaleString()}` })
            lines.push({ label: 'Entry Multiple', value: `${(price / ebitda).toFixed(1)}x EBITDA` })
        }
        if (revenue) {
            lines.push({ label: 'Trailing Revenue', value: `$${revenue.toLocaleString()}` })
        }

        lines.push({ label: '', value: '' })
        lines.push({ label: 'FINANCING STRUCTURE', value: '' })
        lines.push({ label: 'Buyer Equity', value: `$${Math.round(equity).toLocaleString()} (${equityPct}%)` })
        if (seniorDebt > 0) {
            lines.push({ label: 'Senior Debt', value: `$${Math.round(seniorDebt).toLocaleString()} at ${rate}, ${term}-year term` })
        }
        if (sellerNote > 0) {
            lines.push({ label: 'Seller Note', value: `$${Math.round(sellerNote).toLocaleString()}` })
        }

        lines.push({ label: '', value: '' })
        lines.push({ label: 'KEY TERMS', value: '' })
        lines.push({ label: 'Hold Period', value: `${holdPeriod} years` })
        if (model.transactionFees) {
            lines.push({ label: 'Transaction Fees', value: `$${model.transactionFees.toLocaleString()}` })
        }
        if (model.workingCapitalRequirement) {
            lines.push({ label: 'Working Capital', value: `$${model.workingCapitalRequirement.toLocaleString()}` })
        }

        lines.push({ label: '', value: '' })
        lines.push({ label: 'CONDITIONS', value: '' })
        lines.push({ label: 'Due Diligence Period', value: '45-60 days' })
        lines.push({ label: 'Non-Compete', value: '3-5 years, geographic scope TBD' })
        lines.push({ label: 'Transition Support', value: '90 days minimum' })

        if (synthesis && synthesis.redFlags.length > 0) {
            lines.push({ label: '', value: '' })
            lines.push({ label: 'OPEN ISSUES', value: '' })
            synthesis.redFlags.slice(0, 3).forEach((flag, i) => {
                lines.push({ label: `Issue ${i + 1}`, value: flag.slice(0, 80) })
            })
        }

        const text = lines.map(l => {
            if (!l.label && !l.value) return ''
            if (!l.value) return `\n--- ${l.label} ---`
            return `${l.label}: ${l.value}`
        }).join('\n')

        return { lines, text }
    }, [model, synthesis, projectName])

    if (!termSheet) return null

    const handleCopy = async () => {
        if (await copyToClipboard(termSheet.text)) {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Term sheet summary</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5 text-xs">
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    Draft term sheet from saved assumptions and documented facts
                </p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs space-y-0.5 max-h-[400px] overflow-y-auto">
                    {termSheet.lines.map((line, i) => {
                        if (!line.label && !line.value) return <div key={i} className="h-2" />
                        if (!line.value) return (
                            <p key={i} className="font-bold text-primary pt-2 text-[10px] uppercase tracking-wider">
                                {line.label}
                            </p>
                        )
                        return (
                            <div key={i} className="flex gap-2">
                                <span className="text-muted-foreground shrink-0 w-[140px]">{line.label}:</span>
                                <span className="text-foreground font-medium">{line.value}</span>
                            </div>
                        )
                    })}
                </div>

                <p className="text-[10px] text-muted-foreground mt-3 text-center">
                    This is an illustrative draft based on saved model assumptions. Not a legal document.
                    Review with counsel before sending.
                </p>
            </CardContent>
        </Card>
    )
}
