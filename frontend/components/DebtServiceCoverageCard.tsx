import { useMemo } from 'react'
import { Shield } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { parseDocumentedFacts } from '../utils/evidence'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type Props = {
    model: DealModel
}

type DSCRAnalysis = {
    currentDSCR: number
    revenueDeclineToBreakeven: number
    ebitdaDeclineToMinThreshold: number
    status: 'green' | 'amber' | 'red'
    afterTaxEbitda: number
    annualDebtService: number
}

export default function DebtServiceCoverageCard({ model }: Props) {
    const analysis = useMemo((): DSCRAnalysis | null => {
        const facts = parseDocumentedFacts(model.documentedFactsJson)
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const revenue = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const price = model.purchasePrice ?? model.askingPrice

        if (!price || !ebitda || ebitda <= 0) return null

        const taxRate = model.taxRate ?? 0.25
        const equityPct = model.equityContributionPercent ?? 25
        const equity = price * (equityPct / 100)
        const debt = price - equity - (model.sellerNoteAmount ?? 0)
        const rate = model.interestRate ?? 0.07
        const amortYears = model.amortizationYears ?? 10

        const monthlyRate = rate / 12
        const nPayments = amortYears * 12
        const monthlyPayment = debt > 0 && monthlyRate > 0
            ? debt * (monthlyRate * Math.pow(1 + monthlyRate, nPayments)) / (Math.pow(1 + monthlyRate, nPayments) - 1)
            : 0
        const annualDebtService = monthlyPayment * 12

        if (annualDebtService <= 0) return null

        const afterTaxEbitda = ebitda * (1 - taxRate)
        const currentDSCR = afterTaxEbitda / annualDebtService

        // Revenue decline % before DSCR drops below 1.0x
        // At breakeven: afterTaxEbitda * (1 - decline) = annualDebtService
        // decline = 1 - (annualDebtService / afterTaxEbitda)
        const ebitdaMargin = revenue && revenue > 0 ? ebitda / revenue : null
        const revenueDeclineToBreakeven = ebitdaMargin && ebitdaMargin > 0
            ? Math.max(0, (1 - (annualDebtService / afterTaxEbitda)) * 100)
            : 0

        // EBITDA decline % before DSCR drops below 1.25x (minimum lender threshold)
        // At 1.25x: afterTaxEbitda * (1 - decline) = 1.25 * annualDebtService
        // decline = 1 - (1.25 * annualDebtService / afterTaxEbitda)
        const ebitdaDeclineToMinThreshold = Math.max(
            0,
            (1 - (1.25 * annualDebtService / afterTaxEbitda)) * 100
        )

        let status: 'green' | 'amber' | 'red'
        if (currentDSCR >= 1.5) {
            status = 'green'
        } else if (currentDSCR >= 1.25) {
            status = 'amber'
        } else {
            status = 'red'
        }

        return {
            currentDSCR,
            revenueDeclineToBreakeven,
            ebitdaDeclineToMinThreshold,
            status,
            afterTaxEbitda,
            annualDebtService,
        }
    }, [model])

    if (!analysis) return null

    const statusColors = {
        green: 'text-green-600 bg-green-50 border-green-200',
        amber: 'text-amber-600 bg-amber-50 border-amber-200',
        red: 'text-red-600 bg-red-50 border-red-200',
    }

    const statusLabels = {
        green: 'Strong coverage',
        amber: 'Adequate coverage',
        red: 'Weak coverage',
    }

    // Gauge positioning: map DSCR onto a 0-100 scale where thresholds are at fixed positions
    const thresholds = [
        { value: 1.0, position: 20, label: '1.0x' },
        { value: 1.25, position: 40, label: '1.25x' },
        { value: 1.5, position: 60, label: '1.5x' },
        { value: 2.0, position: 80, label: '2.0x' },
    ]

    const gaugePosition = (() => {
        const dscr = analysis.currentDSCR
        if (dscr <= 0) return 0
        if (dscr <= 1.0) return (dscr / 1.0) * 20
        if (dscr <= 1.25) return 20 + ((dscr - 1.0) / 0.25) * 20
        if (dscr <= 1.5) return 40 + ((dscr - 1.25) / 0.25) * 20
        if (dscr <= 2.0) return 60 + ((dscr - 1.5) / 0.5) * 20
        return Math.min(100, 80 + ((dscr - 2.0) / 1.0) * 20)
    })()

    const gaugeColor = analysis.status === 'green'
        ? 'bg-green-500'
        : analysis.status === 'amber'
            ? 'bg-amber-500'
            : 'bg-red-500'

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <CardTitle className="text-lg">Debt service coverage</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                    After-tax EBITDA relative to annual debt obligations
                </p>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                {/* Current DSCR display */}
                <div className={`rounded-lg border p-3 ${statusColors[analysis.status]}`}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">Current DSCR</span>
                        <span className="text-xs font-medium">{statusLabels[analysis.status]}</span>
                    </div>
                    <div className="text-2xl font-bold mt-1">
                        {analysis.currentDSCR.toFixed(2)}x
                    </div>
                    <div className="text-[10px] mt-1 opacity-80">
                        ${Math.round(analysis.afterTaxEbitda).toLocaleString()} after-tax EBITDA / ${Math.round(analysis.annualDebtService).toLocaleString()} annual debt service
                    </div>
                </div>

                {/* Visual gauge */}
                <div className="space-y-1.5">
                    <span className="text-xs font-medium text-foreground">DSCR position</span>
                    <div className="relative h-6 rounded-full bg-gradient-to-r from-red-100 via-amber-100 to-green-100 overflow-hidden border border-border">
                        {/* Threshold markers */}
                        {thresholds.map((t) => (
                            <div
                                key={t.value}
                                className="absolute top-0 bottom-0 w-px bg-foreground/30"
                                style={{ left: `${t.position}%` }}
                            />
                        ))}
                        {/* Current position indicator */}
                        <div
                            className={`absolute top-1 bottom-1 w-2.5 rounded-full ${gaugeColor} shadow-sm`}
                            style={{ left: `calc(${gaugePosition}% - 5px)` }}
                        />
                    </div>
                    <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                        {thresholds.map((t) => (
                            <span key={t.value} style={{ position: 'absolute', left: `calc(${t.position}% - 10px)` }}>
                                {t.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Decline metrics */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="rounded-lg bg-muted/50 p-3">
                        <div className="text-[10px] text-muted-foreground">Revenue decline to breakeven</div>
                        <div className="text-lg font-bold text-foreground mt-0.5">
                            {analysis.revenueDeclineToBreakeven.toFixed(1)}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                            Before DSCR drops below 1.0x
                        </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                        <div className="text-[10px] text-muted-foreground">EBITDA decline to min threshold</div>
                        <div className="text-lg font-bold text-foreground mt-0.5">
                            {analysis.ebitdaDeclineToMinThreshold.toFixed(1)}%
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                            Before DSCR drops below 1.25x
                        </div>
                    </div>
                </div>

                <div className="rounded-lg bg-muted/50 p-3 mt-2">
                    <p className="text-[10px] text-muted-foreground">
                        DSCR measures how many times after-tax earnings cover required debt payments.
                        Lenders typically require a minimum of 1.25x. Values above 1.5x indicate strong
                        downside protection against revenue volatility.
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
