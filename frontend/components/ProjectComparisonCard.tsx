import { useCallback } from 'react'
import { Download, GitCompareArrows } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { parseDocumentedFacts } from '../utils/evidence'

type ProjectComparison = {
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

function money(value: number) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
}

function riskDot(level: string | undefined) {
    const normalized = (level ?? '').trim().toLowerCase()
    if (normalized === 'high' || normalized === 'critical') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-destructive" />
    if (normalized === 'medium') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-500" />
    if (normalized === 'low') return <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
}

function buildComparisonMarkdown(projects: ProjectComparison[]): string {
    const lines: string[] = []
    lines.push('# Deal Comparison Report')
    lines.push('')
    lines.push(`*Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`)
    lines.push('')
    lines.push(`Comparing ${projects.length} projects side by side.`)
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
        { label: 'Red Flags', getValue: p => String(p.synthesis?.redFlags?.length ?? 0) },
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
            lines.push(`### Recommendation`)
            lines.push(p.synthesis.finalJudgmentSummary)
            lines.push('')
        }
    }

    return lines.join('\n')
}

export default function ProjectComparisonCard({ projects, activeProjectId, onSelectProject }: ProjectComparisonCardProps) {
    const handleExport = useCallback(() => {
        const md = buildComparisonMarkdown(projects)
        const blob = new Blob([md], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `deal-comparison-${new Date().toISOString().slice(0, 10)}.md`
        a.click()
        URL.revokeObjectURL(url)
    }, [projects])

    if (projects.length <= 1) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                        Project comparison
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Add more projects to compare deals side by side</p>
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
                return <span className="text-xs">{typeof v === 'number' ? money(v) : 'Not confirmed'}</span>
            },
        },
        {
            label: 'EBITDA / SDE',
            render: (p) => {
                const facts = parseDocumentedFacts(p.model.documentedFactsJson)
                const v = facts.ebitda_sde?.value
                return <span className="text-xs">{typeof v === 'number' ? money(v) : 'Not confirmed'}</span>
            },
        },
        {
            label: 'Asking price',
            render: (p) => <span className="text-xs">{typeof p.model.askingPrice === 'number' ? money(p.model.askingPrice) : 'Not confirmed'}</span>,
        },
        {
            label: 'Entry multiple',
            render: (p) => {
                const facts = parseDocumentedFacts(p.model.documentedFactsJson)
                const ebitda = facts.ebitda_sde?.value
                const price = p.model.askingPrice
                if (typeof price !== 'number' || typeof ebitda !== 'number' || ebitda === 0) return <span className="text-xs text-muted-foreground">N/A</span>
                return <span className="text-xs">{(price / ebitda).toFixed(1)}x</span>
            },
        },
        {
            label: 'Valuation',
            render: (p) => {
                const val = p.synthesis?.valuationBaseEstimate
                if (!val || val === '0') return <span className="text-xs text-muted-foreground">Pending</span>
                const num = parseFloat(val.replace(/[^0-9.]/g, ''))
                const suffix = /m$/i.test(val) ? 'M' : /b$/i.test(val) ? 'B' : /k$/i.test(val) ? 'K' : ''
                return <span className="text-xs font-medium">{suffix ? `$${num}${suffix}` : money(num)}</span>
            },
        },
        {
            label: 'Confidence',
            render: (p) => {
                const raw = p.synthesis?.valuationConfidence || p.synthesis?.aiConfidence
                if (!raw) return <span className="text-xs text-muted-foreground">—</span>
                const conf = parseFloat(raw)
                if (!Number.isFinite(conf)) return <span className="text-xs text-muted-foreground">—</span>
                const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf)
                const color = pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
                return <span className={`text-xs font-medium ${color}`}>{pct}%</span>
            },
        },
        {
            label: 'Documents',
            render: (p) => <span className="text-xs">{p.completedDocuments}/{p.documentsCount} processed</span>,
        },
        {
            label: 'Synthesis',
            render: (p) => {
                const ready = p.synthesis && p.synthesis.finalJudgmentSummary.trim().length > 0
                return ready
                    ? <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">Ready</span>
                    : <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Pending</span>
            },
        },
    ]

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                        Project comparison
                    </CardTitle>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleExport}>
                        <Download className="h-3 w-3" />
                        Export comparison
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="pb-2 pr-3 text-xs font-medium text-muted-foreground" />
                            {projects.map((p) => (
                                <th key={p.projectId} className={`cursor-pointer pb-2 px-3 text-xs font-semibold text-foreground transition-colors hover:text-primary ${p.projectId === activeProjectId ? 'bg-primary/5 rounded-t-md' : ''}`} onClick={() => onSelectProject(p.projectId)}>
                                    {p.projectName}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.label} className="border-b border-border last:border-0">
                                <td className="py-2 pr-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{row.label}</td>
                                {projects.map((p) => (
                                    <td key={p.projectId} className={`py-2 px-3 ${p.projectId === activeProjectId ? 'bg-primary/5' : ''}`}>
                                        {row.render(p)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}
