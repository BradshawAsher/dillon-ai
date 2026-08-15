import { useMemo } from 'react'
import { Scale } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import CardExplainerPopover from './CardExplainerPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem
}

function money(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
    return `$${val.toFixed(0)}`
}

type Scenario = {
    label: string
    valuation: number
    probability: number
    color: string
    bgColor: string
    description: string
}

export default function RiskAdjustedValuationCard({ model, synthesis }: Props) {
    const result = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!ebitda || !price) return null

        const redCount = synthesis?.redFlags?.length ?? 0
        const bearMult = Math.max(2.0, (price / ebitda) * 0.7)
        const baseMult = price / ebitda
        const bullMult = baseMult * 1.3

        const bear: Scenario = {
            label: 'Bear',
            valuation: ebitda * bearMult,
            probability: redCount >= 3 ? 35 : redCount >= 1 ? 25 : 15,
            color: 'text-red-600',
            bgColor: 'bg-red-500',
            description: redCount > 0
                ? `Red flags materialize: ${synthesis?.redFlags?.slice(0, 1).join('; ') || 'risks confirmed'}`
                : 'Growth stalls, margins compress, requires price renegotiation',
        }

        const bull: Scenario = {
            label: 'Bull',
            valuation: ebitda * bullMult,
            probability: redCount >= 3 ? 15 : redCount >= 1 ? 25 : 35,
            color: 'text-green-600',
            bgColor: 'bg-green-500',
            description: synthesis?.greenFlags?.length
                ? `Upside confirmed: ${synthesis.greenFlags.slice(0, 1).join('; ')}`
                : 'Revenue growth accelerates, margin expansion, multiple expansion at exit',
        }

        const base: Scenario = {
            label: 'Base',
            valuation: ebitda * baseMult,
            probability: 100 - bear.probability - bull.probability,
            color: 'text-blue-600',
            bgColor: 'bg-blue-500',
            description: 'Current trajectory continues with moderate growth assumptions',
        }

        const expectedValue = (bear.valuation * bear.probability + base.valuation * base.probability + bull.valuation * bull.probability) / 100
        const askingVsExpected = ((price - expectedValue) / expectedValue) * 100

        return { scenarios: [bear, base, bull], expectedValue, askingVsExpected, maxVal: bull.valuation }
    }, [model, synthesis])

    if (!result) return null

    const { scenarios, expectedValue, askingVsExpected, maxVal } = result
    const price = model.purchasePrice ?? model.askingPrice ?? 0

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Scale className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Risk-adjusted valuation</CardTitle>
                        <CardExplainerPopover
                            title="Risk-Adjusted Valuation"
                            whatIsIt="A decision-science valuation model that estimates intrinsic enterprise value by weighting Bear, Base, and Bull operational scenarios against the deal's diligence findings."
                            howItWorks="Scenario probabilities automatically adjust dynamically based on documented red and green flags extracted from the deal's VDR data room."
                            whyItMatters="Protects buyers from paying full multiple value on a deal when substantial downside operational risks or key-person dependencies remain unhedged."
                        />
                    </div>
                    <Badge variant="outline">Probability-weighted</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {scenarios.map(s => (
                    <div key={s.label} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${s.color}`}>{s.label}</span>
                                <span className="text-xs text-muted-foreground">{s.probability}% probability</span>
                            </div>
                            <span className={`text-sm font-bold ${s.color}`}>{money(s.valuation)}</span>
                        </div>
                        <div className="h-4 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-4 rounded-full ${s.bgColor} transition-all`}
                                style={{ width: `${(s.valuation / maxVal) * 100}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{s.description}</p>
                    </div>
                ))}

                <div className="rounded-lg border border-border bg-muted/20 p-3 mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Expected Value</span>
                        <span className="text-sm font-bold text-foreground">{money(expectedValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Asking vs Expected</span>
                        <span className={`text-sm font-bold ${askingVsExpected > 10 ? 'text-red-600' : askingVsExpected < -10 ? 'text-green-600' : 'text-foreground'}`}>
                            {askingVsExpected > 0 ? '+' : ''}{askingVsExpected.toFixed(1)}%
                        </span>
                    </div>
                    {price > 0 && (
                        <p className="text-[10px] text-muted-foreground">
                            {askingVsExpected > 15 ? `Asking price is above the bull case — likely overpriced.` :
                             askingVsExpected > 5 ? `Asking price above expected value — negotiate down.` :
                             askingVsExpected < -10 ? `Asking price below expected value — attractive entry.` :
                             `Asking price roughly in line with expected value.`}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
