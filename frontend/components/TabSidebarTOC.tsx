import { useEffect, useState, useCallback, useRef } from 'react'
import { List, ChevronRight, ChevronLeft, Bookmark, Navigation, GripVertical, RotateCcw } from 'lucide-react'

type TOCSection = {
    id: string
    label: string
    indent?: boolean
}

export type WorkspaceTab = 'overview' | 'analysis' | 'diligence' | 'synthesis' | 'spending' | 'compare' | 'valuation' | 'returns' | 'growth' | 'structure' | 'negotiation' | 'documents' | 'history' | 'errors' | 'email' | 'evals' | 'faqs'

const TAB_SECTIONS: Partial<Record<WorkspaceTab, TOCSection[]>> = {
    overview: [
        { id: 'overview-snapshot', label: 'Deal Snapshot' },
        { id: 'overview-health', label: 'Health KPIs' },
        { id: 'overview-actions', label: 'Action Items' },
        { id: 'overview-timeline', label: 'Timeline' },
    ],
    analysis: [
        { id: 'analysis-deal-on-a-page', label: '1-Pager' },
        { id: 'analysis-scorecard', label: 'Scorecard' },
        { id: 'analysis-snapshot', label: 'Snapshot' },
        { id: 'analysis-opportunity', label: 'Opportunity' },
        { id: 'analysis-risk-valuation', label: 'Risk Val.' },
        { id: 'analysis-next-actions', label: 'Next Steps' },
        { id: 'analysis-readiness', label: 'Readiness' },
        { id: 'analysis-coverage', label: 'Coverage' },
        { id: 'analysis-scorecard-breakdown', label: 'Score Breakdown' },
        { id: 'analysis-rules', label: 'Rules' },
        { id: 'analysis-confidence', label: 'Confidence' },
        { id: 'analysis-health', label: 'Fin. Health' },
        { id: 'analysis-ebitda-quality', label: 'EBITDA QoE' },
        { id: 'analysis-benchmark', label: 'Benchmark' },
        { id: 'analysis-position', label: 'Market Pos.' },
        { id: 'analysis-assumption-gaps', label: 'Gaps' },
        { id: 'analysis-whats-missing', label: 'Missing' },
        { id: 'analysis-market-comps', label: 'Comps' },
        { id: 'analysis-financing-scenarios', label: 'Financing' },
        { id: 'analysis-metrics', label: 'KPIs' },
        { id: 'analysis-percentile', label: 'Percentile' },
        { id: 'analysis-deal-type', label: 'Deal Type' },
        { id: 'analysis-fit', label: 'Deal Fit' },
        { id: 'analysis-asset-comp', label: 'Assets' },
        { id: 'analysis-val-gap', label: 'Val. Gap' },
        { id: 'analysis-cash-on-cash', label: 'Cash-on-Cash' },
        { id: 'analysis-val-evolution', label: 'Value Evol.' },
        { id: 'analysis-revenue-bridge', label: 'Rev. Bridge' },
        { id: 'analysis-base-returns', label: 'Returns' },
        { id: 'analysis-growth-sensitivity', label: 'Sensitivity' },
        { id: 'analysis-monte-carlo', label: 'Monte Carlo' },
        { id: 'analysis-breakeven', label: 'Breakeven' },
        { id: 'analysis-quick-insights', label: 'Insights' },
        { id: 'analysis-thesis', label: 'Thesis' },
        { id: 'analysis-decision', label: 'Decision' },
        { id: 'analysis-quick-wins', label: 'Quick Wins' },
        { id: 'analysis-strengths', label: 'Strengths' },
        { id: 'analysis-risk-summary', label: 'Risk Summary' },
        { id: 'analysis-risk-matrix', label: 'Risk Matrix' },
        { id: 'analysis-key-person', label: 'Key Person' },
        { id: 'analysis-owner-dep', label: 'Owner Dep.' },
        { id: 'analysis-diligence-comp', label: 'DD Complete' },
        { id: 'analysis-risk-reward', label: 'Risk/Reward' },
        { id: 'analysis-deal-killer', label: 'Deal Killer' },
        { id: 'analysis-second-opinion', label: '2nd Opinion' },
        { id: 'analysis-alert-rules', label: 'Alert Rules' },
        { id: 'analysis-time-to-close', label: 'Time2Close' },
        { id: 'analysis-closing-checklist', label: 'Closing' },
        { id: 'analysis-seller-qa', label: 'Seller Q&A' },
        { id: 'analysis-mgmt-questions', label: 'Mgmt Qs' },
        { id: 'analysis-playbook', label: 'Playbook' },
        { id: 'analysis-negotiation-impact', label: 'Neg. Impact' },
        { id: 'analysis-deal-timing', label: 'Deal Timing' },
        { id: 'analysis-timeline', label: 'Timeline' },
        { id: 'analysis-investor-readiness', label: 'Investor Read' },
        { id: 'analysis-term-sheet', label: 'Term Sheet' },
        { id: 'analysis-dd-requests', label: 'DD Requests' },
        { id: 'analysis-activity-feed', label: 'Activity' },
        { id: 'analysis-public-data', label: 'Public Data' },
    ],
    diligence: [
        { id: 'diligence-project-synth', label: 'Synthesis' },
        { id: 'diligence-documents', label: 'Readiness' },
        { id: 'diligence-quality', label: 'Data Quality' },
        { id: 'diligence-context', label: 'Deal Context' },
    ],
    synthesis: [
        { id: 'synthesis-judgment', label: 'Judgment' },
        { id: 'synthesis-next-step', label: 'Next Step' },
        { id: 'synthesis-valuation', label: 'Valuation Range' },
        { id: 'synthesis-loi-status', label: 'LOI Status' },
        { id: 'synthesis-material-impact', label: 'Material Impact' },
        { id: 'synthesis-filters', label: 'Findings' },
        { id: 'synthesis-red-flags', label: 'Red Flags', indent: true },
        { id: 'synthesis-yellow-flags', label: 'Yellow Flags', indent: true },
        { id: 'synthesis-green-flags', label: 'Green Flags', indent: true },
        { id: 'synthesis-takeaways', label: 'Takeaways', indent: true },
        { id: 'synthesis-doc-thesis', label: 'Doc Thesis', indent: true },
        { id: 'synthesis-conflicts', label: 'Conflicts', indent: true },
        { id: 'synthesis-negotiation', label: 'Levers', indent: true },
        { id: 'synthesis-missing-docs', label: 'Missing Docs', indent: true },
        { id: 'synthesis-mgmt-questions', label: 'Mgmt Questions', indent: true },
        { id: 'synthesis-cross-doc', label: 'Cross-Doc Matrix' },
        { id: 'synthesis-pipeline-metrics', label: 'Coverage Metrics' },
    ],
    documents: [
        { id: 'docs-upload', label: 'Upload' },
        { id: 'docs-table', label: 'Documents' },
        { id: 'docs-extraction', label: 'Extraction' },
    ],
    compare: [
        { id: 'compare-matrix', label: 'Deal Matrix' },
        { id: 'compare-charts', label: 'Comparisons' },
        { id: 'compare-rankings', label: 'Rankings' },
    ],
    valuation: [
        { id: 'valuation-summary', label: 'Valuation Summary' },
        { id: 'valuation-multiples', label: 'Multiple Explorer' },
        { id: 'valuation-dcf', label: 'DCF Model' },
        { id: 'valuation-precedent', label: 'Precedents' },
    ],
    returns: [
        { id: 'returns-summary', label: 'Returns Summary' },
        { id: 'returns-waterfall', label: 'Waterfall' },
        { id: 'returns-sensitivity', label: 'Sensitivity Matrix' },
        { id: 'returns-cashflow', label: 'Cash Flow Forecast' },
    ],
    growth: [
        { id: 'growth-projections', label: 'Projections' },
        { id: 'growth-scenarios', label: 'Scenarios' },
        { id: 'growth-drivers', label: 'Growth Drivers' },
    ],
    structure: [
        { id: 'structure-sources-uses', label: 'Sources & Uses' },
        { id: 'structure-debt-schedule', label: 'Debt Schedule' },
        { id: 'structure-covenants', label: 'Covenants' },
    ],
    negotiation: [
        { id: 'negotiation-levers', label: 'Levers' },
        { id: 'negotiation-impact', label: 'Price Impact' },
        { id: 'negotiation-playbook', label: 'Playbook' },
    ],
    spending: [
        { id: 'spending-model', label: 'Cost Breakdown' },
        { id: 'spending-api-calls', label: 'API Calls' },
        { id: 'spending-forecast', label: 'Cost Forecast' },
    ],
    history: [
        { id: 'history-timeline', label: 'Timeline' },
        { id: 'history-versions', label: 'Versions' },
    ],
    errors: [
        { id: 'errors-summary', label: 'Summary' },
        { id: 'errors-list', label: 'Error Log' },
    ],
    email: [
        { id: 'email-templates', label: 'Templates' },
        { id: 'email-logs', label: 'Sent Logs' },
    ],
    evals: [
        { id: 'evals-benchmarks', label: 'Benchmarks' },
        { id: 'evals-accuracy', label: 'Accuracy' },
        { id: 'evals-latency', label: 'Latency' },
    ],
    faqs: [
        { id: 'faq-general', label: 'General' },
        { id: 'faq-methodology', label: 'Methodology' },
        { id: 'faq-troubleshooting', label: 'Help' },
    ],
}

