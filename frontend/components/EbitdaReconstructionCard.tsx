import { useState, useEffect, useMemo } from 'react'
import { Calculator, CircleAlert, Plus, Trash2, RotateCcw, Sliders, CheckCircle2 } from 'lucide-react'

import type { DealModel } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import { WaterfallChart, type WaterfallDatum } from './DealCharts'
import CardInfoPopover from './common/CardInfoPopover'

function money(value: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

function pct(value: number) {
    return `${(value * 100).toFixed(1)}%`
}

type LineItem = {
    label: string
    value: number
    source: 'documented' | 'calculated' | 'analyst'
    note?: string
}

export type AnalystAdjustment = {
    id: string
    name: string
    amount: number
    type: 'add' | 'deduct'
    category: 'Owner Compensation' | 'Non-Recurring / One-Time' | 'Synergy' | 'Market Normalization' | 'Other'
}

export default function EbitdaReconstructionCard({ model, onOpenEvidence }: { model: DealModel; onOpenEvidence?: (evidence: EvidenceItem) => void }) {
    const facts = parseDocumentedFacts(model.documentedFactsJson)
    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null

    // Analyst adjustments state loaded per project
    const storageKey = `mergeworks_ebitda_adj_${model.projectId || 'default'}`
    const [adjustments, setAdjustments] = useState<AnalystAdjustment[]>(() => {
        try {
            const raw = localStorage.getItem(storageKey)
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    })

    // Sync on project change or edit
    useEffect(() => {
        try {
            const raw = localStorage.getItem(storageKey)
            setAdjustments(raw ? JSON.parse(raw) : [])
        } catch {
            setAdjustments([])
        }
    }, [storageKey])

    const saveAdjustments = (items: AnalystAdjustment[]) => {
        setAdjustments(items)
        try {
            localStorage.setItem(storageKey, JSON.stringify(items))
        } catch {
            // ignore storage errors
        }
    }

    // New adjustment input form state
    const [newName, setNewName] = useState('')
    const [newAmount, setNewAmount] = useState('')
    const [newType, setNewType] = useState<'add' | 'deduct'>('add')
    const [newCategory, setNewCategory] = useState<AnalystAdjustment['category']>('Owner Compensation')

    const handleAddAdjustment = (e: React.FormEvent) => {
        e.preventDefault()
        const parsedAmount = parseFloat(newAmount.replace(/[^0-9.]/g, ''))
        if (!newName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return

        const newItem: AnalystAdjustment = {
            id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: newName.trim(),
            amount: parsedAmount,
            type: newType,
            category: newCategory,
        }

        saveAdjustments([...adjustments, newItem])
        setNewName('')
        setNewAmount('')
    }

    const handleDeleteAdjustment = (id: string) => {
        saveAdjustments(adjustments.filter(a => a.id !== id))
    }

    const handleResetAdjustments = () => {
        saveAdjustments([])
    }

    // Quick presets
    const handleAddPreset = (name: string, amount: number, type: 'add' | 'deduct', category: AnalystAdjustment['category']) => {
        const newItem: AnalystAdjustment = {
            id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name,
            amount,
            type,
            category,
        }
        saveAdjustments([...adjustments, newItem])
    }

    // Calculate totals
    const netAdjustment = useMemo(() => {
        return adjustments.reduce((acc, curr) => {
            return curr.type === 'add' ? acc + curr.amount : acc - curr.amount
        }, 0)
    }, [adjustments])

    const adjustedEbitda = ebitda !== null ? ebitda + netAdjustment : null
    const askingPrice = model.askingPrice ?? model.purchasePrice ?? null

    if (revenue === null || ebitda === null) return null

    const margin = ebitda / revenue
    const adjustedMargin = adjustedEbitda && revenue > 0 ? adjustedEbitda / revenue : margin
    const opex = revenue - ebitda
    const lines: LineItem[] = [
        { label: 'Revenue', value: revenue, source: 'documented' },
        { label: 'Less: Operating expenses (implied)', value: -opex, source: 'calculated', note: 'Revenue minus EBITDA/SDE' },
        { label: 'Documented EBITDA / SDE', value: ebitda, source: 'documented' },
    ]

    const addBacks = facts.add_backs
    if (addBacks && typeof addBacks.value === 'number' && addBacks.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Owner add-backs', value: addBacks.value, source: addBacks.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    const depreciation = facts.depreciation
    if (depreciation && typeof depreciation.value === 'number' && depreciation.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Depreciation & amortization', value: depreciation.value, source: depreciation.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    const interest = facts.interest_expense
    if (interest && typeof interest.value === 'number' && interest.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Interest expense', value: interest.value, source: interest.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    const taxes = facts.taxes
    if (taxes && typeof taxes.value === 'number' && taxes.value > 0) {
        lines.splice(2, 0, { label: 'Plus: Taxes', value: taxes.value, source: taxes.status === 'confirmed' ? 'documented' : 'analyst' })
    }

    // If analyst adjustments exist, add pro-forma items into the waterfall lines
    if (adjustments.length > 0 && adjustedEbitda !== null) {
        adjustments.forEach(adj => {
            lines.push({
                label: `${adj.type === 'add' ? 'Plus' : 'Less'}: ${adj.name} (Analyst)`,
                value: adj.type === 'add' ? adj.amount : -adj.amount,
                source: 'analyst',
                note: `Analyst Pro-Forma ${adj.category}`,
            })
        })
        lines.push({
            label: 'Pro-Forma Adjusted EBITDA',
            value: adjustedEbitda,
            source: 'analyst',
            note: 'Normalized pro-forma earnings run-rate',
        })
    }

    const warnings: string[] = []
    if (margin > 0.6) warnings.push(`Documented margin is ${pct(margin)} — unusually high, verify add-backs`)
    if (margin < 0.05) warnings.push(`Documented margin is ${pct(margin)} — very thin, check for missing line items`)
    if (margin < 0) warnings.push(`Negative EBITDA margin (${pct(margin)}) — verify sign and period`)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-primary" />
                            <CardTitle className="text-xl">EBITDA Reconstruction & Pro-Forma Adjustments</CardTitle>
                            <CardInfoPopover cardId="ebitda-reconstruction" />
                        </div>
                        <CardDescription className="mt-1">
                            Breaks documented revenue into operating components and lets analysts model custom pro-forma add-backs and owner normalization adjustments.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {adjustments.length > 0 ? (
                            <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                                <Sliders className="mr-1 h-3 w-3" />
                                {adjustments.length} Custom Adjustment{adjustments.length > 1 ? 's' : ''}
                            </Badge>
                        ) : null}
                        <Badge variant={warnings.length ? 'warning' : 'success'}>
                            {warnings.length ? `${warnings.length} review item${warnings.length > 1 ? 's' : ''}` : 'Reasonable'}
                        </Badge>
                        <Badge variant="outline">
                            {adjustments.length > 0 ? `${pct(adjustedMargin)} adj margin` : `${pct(margin)} margin`}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
                {/* Documented Breakdown Table */}
                <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Earnings Bridge Breakdown</p>
                    {lines.map((line, index) => (
                        <button
                            key={`${line.label}-${index}`}
                            type="button"
                            onClick={() => onOpenEvidence?.({
                                title: line.label,
                                sourceFile: facts.revenue?.citations?.[0]?.source_file || facts.ebitda_sde?.citations?.[0]?.source_file,
                                sourceLocation: facts.revenue?.citations?.[0]?.row_or_cell || 'Financial statement',
                                excerpt: `${line.label}: ${money(line.value)}${line.note ? ` (${line.note})` : ''}`,
                                status: line.source === 'documented' ? 'Confirmed' : line.source === 'calculated' ? 'Calculated' : 'Analyst entry',
                                provenance: 'EBITDA reconstruction',
                                period: facts.revenue?.period || facts.ebitda_sde?.period,
                                currency: facts.revenue?.currency || 'USD',
                            })}
                            className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/30 ${line.label === 'Documented EBITDA / SDE' || line.label === 'Pro-Forma Adjusted EBITDA' ? 'border-t-2 border-primary/30 font-semibold bg-muted/10' : ''}`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-foreground">{line.label}</span>
                                <Badge variant={line.source === 'documented' ? 'success' : line.source === 'calculated' ? 'secondary' : 'outline'} className="text-[10px]">{line.source}</Badge>
                            </span>
                            <span className={`font-mono ${line.value < 0 ? 'text-destructive' : 'text-foreground'}`}>{money(line.value)}</span>
                        </button>
                    ))}
                </div>

                {warnings.length > 0 ? (
                    <div className="space-y-2">
                        {warnings.map((warning) => (
                            <div key={warning} className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                                <p className="text-xs text-foreground">{warning}</p>
                            </div>
                        ))}
                    </div>
                ) : null}

                {/* Waterfall Visualization */}
                <WaterfallChart
                    title="EBITDA Bridge Flow"
                    description="Visual flow from revenue through expenses to normalized EBITDA. Green bars add value; red bars subtract."
                    data={lines.filter(l => l.label !== 'Pro-Forma Adjusted EBITDA').map((line): WaterfallDatum => ({
                        label: line.label.replace('Less: ', '').replace('Plus: ', '').replace(' (implied)', '').replace(' (Analyst)', ''),
                        value: line.value,
                        type: line.label === 'Revenue' || line.label === 'Documented EBITDA / SDE' ? 'total' : line.value >= 0 ? 'positive' : 'negative',
                    }))}
                />

                {/* Analyst Adjustments Manager */}
                <div className="rounded-lg border border-border bg-card/50 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sliders className="h-4 w-4 text-primary" />
                            <h4 className="text-sm font-semibold text-foreground">Analyst Pro-Forma Adjustment Modeling</h4>
                        </div>
                        {adjustments.length > 0 ? (
                            <Button variant="ghost" size="sm" onClick={handleResetAdjustments} className="h-7 text-xs text-muted-foreground hover:text-destructive cursor-pointer gap-1">
                                <RotateCcw className="h-3 w-3" /> Reset Overrides
                            </Button>
                        ) : null}
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground text-[11px]">Quick Add:</span>
                        <button
                            type="button"
                            onClick={() => handleAddPreset('Owner Auto & Fuel Perks', 18000, 'add', 'Owner Compensation')}
                            className="rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                            + Owner Auto ($18k)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddPreset('One-Time Litigation & Legal Retainer', 45000, 'add', 'Non-Recurring / One-Time')}
                            className="rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                            + One-Time Legal ($45k)
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAddPreset('Replacement General Manager Salary', 75000, 'deduct', 'Market Normalization')}
                            className="rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:border-primary/50 hover:bg-muted/40 cursor-pointer transition-colors"
                        >
                            - Market GM Salary ($75k)
                        </button>
                    </div>

                    {/* Custom Add Form */}
                    <form onSubmit={handleAddAdjustment} className="grid gap-2 sm:grid-cols-12 items-center">
                        <input
                            type="text"
                            placeholder="Adjustment description (e.g. Discontinued product line)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="sm:col-span-5 h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <select
                            value={newType}
                            onChange={e => setNewType(e.target.value as 'add' | 'deduct')}
                            className="sm:col-span-2 h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                        >
                            <option value="add">+ Add-Back</option>
                            <option value="deduct">- Deduction</option>
                        </select>
                        <input
                            type="text"
                            placeholder="$ Amount (e.g. 25000)"
                            value={newAmount}
                            onChange={e => setNewAmount(e.target.value)}
                            className="sm:col-span-3 h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <Button type="submit" size="sm" className="sm:col-span-2 h-8 text-xs cursor-pointer gap-1">
                            <Plus className="h-3 w-3" /> Add
                        </Button>
                    </form>

                    {/* Active Adjustments List */}
                    {adjustments.length > 0 ? (
                        <div className="space-y-2 pt-2 border-t border-border">
                            <p className="text-[11px] font-medium text-muted-foreground">Active Pro-Forma Overrides:</p>
                            <div className="space-y-1.5">
                                {adjustments.map(adj => (
                                    <div key={adj.id} className="flex items-center justify-between rounded-md border border-border/80 bg-background px-3 py-1.5 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${adj.type === 'add' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                                                {adj.type === 'add' ? '+ Add-Back' : '- Deduction'}
                                            </span>
                                            <span className="font-medium text-foreground">{adj.name}</span>
                                            <span className="text-[10px] text-muted-foreground">({adj.category})</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`font-mono font-semibold ${adj.type === 'add' ? 'text-emerald-600' : 'text-destructive'}`}>
                                                {adj.type === 'add' ? '+' : '-'}{money(adj.amount)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAdjustment(adj.id)}
                                                className="text-muted-foreground hover:text-destructive cursor-pointer"
                                                title="Remove adjustment"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Summary Impact Pill */}
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 rounded-md bg-muted/40 p-2.5 text-xs">
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Documented EBITDA</p>
                                    <p className="font-semibold text-foreground">{money(ebitda)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Net Adjustments</p>
                                    <p className={`font-semibold ${netAdjustment >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                        {netAdjustment >= 0 ? '+' : ''}{money(netAdjustment)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Adjusted EBITDA</p>
                                    <p className="font-bold text-primary">{adjustedEbitda !== null ? money(adjustedEbitda) : '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground">Pro-Forma Multiple</p>
                                    <p className="font-bold text-foreground">
                                        {askingPrice && adjustedEbitda && adjustedEbitda > 0 ? `${(askingPrice / adjustedEbitda).toFixed(1)}x` : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                <p className="text-xs text-muted-foreground">
                    Click any line to see its evidence source. Adjustments made in this panel are persisted locally for your session and help establish your walkaway deal valuation.
                </p>
            </CardContent>
        </Card>
    )
}
