import { useState } from 'react'
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'

type ChangelogEntry = {
    date: string
    title: string
    description: string
    category: 'feature' | 'improvement' | 'fix'
}

const CHANGELOG: ChangelogEntry[] = [
    { date: '2026-07-25', title: 'Document coverage matrix', description: '10-category coverage grid showing which standard diligence document types have been uploaded.', category: 'feature' },
    { date: '2026-07-25', title: 'Risk concentration map', description: 'Visual breakdown of findings by business category (Revenue, Customer, Debt, Legal, People, Margins, Growth) with severity coloring.', category: 'feature' },
    { date: '2026-07-25', title: 'Project comparison table', description: 'Side-by-side comparison of multiple deals showing key metrics, risk level, and document progress.', category: 'feature' },
    { date: '2026-07-25', title: 'Always-on valuation', description: 'Synthesis now always shows a valuation range with confidence badges. No more blank $0 values.', category: 'improvement' },
    { date: '2026-07-25', title: 'Command palette (Ctrl+K)', description: 'Quick-switch between tabs, toggle theme, export, and more from a searchable command bar.', category: 'feature' },
    { date: '2026-07-25', title: 'Notification center', description: 'Bell icon in toolbar shows recent document processing and synthesis completion events with timestamps.', category: 'feature' },
    { date: '2026-07-25', title: 'Deal readiness gauge', description: '7-milestone progress indicator tracking documents, revenue, EBITDA, price, synthesis, and valuation completion.', category: 'feature' },
    { date: '2026-07-25', title: 'AI Deal Assistant chatbot', description: 'Floating chat panel (bottom-left) answers questions about risks, valuation, negotiation, and missing docs using your project data.', category: 'feature' },
    { date: '2026-07-25', title: 'Deal export (Markdown + JSON)', description: 'Download your deal summary as a Markdown report or raw JSON from the Export button in the toolbar.', category: 'feature' },
    { date: '2026-07-25', title: 'Optional sign-in', description: 'Sign in with name/email/team from the header. No login required to use the app.', category: 'feature' },
    { date: '2026-07-25', title: 'Industry benchmarks placeholder', description: 'Shows where benchmark comparisons will appear once a data source is connected.', category: 'feature' },
    { date: '2026-07-25', title: 'Cost per run estimates', description: 'Estimated LLM costs per document and synthesis run shown on Overview.', category: 'feature' },
    { date: '2026-07-25', title: 'Keyboard shortcuts', description: 'Press ? to see available shortcuts. Esc closes drawers and panels.', category: 'improvement' },
    { date: '2026-07-25', title: 'n8n workflow sticky notes', description: 'Added explanatory notes to 4 key n8n workflows for easier navigation.', category: 'improvement' },
    { date: '2026-07-24', title: 'Dark mode toggle', description: 'Light/Dark/Auto theme in the header toolbar. Persists across sessions.', category: 'feature' },
    { date: '2026-07-24', title: 'EBITDA waterfall chart', description: 'Visual revenue → expenses → EBITDA → add-backs → adjusted EBITDA flow chart.', category: 'feature' },
    { date: '2026-07-24', title: 'Buyer profile card', description: 'Optional buyer details with transparent acquisition-fit reasoning.', category: 'feature' },
    { date: '2026-07-24', title: 'Recurring vs one-time card', description: 'Quality-of-earnings check classifying findings as recurring or one-time.', category: 'feature' },
    { date: '2026-07-24', title: 'Model assumptions summary', description: 'Shows saved assumptions at the top of every quantitative tab with jump-to-edit.', category: 'improvement' },
    { date: '2026-07-24', title: 'Mobile responsiveness', description: 'KPI grid and cards now display properly on phones and tablets.', category: 'fix' },
    { date: '2026-07-24', title: 'Code-splitting (52% bundle reduction)', description: 'Lazy-loaded 22+ components. Initial load dropped from 1,315KB to 628KB.', category: 'improvement' },
]

const CATEGORY_BADGE: Record<ChangelogEntry['category'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
    feature: { label: 'New', variant: 'default' },
    improvement: { label: 'Improved', variant: 'secondary' },
    fix: { label: 'Fixed', variant: 'outline' },
}

export default function WhatsNewCard() {
    const [expanded, setExpanded] = useState(false)
    const visible = expanded ? CHANGELOG : CHANGELOG.slice(0, 5)

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80 pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">What's new</CardTitle>
                    </div>
                    <Badge variant="secondary">{CHANGELOG.length} updates</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-border">
                    {visible.map((entry, i) => {
                        const badge = CATEGORY_BADGE[entry.category]
                        return (
                            <div key={i} className="flex gap-3 px-4 py-3">
                                <div className="mt-0.5 shrink-0">
                                    <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{entry.description}</p>
                                </div>
                                <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">{entry.date.slice(5)}</span>
                            </div>
                        )
                    })}
                </div>
                {CHANGELOG.length > 5 && (
                    <div className="border-t border-border px-4 py-2">
                        <Button variant="ghost" size="sm" className="w-full gap-1 text-xs" onClick={() => setExpanded(!expanded)}>
                            {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {CHANGELOG.length} updates</>}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
