import { useEffect, useState, useCallback, useRef } from 'react'
import { List, ChevronRight, ChevronLeft } from 'lucide-react'

type TOCSection = {
    id: string
    label: string
    indent?: boolean
}

type WorkspaceTab = 'overview' | 'analysis' | 'diligence' | 'synthesis' | 'spending' | 'compare' | 'valuation' | 'returns' | 'growth' | 'structure' | 'negotiation' | 'documents' | 'history' | 'errors' | 'email' | 'evals' | 'faqs'

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

export default function TabSidebarTOC({ activeTab }: { activeTab: WorkspaceTab }) {
    const [activeSection, setActiveSection] = useState<string>('')
    const [isCollapsed, setIsCollapsed] = useState(false)
    const observerRef = useRef<IntersectionObserver | null>(null)

    const sections = TAB_SECTIONS[activeTab]

    const scrollToSection = useCallback((sectionId: string) => {
        const element = document.getElementById(sectionId)
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
            setActiveSection(sectionId)
        }
    }, [])

    useEffect(() => {
        if (!sections) return

        observerRef.current?.disconnect()

        const visibleSections = new Map<string, boolean>()
        observerRef.current = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    visibleSections.set(entry.target.id, entry.isIntersecting)
                }
                for (const section of sections) {
                    if (visibleSections.get(section.id)) {
                        setActiveSection(section.id)
                        break
                    }
                }
            },
            { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
        )

        for (const section of sections) {
            const el = document.getElementById(section.id)
            if (el) observerRef.current.observe(el)
        }

        return () => { observerRef.current?.disconnect() }
    }, [sections, activeTab])

    if (!sections || sections.length === 0) return null

    if (isCollapsed) {
        return (
            <div className="fixed right-3 top-1/3 z-30 hidden xl:block print:hidden">
                <button
                    type="button"
                    onClick={() => setIsCollapsed(false)}
                    className="flex items-center gap-1 rounded-lg border border-border/80 bg-card/95 px-2 py-2 text-xs font-medium text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground"
                    title="Show table of contents"
                >
                    <List className="h-3.5 w-3.5" />
                    <ChevronLeft className="h-3 w-3" />
                </button>
            </div>
        )
    }

    return (
        <aside className="fixed right-3 top-1/4 z-30 hidden w-44 xl:block print:hidden">
            <nav className="rounded-xl border border-border/80 bg-card/95 shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">On this tab</span>
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(true)}
                        className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        title="Collapse sidebar"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </div>
                <ul className="max-h-[60vh] overflow-y-auto p-1.5">
                    {sections.map((section) => {
                        const isActive = activeSection === section.id
                        return (
                            <li key={section.id}>
                                <button
                                    type="button"
                                    onClick={() => scrollToSection(section.id)}
                                    className={`w-full rounded-md px-2.5 py-1.5 text-left text-[11px] leading-tight transition-colors ${
                                        section.indent ? 'pl-4' : ''
                                    } ${
                                        isActive
                                            ? 'bg-primary/10 font-semibold text-primary'
                                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
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
