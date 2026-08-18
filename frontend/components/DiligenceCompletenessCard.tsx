import { useMemo } from 'react'
import { ClipboardCheck } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import type { ProjectSynthesisItem } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'

type Props = {
    model: DealModel
    synthesis?: ProjectSynthesisItem | null
    documentCount: number
    onNavigate?: (target: string) => void
}

type Category = {
    label: string
    score: number
    maxScore: number
    items: { label: string; done: boolean }[]
}

export default function DiligenceCompletenessCard({ model, synthesis, documentCount, onNavigate }: Props) {
    const categories = useMemo(() => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const result: Category[] = []

        const financialItems = [
            { label: 'Revenue confirmed', done: facts.revenue?.value != null },
            { label: 'EBITDA/SDE confirmed', done: facts.ebitda_sde?.value != null },
            { label: 'Gross margin available', done: facts.gross_profit?.value != null || facts.cogs?.value != null },
            { label: 'Balance sheet data', done: facts.total_assets?.value != null || facts.total_liabilities?.value != null },
            { label: 'Cash flow statement', done: facts.operating_cash_flow?.value != null },
        ]
        result.push({
            label: 'Financial Data',
            score: financialItems.filter(i => i.done).length,
            maxScore: financialItems.length,
            items: financialItems,
        })

        const valuationItems = [
            { label: 'Purchase price set', done: (model.purchasePrice ?? model.askingPrice ?? 0) > 0 },
            { label: 'Entry multiple calculated', done: facts.ebitda_sde?.value != null && (model.purchasePrice ?? model.askingPrice ?? 0) > 0 },
            { label: 'Exit multiple assumed', done: model.exitMultiple != null && model.exitMultiple > 0 },
            { label: 'Growth rate established', done: model.baseRevenueGrowth != null },
            { label: 'Hold period defined', done: model.holdPeriodYears != null && model.holdPeriodYears > 0 },
        ]
        result.push({
            label: 'Valuation Inputs',
            score: valuationItems.filter(i => i.done).length,
            maxScore: valuationItems.length,
            items: valuationItems,
        })

        const riskItems = [
            { label: 'Documents analyzed', done: documentCount >= 1 },
            { label: 'Multiple documents', done: documentCount >= 3 },
            { label: 'Synthesis completed', done: synthesis != null },
            { label: 'Red flags identified', done: (synthesis?.redFlags?.length ?? 0) > 0 || (synthesis?.greenFlags?.length ?? 0) > 0 },
            { label: 'Open questions listed', done: (synthesis?.openQuestions?.length ?? 0) > 0 },
        ]
        result.push({
            label: 'Risk Assessment',
            score: riskItems.filter(i => i.done).length,
            maxScore: riskItems.length,
            items: riskItems,
        })

        const dealItems = [
            { label: 'Financing structure', done: (model.seniorDebtAmount ?? 0) > 0 || (model.equityAmount ?? 0) > 0 },
            { label: 'Interest rate set', done: model.interestRate != null && model.interestRate > 0 },
            { label: 'Working capital defined', done: (model.workingCapitalRequirement ?? 0) > 0 },
            { label: 'Transaction fees estimated', done: (model.transactionFees ?? 0) > 0 },
            { label: 'Tax rate configured', done: model.taxRate != null && model.taxRate > 0 },
        ]
        result.push({
            label: 'Deal Structure',
            score: dealItems.filter(i => i.done).length,
            maxScore: dealItems.length,
            items: dealItems,
        })

        return result
    }, [model, synthesis, documentCount])

    const totalScore = categories.reduce((s, c) => s + c.score, 0)
    const totalMax = categories.reduce((s, c) => s + c.maxScore, 0)
    const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

    const level = pct >= 80 ? 'Thorough' : pct >= 60 ? 'Solid' : pct >= 40 ? 'In Progress' : 'Early Stage'
    const levelColor = pct >= 80 ? 'text-green-600' : pct >= 60 ? 'text-blue-600' : pct >= 40 ? 'text-amber-600' : 'text-red-600'
    const barColor = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Diligence completeness</CardTitle>
                    <CardInfoPopover cardId="diligence-completeness" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    How thorough is your analysis? {totalScore}/{totalMax} data points confirmed.
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-bold ${levelColor}`}>{level}</span>
                            <span className="text-xs font-mono text-muted-foreground">{pct}%</span>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map(cat => {
                        const navTarget = cat.label === 'Financial Data' ? 'upload'
                            : cat.label === 'Valuation Inputs' ? 'valuation'
                                : cat.label === 'Risk Assessment' ? 'synthesis'
                                    : 'structure'
                        const navLabel = cat.label === 'Financial Data' ? 'Upload docs'
                            : cat.label === 'Valuation Inputs' ? 'Set inputs'
                                : cat.label === 'Risk Assessment' ? 'Run synthesis'
                                    : 'Configure'

                        return (
                            <div key={cat.label} className="rounded-lg border border-border p-2.5 bg-background">
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <p className="text-xs font-bold text-foreground truncate">{cat.label}</p>
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">{cat.score}/{cat.maxScore}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                                    <div
                                        className={`h-full rounded-full ${cat.score === cat.maxScore ? 'bg-green-500' : cat.score > 0 ? 'bg-blue-500' : 'bg-muted-foreground/30'}`}
                                        style={{ width: `${(cat.score / cat.maxScore) * 100}%` }}
                                    />
                                </div>
                                <div className="space-y-0.5">
                                    {cat.items.map(item => (
                                        <div key={item.label} className="flex items-center gap-1.5">
                                            <span className={`text-[10px] ${item.done ? 'text-green-600' : 'text-muted-foreground/50'}`}>
                                                {item.done ? '●' : '○'}
                                            </span>
                                            <span className={`text-[10px] ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                                                {item.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {onNavigate && cat.score < cat.maxScore && (
                                    <button
                                        type="button"
                                        onClick={() => onNavigate(navTarget)}
                                        className="mt-2 w-full rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5 text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        Resolve → {navLabel}
                                    </button>
                                )}
                                {cat.score === cat.maxScore && (
                                    <div className="mt-2 w-full rounded-md bg-green-500/10 px-2 py-1.5 text-[10px] font-semibold text-green-600 text-center">
                                        ✓ Complete
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {pct < 80 && (
                    <div className="rounded-lg bg-muted/50 p-2.5 text-[10px] text-muted-foreground">
                        <span className="font-medium text-foreground">Next steps: </span>
                        {categories.find(c => c.score < c.maxScore)?.items.find(i => !i.done)?.label ?? 'Upload more documents'}
                        {' — '}completing more items improves analysis confidence and deal model accuracy.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