/**
 * Top-of-Tab Horizontal Section Navigation Bar (Prominent TOC)
 * Renders cleanly at the top of active workspace tabs for high visibility.
 */
export function TabTopNavTOC({ activeTab }: { activeTab: WorkspaceTab }) {
    const sections = TAB_SECTIONS[activeTab]
    const [activeSection, setActiveSection] = useState<string>('')

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setActiveSection(sectionId)
        }
    }

    if (!sections || sections.length === 0) return null

    return (
        <div className="mb-4 rounded-xl border border-primary/30 bg-card p-3 shadow-md">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-primary pr-2 border-r border-border shrink-0">
                    <Navigation className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>Table of Contents ({sections.length})</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 flex-1 overflow-x-auto py-0.5">
                    {sections.map((sec) => {
                        const isActive = activeSection === sec.id
                        return (
                            <button
                                key={sec.id}
                                type="button"
                                onClick={() => scrollToSection(sec.id)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                }`}
                            >
                                {sec.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

type Props = {
    activeTab: WorkspaceTab
}

export default function TabSidebarTOC({ activeTab }: Props) {
    const [activeSection, setActiveSection] = useState<string>('')
    const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
    const [topOffset, setTopOffset] = useState<number | null>(() => {
        if (typeof window === 'undefined') return null
        try {
            const stored = localStorage.getItem('mergeworks.tocTop')
            if (stored) {
                const parsed = parseInt(stored, 10)
                if (!Number.isNaN(parsed)) {
                    return Math.max(64, Math.min(window.innerHeight - 200, parsed))
                }
            }
        } catch { }
        return null
    })

    const observerRef = useRef<IntersectionObserver | null>(null)
    const dragYRef = useRef<{ startY: number; startTop: number } | null>(null)
    const sections = TAB_SECTIONS[activeTab] || []

    useEffect(() => {
        if (topOffset != null) {
            try { localStorage.setItem('mergeworks.tocTop', String(topOffset)) } catch { }
        } else {
            try { localStorage.removeItem('mergeworks.tocTop') } catch { }
        }
    }, [topOffset])

    const handleDragPointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
        const currentTop = topOffset ?? 128
        dragYRef.current = {
            startY: e.clientY,
            startTop: currentTop,
        }
        try {
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        } catch { }
    }

    const handleDragPointerMove = (e: React.PointerEvent) => {
        if (!dragYRef.current) return
        const deltaY = e.clientY - dragYRef.current.startY
        const nextTop = Math.max(64, Math.min(window.innerHeight - 200, dragYRef.current.startTop + deltaY))
        setTopOffset(Math.round(nextTop))
    }

    const handleDragPointerUp = (e: React.PointerEvent) => {
        if (!dragYRef.current) return
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
        } catch { }
        dragYRef.current = null
    }

    const handleResetPosition = () => {
        setTopOffset(null)
    }

    const scrollToSection = useCallback((sectionId: string) => {
        const el = document.getElementById(sectionId)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setActiveSection(sectionId)
        }
    }, [])

    useEffect(() => {
        if (!sections || sections.length === 0) return

        observerRef.current?.disconnect()

        observerRef.current = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id)
                        break
                    }
                }
            },
            { rootMargin: '-80px 0px -40% 0px', threshold: 0.05 }
        )

        for (const section of sections) {
            const el = document.getElementById(section.id)
            if (el) {
                observerRef.current.observe(el)
            }
        }

        return () => {
            observerRef.current?.disconnect()
        }
    }, [sections, activeTab])

    if (!sections || sections.length === 0) return null

    if (isCollapsed) {
        return (
            <div
                className={`fixed left-0 z-40 print:hidden ${topOffset == null ? 'top-32' : ''}`}
                style={topOffset != null ? { top: `${topOffset}px` } : undefined}
            >
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    className="flex items-center gap-1.5 rounded-r-lg border border-l-0 border-primary/50 bg-background/95 px-2 py-1.5 text-xs font-bold text-primary shadow-xl backdrop-blur-md transition-all hover:bg-primary/10 hover:pr-2.5 cursor-pointer group"
                    title="Show Table of Contents"
                >
                    <List className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="hidden sm:inline text-xs font-bold">TOC</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        )
    }

    return (
        <aside
            className={`fixed left-0 z-50 w-[4.25rem] print:hidden ${topOffset == null ? 'top-32' : ''}`}
            style={topOffset != null ? { top: `${topOffset}px` } : undefined}
        >
            <nav className="rounded-r-lg border border-l-0 border-primary/40 bg-background/95 shadow-2xl backdrop-blur-md overflow-hidden">
                <div
                    onPointerDown={handleDragPointerDown}
                    onPointerMove={handleDragPointerMove}
                    onPointerUp={handleDragPointerUp}
                    className="flex items-center justify-between border-b border-border px-1.5 py-1 bg-primary/10 cursor-move select-none group"
                    title="Drag vertically to reposition TOC"
                >
                    <div className="flex items-center gap-0.5 min-w-0">
                        <GripVertical className="h-3 w-3 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary truncate">TOC</span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        {topOffset != null && (
                            <button
                                type="button"
                                onClick={handleResetPosition}
                                className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                                title="Reset TOC position"
                            >
                                <RotateCcw className="h-2.5 w-2.5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(true)}
                            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
                            title="Collapse Table of Contents"
                        >
                            <ChevronLeft className="h-3 w-3" />
                        </button>
                    </div>
                </div>
                <ul className="max-h-[92vh] overflow-y-auto p-0.5 space-y-0.5">
                    {sections.map((section) => {
                        const isActive = activeSection === section.id
                        return (
                            <li key={section.id}>
                                <button
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    title={section.label}
                                    className={`w-full rounded px-1 py-1 text-left text-[10px] font-semibold leading-tight transition-all cursor-pointer truncate ${
                                        section.indent ? 'pl-1.5 text-muted-foreground/80 font-medium' : ''
                                    } ${
                                        isActive
                                            ? 'border-l-2 border-primary bg-primary/15 font-bold text-primary shadow-2xs'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    {section.label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}
