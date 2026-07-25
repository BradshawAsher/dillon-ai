import { useMemo } from 'react'
import { AlertTriangle, PieChart, Users } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import type { EvidenceItem } from '../utils/evidence'

type ConcentrationFinding = {
    customer: string
    revenueShare: number | null
    detail: string
    severity: 'critical' | 'medium' | 'low'
    source?: string
}

function parseConcentrationFromSynthesis(synthesis: ProjectSynthesisItem): ConcentrationFinding[] {
    const findings: ConcentrationFinding[] = []

    const allFindings = [
        ...synthesis.redFlags.map((t) => ({ text: t, sev: 'critical' as const })),
        ...synthesis.yellowFlags.map((t) => ({ text: t, sev: 'medium' as const })),
        ...synthesis.crossDocumentConflicts.map((t) => ({ text: t, sev: 'medium' as const })),
        ...synthesis.openQuestions.map((t) => ({ text: t, sev: 'low' as const })),
        ...synthesis.negotiationLevers.map((t) => ({ text: t, sev: 'low' as const })),
        ...synthesis.keyTakeaways.map((t) => ({ text: t, sev: 'low' as const })),
    ]

    const concentrationPattern = /customer|client|concentration|revenue.*(?:\d+%|percent)|top.+(?:account|customer|client)|single.*(?:customer|client)|depend(?:en|an)/i

    for (const { text, sev } of allFindings) {
        if (!concentrationPattern.test(text)) continue

        const percentMatch = text.match(/(\d{1,3})(?:\.\d+)?%/)
        const revenueShare = percentMatch ? parseFloat(percentMatch[1]) / 100 : null

        const customerMatch = text.match(/(?:top|largest|single|#1|primary)\s+(?:customer|client|account)\s+(?:is\s+)?([^,.\d]+)/i)
        const customer = customerMatch?.[1]?.trim() || 'Top customer'

        findings.push({
            customer,
            revenueShare,
            detail: text,
            severity: sev,
            source: revenueShare && revenueShare > 0.3 ? 'High concentration risk' : 'Customer dependency noted',
        })
    }

    if (findings.length === 0 && synthesis.finalJudgmentJson) {
        try {
            const parsed = JSON.parse(synthesis.finalJudgmentJson)
            const response = parsed?.response || parsed
            const searchFields = [
                ...(response?.flags?.red_flags || []),
                ...(response?.flags?.yellow_flags || []),
                ...(response?.reconciliation_findings || []),
                ...(response?.key_acquisition_takeaways || []),
            ]
            for (const item of searchFields) {
                if (!item || typeof item !== 'object') continue
                const desc = item.description || item.text || item.takeaway || item.summary || ''
                if (!concentrationPattern.test(desc)) continue
                const percentMatch = desc.match(/(\d{1,3})(?:\.\d+)?%/)
                findings.push({
                    customer: 'Top customer',
                    revenueShare: percentMatch ? parseFloat(percentMatch[1]) / 100 : null,
                    detail: desc,
                    severity: item.severity === 'critical' || item.severity === 'high' ? 'critical' : 'medium',
                    source: item.citations?.[0]?.source_file,
                })
            }
        } catch {}
    }

    return findings
}

function getRiskLevel(findings: ConcentrationFinding[]): { label: string; variant: 'destructive' | 'warning' | 'success' } {
    const maxShare = Math.max(...findings.map((f) => f.revenueShare ?? 0), 0)
    const hasCritical = findings.some((f) => f.severity === 'critical')
    if (maxShare > 0.4 || hasCritical) return { label: 'High concentration risk', variant: 'destructive' }
    if (maxShare > 0.2 || findings.length > 0) return { label: 'Moderate concentration', variant: 'warning' }
    return { label: 'Diversified', variant: 'success' }
}

export default function CustomerConcentrationCard({ synthesis, onOpenEvidence }: { synthesis: ProjectSynthesisItem; onOpenEvidence?: (item: EvidenceItem) => void }) {
    const findings = useMemo(() => parseConcentrationFromSynthesis(synthesis), [synthesis])

    if (findings.length === 0) return null

    const risk = getRiskLevel(findings)
    const topConcentration = Math.max(...findings.map((f) => f.revenueShare ?? 0), 0)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">Customer concentration</CardTitle>
                        </div>
                        <CardDescription className="mt-1">
                            Revenue dependency on individual customers extracted from synthesis findings.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant={risk.variant}>{risk.label}</Badge>
                        {topConcentration > 0 && <Badge variant="outline">{(topConcentration * 100).toFixed(0)}% top customer</Badge>}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
                {topConcentration > 0.2 && (
                    <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {topConcentration > 0.4
                                    ? 'Critical revenue dependency — single-customer loss would materially impair value'
                                    : 'Moderate concentration — customer loss represents a notable downside scenario'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Consider negotiating retention protections, earnout adjustments tied to key accounts, or a working-capital escrow.
                            </p>
                        </div>
                    </div>
                )}

                {topConcentration > 0 && (
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3">
                        <PieChart className="h-10 w-10 shrink-0 text-primary" />
                        <div className="flex-1">
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold text-foreground">{(topConcentration * 100).toFixed(0)}%</span>
                                <span className="mb-0.5 text-sm text-muted-foreground">of revenue from top customer</span>
                            </div>
                            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className={`h-full rounded-full transition-all ${topConcentration > 0.4 ? 'bg-destructive' : topConcentration > 0.2 ? 'bg-warning' : 'bg-success'}`}
                                    style={{ width: `${Math.min(topConcentration * 100, 100)}%` }}
                                />
                            </div>
                            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                                <span>0%</span>
                                <span className="border-l border-warning/50 pl-1">20% threshold</span>
                                <span className="border-l border-destructive/50 pl-1">40% critical</span>
                                <span>100%</span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {findings.map((finding, index) => (
                        <button
                            key={index}
                            type="button"
                            onClick={() => onOpenEvidence?.({
                                title: 'Customer concentration finding',
                                sourceFile: finding.source || synthesis.citations?.[0],
                                sourceLocation: 'Synthesis analysis',
                                excerpt: finding.detail,
                                status: finding.severity === 'critical' ? 'Risk' : 'Needs review',
                                provenance: 'Customer concentration analysis',
                            })}
                            className="flex w-full items-start gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary/40"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={finding.severity === 'critical' ? 'destructive' : finding.severity === 'medium' ? 'warning' : 'secondary'}>
                                        {finding.severity === 'critical' ? 'Critical' : finding.severity === 'medium' ? 'Medium' : 'Low'}
                                    </Badge>
                                    {finding.revenueShare !== null && (
                                        <Badge variant="outline">{(finding.revenueShare * 100).toFixed(0)}% revenue share</Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground">{finding.customer}</span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-foreground">{finding.detail}</p>
                            </div>
                        </button>
                    ))}
                </div>

                <p className="text-xs text-muted-foreground">
                    Findings are extracted from synthesis red/yellow flags and cross-document analysis. Click any finding for source evidence.
                </p>
            </CardContent>
        </Card>
    )
}
