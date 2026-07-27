import { useMemo } from 'react'
import { UserX } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
    synthesis: ProjectSynthesisItem | null
}

type RiskFactor = {
    label: string
    detected: boolean
    weight: number
    mitigation: string
}

export default function OwnerDependencyCard({ model, synthesis }: Props) {
    const result = useMemo(() => {
        if (!synthesis) return null

        const allFlags = [
            ...(synthesis.redFlags ?? []),
            ...(synthesis.yellowFlags ?? []),
            ...(synthesis.openQuestions ?? []),
            ...(synthesis.greenFlags ?? []),
        ].map(f => f.toLowerCase())

        const factors: RiskFactor[] = [
            {
                label: 'Owner handles key client relationships',
                detected: allFlags.some(f => f.includes('client') && (f.includes('owner') || f.includes('personal') || f.includes('relationship'))),
                weight: 25,
                mitigation: 'Require introductions during transition; add non-compete clause',
            },
            {
                label: 'Owner is primary revenue generator',
                detected: allFlags.some(f => (f.includes('revenue') || f.includes('sales')) && (f.includes('owner') || f.includes('founder') || f.includes('key person'))),
                weight: 30,
                mitigation: 'Hire/promote sales lead before close; structure earnout tied to revenue retention',
            },
            {
                label: 'No management team in place',
                detected: allFlags.some(f => f.includes('management') && (f.includes('lack') || f.includes('no ') || f.includes('missing') || f.includes('thin'))),
                weight: 20,
                mitigation: 'Budget for management hires; negotiate 12-month consulting agreement',
            },
            {
                label: 'Owner holds specialized licenses/certifications',
                detected: allFlags.some(f => f.includes('licens') || f.includes('certif') || f.includes('permit')),
                weight: 15,
                mitigation: 'Verify license transferability; plan for new applications if needed',
            },
            {
                label: 'Supplier/vendor relationships tied to owner',
                detected: allFlags.some(f => (f.includes('supplier') || f.includes('vendor')) && (f.includes('owner') || f.includes('personal') || f.includes('relationship'))),
                weight: 10,
                mitigation: 'Get vendor introductions; secure assignment of key contracts',
            },
        ]

        const detectedFactors = factors.filter(f => f.detected)
        const score = factors.reduce((sum, f) => sum + (f.detected ? f.weight : 0), 0)

        const level = score >= 50 ? 'high' : score >= 25 ? 'moderate' : 'low'

        return { factors, detectedFactors, score, level }
    }, [synthesis])

    if (!result) return null

    const levelColor = result.level === 'high' ? 'text-red-600' : result.level === 'moderate' ? 'text-amber-600' : 'text-green-600'
    const levelBg = result.level === 'high' ? 'bg-red-100 dark:bg-red-900/30' : result.level === 'moderate' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Owner dependency risk</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    How dependent is the business on the current owner?
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className={`rounded-full px-3 py-1.5 ${levelBg}`}>
                        <span className={`text-sm font-bold capitalize ${levelColor}`}>{result.level} risk</span>
                    </div>
                    <div className="flex-1">
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${result.level === 'high' ? 'bg-red-500' : result.level === 'moderate' ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${result.score}%` }}
                            />
                        </div>
                    </div>
                    <span className="text-xs font-bold text-foreground">{result.score}/100</span>
                </div>

                <div className="space-y-2">
                    {result.factors.map((factor, i) => (
                        <div key={i} className={`rounded-lg border p-2.5 ${factor.detected ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20' : 'border-border'}`}>
                            <div className="flex items-start gap-2">
                                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${factor.detected ? 'bg-red-500' : 'bg-green-500'}`} />
                                <div className="flex-1">
                                    <p className={`text-xs font-medium ${factor.detected ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
                                        {factor.label}
                                    </p>
                                    {factor.detected && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            Mitigation: {factor.mitigation}
                                        </p>
                                    )}
                                </div>
                                <span className="text-[9px] text-muted-foreground shrink-0">{factor.weight}pts</span>
                            </div>
                        </div>
                    ))}
                </div>

                {result.detectedFactors.length === 0 && (
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 p-3 text-center">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                            No owner dependency signals detected in synthesis
                        </p>
                    </div>
                )}

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[10px] text-muted-foreground">
                        Scans synthesis flags for keywords indicating owner/founder dependency.
                        Higher scores suggest more transition risk. Mitigations listed are standard M&A protective measures.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
