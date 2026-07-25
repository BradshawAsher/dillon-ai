import { GitCompareArrows } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
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

export default function ProjectComparisonCard({ projects, activeProjectId, onSelectProject }: ProjectComparisonCardProps) {
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
                <CardTitle className="flex items-center gap-2 text-base">
                    <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
                    Project comparison
                </CardTitle>
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
