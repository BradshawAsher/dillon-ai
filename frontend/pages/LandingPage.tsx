import React, { useState } from 'react'
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Cpu,
    DollarSign,
    ExternalLink,
    FileCheck,
    FileSearch,
    FileText,
    Filter,
    Globe,
    HelpCircle,
    Layers,
    Lock,
    Play,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Users,
    X,
    Zap,
} from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Input } from '../lib/shadcn/input'

interface LandingPageProps {
    onLaunchDashboard: () => void
}

export default function LandingPage({ onLaunchDashboard }: LandingPageProps) {
    const [showWalkthroughModal, setShowWalkthroughModal] = useState(false)
    const [showAccessModal, setShowAccessModal] = useState(false)
    const [walkthroughStep, setWalkthroughStep] = useState(1)
    const [previewTab, setPreviewTab] = useState<'valuation' | 'citations' | 'risks' | 'cost'>('valuation')
    const [activeFactIndex, setActiveFactIndex] = useState(0)
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

    const faqs = [
        {
            question: 'What is MergeWorks AI Due Diligence?',
            answer: 'MergeWorks is an autonomous M&A deal intelligence platform that analyzes 2-year P&Ls, balance sheets, customer rosters, and LOIs. It automatically generates audit-grade valuation ranges, EBITDA reconstructions, and Investment Committee memos with 100% citation transparency.',
            badge: 'GETTING STARTED',
        },
        {
            question: 'How do I analyze a deal as a beginner?',
            answer: 'It takes less than 30 seconds! Click "Launch App Dashboard" at the top of the page. You can either drag & drop your deal documents (PDF, Excel, Word) into the intake dropzone or click "Example Mode" at the bottom right to explore a pre-analyzed sample deal packet.',
            badge: 'BEGINNER GUIDE',
        },
        {
            question: 'How does MergeWorks ensure 0 numeric hallucinations?',
            answer: 'Every single extracted figure (revenue, EBITDA add-backs, customer concentration percentages) is tied to an explicit document line item or cell reference (e.g. "Apex_Commercial_PL_2025.pdf: Line 4"). You can click any number to inspect its original document source.',
            badge: '100% CITATION GUARANTEE',
        },
        {
            question: 'What document formats and file types are supported?',
            answer: 'MergeWorks accepts native PDFs, scanned PDF documents, Excel spreadsheets (.xlsx, .xltx), Word documents (.docx), and CSV financial tables.',
            badge: 'FILE SUPPORT',
        },
        {
            question: 'How are Bear, Base, and Bull valuation multiples calculated?',
            answer: 'Our multi-doc synthesis engine cross-analyzes customer concentration risks, revenue growth rates, and owner add-back quality against industry benchmarks to generate a conservative Bear (3.5x), realistic Base (4.2x), and upside Bull (5.0x) valuation range.',
            badge: 'VALUATION MATH',
        },
        {
            question: 'What is the difference between Example Mode and Live n8n Mode?',
            answer: 'Example Mode allows you to test and navigate full deal memos, EBITDA tables, and risk flags instantly using pre-computed sample data. Live n8n Mode connects directly to our live AI workflow engine to parse real uploaded files.',
            badge: 'DATA MODES',
        },
        {
            question: 'Is my confidential financial data secure?',
            answer: 'Yes. All file uploads are handled with strict tenant isolation, encrypted in transit and at rest, and never used to train public language models.',
            badge: 'PRIVACY & SECURITY',
        },
        {
            question: 'Where can I see cost benchmarks and accuracy evaluations?',
            answer: 'You can view our Track A Cost Model section on this page or navigate to the "Eval & Harness" tab in the App Dashboard to view automated golden dataset pass rates and cost breakdowns.',
            badge: 'EVALS & HARNESS',
        },
    ]

    // Access request form state
    const [accessForm, setAccessForm] = useState({ name: '', email: '', firm: '', role: '' })
    const [accessSubmitted, setAccessFormSubmitted] = useState(false)

    const handleAccessSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (accessForm.email) {
            setAccessFormSubmitted(true)
        }
    }

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }

    const interactiveFacts = [
        {
            label: '2025 Gross Revenue',
            extractedValue: '$3,250,000',
            confidence: '98%',
            citation: 'Apex_Commercial_PL_2025.pdf: Line 4 (Revenue)',
            verified: true,
            note: 'Matches bank deposit statements within $1,200 variance',
        },
        {
            label: 'Adjusted EBITDA',
            extractedValue: '$840,000 (25.8% Margin)',
            confidence: '95%',
            citation: 'Apex_Commercial_PL_2025.pdf: Line 28 & Add-back Schedule B',
            verified: true,
            note: 'Includes $120,000 owner excess compensation add-back',
        },
        {
            label: 'Customer Concentration Risk',
            extractedValue: 'Top 2 Accounts = 48% Revenue',
            confidence: '92%',
            citation: 'Apex_Customer_Roster_2025.xlsx: Cell C2-C14',
            verified: true,
            note: 'HIGH RISK: Single client loss exceeds 25% EBITDA impact',
        },
        {
            label: 'Total Working Capital',
            extractedValue: '$412,000',
            confidence: '96%',
            citation: 'Balance Sheet 2025.pdf: Line 18 (Current Assets - Liabilities)',
            verified: true,
            note: 'Sufficient 60-day operating cash buffer confirmed',
        },
    ]

    const walkthroughSteps = [
        {
            step: 1,
            title: '01. Instant Document Intake & OCR',
            desc: 'Drag and drop 2-year P&Ls, Balance Sheets, Customer Rosters, and LOIs. Our OCR engine parses both clean PDFs and messy scans with zero data leakage.',
            highlight: 'Parses PDFs, Excel, & Scans in < 3 seconds',
        },
        {
            step: 2,
            title: '02. Evidence-Backed Fact Extraction',
            desc: 'Every revenue figure, EBITDA add-back, and debt liability is mapped directly to its source file basename, line item, or spreadsheet cell.',
            highlight: '100% Citation Transparency · Zero Numeric Hallucinations',
        },
        {
            step: 3,
            title: '03. Multi-Doc Portfolio Synthesis',
            desc: 'Cross-checks P&L statements against Balance Sheets and Customer Rosters to detect hidden working capital deficits, customer concentration, and tax liabilities.',
            highlight: 'Automated Red Flag Detection & Traffic Light Scoring',
        },
        {
            step: 4,
            title: '04. Valuation Ranges & IC Deal Memo',
            desc: 'Generates Bear, Base, and Bull valuation multiples ($2.18M–$3.27M) alongside an Investment Committee-ready Markdown deal memo with 1-click export.',
            highlight: 'Downloadable Executive Summary & Valuation Spreadsheets',
        },
    ]

    return (
        <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary">
            {/* Header / Navigation Bar */}
            <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
                <div className="w-full flex items-center justify-between px-3 py-2.5 sm:px-6">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-indigo-600 to-purple-600 text-white shadow-md shadow-primary/20">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-black tracking-tight text-foreground leading-none">MergeWorks</span>
                                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-[10px] font-bold text-primary px-1.5 py-0.5 leading-none shrink-0">
                                    AI DUE DILIGENCE
                                </Badge>
                            </div>
                            <span className="text-[11px] font-semibold text-muted-foreground mt-1 leading-none whitespace-nowrap">
                                Autonomous M&amp;A Deal Intelligence
                            </span>
                        </div>
                    </div>

                    <nav className="hidden lg:flex items-center gap-0.5 sm:gap-1 rounded-full border border-border/60 bg-muted/30 p-1 text-xs font-semibold text-muted-foreground ml-6 lg:ml-8 mr-auto">
                        <button
                            type="button"
                            onClick={() => scrollToSection('hero')}
                            className="rounded-full px-2.5 sm:px-3 py-1 transition-all hover:bg-background hover:text-foreground hover:shadow-2xs whitespace-nowrap"
                        >
                            Hero
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('features')}
                            className="rounded-full px-2.5 sm:px-3 py-1 transition-all hover:bg-background hover:text-foreground hover:shadow-2xs whitespace-nowrap"
                        >
                            Features
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('live-preview')}
                            className="rounded-full px-2.5 sm:px-3 py-1 transition-all hover:bg-background hover:text-foreground hover:shadow-2xs whitespace-nowrap"
                        >
                            Live Preview
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('evidence')}
                            className="rounded-full px-2.5 sm:px-3 py-1 transition-all hover:bg-background hover:text-foreground hover:shadow-2xs whitespace-nowrap"
                        >
                            Fact Citation
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('pipeline')}
                            className="rounded-full px-2.5 sm:px-3 py-1 transition-all hover:bg-background hover:text-foreground hover:shadow-2xs whitespace-nowrap"
                        >
                            M&amp;A Pipeline
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('cost-model')}
                            className="rounded-full px-2.5 sm:px-3 py-1 transition-all hover:bg-background hover:text-foreground hover:shadow-2xs whitespace-nowrap"
                        >
                            Cost Model
                        </button>
                        <button
                            type="button"
                            onClick={() => scrollToSection('faqs')}
                            className="rounded-full px-2.5 sm:px-3 py-1 transition-all hover:bg-background hover:text-foreground hover:shadow-2xs whitespace-nowrap text-primary font-bold bg-primary/10"
                        >
                            FAQs
                        </button>
                    </nav>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="hidden lg:inline-flex text-xs font-semibold"
                            onClick={() => setShowAccessModal(true)}
                        >
                            Apply for Access
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="hidden sm:inline-flex text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 shrink-0"
                            onClick={() => setShowWalkthroughModal(true)}
                        >
                            <Play className="mr-1.5 h-3.5 w-3.5 fill-current shrink-0" />
                            Guided Walkthrough
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-gradient-to-r from-primary to-indigo-600 font-bold text-white shadow-sm hover:from-primary/90 hover:to-indigo-600/90 shrink-0 whitespace-nowrap text-xs px-4"
                            onClick={onLaunchDashboard}
                        >
                            <span>Launch App Dashboard</span>
                            <ArrowRight className="ml-1.5 h-4 w-4 shrink-0" />
                        </Button>
                    </div>
                </div>
            </header>

            {/* HERO SECTION (Above the Fold) */}
            <section id="hero" className="relative overflow-hidden border-b border-border/50 bg-gradient-to-b from-primary/5 via-background to-background py-16 sm:py-24">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.12),transparent_50%)]" />
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mx-auto max-w-4xl text-center space-y-6">
                        <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.08]">
                            Instant M&amp;A Due Diligence
                        </h1>
                        <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 max-w-2xl mx-auto pt-1 leading-snug">
                            Evidence-Backed Valuations &amp; Deal Memos in Seconds
                        </p>

                        {/* PRIMARY STANDOUT CTA */}
                        <div className="pt-2 flex flex-col items-center justify-center gap-3">
                            <Button
                                type="button"
                                size="lg"
                                className="w-full sm:w-auto bg-gradient-to-r from-primary via-indigo-600 to-purple-600 px-10 py-7 text-lg sm:text-xl font-black text-white shadow-xl shadow-primary/30 hover:scale-[1.03] transition-all cursor-pointer rounded-2xl"
                                onClick={onLaunchDashboard}
                            >
                                <Sparkles className="mr-2.5 h-6 w-6 text-amber-300 animate-pulse" />
                                <span>Launch App Dashboard</span>
                                <ArrowRight className="ml-2.5 h-6 w-6" />
                            </Button>

                            {/* Secondary Actions */}
                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="default"
                                    className="border-border/80 text-sm font-bold px-5 py-2.5 shadow-2xs hover:bg-muted"
                                    onClick={() => setShowWalkthroughModal(true)}
                                >
                                    <Play className="mr-2 h-4 w-4 fill-primary text-primary" />
                                    Guided Walkthrough
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="default"
                                    className="border-border/80 text-sm font-bold px-5 py-2.5 shadow-2xs hover:bg-muted"
                                    onClick={() => setShowAccessModal(true)}
                                >
                                    <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                                    Apply for Access
                                </Button>
                            </div>
                        </div>

                        {/* Description Paragraph Below CTAs */}
                        <p className="mx-auto max-w-2xl text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed pt-2">
                            Transform deal packets into audit-grade EBITDA reconstructions, valuation ranges, and IC memos with 100% citation transparency.
                        </p>

                        {/* Trust Highlights */}
                        <div className="pt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-semibold text-muted-foreground border-t border-border/40 max-w-3xl mx-auto">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span>Zero Numeric Hallucination Guarantee</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <span>SOC2 Type II Audit Compliant</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Cpu className="h-4 w-4 text-indigo-600" />
                                <span>Claude Sonnet 5 &amp; OpenAI 5.6 Hybrid Engine</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* KEY FEATURES SECTION */}
            <section id="features" className="py-16 sm:py-20 border-b border-border/50 bg-background">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
                    <div className="text-center space-y-3 max-w-3xl mx-auto">
                        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-mono text-xs">
                            PLATFORM CAPABILITIES
                        </Badge>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            Engineered for M&amp;A Advisors &amp; Private Equity
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Replace manual associate document review with audit-grade AI automation that scales across your entire acquisition pipeline.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="border-border shadow-xs bg-card hover:border-primary/50 transition-all">
                            <CardHeader>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2">
                                    <FileCheck className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg font-bold text-foreground">Zero Numeric Hallucination</CardTitle>
                                <CardDescription className="text-xs">
                                    Guaranteed mathematical accuracy. Every extracted number is cross-checked against source financial statements with exact line item citations.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-border shadow-xs bg-card hover:border-primary/50 transition-all">
                            <CardHeader>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 mb-2">
                                    <BarChart3 className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg font-bold text-foreground">EBITDA Reconstruction</CardTitle>
                                <CardDescription className="text-xs">
                                    Automated add-back quality scoring. Reconciles reported net income with owner excess compensation, one-time legal fees, and personal expenses.
                                </CardDescription>
                            </CardHeader>
                        </Card>

                        <Card className="border-border shadow-xs bg-card hover:border-primary/50 transition-all">
                            <CardHeader>
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 mb-2">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <CardTitle className="text-lg font-bold text-foreground">Bear / Base / Bull Valuation</CardTitle>
                                <CardDescription className="text-xs">
                                    Generates risk-adjusted valuation multiples ($2.18M–$3.27M) based on customer concentration, working capital buffers, and industry benchmarks.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </div>
                </div>
            </section>

            {/* LIVE PRODUCT PREVIEW (Interactive Embedded Component) */}
            <section id="live-preview" className="py-16 sm:py-20 bg-muted/20 border-b border-border/50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="text-center space-y-2 max-w-2xl mx-auto">
                        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-mono text-xs">
                            INTERACTIVE DEMO PREVIEW
                        </Badge>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                            Live Deal Packet Inspection
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Not a static screenshot — click through real extracted metrics, citation mapping, and traffic light risk scores below.
                        </p>
                    </div>

                    {/* Embedded Interactive Deal Card */}
                    <Card className="mx-auto max-w-5xl border-border/80 shadow-2xl bg-card overflow-hidden">
                        <CardHeader className="border-b border-border/60 bg-muted/40 pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="success" className="font-mono text-xs font-bold">
                                            PASS (Score: 85%)
                                        </Badge>
                                        <h3 className="text-xl font-bold text-foreground">
                                            Apex Commercial Services (Project Alpha)
                                        </h3>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Deal Packet: 4 Documents Included (P&amp;L 2025, Balance Sheet, Customer Roster, LOI)
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                                        <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                        <span>Total Run Cost: $0.0226</span>
                                    </Badge>
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="bg-primary text-white text-xs font-semibold"
                                        onClick={onLaunchDashboard}
                                    >
                                        Open in App
                                        <ExternalLink className="ml-1 h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            {/* Interactive Tab Switcher */}
                            <div className="pt-4 flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={previewTab === 'valuation' ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setPreviewTab('valuation')}
                                >
                                    Valuation &amp; EBITDA
                                </Button>
                                <Button
                                    type="button"
                                    variant={previewTab === 'citations' ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setPreviewTab('citations')}
                                >
                                    Evidence Citations
                                </Button>
                                <Button
                                    type="button"
                                    variant={previewTab === 'risks' ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setPreviewTab('risks')}
                                >
                                    Traffic Light Risks
                                </Button>
                                <Button
                                    type="button"
                                    variant={previewTab === 'cost' ? 'default' : 'outline'}
                                    size="sm"
                                    className="text-xs"
                                    onClick={() => setPreviewTab('cost')}
                                >
                                    Cost &amp; Model Pipeline
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6">
                            {previewTab === 'valuation' && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
                                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                                Bear Valuation (3.5x)
                                            </span>
                                            <p className="text-2xl font-black text-foreground">$2,184,000</p>
                                            <p className="text-[11px] text-muted-foreground">Assumes 15% customer churn post-acquisition</p>
                                        </div>
                                        <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 space-y-1">
                                            <span className="text-xs font-bold text-primary uppercase tracking-wide">
                                                Base Valuation (4.2x)
                                            </span>
                                            <p className="text-2xl font-black text-foreground">$2,730,000</p>
                                            <p className="text-[11px] text-muted-foreground">Standard 25.8% EBITDA margin benchmark</p>
                                        </div>
                                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                                Bull Valuation (5.0x)
                                            </span>
                                            <p className="text-2xl font-black text-foreground">$3,276,000</p>
                                            <p className="text-[11px] text-muted-foreground">Assumes expansion of recurring service contracts</p>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-2">
                                        <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            EBITDA Reconstruction Summary
                                        </h4>
                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                            Reported Net Income of $720,000 adjusted upwards by $120,000 for excess owner compensation and $15,000 non-recurring legal expenses, confirming <strong>$845,000 Adjusted EBITDA</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {previewTab === 'citations' && (
                                <div className="space-y-4">
                                    <p className="text-xs text-muted-foreground">
                                        Every single extracted number links directly to its source file line item with line numbers and verification status:
                                    </p>
                                    <div className="space-y-2 font-mono text-xs">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-background gap-2">
                                            <div>
                                                <span className="font-bold text-foreground">Gross Revenue ($3,250,000)</span>
                                                <p className="text-[11px] text-muted-foreground">Source: Apex_Commercial_PL_2025.pdf (Line 4)</p>
                                            </div>
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 w-fit">
                                                Verified Match (98%)
                                            </Badge>
                                        </div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-border bg-background gap-2">
                                            <div>
                                                <span className="font-bold text-foreground">Owner Compensation Add-back ($120,000)</span>
                                                <p className="text-[11px] text-muted-foreground">Source: Schedule B Add-backs (Line 12)</p>
                                            </div>
                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300 w-fit">
                                                Verified Match (95%)
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {previewTab === 'risks' && (
                                <div className="space-y-3">
                                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                                        <Badge variant="warning" className="shrink-0">YELLOW FLAG</Badge>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-foreground">Customer Concentration Warning</p>
                                            <p className="text-xs text-muted-foreground">Top 2 accounts generate 48% of total revenue. Recommend key-person clause in LOI.</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
                                        <Badge variant="success" className="shrink-0">GREEN FLAG</Badge>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-foreground">Clean Working Capital Position</p>
                                            <p className="text-xs text-muted-foreground">Current ratio of 2.1x exceeds 1.5x minimum covenant requirements.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {previewTab === 'cost' && (
                                <div className="space-y-4 text-xs">
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-1">
                                            <span className="text-primary font-bold">Per-Doc Primary Model:</span>
                                            <p className="text-base font-black text-foreground">Claude Sonnet 5</p>
                                            <p className="text-[11px] text-muted-foreground">Backup Failover: Claude Opus 5</p>
                                        </div>
                                        <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-1">
                                            <span className="text-purple-600 dark:text-purple-400 font-bold">Synthesizer Primary Model:</span>
                                            <p className="text-base font-black text-foreground">OpenAI 5.6 Terra</p>
                                            <p className="text-[11px] text-muted-foreground">Backup Failover: OpenAI 5.6 Sol</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* EVIDENCE-BASED SCORING & CITATION TRANSPARENCY */}
            <section id="evidence" className="py-16 sm:py-20 border-b border-border/50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
                    <div className="text-center space-y-3 max-w-3xl mx-auto">
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                            EVIDENCE TRANSPARENCY
                        </Badge>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            Trust What You Can Verify
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            M&amp;A buyers and investment committees reject black-box AI outputs. MergeWorks links every extracted number directly to its original file and line item.
                        </p>
                    </div>

                    {/* Interactive Fact Checker Widget */}
                    <div className="grid gap-8 lg:grid-cols-12 items-center">
                        <div className="lg:col-span-5 space-y-3">
                            <h3 className="text-lg font-bold text-foreground">Interactive Fact Inspection</h3>
                            <p className="text-xs text-muted-foreground">
                                Click any extracted metric below to inspect its exact source document, citation, and verification notes:
                            </p>

                            <div className="space-y-2 pt-2">
                                {interactiveFacts.map((fact, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                                            activeFactIndex === idx
                                                ? 'border-primary bg-primary/10 shadow-xs'
                                                : 'border-border bg-card hover:bg-muted/50'
                                        }`}
                                        onClick={() => setActiveFactIndex(idx)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-foreground">{fact.label}</span>
                                            <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-700">
                                                {fact.confidence}
                                            </Badge>
                                        </div>
                                        <p className="text-sm font-black text-primary mt-1">{fact.extractedValue}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-7">
                            <Card className="border-primary/30 shadow-xl bg-card">
                                <CardHeader className="border-b border-border bg-muted/30 pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <FileSearch className="h-4 w-4 text-primary" />
                                            <span>Citation Inspector View</span>
                                        </CardTitle>
                                        <Badge variant="success" className="text-[10px] font-bold">VERIFIED</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase">Target Field</span>
                                        <p className="text-base font-bold text-foreground">{interactiveFacts[activeFactIndex].label}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-xs font-semibold text-muted-foreground uppercase">Extracted Value</span>
                                        <p className="text-xl font-black text-primary font-mono">{interactiveFacts[activeFactIndex].extractedValue}</p>
                                    </div>

                                    <div className="p-3.5 rounded-lg border border-border bg-muted/40 font-mono text-xs space-y-1">
                                        <span className="text-muted-foreground text-[10px] uppercase tracking-wide font-sans font-semibold">Exact Source Citation:</span>
                                        <p className="text-foreground font-bold">{interactiveFacts[activeFactIndex].citation}</p>
                                    </div>

                                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                                        <strong>Auditor Note:</strong> {interactiveFacts[activeFactIndex].note}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </section>

            {/* M&A PIPELINE FLOW */}
            <section id="pipeline" className="py-16 sm:py-20 bg-muted/20 border-b border-border/50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
                    <div className="text-center space-y-3 max-w-3xl mx-auto">
                        <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs">
                            AUTONOMOUS WORKFLOW
                        </Badge>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            Structured 5-Stage M&amp;A Pipeline
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            How MergeWorks processes raw financial documents into investment committee verdicts:
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-5">
                        {[
                            { step: '01', title: 'Document Intake', desc: 'Accepts P&Ls, Balance Sheets, Rosters, & LOIs via dropzone or webhook.' },
                            { step: '02', title: 'OCR & Fact Extraction', desc: 'Structured JSON output with retry pass tracking (Primary/Backup models).' },
                            { step: '03', title: 'Evidence Mapping', desc: 'Attaches file line numbers & cell references to every extracted number.' },
                            { step: '04', title: 'Portfolio Synthesis', desc: 'Cross-document financial reconciliation & EBITDA reconstruction.' },
                            { step: '05', title: 'IC Verdict & Memo', desc: 'Bear/Base/Bull valuation ranges & downloadable deal memo.' },
                        ].map((s, idx) => (
                            <Card key={idx} className="border-border shadow-xs bg-card hover:border-primary/50 transition-colors">
                                <CardHeader className="pb-2">
                                    <span className="font-mono text-xs font-extrabold text-primary">{s.step}</span>
                                    <CardTitle className="text-sm font-bold text-foreground">{s.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* COST MODEL & ROI SECTION */}
            <section id="cost-model" className="py-16 sm:py-20 border-b border-border/50">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
                    <div className="text-center space-y-3 max-w-3xl mx-auto">
                        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs">
                            TRACK A: COST OPTIMIZATION
                        </Badge>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            88%+ Cost Savings Achieved
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Empirical cost breakdown comparing legacy manual review, flagship models, and MergeWorks hybrid pipeline:
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
                        <Card className="border-border bg-card">
                            <CardHeader>
                                <Badge variant="secondary" className="w-fit text-[10px]">MANUAL ANALYST</Badge>
                                <CardTitle className="text-3xl font-black text-foreground">$1,200 <span className="text-xs font-normal text-muted-foreground">/ deal</span></CardTitle>
                                <CardDescription className="text-xs">24 hours of associate time per packet</CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <p>• High error rate on complex scanned P&amp;Ls</p>
                                <p>• No automated regression tracking</p>
                            </CardContent>
                        </Card>

                        <Card className="border-border bg-card">
                            <CardHeader>
                                <Badge variant="outline" className="w-fit text-[10px]">UNOPTIMIZED BRUTE FORCE</Badge>
                                <CardTitle className="text-3xl font-black text-foreground">$0.1800 <span className="text-xs font-normal text-muted-foreground">/ run</span></CardTitle>
                                <CardDescription className="text-xs">Brute-force multi-doc dump into single prompt</CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-muted-foreground space-y-2">
                                <p>• High output token costs ($10.00/1M)</p>
                                <p>• Redundant context repetition across files</p>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/50 bg-primary/5 shadow-lg">
                            <CardHeader>
                                <Badge variant="success" className="w-fit text-[10px] font-bold">MERGEWORKS HYBRID (OPTIMIZED)</Badge>
                                <CardTitle className="text-3xl font-black text-primary">$0.0210 <span className="text-xs font-normal text-muted-foreground">/ run</span></CardTitle>
                                <CardDescription className="text-xs">Sonnet 5 (Per-Doc OCR) + OpenAI 5.6 (Synthesizer)</CardDescription>
                            </CardHeader>
                            <CardContent className="text-xs text-foreground space-y-2 font-medium">
                                <p className="text-emerald-600 font-bold">✓ 88%+ Savings vs Unoptimized Runs</p>
                                <p className="text-emerald-600 font-bold">✓ 99.9% Savings vs Manual Review ($0.021 vs $1,200)</p>
                                <p>✓ Zero numeric hallucination score with 100% citations</p>
                                <p>✓ Sub-15 second end-to-end execution</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* FREQUENTLY ASKED QUESTIONS (FAQ) SECTION */}
            <section id="faqs" className="py-16 sm:py-24 bg-muted/20 border-b border-border/50">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 space-y-10">
                    <div className="text-center space-y-3 max-w-3xl mx-auto">
                        <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary font-mono text-xs">
                            BEGINNER &amp; USER GUIDE
                        </Badge>
                        <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                            Frequently Asked Questions (FAQs)
                        </h2>
                        <p className="text-sm text-muted-foreground sm:text-base">
                            Everything you need to know about navigating MergeWorks, uploading deal packets, and reviewing audit-grade M&amp;A due diligence.
                        </p>
                    </div>

                    <div className="space-y-3.5 max-w-3xl mx-auto">
                        {faqs.map((faq, idx) => (
                            <div key={idx} className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden transition-all">
                                <button
                                    type="button"
                                    onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
                                    className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-foreground hover:bg-muted/30 cursor-pointer"
                                >
                                    <span className="flex items-center gap-3">
                                        <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                                        <span>{faq.question}</span>
                                    </span>
                                    {openFaqIndex === idx ? <ChevronUp className="h-5 w-5 text-primary shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />}
                                </button>
                                {openFaqIndex === idx && (
                                    <div className="px-5 pb-5 pt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/10 space-y-3">
                                        <p>{faq.answer}</p>
                                        {faq.badge && (
                                            <Badge variant="secondary" className="text-[10px] font-mono font-bold">
                                                {faq.badge}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="text-center pt-4">
                        <p className="text-xs text-muted-foreground mb-3">Still have questions about analyzing your deal packet?</p>
                        <Button
                            type="button"
                            onClick={onLaunchDashboard}
                            className="bg-primary text-white font-bold text-xs shadow-md"
                        >
                            <span>Try Sample Deal Packet in App Dashboard</span>
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-border bg-card py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
                            M
                        </div>
                        <span className="text-sm font-bold text-foreground">MergeWorks AI Due Diligence Platform</span>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <a href="#features" className="hover:text-foreground">Features</a>
                        <a href="#live-preview" className="hover:text-foreground">Live Preview</a>
                        <a href="#cost-model" className="hover:text-foreground">Cost Model</a>
                        <a href="#faqs" className="hover:text-foreground font-semibold text-primary">FAQs</a>
                        <button type="button" onClick={() => setShowWalkthroughModal(true)} className="hover:text-foreground">Walkthrough</button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        © 2026 MergeWorks Inc. All rights reserved.
                    </p>
                </div>
            </footer>

            {/* GUIDED WALKTHROUGH MODAL (Supademo Integration) */}
            {showWalkthroughModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                                    SUPADEMO WALKTHROUGH
                                </Badge>
                                <h3 className="text-lg font-bold text-foreground">Guided Product Demo</h3>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setShowWalkthroughModal(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Interactive Step Preview */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border">
                                <span className="text-xs font-bold text-primary font-mono">
                                    Step {walkthroughStep} of {walkthroughSteps.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        disabled={walkthroughStep === 1}
                                        onClick={() => setWalkthroughStep((prev) => Math.max(1, prev - 1))}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        disabled={walkthroughStep === walkthroughSteps.length}
                                        onClick={() => setWalkthroughStep((prev) => Math.min(walkthroughSteps.length, prev + 1))}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>

                            <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                                <h4 className="text-base font-bold text-foreground">
                                    {walkthroughSteps[walkthroughStep - 1].title}
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {walkthroughSteps[walkthroughStep - 1].desc}
                                </p>
                                <Badge variant="success" className="font-mono text-xs font-bold">
                                    {walkthroughSteps[walkthroughStep - 1].highlight}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
                            <a
                                href="https://app.supademo.com/demo/cms81ew4y01kdqm68samg07zi?utm_source=link"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                                <span>Open Full Interactive Supademo in New Tab</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <Button
                                type="button"
                                className="bg-primary text-white text-xs font-bold w-full sm:w-auto"
                                onClick={() => {
                                    setShowWalkthroughModal(false)
                                    onLaunchDashboard()
                                }}
                            >
                                Try Live in App Dashboard
                                <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* APPLY FOR ACCESS MODAL */}
            {showAccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-lg font-bold text-foreground">Apply for Workspace Access</h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setShowAccessModal(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {accessSubmitted ? (
                            <div className="p-6 text-center space-y-3">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <h4 className="text-base font-bold text-foreground">Access Request Received!</h4>
                                <p className="text-xs text-muted-foreground">
                                    Our deal team will review your application and send invite credentials to <strong>{accessForm.email}</strong> within 1 hour.
                                </p>
                                <Button
                                    type="button"
                                    className="w-full bg-primary text-white text-xs font-bold mt-2"
                                    onClick={() => {
                                        setShowAccessModal(false)
                                        onLaunchDashboard()
                                    }}
                                >
                                    Explore Demo Workspace
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleAccessSubmit} className="space-y-4 text-xs">
                                <div className="space-y-1">
                                    <label className="font-semibold text-foreground">Full Name</label>
                                    <Input
                                        type="text"
                                        required
                                        placeholder="e.g. Alex Mercer"
                                        value={accessForm.name}
                                        onChange={(e) => setAccessForm({ ...accessForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-foreground">Work Email</label>
                                    <Input
                                        type="email"
                                        required
                                        placeholder="alex@mergeworks-pe.com"
                                        value={accessForm.email}
                                        onChange={(e) => setAccessForm({ ...accessForm, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-foreground">Firm / Company Name</label>
                                    <Input
                                        type="text"
                                        required
                                        placeholder="M&A Capital Partners"
                                        value={accessForm.firm}
                                        onChange={(e) => setAccessForm({ ...accessForm, firm: e.target.value })}
                                    />
                                </div>
                                <Button type="submit" className="w-full bg-primary text-white font-bold text-xs py-2.5">
                                    Submit Application
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
