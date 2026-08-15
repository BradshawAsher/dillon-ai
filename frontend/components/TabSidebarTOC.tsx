import { useEffect, useState, useCallback, useRef } from 'react'
import { List, ChevronRight, ChevronLeft, Navigation, GripVertical, RotateCcw } from 'lucide-react'

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
        { id: 'overview-timeline', label: 'Deal Timeline' },
    ],
    analysis: [
        { id: 'analysis-deal-on-a-page', label: 'Deal on a Page' },
        { id: 'analysis-scorecard', label: 'Deal Scorecard' },
        { id: 'analysis-snapshot', label: 'Business Snapshot' },
        { id: 'analysis-opportunity', label: 'Opportunity Score' },
        { id: 'analysis-risk-valuation', label: 'Risk-Adjusted Val.' },
        { id: 'analysis-next-actions', label: 'Deal Action Items' },
        { id: 'analysis-readiness', label: 'Deal Readiness' },
        { id: 'analysis-coverage', label: 'Doc Coverage' },
        { id: 'analysis-scorecard-breakdown', label: 'Score Breakdown' },
        { id: 'analysis-rules', label: 'Rules of Thumb' },
        { id: 'analysis-confidence', label: 'Confidence Meter' },
        { id: 'analysis-health', label: 'Financial Health' },
        { id: 'analysis-ebitda-quality', label: 'EBITDA QoE Score' },
        { id: 'analysis-benchmark', label: 'Benchmark Comp.' },
        { id: 'analysis-position', label: 'Market Position' },
        { id: 'analysis-assumption-gaps', label: 'Assumption Gaps' },
        { id: 'analysis-whats-missing', label: 'What’s Missing' },
        { id: 'analysis-market-comps', label: 'Market Comps' },
        { id: 'analysis-financing-scenarios', label: 'Financing Scenarios' },
        { id: 'analysis-metrics', label: 'Key Metrics Trend' },
        { id: 'analysis-percentile', label: 'Industry Percentile' },
        { id: 'analysis-deal-type', label: 'Deal Type Analysis' },
        { id: 'analysis-fit', label: 'Deal Fit Analysis' },
        { id: 'analysis-asset-comp', label: 'Asset Composition' },
        { id: 'analysis-val-gap', label: 'Valuation Gap' },
        { id: 'analysis-cash-on-cash', label: 'Cash-on-Cash Calc' },
        { id: 'analysis-val-evolution', label: 'Value Evolution' },
        { id: 'analysis-revenue-bridge', label: 'Revenue Bridge' },
        { id: 'analysis-base-returns', label: 'Base Returns' },
        { id: 'analysis-growth-sensitivity', label: 'Growth Sensitivity' },
        { id: 'analysis-monte-carlo', label: 'Monte Carlo Sim' },
        { id: 'analysis-breakeven', label: 'Breakeven Analysis' },
        { id: 'analysis-quick-insights', label: 'Quick Insights' },
        { id: 'analysis-thesis', label: 'Investment Thesis' },
        { id: 'analysis-decision', label: 'Decision Framework' },
        { id: 'analysis-quick-wins', label: 'Quick Wins' },
        { id: 'analysis-strengths', label: 'Strengths & Weaknesses' },
        { id: 'analysis-risk-summary', label: 'Risk Summary' },
        { id: 'analysis-risk-matrix', label: 'Risk Matrix' },
        { id: 'analysis-key-person', label: 'Key Person Risk' },
        { id: 'analysis-owner-dep', label: 'Owner Dependency' },
        { id: 'analysis-diligence-comp', label: 'DD Completeness' },
        { id: 'analysis-risk-reward', label: 'Risk vs Reward' },
        { id: 'analysis-deal-killer', label: 'Deal Killer Check' },
        { id: 'analysis-second-opinion', label: 'Second Opinion' },
        { id: 'analysis-alert-rules', label: 'Alert Rules' },
        { id: 'analysis-time-to-close', label: 'Time to Close' },
        { id: 'analysis-closing-checklist', label: 'Closing Checklist' },
        { id: 'analysis-seller-qa', label: 'Seller Q&A' },
        { id: 'analysis-mgmt-questions', label: 'Mgmt Questions' },
        { id: 'analysis-playbook', label: 'Negotiation Playbook' },
        { id: 'analysis-negotiation-impact', label: 'Negotiation Impact' },
        { id: 'analysis-deal-timing', label: 'Deal Timing' },
        { id: 'analysis-timeline', label: 'Deal Timeline' },
        { id: 'analysis-investor-readiness', label: 'Investor Readiness' },
        { id: 'analysis-term-sheet', label: 'Term Sheet' },
        { id: 'analysis-dd-requests', label: 'DD Request List' },
        { id: 'analysis-activity-feed', label: 'Activity Feed' },
        { id: 'analysis-public-data', label: 'Public Data' },
    ],
    diligence: [
        { id: 'diligence-project-synth', label: 'Synthesis Pass' },
        { id: 'diligence-documents', label: 'Readiness Gate' },
        { id: 'diligence-quality', label: 'Data Quality' },
        { id: 'diligence-context', label: 'Deal Context' },
    ],
    synthesis: [
        { id: 'synthesis-judgment', label: 'Acquisition Judgment' },
        { id: 'synthesis-next-step', label: 'Immediate Next Steps' },
        { id: 'synthesis-valuation', label: 'Valuation Range' },
        { id: 'synthesis-loi-status', label: 'LOI Status' },
        { id: 'synthesis-material-impact', label: 'Material Diligence Impact' },
        { id: 'synthesis-filters', label: 'Key Diligence Findings' },
        { id: 'synthesis-red-flags', label: 'Red Flags', indent: true },
        { id: 'synthesis-yellow-flags', label: 'Yellow Flags', indent: true },
        { id: 'synthesis-green-flags', label: 'Green Flags', indent: true },
        { id: 'synthesis-takeaways', label: 'Executive Takeaways', indent: true },
        { id: 'synthesis-doc-thesis', label: 'Document Thesis', indent: true },
        { id: 'synthesis-conflicts', label: 'Document Conflicts', indent: true },
        { id: 'synthesis-negotiation', label: 'Negotiation Levers', indent: true },
        { id: 'synthesis-missing-docs', label: 'Missing Documents', indent: true },
        { id: 'synthesis-mgmt-questions', label: 'Management Questions', indent: true },
        { id: 'synthesis-cross-doc', label: 'Cross-Document Matrix' },
        { id: 'synthesis-pipeline-metrics', label: 'Extraction Metrics' },
    ],
    documents: [
        { id: 'docs-upload', label: 'VDR File Upload' },
        { id: 'docs-table', label: 'Documents Catalog' },
        { id: 'docs-extraction', label: 'Extraction Details' },
    ],
    compare: [
        { id: 'compare-matrix', label: 'Portfolio Deal Matrix' },
        { id: 'compare-charts', label: 'Valuation Comparisons' },
        { id: 'compare-rankings', label: 'Opportunity Rankings' },
    ],
    valuation: [
        { id: 'valuation-summary', label: 'Valuation Summary' },
        { id: 'valuation-multiples', label: 'Multiple Explorer' },
        { id: 'valuation-dcf', label: 'DCF Model' },
        { id: 'valuation-precedent', label: 'Precedent Comps' },
    ],
    returns: [
        { id: 'returns-summary', label: 'Returns Summary' },
        { id: 'returns-waterfall', label: 'Equity Waterfall' },
        { id: 'returns-sensitivity', label: 'Sensitivity Matrix' },
        { id: 'returns-cashflow', label: 'Cash Flow Forecast' },
    ],
    growth: [
        { id: 'growth-projections', label: 'Revenue Projections' },
        { id: 'growth-scenarios', label: 'Scenario Builder' },
        { id: 'growth-drivers', label: 'Growth Levers' },
    ],
    structure: [
        { id: 'structure-sources-uses', label: 'Sources & Uses' },
        { id: 'structure-debt-schedule', label: 'Debt Amortization' },
        { id: 'structure-covenants', label: 'Bank Covenants' },
    ],
    negotiation: [
        { id: 'negotiation-levers', label: 'Strategic Levers' },
        { id: 'negotiation-impact', label: 'Price Impact Bridge' },
        { id: 'negotiation-playbook', label: 'Negotiation Playbook' },
    ],
    spending: [
        { id: 'spending-model', label: 'AI Cost Breakdown' },
        { id: 'spending-api-calls', label: 'LLM Token Usage' },
        { id: 'spending-forecast', label: 'Budget Forecast' },
    ],
    history: [
        { id: 'history-timeline', label: 'Version Timeline' },
        { id: 'history-versions', label: 'Snapshot Versions' },
    ],
    errors: [
        { id: 'errors-summary', label: 'Pipeline Summary' },
        { id: 'errors-list', label: 'Workflow Error Log' },
    ],
    email: [
        { id: 'email-templates', label: 'Broker Email Templates' },
        { id: 'email-logs', label: 'Sent Outreach Logs' },
    ],
    evals: [
        { id: 'evals-benchmarks', label: 'Benchmark Models' },
        { id: 'evals-accuracy', label: 'Extraction Accuracy' },
        { id: 'evals-latency', label: 'Latency & Throughput' },
    ],
    faqs: [
        { id: 'faq-general', label: 'General Diligence' },
        { id: 'faq-methodology', label: 'Financial Methodology' },
        { id: 'faq-troubleshooting', label: 'Platform Guidance' },
    ],
}

