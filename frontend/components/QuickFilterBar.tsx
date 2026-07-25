import { AlertTriangle, CircleHelp, FileX, Flag, ShieldAlert } from 'lucide-react'

import type { ProjectSynthesisItem } from '../hooks/backend/diligence'

type QuickFilter = {
    id: string
    label: string
    count: number
    icon: React.ReactNode
    variant: 'destructive' | 'warning' | 'secondary'
}

export default function QuickFilterBar({ synthesis, onJumpTo }: { synthesis: ProjectSynthesisItem | undefined; onJumpTo: (target: 'red-flags' | 'open-questions' | 'missing-docs' | 'conflicts' | 'negotiation') => void }) {
    if (!synthesis) return null

    const filters: QuickFilter[] = [
        {
            id: 'red-flags',
            label: 'Red flags',
            count: synthesis.redFlags.length,
            icon: <Flag className="h-3.5 w-3.5" />,
            variant: 'destructive',
        },
        {
            id: 'conflicts',
            label: 'Conflicts',
            count: synthesis.crossDocumentConflicts.length,
            icon: <ShieldAlert className="h-3.5 w-3.5" />,
            variant: 'destructive',
        },
        {
            id: 'open-questions',
            label: 'Open questions',
            count: synthesis.openQuestions.length,
            icon: <CircleHelp className="h-3.5 w-3.5" />,
            variant: 'warning',
        },
        {
            id: 'missing-docs',
            label: 'Missing docs',
            count: synthesis.missingDocuments.length,
            icon: <FileX className="h-3.5 w-3.5" />,
            variant: 'warning',
        },
        {
            id: 'negotiation',
            label: 'Levers',
            count: synthesis.negotiationLevers.length,
            icon: <AlertTriangle className="h-3.5 w-3.5" />,
            variant: 'secondary',
        },
    ]

    const activeFilters = filters.filter((f) => f.count > 0)
    if (activeFilters.length === 0) return null

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Jump to:</span>
            {activeFilters.map((filter) => (
                <button
                    key={filter.id}
                    type="button"
                    onClick={() => onJumpTo(filter.id as 'red-flags' | 'open-questions' | 'missing-docs' | 'conflicts' | 'negotiation')}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:border-primary/50 ${
                        filter.variant === 'destructive'
                            ? 'border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10'
                            : filter.variant === 'warning'
                                ? 'border-warning/30 bg-warning/5 text-warning hover:bg-warning/10'
                                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                    }`}
                >
                    {filter.icon}
                    <span>{filter.label}</span>
                    <span className="ml-0.5 rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] font-bold">{filter.count}</span>
                </button>
            ))}
        </div>
    )
}
