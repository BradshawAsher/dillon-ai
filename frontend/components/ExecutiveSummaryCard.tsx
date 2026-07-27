import { useMemo, useCallback } from 'react'
import { FileText } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Button } from '../lib/shadcn/button'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
    projectName: string
}

export default function ExecutiveSummaryCard({ model, synthesis, projectName }: Props) {
    const summary = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const margin = revenue && revenue > 0 ? Math.round((ebitda / revenue) * 100) : null
        const entryMult = (price / ebitda).toFixed(1)
        const holdYears = model.holdPeriodYears ?? 5
        const growth = model.baseRevenueGrowth ?? 0.05
        const exitMult = model.exitMultiple ?? 4.0
        const equity = model.equityAmount ?? (price - (model.seniorDebtAmount ?? 0) - (model.sellerNoteAmount ?? 0))

        const futureEbitda = ebitda * Math.pow(1 + growth, holdYears)
        const exitValue = futureEbitda * exitMult
        const moic = equity > 0 ? exitValue / equity : 0
        const irr = holdYears > 0 ? (Math.pow(moic, 1 / holdYears) - 1) * 100 : 0

        const fmt = (n: number) => {
            if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
            if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
            return `$${n.toLocaleString()}`
        }

        const redFlags = synthesis?.redFlags?.length ?? 0
        const greenFlags = synthesis?.greenFlags?.length ?? 0

        let s1 = `${projectName || 'This business'} is a ${revenue ? fmt(revenue) + ' revenue' : ''} company generating ${fmt(ebitda)} in EBITDA${margin ? ` (${margin}% margin)` : ''}, available at ${entryMult}x.`

        let s2: string
        if (redFlags === 0) {
            s2 = 'Risk profile is clean with no material red flags identified.'
        } else if (redFlags <= 2) {
            s2 = `The deal presents moderate risk with ${redFlags} red flag${redFlags > 1 ? 's' : ''} identified, offset by ${greenFlags} positive indicator${greenFlags !== 1 ? 's' : ''}.`
        } else {
            s2 = `Elevated risk profile: ${redFlags} red flags require attention before proceeding.`
        }

        let s3 = `At proposed terms, projected MOIC is ${moic.toFixed(1)}x over ${holdYears} years (${irr.toFixed(0)}% IRR).`

        let s4: string
        if (moic >= 2.5 && redFlags <= 2) {
            s4 = 'Recommend proceeding to LOI with standard diligence timeline.'
        } else if (moic >= 1.5) {
            s4 = 'Recommend continued diligence with focus on risk mitigation and price negotiation.'
        } else {
            s4 = 'Further analysis needed — returns profile does not meet target threshold at current terms.'
        }

        return `${s1} ${s2} ${s3} ${s4}`
    }, [model, synthesis, projectName])

    const handleCopy = useCallback(() => {
        if (summary) navigator.clipboard.writeText(summary)
    }, [summary])

    if (!summary) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg">Executive summary</CardTitle>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs h-7">
                        Copy
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <p className="text-sm leading-relaxed text-foreground">{summary}</p>
            </CardContent>
        </Card>
    )
}
