import { useEffect, useState, useCallback, useRef } from 'react'
import { List, ChevronRight, ChevronLeft, Bookmark, Navigation } from 'lucide-react'

type TOCSection = {
    id: string
    label: string
    indent?: boolean
}

export type WorkspaceTab = 'overview' | 'analysis' | 'diligence' | 'synthesis' | 'spending' | 'compare' | 'valuation' | 'returns' | 'growth' | 'structure' | 'negotiation' | 'documents' | 'history' | 'errors' | 'email' | 'evals' | 'faqs'

const TAB_SECTIONS: Partial<Record<WorkspaceTab, TOCSection[]>> = {
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
        { id: 'synthesis-open-questions', label: 'Open Questions', indent: true },
        { id: 'synthesis-citations', label: 'Citations' },
        { id: 'synthesis-management-questions', label: 'Mgmt Questions' },
    ],
    valuation: [
        { id: 'valuation-header', label: 'Valuation Summary' },
        { id: 'valuation-quick', label: 'Quick Valuation' },
        { id: 'valuation-comps', label: 'Comparables' },
        { id: 'valuation-gap', label: 'Valuation Gap' },
        { id: 'valuation-sensitivity', label: 'Sensitivity' },
        { id: 'valuation-risk-adjusted', label: 'Risk-Adjusted' },
        { id: 'valuation-monte-carlo', label: 'Monte Carlo' },
    ],
    returns: [
        { id: 'returns-header', label: 'Returns Summary' },
        { id: 'returns-base', label: 'Base Metrics' },
        { id: 'returns-all-cash', label: 'All-Cash' },
        { id: 'returns-financed', label: 'Financed' },
        { id: 'returns-cash-on-cash', label: 'Cash-on-Cash' },
        { id: 'returns-payback', label: 'Payback Timeline' },
        { id: 'returns-hold-period', label: 'Hold Period' },
        { id: 'returns-scenario', label: 'Scenario Comparison' },
    ],
    analysis: [
        { id: 'analysis-header', label: 'Analysis Summary' },
        { id: 'analysis-deal-grade', label: 'Deal Grade' },
        { id: 'analysis-fit', label: 'Deal Fit' },
        { id: 'analysis-strengths', label: 'Strengths & Weak.' },
        { id: 'analysis-risks', label: 'Risk Matrix' },
        { id: 'analysis-thesis', label: 'Investment Thesis' },
    ],
    diligence: [
        { id: 'diligence-batch', label: 'Batch Progress' },
        { id: 'diligence-upload', label: 'File Upload' },
        { id: 'diligence-project-synth', label: 'Project Synthesis' },
        { id: 'diligence-documents', label: 'Documents' },
    ],
    overview: [
        { id: 'overview-snapshot', label: 'Deal Snapshot' },
        { id: 'overview-health', label: 'Health KPIs' },
        { id: 'overview-actions', label: 'Action Items' },
        { id: 'overview-timeline', label: 'Timeline' },
    ],
    growth: [
        { id: 'growth-header', label: 'Growth Summary' },
        { id: 'growth-revenue-bridge', label: 'Revenue Bridge' },
        { id: 'growth-sensitivity', label: 'Sensitivity' },
        { id: 'growth-leverage', label: 'Operating Leverage' },
        { id: 'growth-value-creation', label: 'Value Creation' },
    ],
    structure: [
        { id: 'structure-header', label: 'Structure Summary' },
        { id: 'structure-financing', label: 'Financing' },
        { id: 'structure-closing', label: 'Closing Checklist' },
        { id: 'structure-term-sheet', label: 'Term Sheet' },
    ],
    negotiation: [
        { id: 'negotiation-header', label: 'Negotiation Summary' },
        { id: 'negotiation-playbook', label: 'Playbook' },
        { id: 'negotiation-seller', label: 'Seller Questions' },
        { id: 'negotiation-impact', label: 'Impact Analysis' },
    ],
    evals: [
        { id: 'evals-header', label: 'Evals Overview' },
        { id: 'evals-deal-cards', label: 'Deal Cards' },
        { id: 'evals-harness', label: 'Harness Controls' },
        { id: 'evals-doc-viewer', label: 'Doc Viewer' },
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

export default function TabSidebarTOC({ activeTab }: { activeTab: WorkspaceTab }) {
    const [activeSection, setActiveSection] = useState<string>('')
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set())
    const observerRef = useRef<IntersectionObserver | null>(null)
    const mutationRef = useRef<MutationObserver | null>(null)

    const sections = TAB_SECTIONS[activeTab]

    const scrollToSection = useCallback((sectionId: string) => {
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setActiveSection(sectionId)
        }
    }, [])

    const syncObserver = useCallback(() => {
        if (!sections) return

        observerRef.current?.disconnect()

        const nowPresent = new Set<string>()
        const visibleSections = new Map<string, boolean>()

        observerRef.current = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    visibleSections.set(entry.target.id, entry.isIntersecting)
                }
                for (const section of sections) {
                    if (visibleSections.get(section.id)) {
                        setActiveSection(section.id)
                        return
                    }
                }
            },
            { rootMargin: '-60px 0px -50% 0px', threshold: 0.1 }
        )

        for (const section of sections) {
            const el = document.getElementById(section.id)
            if (el) {
                nowPresent.add(section.id)
                observerRef.current.observe(el)
            }
        }

        setPresentIds(nowPresent)
    }, [sections])

    useEffect(() => {
        if (!sections) return

        const timeout = setTimeout(syncObserver, 150)

        mutationRef.current?.disconnect()
        mutationRef.current = new MutationObserver(() => {
            syncObserver()
        })
        mutationRef.current.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false,
        })

        return () => {
            clearTimeout(timeout)
            observerRef.current?.disconnect()
            mutationRef.current?.disconnect()
        }
    }, [sections, activeTab, syncObserver])

    if (!sections || sections.length === 0) return null

    const visibleSections = sections.filter((s) => presentIds.has(s.id))
    if (visibleSections.length === 0) return null

    if (isCollapsed) {
        return (
            <div className="fixed left-0 top-32 z-40 print:hidden">
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    className="flex items-center gap-2 rounded-r-xl border border-l-0 border-primary/50 bg-background/95 px-3 py-2.5 text-xs font-bold text-primary shadow-xl backdrop-blur-md transition-all hover:bg-primary/10 hover:pr-4 cursor-pointer group"
                    title="Show Table of Contents"
                >
                    <List className="h-4 w-4 shrink-0 text-primary" />
                    <span className="hidden sm:inline">Table of Contents ({visibleSections.length})</span>
                    <ChevronRight className="h-3.5 w-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        )
    }

    return (
        <aside className="fixed left-0 top-32 z-50 w-60 print:hidden">
            <nav className="rounded-r-2xl border border-l-0 border-primary/40 bg-background/95 shadow-2xl backdrop-blur-md overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5 bg-primary/10">
                    <div className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-primary">Table of Contents</span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                        title="Collapse Table of Contents"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                </div>
                <ul className="max-h-[60vh] overflow-y-auto p-2 space-y-0.5">
                    {visibleSections.map((section) => {
                        const isActive = activeSection === section.id
                        return (
                            <li key={section.id}>
                                <button
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    className={`w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium leading-tight transition-all cursor-pointer ${
                                        section.indent ? 'pl-5' : ''
                                    } ${
                                        isActive
                                            ? 'border-l-2 border-primary bg-primary/15 font-bold text-primary shadow-sm'
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
