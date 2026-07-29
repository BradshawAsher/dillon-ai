import { useState } from 'react'
import { Handshake, ChevronDown, ChevronUp, DollarSign, Target } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'

type Props = {
    synthesis?: ProjectSynthesisItem
    model: DealModel
}

type PlaybookItem = {
    tactic: string
    source: string
    priority: 'high' | 'medium' | 'low'
    estimatedImpact: string
}

function buildPlaybook(synthesis: ProjectSynthesisItem, model: DealModel): PlaybookItem[] {
    const items: PlaybookItem[] = []
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const ebitda = facts.ebitda_sde?.value
    const price = model.askingPrice ?? model.purchasePrice

    for (const lever of (synthesis.negotiationLevers || [])) {
        const lower = lever.toLowerCase()
        let priority: 'high' | 'medium' | 'low' = 'medium'
        let impact = 'TBD'

        if (lower.includes('customer') || lower.includes('concentration')) {
            priority = 'high'
            impact = ebitda ? `${(ebitda * 0.5).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} discount justification` : '0.5x EBITDA discount'
        } else if (lower.includes('add-back') || lower.includes('addback') || lower.includes('adjustment')) {
            priority = 'high'
            impact = price ? `${(price * 0.05).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} reduction` : '5% price reduction'
        } else if (lower.includes('working capital') || lower.includes('inventory')) {
            priority = 'medium'
            impact = price ? `${(price * 0.03).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} adjustment` : '3% adjustment'
        } else if (lower.includes('earnout') || lower.includes('earn-out') || lower.includes('deferred')) {
            priority = 'medium'
            impact = price ? `${(price * 0.15).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} deferred` : '15% deferred to earnout'
        } else if (lower.includes('key person') || lower.includes('management') || lower.includes('retention')) {
            priority = 'medium'
            impact = 'Retention agreement or holdback'
        }

        items.push({ tactic: lever, source: 'Synthesis', priority, estimatedImpact: impact })
    }

    for (const flag of synthesis.redFlags.slice(0, 3)) {
        const lower = flag.toLowerCase()
        if (lower.includes('declin') || lower.includes('drop') || lower.includes('loss')) {
            items.push({ tactic: `Price reduction for: ${flag}`, source: 'Red flag', priority: 'high', estimatedImpact: ebitda ? `${(ebitda * 0.3).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} reduction` : '0.3x multiple reduction' })
        }
    }

    return items.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 }
        return order[a.priority] - order[b.priority]
    })
}

export default function NegotiationPlaybook({ synthesis, model }: Props) {
    const [expanded, setExpanded] = useState(false)

    if (!synthesis || !(synthesis.negotiationLevers?.length || synthesis.redFlags.length)) return null

    const playbook = buildPlaybook(synthesis, model)
    if (playbook.length === 0) return null

    const visible = expanded ? playbook : playbook.slice(0, 4)
    const priorityColors = { high: 'text-destructive', medium: 'text-amber-600 dark:text-amber-400', low: 'text-muted-foreground' }

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-card/80">
                <div className="flex items-center gap-2">
                    <Handshake className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base font-bold">Negotiation playbook</CardTitle>
                    <Badge variant="secondary" className="text-[10px]">{playbook.length} tactics</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="space-y-2">
                    {visible.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-md border border-border bg-background p-3.5">
                            <Target className={`mt-0.5 h-4 w-4 shrink-0 ${priorityColors[item.priority]}`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold leading-relaxed text-foreground">{item.tactic}</p>
                                <div className="mt-1.5 flex items-center gap-2">
                                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                        <DollarSign className="h-2.5 w-2.5" />{item.estimatedImpact}
                                    </span>
                                    <Badge variant="outline" className="text-[9px] px-1 py-0">{item.priority}</Badge>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {playbook.length > 4 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-md py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {playbook.length} tactics</>}
                    </button>
                )}
            </CardContent>
        </Card>
    )
}
