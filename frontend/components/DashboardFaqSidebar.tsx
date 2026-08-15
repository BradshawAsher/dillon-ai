import React, { useEffect, useState } from 'react'
import {
    HelpCircle,
    Search,
    X,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    BookOpen,
    Sparkles,
    CheckCircle2,
    Layers,
    SlidersHorizontal,
    FileText,
    Zap,
    ShieldCheck,
    ArrowRight,
    MessageSquare,
    Bot,
} from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Input } from '../lib/shadcn/input'
import { Badge } from '../lib/shadcn/badge'
import { Card, CardContent } from '../lib/shadcn/card'
import { type WorkspaceTab } from '../hooks/useDealWorkspaceState'
import { filterFaqs } from '../utils/faq'

interface DashboardFaqSidebarProps {
    isOpen: boolean
    onClose: () => void
    onSwitchTab?: (tab: WorkspaceTab) => void
}

export default function DashboardFaqSidebar({
    isOpen,
    onClose,
    onSwitchTab,
}: DashboardFaqSidebarProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<
        'all' | 'getting-started' | 'diligence' | 'citations' | 'valuation' | 'troubleshooting'
    >('all')
    // Track the open FAQ by its question text, not a list index — otherwise
    // filtering/searching leaves the wrong item expanded (the index now points
    // at a different question).
    const [openFaqKey, setOpenFaqKey] = useState<string | null>(null)

    const dashboardFaqs: Array<{
        category: 'getting-started' | 'diligence' | 'recommendations' | 'citations' | 'valuation' | 'troubleshooting'
        categoryLabel: string
        question: string
        answer: string
        actionLabel?: string
        targetTab?: WorkspaceTab
        badge?: string
    }> = [
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'What does the "ESCALATE" (or "WALK AWAY / RESTRUCTURE") actionable recommendation mean?',
            answer: 'An ESCALATE recommendation indicates critical, structural deal-breakers or severe financial misrepresentations (e.g. >50% customer concentration without contracts, unrecorded payroll tax liens, or tax return Form 1120 revenue fabricated by >50%) that cannot be resolved through routine purchase price negotiations. It directs the deal team to halt LOI signing, freeze earnest deposit release, and escalate directly to the Senior Investment Committee, forensic CPAs, or M&A legal counsel.',
            actionLabel: 'Open Synthesis Verdict',
            targetTab: 'synthesis',
            badge: 'ESCALATION GUIDE',
        },
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'What is the difference between a Deal-Level Escalation and a Document-Level Escalation?',
            answer: '• Deal-Level Escalation: Produced during the Multi-Document Project Synthesis pass when the target business exhibits existential financial, legal, or commercial deal-breakers.\n• Document-Level Escalation: Produced during single-document OCR/extraction when a corrupted scan, missing schedule, or unparseable table requires manual human analyst verification before numbers can be trusted.',
            actionLabel: 'View Submission History',
            targetTab: 'history',
            badge: 'ESCALATION ARCHITECTURE',
        },
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'What do the Green, Yellow, and Red traffic light postures mean?',
            answer: '• GREEN (PROCEED / PROCEED TO LOI): Low risk. Verified earnings quality, justified add-backs, and market-supported valuation.\n• YELLOW (RENEGOTIATE / PROCEED WITH REPRICE): Moderate risk. Target is viable, but seller add-backs require haircuts or price multiples need downward re-trading.\n• RED (ESCALATE / WALK AWAY): High risk / Deal-breaker. Existential tax, solvency, or customer concentration risks requiring senior leadership review.',
            actionLabel: 'Open Overview Tab',
            targetTab: 'overview',
            badge: 'RISK POSTURES',
        },
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'When does the AI choose "RENEGOTIATE" versus "ESCALATE"?',
            answer: 'The AI issues RENEGOTIATE when diligence risks can be resolved via a dollar-for-dollar purchase price reduction or escrow holdback (e.g. rejecting $200k of personal expenses). It issues ESCALATE when risks threaten the ongoing viability of the company or indicate fraud (e.g. non-renewing anchor client, undisclosed liens, or massive book-tax variance).',
            actionLabel: 'Inspect Negotiation Levers',
            targetTab: 'negotiation',
            badge: 'DECISION MATRIX',
        },
        {
            category: 'getting-started',
            categoryLabel: 'Getting Started',
            question: 'What are the 2 main operational workflows of the agent? (Pre-LOI vs Post-LOI)',
            answer: '1. Pre-LOI Valuation Discovery: Extract normalized EBITDA, audit seller add-backs, and calculate fair valuation bounds (Base, Bear, Bull) before issuing an LOI.\n2. Post-LOI Deal Negotiation: Reconcile proposed LOI purchase prices against audited financials, detect cross-document accounting discrepancies, and generate dollar-for-dollar price adjustment levers.',
            actionLabel: 'Go to Overview',
            targetTab: 'overview',
            badge: 'AGENT WORKFLOWS',
        },
        {
            category: 'getting-started',
            categoryLabel: 'Getting Started',
            question: 'How do I analyze a deal packet as a beginner?',
            answer: 'Start in the Overview tab. Drag & drop your deal files (2-year P&Ls, Balance Sheets, LOIs) into the intake dropzone. Alternatively, click "Example Mode" at the bottom right to instantly explore a pre-analyzed sample deal packet.',
            actionLabel: 'Go to Intake in Overview',
            targetTab: 'overview',
            badge: 'QUICK START',
        },
        {
            category: 'diligence',
            categoryLabel: 'Deal Analysis',
            question: 'Where can I inspect EBITDA add-backs and owner compensation?',
            answer: 'Jump to the Diligence tab! Under the EBITDA Reconstruction card, you will find a normalized earnings table breaking down seller add-backs, non-recurring expenses, and quality-of-earnings adjustments.',
            actionLabel: 'Open Diligence Tab',
            targetTab: 'diligence',
            badge: 'EBITDA MATH',
        },
        {
            category: 'valuation',
            categoryLabel: 'Valuation Math',
            question: 'How are Bear, Base, and Bull valuation ranges computed?',
            answer: 'Valuation ranges are derived by cross-analyzing customer concentration risks, revenue growth trends, and owner add-back quality. You can adjust leverage, tax, and exit multiple assumptions live in the Valuation tab.',
            actionLabel: 'Open Valuation Tab',
            targetTab: 'valuation',
            badge: 'LBO & MULTIPLES',
        },
        {
            category: 'citations',
            categoryLabel: 'Citations & Verification',
            question: 'How do I verify the original source document for an extracted number?',
            answer: 'Every financial fact has a 100% citation guarantee. Click any extracted number or open the Evidence Drawer to view the exact line-by-line citation (e.g. Apex_Commercial_PL_2025.pdf: Line 4).',
            actionLabel: 'Open Diligence & Citations',
            targetTab: 'diligence',
            badge: '100% CITATIONS',
        },
        {
            category: 'diligence',
            categoryLabel: 'Deal Analysis',
            question: 'What is Portfolio Synthesis and how do I trigger it?',
            answer: 'Portfolio Synthesis runs a multi-doc pass to cross-check P&L revenue against bank deposits, calculate debt coverage, and generate the IC deal memo. Click "Run Full Portfolio Synthesis" on the Synthesis tab.',
            actionLabel: 'Open Synthesis Tab',
            targetTab: 'synthesis',
            badge: 'IC DEAL MEMO',
        },
        {
            category: 'getting-started',
            categoryLabel: 'Getting Started',
            question: 'What is the difference between Example Mode and Live n8n Mode?',
            answer: '• Example Mode: Uses pre-computed sample deal packets for instant UI exploration with 0 network delay.\n• Live n8n Mode: Connects to our live AI workflow engine to parse real uploaded PDFs and spreadsheets.',
            badge: 'DATA MODES',
        },
        {
            category: 'diligence',
            categoryLabel: 'Deal Analysis',
            question: 'How do I track management Q&A and due diligence questions?',
            answer: 'Use the Management Question Tracker in the Analysis or Overview tab. You can add due diligence questions, assign priority levels, mark seller responses, and export the Q&A schedule.',
            actionLabel: 'Open Analysis Tab',
            targetTab: 'analysis',
            badge: 'Q&A TRACKER',
        },
        {
            category: 'troubleshooting',
            categoryLabel: 'Troubleshooting',
            question: 'What should I do if a complex document fails or hits an error?',
            answer: 'Check the Errors tab! Our workflow engine automatically retries complex scans with failover model passes (Claude Opus 5 / OpenAI 5.6 Sol). You can inspect error logs and click "Re-Run Extraction".',
            actionLabel: 'View Workflow Errors',
            targetTab: 'errors',
            badge: 'RETRY LOGS',
        },
    ]

    const categories = [
        { id: 'all', label: 'All FAQs' },
        { id: 'recommendations', label: 'Recommendations & Postures' },
        { id: 'getting-started', label: 'Getting Started' },
        { id: 'diligence', label: 'Deal Analysis' },
        { id: 'citations', label: 'Citations' },
        { id: 'valuation', label: 'Valuation Math' },
        { id: 'troubleshooting', label: 'Troubleshooting' },
    ]

    const filteredFaqs = filterFaqs(dashboardFaqs, { category: selectedCategory, query: searchQuery })

    // Auto-open the first FAQ on mount, and close on Escape (drawer convention).
    useEffect(() => {
        if (isOpen) setOpenFaqKey((current) => current ?? dashboardFaqs[0]?.question ?? null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return
        const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [isOpen, onClose])

    if (!isOpen) return null

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className="fixed inset-0 z-40 bg-background/60 backdrop-blur-xs lg:hidden"
                onClick={onClose}
            />

            {/* Sidebar drawer */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="FAQs and Guidance Sidebar"
                className="fixed right-0 top-0 bottom-0 z-50 flex w-full flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300 sm:w-[420px]"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border/80 p-4 bg-muted/20">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <HelpCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground leading-none">
                                FAQs &amp; Deal Guide
                            </h2>
                            <p className="text-[11px] text-muted-foreground mt-1 leading-none">
                                Follow along across any workspace tab
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                        onClick={onClose}
                        title="Close FAQ Sidebar"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-border/60 space-y-3 bg-card/50">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search questions or features..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs h-9"
                            aria-label="Search FAQs"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                        {categories.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                aria-pressed={selectedCategory === cat.id}
                                onClick={() => setSelectedCategory(cat.id as any)}
                                className={`rounded-full px-2.5 py-1 transition-all whitespace-nowrap text-[11px] font-medium shrink-0 ${
                                    selectedCategory === cat.id
                                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FAQ Items List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {filteredFaqs.length === 0 ? (
                        <div className="p-8 text-center space-y-2 text-muted-foreground">
                            <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/50" />
                            <p className="text-xs font-semibold">No matching questions found</p>
                            <p className="text-[11px]">Try clearing your search or category filter.</p>
                        </div>
                    ) : (
                        filteredFaqs.map((faq) => {
                            const isOpen = openFaqKey === faq.question
                            return (
                                <Card
                                    key={faq.question}
                                    className={`border transition-all ${
                                        isOpen
                                            ? 'border-primary/40 bg-primary/5 shadow-xs'
                                            : 'border-border/80 bg-card hover:border-border'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        aria-expanded={isOpen}
                                        onClick={() => setOpenFaqKey(isOpen ? null : faq.question)}
                                        className="w-full p-3.5 text-left flex items-start justify-between gap-3 text-xs font-bold text-foreground cursor-pointer"
                                    >
                                        <div className="space-y-1 pr-1">
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] px-1.5 py-0 border-primary/30 text-primary font-mono"
                                                >
                                                    {faq.categoryLabel}
                                                </Badge>
                                                {faq.badge && (
                                                    <span className="text-[9px] font-mono text-muted-foreground">
                                                        · {faq.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-foreground leading-snug">
                                                {faq.question}
                                            </p>
                                        </div>
                                        {isOpen ? (
                                            <ChevronUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <CardContent className="px-3.5 pb-3.5 pt-0 text-xs text-muted-foreground space-y-3 border-t border-border/40 mt-1">
                                            <p className="whitespace-pre-line leading-relaxed pt-2">
                                                {faq.answer}
                                            </p>

                                            <div className="flex flex-col gap-1.5 mt-1">
                                                {faq.targetTab && onSwitchTab && (
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 justify-between h-8 cursor-pointer"
                                                        onClick={() => {
                                                            if (faq.targetTab) {
                                                                onSwitchTab(faq.targetTab)
                                                            }
                                                        }}
                                                    >
                                                        <span>{faq.actionLabel || 'Jump to Workspace Tab'}</span>
                                                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="w-full text-[11px] font-medium text-muted-foreground hover:text-foreground justify-between h-7 border border-border/50 hover:bg-muted/50 cursor-pointer"
                                                    onClick={() => {
                                                        window.dispatchEvent(
                                                            new CustomEvent('mergeworks:open-chat-ask', {
                                                                detail: {
                                                                    topic: faq.question,
                                                                    title: faq.categoryLabel,
                                                                    prompt: `Can you explain the following in detail:\n\n**${faq.question}**\n\nContext:\n${faq.answer}`,
                                                                },
                                                            })
                                                        )
                                                        onClose()
                                                    }}
                                                >
                                                    <span className="flex items-center gap-1.5">
                                                        <Bot className="h-3 w-3 text-primary" />
                                                        <span>Ask Dillon AI to explain more</span>
                                                    </span>
                                                    <Sparkles className="h-3 w-3 text-amber-500" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            )
                        })
                    )}
                </div>

                {/* Footer Tip */}
                <div className="p-3 border-t border-border/80 bg-muted/20 text-center text-[11px] text-muted-foreground flex items-center justify-between px-4">
                    <span className="flex items-center gap-1.5 font-medium">
                        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Need keyboard shortcuts?</span>
                    </span>
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                        Ctrl+K
                    </kbd>
                </div>
            </aside>
        </>
    )
}
