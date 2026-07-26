import { useMemo, useState } from 'react'
import { Check, Copy, Mail } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

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

export default function DealEmailDraftCard({ model, synthesis, projectName }: Props) {
    const [copied, setCopied] = useState(false)

    const email = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice
        const multiple = price && ebitda ? (price / ebitda).toFixed(1) : null
        const signal = synthesis?.finalTrafficLight
        const redCount = synthesis?.redFlags?.length ?? 0

        const subject = `Deal Update: ${projectName || 'Target'} — ${signal === 'GREEN' ? 'Proceed' : signal === 'RED' ? 'Concerns Identified' : 'Under Review'}`

        const lines: string[] = []
        lines.push(`Hi team,\n`)
        lines.push(`Quick update on ${projectName || 'the target'}:\n`)

        lines.push(`KEY METRICS:`)
        if (revenue) lines.push(`• Revenue: ${money(revenue)}`)
        if (ebitda) lines.push(`• EBITDA/SDE: ${money(ebitda)}${revenue ? ` (${((ebitda / revenue) * 100).toFixed(0)}% margin)` : ''}`)
        if (price) lines.push(`• Price: ${money(price)}${multiple ? ` (${multiple}x)` : ''}`)
        lines.push('')

        lines.push(`STATUS: ${signal === 'GREEN' ? '🟢 Green — recommend proceeding' : signal === 'RED' ? '🔴 Red — significant concerns' : signal === 'YELLOW' ? '🟡 Yellow — conditional proceed' : '⚪ Pending synthesis'}`)
        if (redCount > 0) {
            lines.push(`\nTOP CONCERNS (${redCount}):`)
            synthesis?.redFlags.slice(0, 3).forEach(f => lines.push(`• ${f}`))
        }
        if (synthesis?.negotiationLevers?.length) {
            lines.push(`\nNEGOTIATION LEVERS:`)
            synthesis.negotiationLevers.slice(0, 3).forEach(l => lines.push(`• ${l}`))
        }

        lines.push(`\nNEXT STEPS:`)
        if (!synthesis) lines.push(`• Complete document upload and synthesis`)
        else if (redCount > 0) lines.push(`• Schedule management call to address red flags`)
        else lines.push(`• Move to detailed due diligence / LOI`)
        lines.push('')
        lines.push(`Full analysis available in MergeWorks dashboard.`)
        lines.push(`\n— Sent via MergeWorks DD Dashboard`)

        return { subject, body: lines.join('\n') }
    }, [model, synthesis, projectName])

    const handleCopy = () => {
        navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Team update draft</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary">Email ready</Badge>
                        <button
                            onClick={handleCopy}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            title="Copy email to clipboard"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="text-[10px] font-bold text-muted-foreground mb-1">Subject: {email.subject}</p>
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{email.body}</pre>
                </div>
            </CardContent>
        </Card>
    )
}