/**
 * Top-of-Tab Horizontal Section Navigation Bar (Prominent TOC)
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
    const [tocWidth, setTocWidth] = useState<number>(() => {
        if (typeof window === 'undefined') return 185
        try {
            const stored = localStorage.getItem('mergeworks.tocWidth')
            if (stored) {
                const parsed = parseInt(stored, 10)
                if (!Number.isNaN(parsed)) {
                    return Math.max(140, Math.min(360, parsed))
                }
            }
        } catch { }
        return 185
    })

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
    const dragXRef = useRef<{ startX: number; startWidth: number } | null>(null)
    const sections = TAB_SECTIONS[activeTab] || []

    useEffect(() => {
        if (topOffset != null) {
            try { localStorage.setItem('mergeworks.tocTop', String(topOffset)) } catch { }
        } else {
            try { localStorage.removeItem('mergeworks.tocTop') } catch { }
        }
    }, [topOffset])

    useEffect(() => {
        try { localStorage.setItem('mergeworks.tocWidth', String(tocWidth)) } catch { }
    }, [tocWidth])

    // Keyboard shortcut: Alt+T to toggle collapse
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.altKey && (e.key === 't' || e.key === 'T')) {
                e.preventDefault()
                setIsCollapsed((prev) => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

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

    // Horizontal width resize drag handler
    const handleWidthPointerDown = (e: React.PointerEvent) => {
        e.preventDefault()
        dragXRef.current = {
            startX: e.clientX,
            startWidth: tocWidth,
        }
        try {
            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
        } catch { }
    }

    const handleWidthPointerMove = (e: React.PointerEvent) => {
        if (!dragXRef.current) return
        const deltaX = e.clientX - dragXRef.current.startX
        const nextWidth = Math.max(140, Math.min(360, dragXRef.current.startWidth + deltaX))
        setTocWidth(Math.round(nextWidth))
    }

    const handleWidthPointerUp = (e: React.PointerEvent) => {
        if (!dragXRef.current) return
        try {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
        } catch { }
        dragXRef.current = null
    }

    const handleResetAll = () => {
        setTopOffset(null)
        setTocWidth(185)
        try {
            localStorage.removeItem('mergeworks.tocTop')
            localStorage.removeItem('mergeworks.tocWidth')
        } catch { }
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
                    className="flex items-center gap-2 rounded-r-xl border border-l-0 border-primary/50 bg-background/95 px-3 py-2 text-xs font-bold text-primary shadow-2xl backdrop-blur-md transition-all hover:bg-primary/10 hover:pr-4 cursor-pointer group"
                    title="Open Table of Contents (Alt+T)"
                >
                    <List className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-xs font-bold tracking-tight">Table of Contents</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        )
    }

    return (
        <aside
            className={`fixed left-0 z-50 print:hidden ${topOffset == null ? 'top-32' : ''}`}
            style={{
                width: `${tocWidth}px`,
                top: topOffset != null ? `${topOffset}px` : undefined,
            }}
        >
            <nav className="relative rounded-r-xl border border-l-0 border-primary/40 bg-background/95 shadow-2xl backdrop-blur-md overflow-hidden">
                {/* Header with Drag and Actions */}
                <div
                    onPointerDown={handleDragPointerDown}
                    onPointerMove={handleDragPointerMove}
                    onPointerUp={handleDragPointerUp}
                    className="flex items-center justify-between border-b border-border px-2 py-1.5 bg-primary/10 cursor-move select-none group"
                    title="Drag vertically to reposition (Alt+T to toggle)"
                >
                    <div className="flex items-center gap-1 min-w-0">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors shrink-0" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary truncate">
                            Table of Contents
                        </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                            title="Reset position & width"
                        >
                            <RotateCcw className="h-3 w-3" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCollapsed(true)}
                            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer shrink-0"
                            title="Collapse Table of Contents (Alt+T)"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Section List */}
                <ul className="max-h-[85vh] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                    {sections.map((section) => {
                        const isActive = activeSection === section.id
                        return (
                            <li key={section.id}>
                                <button
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    title={section.label}
                                    className={`w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold leading-snug transition-all cursor-pointer whitespace-normal break-words ${
                                        section.indent ? 'pl-3 text-muted-foreground/80 font-medium' : ''
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

                {/* Right Edge Resize Handle */}
                <div
                    onPointerDown={handleWidthPointerDown}
                    onPointerMove={handleWidthPointerMove}
                    onPointerUp={handleWidthPointerUp}
                    className="absolute top-0 right-0 bottom-0 w-2 cursor-ew-resize hover:bg-primary/30 transition-colors z-20 group"
                    title="Drag horizontally to resize width"
                >
                    <div className="h-full w-0.5 ml-auto bg-transparent group-hover:bg-primary/50" />
                </div>
            </nav>
        </aside>
    )
}
