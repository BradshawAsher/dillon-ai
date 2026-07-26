import { useMemo } from 'react'
import { UserX } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'

type Props = {
    synthesis?: ProjectSynthesisItem
}

const KEY_PERSON_KEYWORDS = ['owner', 'founder', 'key person', 'key-person', 'key man', 'key-man', 'single point', 'one person', 'sole', 'dependent on', 'reliance on', 'personal relationship', 'owner-operated', 'owner operated']

export default function KeyPersonRiskCard({ synthesis }: Props) {
    const analysis = useMemo(() => {
        if (!synthesis) return null

        const allFlags = [
            ...(synthesis.redFlags ?? []),
            ...(synthesis.yellowFlags ?? []),
            ...(synthesis.openQuestions ?? []),
            ...(synthesis.keyTakeaways ?? []),
        ]

        const matches = allFlags.filter(flag =>
            KEY_PERSON_KEYWORDS.some(kw => flag.toLowerCase().includes(kw))
        )

        if (matches.length === 0) return null

        const isHigh = matches.some(m => {
            const lower = m.toLowerCase()
            return synthesis.redFlags?.some(rf => rf === m) ||
                lower.includes('single point') ||
                lower.includes('sole') ||
                lower.includes('dependent on')
        })

        return {
            level: isHigh ? 'high' as const : 'medium' as const,
            findings: matches.slice(0, 4),
        }
    }, [synthesis])

    if (!analysis) return null

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserX className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Key person risk</CardTitle>
                    </div>
                    <Badge variant={analysis.level === 'high' ? 'destructive' : 'warning'}>
                        {analysis.level === 'high' ? 'High risk' : 'Moderate'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-3">
                    {analysis.level === 'high'
                        ? 'This deal shows strong owner/founder dependency. Consider transition planning, earn-outs, or consulting agreements.'
                        : 'Some key-person indicators detected. Evaluate management depth and transition readiness.'
                    }
                </p>
                <div className="space-y-2">
                    {analysis.findings.map((finding, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${analysis.level === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                            <p className="text-sm text-foreground">{finding}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-3 rounded-md border border-dashed border-border bg-muted/20 p-2.5">
                    <p className="text-[11px] text-muted-foreground">
                        <strong>Mitigation:</strong> Non-compete + consulting agreement, customer intro period, employee retention bonuses, earn-out tied to revenue maintenance.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
