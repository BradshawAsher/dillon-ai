import { useState, useMemo, useCallback } from 'react'
import { Download, GitCompareArrows, ArrowUpDown, Search, FileSpreadsheet, CheckCircle2 } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'
import CardInfoPopover from './common/CardInfoPopover'

export type ProjectComparison = {
    projectId: string
    projectName: string
    model: DealModel
    synthesis?: ProjectSynthesisItem
    documentsCount: number
    completedDocuments: number
}

type ProjectComparisonCardProps = {
    projects: ProjectComparison[]
    activeProjectId: string
    onSelectProject: (projectId: string) => void
}

type SortOption = 'name' | 'revenue' | 'ebitda' | 'margin' | 'price' | 'multiple' | 'valuation' | 'flags'
type RiskFilterOption = 'all' | 'low' | 'medium' | 'high'

function money(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

function parseValuationNumber(val: string | undefined): number {
    if (!val || val === '0') return 0
    const num = parseFloat(val.replace(/[^0-9.]/g, ''))
    if (isNaN(num)) return 0
    if (/m$/i.test(val)) return num * 1_000_000
    if (/k$/i.test(val)) return num * 1_000
    if (/b$/i.test(val)) return num * 1_000_000_000
    return num
}

function riskDot(level: string | undefined) {
    const normalized = (level ?? '').trim().toLowerCase()
    if (normalized === 'high' || normalized === 'critical') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive shrink-0" />
    if (normalized === 'medium') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
    if (normalized === 'low') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/40 shrink-0" />
}

function buildComparisonMarkdown(projects: ProjectComparison[]): string {
    const lines: string[] = []
    lines.push('# MergeWorks Dillon AI — Portfolio Deal Comparison Report')
    lines.push('')
    lines.push(`*Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`)
    lines.push('')
    lines.push(`Comparing ${projects.length} target acquisitions side by side.`)
    lines.push('')

    const header = ['Metric', ...projects.map(p => p.projectName)]
    const separator = header.map(() => '---')
    lines.push(`| ${header.join(' | ')} |`)
    lines.push(`| ${separator.join(' | ')} |`)

    const metricRows: { label: string; getValue: (p: ProjectComparison) => string }[] = [
        { label: 'Risk Level', getValue: p => p.synthesis?.finalRiskLevel || 'Pending' },
        { label: 'Traffic Light', getValue: p => p.synthesis?.finalTrafficLight || 'Pending' },
        { label: 'Revenue', getValue: p => { const f = parseDocumentedFacts(p.model.documentedFactsJson); return typeof f.revenue?.value === 'number' ? `$${Number(f.revenue.value).toLocaleString()}` : 'N/A' } },
        { label: 'EBITDA/SDE', getValue: p => { const f = parseDocumentedFacts(p.model.documentedFactsJson); return typeof f.ebitda_sde?.value === 'number' ? `$${Number(f.ebitda_sde.value).toLocaleString()}` : 'N/A' } },
        { label: 'Asking Price', getValue: p => p.model.askingPrice ? `$${p.model.askingPrice.toLocaleString()}` : 'N/A' },
        { label: 'Entry Multiple', getValue: p => { const f = parseDocumentedFacts(p.model.documentedFactsJson); const e = f.ebitda_sde?.value; const pr = p.model.askingPrice; return typeof pr === 'number' && typeof e === 'number' && e > 0 ? `${(pr / e).toFixed(1)}x` : 'N/A' } },
        { label: 'EBITDA Margin', getValue: p => { const f = parseDocumentedFacts(p.model.documentedFactsJson); const r = f.revenue?.value; const e = f.ebitda_sde?.value; return typeof r === 'number' && typeof e === 'number' && r > 0 ? `${((e / r) * 100).toFixed(0)}%` : 'N/A' } },
        { label: 'Valuation (Base)', getValue: p => p.synthesis?.valuationBaseEstimate && p.synthesis.valuationBaseEstimate !== '0' ? `$${p.synthesis.valuationBaseEstimate}` : 'Pending' },
        { label: 'Confidence', getValue: p => { const raw = p.synthesis?.valuationConfidence || p.synthesis?.aiConfidence; if (!raw) return 'N/A'; const c = parseFloat(raw); return Number.isFinite(c) ? `${c <= 1 ? Math.round(c * 100) : Math.round(c)}%` : 'N/A' } },
        { label: 'Red Flags Count', getValue: p => String(p.synthesis?.redFlags?.length ?? 0) },
        { label: 'Green Flags Count', getValue: p => String(p.synthesis?.greenFlags?.length ?? 0) },
        { label: 'Documents', getValue: p => `${p.completedDocuments}/${p.documentsCount}` },
    ]

    for (const row of metricRows) {
        lines.push(`| ${row.label} | ${projects.map(p => row.getValue(p)).join(' | ')} |`)
    }

    lines.push('')
    for (const p of projects) {
        lines.push(`## ${p.projectName}`)
        lines.push('')
        if (p.synthesis?.redFlags?.length) {
            lines.push('### Red Flags')
            p.synthesis.redFlags.forEach(f => lines.push(`- ${f}`))
            lines.push('')
        }
        if (p.synthesis?.greenFlags?.length) {
            lines.push('### Green Flags')
            p.synthesis.greenFlags.forEach(f => lines.push(`- ${f}`))
            lines.push('')
        }
        if (p.synthesis?.negotiationLevers?.length) {
            lines.push('### Negotiation Levers')
            p.synthesis.negotiationLevers.forEach(l => lines.push(`- ${l}`))
            lines.push('')
        }
        if (p.synthesis?.finalJudgmentSummary) {
            lines.push(`### Dillon AI Recommendation`)
            lines.push(p.synthesis.finalJudgmentSummary)
            lines.push('')
        }
    }

    return lines.join('\n')
}

function buildComparisonCsv(projects: ProjectComparison[]): string {
    const escapeCsv = (str: string | number | undefined | null) => {
        if (str === null || str === undefined) return '""'
        const val = String(str).replace(/"/g, '""')
        return `"${val}"`
    }

    const headers = [
        'Project ID',
        'Project Name',
        'Risk Level',
        'Traffic Light',
        'Revenue',
        'EBITDA/SDE',
        'EBITDA Margin %',
        'Asking Price',
        'Entry Multiple (EV/EBITDA)',
        'Valuation Base Estimate',
        'AI Confidence %',
        'Red Flags Count',
        'Green Flags Count',
        'Documents Processed',
        'Total Documents',
    ]

    const rows = projects.map(p => {
        const facts = parseDocumentedFacts(p.model.documentedFactsJson)
        const rev = typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
        const ebitda = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
        const margin = rev && ebitda && rev > 0 ? ((ebitda / rev) * 100).toFixed(1) : ''
        const asking = typeof p.model.askingPrice === 'number' ? p.model.askingPrice : null
        const multiple = asking && ebitda && ebitda > 0 ? (asking / ebitda).toFixed(2) : ''
        const rawConf = p.synthesis?.valuationConfidence || p.synthesis?.aiConfidence
        const confNum = rawConf ? parseFloat(rawConf) : null
        const conf = confNum ? (confNum <= 1 ? Math.round(confNum * 100) : Math.round(confNum)) : ''

        return [
            escapeCsv(p.projectId),
            escapeCsv(p.projectName),
            escapeCsv(p.synthesis?.finalRiskLevel || 'Pending'),
            escapeCsv(p.synthesis?.finalTrafficLight || 'Pending'),
            escapeCsv(rev),
            escapeCsv(ebitda),
            escapeCsv(margin),
            escapeCsv(asking),
            escapeCsv(multiple),
            escapeCsv(p.synthesis?.valuationBaseEstimate || ''),
            escapeCsv(conf),
            escapeCsv(p.synthesis?.redFlags?.length ?? 0),
            escapeCsv(p.synthesis?.greenFlags?.length ?? 0),
            escapeCsv(p.completedDocuments),
            escapeCsv(p.documentsCount),
        ].join(',')
    })

    return [headers.join(','), ...rows].join('\n')
}

export default function ProjectComparisonCard({ projects, activeProjectId, onSelectProject }: ProjectComparisonCardProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [riskFilter, setRiskFilter] = useState<RiskFilterOption>('all')
    const [sortBy, setSortBy] = useState<SortOption>('name')
    const [sortAsc, setSortAsc] = useState(true)

    const handleExportMarkdown = useCallback(() => {
        const md = buildComparisonMarkdown(projects)
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mergeworks-portfolio-comparison-${new Date().toISOString().slice(0, 10)}.md`
        a.click()
        URL.revokeObjectURL(url)
    }, [projects])

    const handleExportCsv = useCallback(() => {
        const csv = buildComparisonCsv(projects)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `mergeworks-portfolio-comparison-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }, [projects])

    // Filter and Sort projects
    const filteredProjects = useMemo(() => {
        let list = [...projects]

        // Search query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim()
            list = list.filter(p => p.projectName.toLowerCase().includes(q) || p.projectId.toLowerCase().includes(q))
        }

        // Risk filter
        if (riskFilter !== 'all') {
            list = list.filter(p => {
                const r = (p.synthesis?.finalRiskLevel || '').toLowerCase()
                if (riskFilter === 'low') return r === 'low'
                if (riskFilter === 'medium') return r === 'medium'
                if (riskFilter === 'high') return r === 'high' || r === 'critical'
                return true
            })
        }

        // Sort
        list.sort((a, b) => {
            const factsA = parseDocumentedFacts(a.model.documentedFactsJson)
            const factsB = parseDocumentedFacts(b.model.documentedFactsJson)

            let diff = 0
            if (sortBy === 'name') {
                diff = a.projectName.localeCompare(b.projectName)
            } else if (sortBy === 'revenue') {
                const revA = factsA.revenue?.value ?? 0
                const revB = factsB.revenue?.value ?? 0
                diff = Number(revA) - Number(revB)
            } else if (sortBy === 'ebitda') {
                const ebA = factsA.ebitda_sde?.value ?? 0
                const ebB = factsB.ebitda_sde?.value ?? 0
                diff = Number(ebA) - Number(ebB)
            } else if (sortBy === 'margin') {
                const revA = Number(factsA.revenue?.value || 0)
                const ebA = Number(factsA.ebitda_sde?.value || 0)
                const revB = Number(factsB.revenue?.value || 0)
                const ebB = Number(factsB.ebitda_sde?.value || 0)
                const marginA = revA > 0 ? ebA / revA : 0
                const marginB = revB > 0 ? ebB / revB : 0
                diff = marginA - marginB
            } else if (sortBy === 'price') {
                const prA = a.model.askingPrice ?? 0
                const prB = b.model.askingPrice ?? 0
                diff = prA - prB
            } else if (sortBy === 'multiple') {
                const ebA = Number(factsA.ebitda_sde?.value || 0)
                const ebB = Number(factsB.ebitda_sde?.value || 0)
                const prA = a.model.askingPrice || 0
                const prB = b.model.askingPrice || 0
                const multA = ebA > 0 ? prA / ebA : 999
                const multB = ebB > 0 ? prB / ebB : 999
                diff = multA - multB
            } else if (sortBy === 'valuation') {
                const valA = parseValuationNumber(a.synthesis?.valuationBaseEstimate)
                const valB = parseValuationNumber(b.synthesis?.valuationBaseEstimate)
                diff = valA - valB
            } else if (sortBy === 'flags') {
                const redA = a.synthesis?.redFlags?.length ?? 0
                const redB = b.synthesis?.redFlags?.length ?? 0
                diff = redA - redB
            }

            return sortAsc ? diff : -diff
        })

        return list
    }, [projects, searchQuery, riskFilter, sortBy, sortAsc])

    // Portfolio KPIs
    const portfolioMetrics = useMemo(() => {
        let totalRevenue = 0
        let totalAsking = 0
        let validEbitdaCount = 0
        let sumMargins = 0
        let validMultipleCount = 0
        let sumMultiples = 0
        let lowRiskCount = 0
        let mediumRiskCount = 0
        let highRiskCount = 0

        projects.forEach(p => {
            const facts = parseDocumentedFacts(p.model.documentedFactsJson)
            const rev = typeof facts.revenue?.value === 'number' ? facts.revenue.value : 0
            const eb = typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : 0
            const price = typeof p.model.askingPrice === 'number' ? p.model.askingPrice : 0

            totalRevenue += rev
            totalAsking += price

            if (rev > 0 && eb > 0) {
                sumMargins += (eb / rev)
                validEbitdaCount++
            }

            if (price > 0 && eb > 0) {
                sumMultiples += (price / eb)
                validMultipleCount++
            }

            const r = (p.synthesis?.finalRiskLevel || '').toLowerCase()
            if (r === 'low') lowRiskCount++
            else if (r === 'medium') mediumRiskCount++
            else if (r === 'high' || r === 'critical') highRiskCount++
        })

        return {
            totalDeals: projects.length,
            totalRevenue,
            totalAsking,
            avgMargin: validEbitdaCount > 0 ? (sumMargins / validEbitdaCount) * 100 : null,
            avgMultiple: validMultipleCount > 0 ? (sumMultiples / validMultipleCount) : null,
            lowRiskCount,
            mediumRiskCount,
            highRiskCount,
        }
    }, [projects])

    if (projects.length <= 1) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                        Multi-Project Deal Comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Add more project dossiers to compare M&A deals side by side.</p>
                </CardContent>
            </Card>
        )
    }

    const rows: { label: string; render: (p: ProjectComparison) => React.ReactNode }[] = [
        {
            label: 'Risk level',
            render: (p) => {
                const level = p.synthesis?.finalRiskLevel
                return <span className="flex items-center gap-1.5 text-xs">{riskDot(level)} {level || 'Pending'}</span>
            },
        },
        {
            label: 'Revenue',
            render: (p) => {
                const facts = parseDocumentedFacts(p.model.documentedFactsJson)
                const v = facts.revenue?.value
                if (typeof v === 'number') return <span className="text-xs font-medium">{money(v)}</span>
                return <span className="text-xs text-muted-foreground">Not confirmed</span>
            },
        },
        {
            label: 'EBITDA / SDE',
            render: (p) => {
                const facts = parseDocumentedFacts(p.model.documentedFactsJson)
                const v = facts.ebitda_sde?.value
                if (typeof v === 'number') return <span className="text-xs font-medium">{money(v)}</span>
                return <span className="text-xs text-muted-foreground">Not confirmed</span>
            },
        },
        {
            label: 'EBITDA Margin',
            render: (p) => {
                const facts = parseDocumentedFacts(p.model.documentedFactsJson)
                const r = facts.revenue?.value
                const e = facts.ebitda_sde?.value
                if (typeof r === 'number' && typeof e === 'number' && r > 0) {
                    const pct = ((e / r) * 100).toFixed(0)
                    return <span className="text-xs font-semibold">{pct}%</span>
                }
                return <span className="text-xs text-muted-foreground">—</span>
            },
        },
        {
            label: 'Asking Price',
            render: (p) => {
                if (typeof p.model.askingPrice === 'number') return <span className="text-xs font-medium">{money(p.model.askingPrice)}</span>
                return <span className="text-xs text-muted-foreground">Not set</span>
            },
        },
        {
            label: 'Entry Multiple',
            render: (p) => {
                const facts = parseDocumentedFacts(p.model.documentedFactsJson)
                const ebitda = facts.ebitda_sde?.value
                const price = p.model.askingPrice
                if (typeof price === 'number' && typeof ebitda === 'number' && ebitda > 0) {
                    const mult = price / ebitda
                    const badgeClass = mult < 4.0
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        : mult <= 6.0
                            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                    return (
                        <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-bold ${badgeClass}`}>
                            {mult.toFixed(1)}x
                        </span>
                    )
                }
                return <span className="text-xs text-muted-foreground">N/A</span>
            },
        },
        {
            label: 'Valuation (Base)',
            render: (p) => {
                const val = p.synthesis?.valuationBaseEstimate
                if (!val || val === '0') return <span className="text-xs text-muted-foreground">Pending</span>
                const num = parseFloat(val.replace(/[^0-9.]/g, ''))
                const suffix = /m$/i.test(val) ? 'M' : /b$/i.test(val) ? 'B' : /k$/i.test(val) ? 'K' : ''
                return <span className="text-xs font-bold text-foreground">{suffix ? `$${num}${suffix}` : money(num)}</span>
            },
        },
        {
            label: 'Valuation Confidence',
            render: (p) => {
                const raw = p.synthesis?.valuationConfidence || p.synthesis?.aiConfidence
                if (!raw) return <span className="text-xs text-muted-foreground">—</span>
                const conf = parseFloat(raw)
                if (!Number.isFinite(conf)) return <span className="text-xs text-muted-foreground">—</span>
                const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf)
                const color = pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
                return <span className={`text-xs font-semibold ${color}`}>{pct}%</span>
            },
        },
        {
            label: 'Red Flags',
            render: (p) => {
                const count = p.synthesis?.redFlags?.length ?? 0
                return (
                    <span className={`text-xs font-medium ${count > 2 ? 'text-destructive font-bold' : count > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {count} issue{count === 1 ? '' : 's'}
                    </span>
                )
            },
        },
        {
            label: 'Green Flags',
            render: (p) => {
                const count = p.synthesis?.greenFlags?.length ?? 0
                return <span className="text-xs text-emerald-600 font-medium">{count} strength{count === 1 ? '' : 's'}</span>
            },
        },
        {
            label: 'Documents',
            render: (p) => <span className="text-xs text-muted-foreground">{p.completedDocuments}/{p.documentsCount} processed</span>,
        },
        {
            label: 'Synthesis',
            render: (p) => {
                const ready = p.synthesis && p.synthesis.finalJudgmentSummary.trim().length > 0
                return ready
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Ready</span>
                    : <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Pending</span>
            },
        },
    ]

    return (
        <div className="space-y-4">
            {/* Portfolio Summary KPI Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Card className="p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">Total Deals</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{portfolioMetrics.totalDeals}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="text-emerald-600 font-medium">{portfolioMetrics.lowRiskCount} low</span>
                        <span>•</span>
                        <span className="text-amber-600 font-medium">{portfolioMetrics.mediumRiskCount} med</span>
                        <span>•</span>
                        <span className="text-destructive font-medium">{portfolioMetrics.highRiskCount} high</span>
                    </div>
                </Card>

                <Card className="p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">Total Deal Volume</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{money(portfolioMetrics.totalAsking)}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Asking pipeline value</p>
                </Card>

                <Card className="p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">Avg EBITDA Margin</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                        {portfolioMetrics.avgMargin !== null ? `${portfolioMetrics.avgMargin.toFixed(0)}%` : '—'}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">Target profitability</p>
                </Card>

                <Card className="p-3">
                    <p className="text-[11px] font-medium text-muted-foreground">Avg Entry Multiple</p>
                    <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                        {portfolioMetrics.avgMultiple !== null ? `${portfolioMetrics.avgMultiple.toFixed(1)}x` : '—'}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">EV / EBITDA valuation</p>
                </Card>
            </div>

            {/* Matrix Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                    <GitCompareArrows className="h-4 w-4 text-primary" />
                                    Deal Comparison Matrix ({filteredProjects.length} of {projects.length})
                                </CardTitle>
                                <CardInfoPopover cardId="project-comparison" />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Side-by-side benchmarking across financial health, entry valuation multiples, and diligence risk posture.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 cursor-pointer" onClick={handleExportMarkdown}>
                                <Download className="h-3.5 w-3.5" />
                                Markdown
                            </Button>
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 cursor-pointer" onClick={handleExportCsv}>
                                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                                CSV Matrix
                            </Button>
                        </div>
                    </div>

                    {/* Filter & Sort Bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                        {/* Search Input */}
                        <div className="relative min-w-[160px] max-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search deal name..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        {/* Risk Filter Buttons */}
                        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5">
                            <button
                                type="button"
                                onClick={() => setRiskFilter('all')}
                                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${riskFilter === 'all' ? 'bg-background text-foreground shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                All Risks
                            </button>
                            <button
                                type="button"
                                onClick={() => setRiskFilter('low')}
                                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${riskFilter === 'low' ? 'bg-background text-emerald-700 dark:text-emerald-400 shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Low
                            </button>
                            <button
                                type="button"
                                onClick={() => setRiskFilter('medium')}
                                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${riskFilter === 'medium' ? 'bg-background text-amber-700 dark:text-amber-400 shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Med
                            </button>
                            <button
                                type="button"
                                onClick={() => setRiskFilter('high')}
                                className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${riskFilter === 'high' ? 'bg-background text-destructive shadow-2xs font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-destructive" /> High
                            </button>
                        </div>

                        {/* Sort Select */}
                        <div className="flex items-center gap-1.5 ml-auto">
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as SortOption)}
                                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                            >
                                <option value="name">Sort by Name</option>
                                <option value="revenue">Sort by Revenue</option>
                                <option value="ebitda">Sort by EBITDA</option>
                                <option value="margin">Sort by EBITDA Margin</option>
                                <option value="price">Sort by Asking Price</option>
                                <option value="multiple">Sort by Entry Multiple</option>
                                <option value="valuation">Sort by Valuation Estimate</option>
                                <option value="flags">Sort by Red Flags Count</option>
                            </select>

                            <button
                                type="button"
                                onClick={() => setSortAsc(prev => !prev)}
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                title={sortAsc ? 'Ascending (click for descending)' : 'Descending (click for ascending)'}
                            >
                                {sortAsc ? '↑ Asc' : '↓ Desc'}
                            </button>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="overflow-x-auto p-0">
                    {filteredProjects.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No deals match the selected search or risk filter criteria.
                        </div>
                    ) : (
                        <table className="w-full min-w-[640px] text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="py-3 px-4 text-xs font-semibold text-muted-foreground w-44 sticky left-0 bg-muted/40 backdrop-blur-xs z-10 border-r border-border/60">
                                        Metric
                                    </th>
                                    {filteredProjects.map((p) => {
                                        const isActive = p.projectId === activeProjectId
                                        return (
                                            <th
                                                key={p.projectId}
                                                className={`py-3 px-3 text-xs font-semibold text-foreground min-w-[160px] max-w-[200px] align-top transition-colors border-r border-border/40 last:border-r-0 ${isActive ? 'bg-primary/10 border-t-2 border-t-primary' : 'hover:bg-muted/40'}`}
                                            >
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="font-bold text-foreground leading-tight truncate" title={p.projectName}>
                                                        {p.projectName}
                                                    </span>
                                                    {isActive ? (
                                                        <span className="inline-flex items-center gap-1 self-start rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-2xs">
                                                            Active Deal
                                                        </span>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSelectProject(p.projectId)}
                                                            className="self-start rounded border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                                                        >
                                                            Make Active
                                                        </button>
                                                    )}
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {rows.map((row) => (
                                    <tr key={row.label} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-2.5 px-4 text-xs font-medium text-muted-foreground whitespace-nowrap sticky left-0 bg-background/95 backdrop-blur-xs z-10 border-r border-border/60">
                                            {row.label}
                                        </td>
                                        {filteredProjects.map((p) => (
                                            <td
                                                key={p.projectId}
                                                className={`py-2.5 px-3 border-r border-border/40 last:border-r-0 ${p.projectId === activeProjectId ? 'bg-primary/5' : ''}`}
                                            >
                                                {row.render(p)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
