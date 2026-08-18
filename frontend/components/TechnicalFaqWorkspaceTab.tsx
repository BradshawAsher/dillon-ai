import React, { useState } from 'react'
import { filterFaqs } from '../utils/faq'
import {
    HelpCircle,
    Search,
    X,
    FileText,
    Zap,
    SlidersHorizontal,
    Database,
    ShieldAlert,
    Terminal,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    Layers,
    Command,
    ExternalLink,
    Play,
    BookOpen,
} from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import CardInfoPopover from './common/CardInfoPopover'
import { Badge } from '../lib/shadcn/badge'

interface TechnicalFaqWorkspaceTabProps {
    onSwitchTab?: (tab: string) => void
}

export default function TechnicalFaqWorkspaceTab({ onSwitchTab }: TechnicalFaqWorkspaceTabProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'recommendations' | 'getting-started' | 'navigation' | 'buttons' | 'data-modes' | 'troubleshooting' | 'chatbot'>('all')
    // Track the open FAQ by question text so filtering doesn't leave the wrong
    // item expanded (index would point at a different question after a filter).
    const [openKey, setOpenKey] = useState<string | null>(null)

    const technicalFaqs = [
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'What does the "ESCALATE" (or "WALK AWAY / RESTRUCTURE") actionable recommendation mean?',
            answer: 'An ESCALATE recommendation indicates critical, structural deal-breakers or severe financial misrepresentations (e.g. >50% customer concentration without contracts, unrecorded payroll tax liens, or tax return Form 1120 revenue fabricated by >50%) that cannot be resolved through routine purchase price negotiations. It directs the deal team to halt LOI signing, freeze earnest deposit release, and escalate directly to the Senior Investment Committee, forensic CPAs, or M&A legal counsel.',
            actionLabel: 'Open Synthesis Verdict',
            targetTab: 'synthesis',
        },
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'What is the difference between a Deal-Level Escalation and a Document-Level Escalation?',
            answer: '• Deal-Level Escalation: Produced during the Multi-Document Project Synthesis pass when the target business exhibits existential financial, legal, or commercial deal-breakers for the buyer.\n• Document-Level Escalation: Produced during single-document OCR/extraction when a corrupted scan, missing schedule, or unparseable table requires manual human analyst verification before numbers can be trusted.',
            actionLabel: 'View Submission History',
            targetTab: 'history',
        },
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'What do the Green, Yellow, and Red traffic light postures mean?',
            answer: '• GREEN (PROCEED / PROCEED TO LOI): Low risk. Verified earnings quality, justified add-backs, and market-supported valuation.\n• YELLOW (RENEGOTIATE / PROCEED WITH REPRICE): Moderate risk. Target is viable, but seller add-backs require haircuts or price multiples need downward re-trading.\n• RED (ESCALATE / WALK AWAY): High risk / Deal-breaker. Existential tax, solvency, or customer concentration risks requiring senior leadership review.',
            actionLabel: 'Open Overview Tab',
            targetTab: 'overview',
        },
        {
            category: 'recommendations',
            categoryLabel: 'Verdict & Escalation Guide',
            question: 'When does the AI choose "RENEGOTIATE" versus "ESCALATE"?',
            answer: 'The AI issues RENEGOTIATE when diligence risks can be resolved via a dollar-for-dollar purchase price reduction or escrow holdback (e.g. rejecting $200k of personal expenses). It issues ESCALATE when risks threaten the ongoing viability of the company or indicate fraud (e.g. non-renewing anchor client, undisclosed liens, or massive book-tax variance).',
            actionLabel: 'Inspect Negotiation Levers',
            targetTab: 'negotiation',
        },
        {
            category: 'getting-started',
            categoryLabel: 'Getting Started',
            question: 'What are the 2 main operational workflows of the agent? (Pre-LOI vs Post-LOI)',
            answer: '1. Phase 1: Pre-LOI Valuation Discovery — Upload raw accounting materials (P&Ls, balance sheets, tax returns) to extract true normalized EBITDA, audit unaudited seller add-backs, and compute fair valuation bounds (Base, Bear, Bull) before issuing an LOI.\n2. Phase 2: Post-LOI Deal Negotiation — Upload an LOI or Term Sheet along with bank recs to reconcile proposed purchase prices against audited valuation bounds, quantify overpayment exposure, detect cross-document accounting discrepancies, and generate dollar-for-dollar price adjustment levers.',
            actionLabel: 'Go to Intake in Overview',
            targetTab: 'overview',
        },
        {
            category: 'getting-started',
            categoryLabel: 'Getting Started',
            question: 'How do I start analyzing a new deal packet from scratch?',
            answer: 'Navigate to the "Projects" or "Overview" tab. In the Document Intake card, drag and drop your deal files (PDF P&Ls, Excel balance sheets, Word LOIs). Click "Process Deal Packet" to trigger automated OCR and fact extraction.',
            actionLabel: 'Go to Intake in Overview',
            targetTab: 'overview',
        },
        {
            category: 'navigation',
            categoryLabel: 'Finding Information',
            question: 'Where can I find EBITDA add-backs and revenue reconciliations?',
            answer: 'Go to the "Diligence" tab. Under the "EBITDA Reconstruction & Seller Add-Backs" card, you will find a line-item breakdown of normalized earnings, owner excess compensation, non-recurring expenses, and quality-of-earnings adjustments.',
            actionLabel: 'Jump to Diligence Tab',
            targetTab: 'diligence',
        },
        {
            category: 'navigation',
            categoryLabel: 'Finding Information',
            question: 'Where are the Bear, Base, and Bull valuation multiples located?',
            answer: 'You can inspect valuation ranges in two places: the "Synthesis" tab (for the full Investment Committee verdict) and the "Valuation" tab (for customizable LBO multiples and sensitivity tables).',
            actionLabel: 'Jump to Valuation Tab',
            targetTab: 'valuation',
        },
        {
            category: 'navigation',
            categoryLabel: 'Finding Information',
            question: 'How do I verify the original source document for an extracted number?',
            answer: 'Every financial fact includes an evidence tag (e.g. Apex_Commercial_PL_2025.pdf: Line 12). Click any extracted number or open the Evidence Drawer to view the line-by-line citation and source excerpt.',
            actionLabel: 'Jump to Diligence Tab',
            targetTab: 'diligence',
        },
        {
            category: 'buttons',
            categoryLabel: 'Button Guide',
            question: 'What do the bottom-right floating controls do? (Example Mode vs Live n8n)',
            answer: '• Example Mode: Uses pre-computed sample deal packets for instant UI exploration with 0 network latency.\n• Live n8n: Connects directly to our live AI workflow engine to execute real OCR and multi-doc synthesis.\n• Landing Page: Switches back to the public homepage.',
        },
        {
            category: 'buttons',
            categoryLabel: 'Button Guide',
            question: 'What does "Run Full Portfolio Synthesis" do?',
            answer: 'This button triggers our multi-document reconciliation pass. It cross-checks P&L revenue against bank deposits, verifies customer concentration limits, calculates debt service coverage, and generates the downloadable IC deal memo.',
            actionLabel: 'Jump to Synthesis Tab',
            targetTab: 'synthesis',
        },
        {
            category: 'buttons',
            categoryLabel: 'Button Guide',
            question: 'How do I use the Command Palette (Ctrl + K / Cmd + K)?',
            answer: 'Press Ctrl+K (or Cmd+K) anywhere in the app to open the Command Palette. From there, you can instantly search project files, jump to specific tabs, switch dark/light theme, or filter risk flags.',
        },
        {
            category: 'data-modes',
            categoryLabel: 'Data & Security',
            question: 'What is Data Isolation and how do I log in?',
            answer: 'When Data Isolation is enabled in the top right, your uploaded deal files are isolated to your authenticated workspace session. Click the "Login" button in the top right header to authenticate.',
        },
        {
            category: 'troubleshooting',
            categoryLabel: 'Troubleshooting',
            question: 'What should I do if a complex scanned document fails to parse?',
            answer: 'Check the "Errors" tab to view the workflow retry logs. Our engine automatically executes retries using failover models (Claude Opus 5 / OpenAI 5.6 Sol). If needed, click "Re-Run Extraction" in the Intake card.',
            actionLabel: 'View Workflow Errors',
            targetTab: 'errors',
        },
        {
            category: 'troubleshooting',
            categoryLabel: 'Troubleshooting',
            question: 'Where can I see the automated AI evaluation pass rates and benchmarks?',
            answer: 'Navigate to the "Evals & Harness" tab to inspect our 25-document golden test suite scores, accuracy by dimension, and Track A model cost benchmarks.',
            actionLabel: 'Jump to Evals & Harness',
            targetTab: 'evals',
        },
        {
            category: 'chatbot',
            categoryLabel: 'Dillon AI Copilot',
            question: 'How does the Dillon AI Copilot 3-Tier Architecture work?',
            answer: '• Tier 1 (Cloud AI / n8n Webhook): Queries our production n8n workflow backed by OpenAI GPT-4o, Claude 3.5 Sonnet, and Gemini 1.5 Pro. It receives full context of the project\'s synthesis, documented financial facts, OCR summaries, and cross-project portfolio state.\n• Tier 2 (Direct Provider API): If you configure your own OpenAI, Anthropic, or Gemini API keys in the chat settings, queries run directly from your browser to provider endpoints with zero intermediate hops.\n• Tier 3 (In-Browser Deterministic Engine): If cloud endpoints are unreachable or you are offline, Dillon instantly runs an in-browser deterministic M&A rules engine with 0ms latency and 100% uptime.',
            actionLabel: 'Open Architecture Card',
            targetTab: 'errors',
        },
        {
            category: 'chatbot',
            categoryLabel: 'Dillon AI Copilot',
            question: 'What is Dillon AI Copilot designed to do?',
            answer: '1. Extract & Audit Deal Financials: Instantly surfaces confirmed Revenue, SDE, EBITDA, and gross margins from uploaded CIMs, P&Ls, and tax returns.\n2. Quality of Earnings (QoE) & Add-Back Verification: Audits seller add-backs (owner perks, non-recurring expenses) and calculates haircut adjustments.\n3. Debt Structuring & DSCR Headroom: Computes debt coverage ratios under SBA 7(a), seller note, and mezzanine debt structures.\n4. Valuation & Multiple Analysis: Compares implied entry multiples against SMB benchmarks (3.0x–6.0x) and runs DCF/IRR sensitivities.\n5. Deep-Link Navigation: Directs you to specific workspace cards and anchors with targeted 1-click links (capped at 1–2 per response).\n6. Cross-Document Discrepancy Auditing: Flags discrepancies between tax return Form 1120 revenue and unaudited internal P&Ls.',
            actionLabel: 'Open Analysis Tab',
            targetTab: 'analysis',
        },
        {
            category: 'chatbot',
            categoryLabel: 'Dillon AI Copilot',
            question: 'What is Dillon AI Copilot NOT made to do / unable to do?',
            answer: '1. NOT a Replacement for Legal/CPA Counsel: Dillon AI does not provide certified CPA audit opinions, binding legal counsel, or environmental Phase I sign-offs.\n2. CANNOT Invent or Hallucinate Missing Facts: Dillon will never fabricate financial numbers or operational metrics that are not documented in uploaded files or user-entered model assumptions.\n3. CANNOT Execute Real-World Transactions: Dillon cannot wire earnest funds, sign contracts, or submit binding LOIs.\n4. CANNOT Tamper with Audit Records: The copilot operates on read-only synthesis snapshots and cannot delete, overwrite, or corrupt immutable database audit logs.',
            actionLabel: 'Open Overview Tab',
            targetTab: 'overview',
        },
        {
            category: 'chatbot',
            categoryLabel: 'Dillon AI Copilot',
            question: 'Why did I receive an in-browser deterministic answer and how do I force a live LLM run?',
            answer: 'When the cloud LLM webhook is slow or unreachable, Dillon AI automatically provides a deterministic in-browser answer (marked with an amber badge) to eliminate wait times and prevent blank screens. You can click the "✨ Run with Live LLM" button on any in-browser response to force a live AI query, or configure personal OpenAI/Anthropic API keys in the chat header.',
            actionLabel: 'Open Deal Structure',
            targetTab: 'structure',
        },
    ]

    const filteredFaqs = filterFaqs(technicalFaqs, { category: selectedCategory, query: searchQuery })

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div id="faqs-header" className="scroll-mt-6 flex flex-col gap-4 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card p-6 shadow-xs md:flex-row md:items-center md:justify-between">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                        <BookOpen className="h-6 w-6 text-primary" />
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            Dashboard Technical Guide &amp; Operational FAQs
                        </h2>
                        <Badge variant="default" className="bg-primary hover:bg-primary/90 text-white font-medium">
                            DASHBOARD HELP
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Technical documentation, navigation maps, and action button guide for Dillon AI Due Diligence.
                    </p>
                </div>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                <Card
                    className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => onSwitchTab?.('overview')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-primary" />
                            <span>1. Intake &amp; Overview</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-foreground font-semibold">Drop files &amp; process deal packets</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => onSwitchTab?.('diligence')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-emerald-600" />
                            <span>2. Diligence &amp; Add-backs</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-foreground font-semibold">EBITDA add-backs &amp; line-item citations</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => onSwitchTab?.('synthesis')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-violet-600" />
                            <span>3. Portfolio Synthesis</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-foreground font-semibold">IC Memos &amp; Valuation ranges</p>
                    </CardContent>
                </Card>

                <Card
                    className="border-border bg-card hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => onSwitchTab?.('evals')}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Database className="h-3.5 w-3.5 text-amber-600" />
                            <span>4. Evals &amp; Harness</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-foreground font-semibold">Pass rates &amp; model cost benchmarks</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Category Filter Bar */}
            <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            <span>Technical FAQs &amp; Feature Map ({filteredFaqs.length})</span>
                            <CardInfoPopover cardId="technical-faq" />
                        </CardTitle>

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search button or feature..."
                                aria-label="Search technical FAQs"
                                className="w-full pl-8 pr-8 py-1.5 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                        {[
                            { id: 'all', label: 'All Topics' },
                            { id: 'chatbot', label: 'Dillon AI Copilot & 3 Tiers' },
                            { id: 'recommendations', label: 'Verdicts & Escalation' },
                            { id: 'getting-started', label: 'Getting Started' },
                            { id: 'navigation', label: 'Finding Info' },
                            { id: 'buttons', label: 'Button Guide' },
                            { id: 'data-modes', label: 'Data & Security' },
                            { id: 'troubleshooting', label: 'Troubleshooting' },
                        ].map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                aria-pressed={selectedCategory === cat.id}
                                onClick={() => setSelectedCategory(cat.id as any)}
                                className={`text-xs px-3 py-1 rounded-full transition-all cursor-pointer font-semibold ${
                                    selectedCategory === cat.id
                                        ? 'bg-primary text-white shadow-2xs'
                                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </CardHeader>

                <CardContent className="space-y-3">
                    {filteredFaqs.length === 0 ? (
                        <div className="p-8 text-center space-y-2 text-muted-foreground">
                            <HelpCircle className="h-8 w-8 mx-auto text-muted-foreground/60" />
                            <p className="text-sm font-semibold">No FAQs match your search query.</p>
                            <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setSelectedCategory('all') }}>
                                Clear Search Filters
                            </Button>
                        </div>
                    ) : (
                        filteredFaqs.map((faq) => {
                            const isOpen = openKey === faq.question
                            return (
                            <div key={faq.question} className="rounded-xl border border-border/80 bg-card shadow-2xs overflow-hidden">
                                <button
                                    type="button"
                                    aria-expanded={isOpen}
                                    onClick={() => setOpenKey(isOpen ? null : faq.question)}
                                    className="w-full p-4 text-left flex items-center justify-between gap-3 font-bold text-sm text-foreground hover:bg-muted/30 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                                            {faq.categoryLabel}
                                        </Badge>
                                        <span>{faq.question}</span>
                                    </div>
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-primary shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                                </button>

                                {isOpen && (
                                    <div className="px-4 pb-4 pt-2 text-xs text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/10 space-y-3">
                                        <p className="whitespace-pre-line text-foreground/90 font-medium">{faq.answer}</p>
                                        {faq.targetTab && onSwitchTab && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                className="h-7 text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                                                onClick={() => onSwitchTab(faq.targetTab!)}
                                            >
                                                <span>{faq.actionLabel || 'Navigate Now'}</span>
                                                <ExternalLink className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            )
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
