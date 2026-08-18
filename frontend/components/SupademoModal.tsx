import React, { useState } from 'react'
import {
    Check,
    Code,
    Copy,
    ExternalLink,
    Maximize2,
    Minimize2,
    Play,
    Sparkles,
    X,
    Layers,
    ShieldCheck,
    ChevronRight,
    Video,
    Film,
    Clock,
    CheckCircle2,
} from 'lucide-react'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'

export const SUPADEMO_DEMO_ID = 'cmsxjva3k02qnqmzskc587vyg'
export const SUPADEMO_DIRECT_URL = `https://app.supademo.com/demo/${SUPADEMO_DEMO_ID}?utm_source=link`
export const SUPADEMO_EMBED_URL = `https://app.supademo.com/embed/${SUPADEMO_DEMO_ID}?embed_v=2&utm_source=embed`

export const SUPADEMO_DEEP_DEMO_ID = 'cmsxmhhb4005f1a0j5beodn92'
export const SUPADEMO_DEEP_DIRECT_URL = `https://app.supademo.com/demo/${SUPADEMO_DEEP_DEMO_ID}?utm_source=link`
export const SUPADEMO_DEEP_EMBED_URL = `https://app.supademo.com/embed/${SUPADEMO_DEEP_DEMO_ID}?embed_v=2&utm_source=embed`

export const SUPADEMO_IFRAME_CODE = `<div style="position: relative; box-sizing: content-box; max-height: 80vh; max-height: 80svh; width: 100%; aspect-ratio: 1.78; padding: 40px 0 40px 0;">
  <iframe
    src="${SUPADEMO_EMBED_URL}"
    loading="lazy"
    title="MergeWorks — Financial Due Diligence Engine"
    allow="clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture"
    frameborder="0"
    webkitallowfullscreen="true"
    mozallowfullscreen="true"
    allowfullscreen
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;"
  ></iframe>
</div>`

export const SUPADEMO_DEEP_IFRAME_CODE = `<div style="position: relative; box-sizing: content-box; max-height: 80vh; max-height: 80svh; width: 100%; aspect-ratio: 1.78; padding: 40px 0 40px 0;">
  <iframe
    src="${SUPADEMO_DEEP_EMBED_URL}"
    loading="lazy"
    title="MergeWorks — Full Deal Diligence Deep Dive (30 Steps)"
    allow="clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture"
    frameborder="0"
    webkitallowfullscreen="true"
    mozallowfullscreen="true"
    allowfullscreen
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;"
  ></iframe>
</div>`

export const YOUTUBE_SHORT_VIDEO_ID = 'ttm2wTX6oPM'
export const YOUTUBE_SHORT_DIRECT_URL = 'https://www.youtube.com/watch?v=ttm2wTX6oPM'
export const YOUTUBE_SHORT_EMBED_URL = 'https://www.youtube.com/embed/ttm2wTX6oPM'

export const YOUTUBE_SHORT_IFRAME_CODE = `<div style="position: relative; box-sizing: content-box; width: 100%; aspect-ratio: 16/9; max-height: 80vh;">
  <iframe
    src="${YOUTUBE_SHORT_EMBED_URL}?autoplay=1&rel=0"
    loading="lazy"
    title="MergeWorks — 2-Min Video Walkthrough"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    frameborder="0"
    allowfullscreen
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; border-radius: 12px;"
  ></iframe>
</div>`

export const STEPS_ROADMAP = [
    { num: 1, title: 'Multi-Doc Ingestion', desc: 'Drag-and-drop CIMs, LOIs, tax filings, and financials.', tag: 'Ingestion' },
    { num: 2, title: 'Deterministic Extraction', desc: 'AI extracts verified revenue, EBITDA, SDE, and officer salaries.', tag: 'Scorecards' },
    { num: 3, title: '100% Ground Truth', desc: 'Every metric links back to its exact clause, page, and bounding box.', tag: 'Evidence' },
    { num: 4, title: 'Valuation Gap Matrix', desc: 'Flags 7.9-9.0x SDE ask vs 3.0-5.0x benchmark multiple disconnect.', tag: 'Valuation' },
    { num: 5, title: 'Opportunity & Risk Scoring', desc: 'Identifies unverified add-backs, thin margin, and key-person risk.', tag: 'Risk Engine' },
    { num: 6, title: 'AI Deal Copilot', desc: 'Interactive conversational deal room grounded across all files.', tag: 'Copilot' },
    { num: 7, title: 'Remediation Playbooks', desc: 'Generate escrow holdbacks, indemnity covenants, and broker drafts.', tag: 'Playbooks' },
    { num: 8, title: 'Equity Waterfall Modeling', desc: 'Model sponsor equity, senior debt, seller notes, and IRR returns.', tag: 'Waterfall' },
    { num: 9, title: '1-Click IC Export', desc: 'Download publication-ready Investment Committee memorandums.', tag: 'IC Reports' },
    { num: 10, title: 'Live n8n Cloud Pipeline', desc: 'Multi-model orchestration running on Pod 1 n8n & Supabase.', tag: 'Cloud Agent' },
]

export const DEEP_STEPS_ROADMAP = [
    { num: 1, title: 'Multi-Doc Deal Room Ingestion', desc: 'Upload CIMs, LOIs, tax returns, and financials in one batch.', tag: 'Intake' },
    { num: 2, title: 'Trigger OCR & Extraction Pipeline', desc: 'Multi-model pipeline parses PDFs and scans with zero data leakage.', tag: 'Ingestion' },
    { num: 3, title: 'Submission History & Version Audit', desc: 'Inspect queued documents and track batch OCR processing status.', tag: 'Audit' },
    { num: 4, title: 'LOI Terms & Valuation Extraction', desc: 'Extracts purchase price, earnout thresholds, and closing contingencies.', tag: 'LOI' },
    { num: 5, title: 'Deep-Dive LOI Evidence Inspection', desc: 'Every extracted covenant is directly linked to the raw source LOI.', tag: 'Evidence' },
    { num: 6, title: '100% Ground Truth Evidence Modal', desc: 'View exact bounding boxes, sentence citations, and confidence scores.', tag: 'Citations' },
    { num: 7, title: 'Verified SDE & EBITDA Add-Backs', desc: 'Reconcile discretionary expenses, non-recurring legal costs, and salaries.', tag: 'Quality of Earnings' },
    { num: 8, title: 'Enterprise Value Implied by Ask', desc: 'Calculates headline EV multiple from reported earnings vs comps.', tag: 'Valuation' },
    { num: 9, title: 'Debt-to-Asset & Solvency Audit', desc: 'Cross-checks balance sheet liabilities to confirm clean 0.13 ratio.', tag: 'Balance Sheet' },
    { num: 10, title: 'Scorecard Cross-Validation', desc: 'Flags contradictory numbers between teaser CIM and signed LOI.', tag: 'Reconciliation' },
    { num: 11, title: 'Cross-Doc Synthesis & $350k Holdback', desc: 'Detects customer concentration risk and proposes $350k escrow.', tag: 'Synthesis' },
    { num: 12, title: 'Key Diligence Inquiry Questions', desc: 'Specific inquiry questions for management on top-customer renewals.', tag: 'Inquiry' },
    { num: 13, title: 'Critical Cash-Flow Red Flag (95%)', desc: 'Identifies working capital deficit and recommends term renegotiation.', tag: 'Red Flag' },
    { num: 14, title: 'IC ESCALATE Verdict', desc: 'Synthesizes red flags and multiple disconnects into clear guidance.', tag: 'Verdict' },
    { num: 15, title: 'Enterprise Value Methodologies', desc: 'Examine EV = Purchase Price + Net Funded Debt calculation mechanics.', tag: 'Formulas' },
    { num: 16, title: 'Normalized EV Breakdown ($4.41M)', desc: 'Detailed breakdown of seller debt assumptions and adjusted equity.', tag: 'Enterprise Value' },
    { num: 17, title: 'Operational Quality & Margins', desc: 'Deep analysis of recurring SaaS margins and customer retention.', tag: 'Operations' },
    { num: 18, title: 'Verified Operating Strengths & Moats', desc: 'Highlights low customer churn and strong gross margin defensibility.', tag: 'Moats' },
    { num: 19, title: 'Opportunity & Upside Modeling', desc: 'Identifies growth opportunities in pricing and international expansion.', tag: 'Growth' },
    { num: 20, title: 'Launch Dillon AI Deal Copilot', desc: 'Ask natural-language questions about footnotes, leases, and contracts.', tag: 'Copilot' },
    { num: 21, title: 'Grounded Copilot Deal Q&A', desc: 'AI answers with citation links directly to underlying P&L line items.', tag: 'Q&A' },
    { num: 22, title: '1-Click Broker Pushback Emails', desc: 'Generate polite but firm broker pushback scripts based on red flags.', tag: 'Negotiation' },
    { num: 23, title: 'Valuation Matrix & Sensitivity', desc: 'Compare Bear (3.0x), Base (4.0x), and Bull (5.0x) SDE multiples.', tag: 'Multiples' },
    { num: 24, title: 'Multiple Discrepancy & Risk Identification', desc: 'Flags high seller premium and provides empirical valuation defense.', tag: 'Risk Matrix' },
    { num: 25, title: 'Tax Rate & Depreciation Assumptions', desc: 'Inspect transparent financial modeling tax rates and working capital.', tag: 'Tax & D&A' },
    { num: 26, title: 'Equity Waterfall & IRR Modeling', desc: 'Model sponsor equity, senior debt, seller notes, and IRR distributions.', tag: 'Waterfall' },
    { num: 27, title: 'Transaction Fees & Capitalization', desc: 'Configure legal fees, advisory costs, and debt amortization schedules.', tag: 'Capitalization' },
    { num: 28, title: 'Phase II Due Diligence Checklist', desc: 'Auto-generates 25+ specific confirmatory diligence requests for seller.', tag: 'Checklist' },
    { num: 29, title: 'Project Portfolio Rollup', desc: 'Manage 350+ files across 20+ active data rooms with unified synthesis.', tag: 'Portfolio' },
    { num: 30, title: '1-Click IC Deal Memo Export', desc: 'Export comprehensive deal memos and financial tables to Markdown/PDF.', tag: 'IC Export' },
]

export type DemoVariantId = 'short-supademo' | 'deep-supademo' | 'short-yt' | 'long-yt'

interface SupademoModalProps {
    isOpen: boolean
    onClose: () => void
    defaultDemoId?: DemoVariantId
    defaultTab?: 'player' | 'embed' | 'steps'
}

export default function SupademoModal({
    isOpen,
    onClose,
    defaultDemoId = 'short-supademo',
    defaultTab = 'player',
}: SupademoModalProps) {
    const [selectedDemo, setSelectedDemo] = useState<DemoVariantId>(defaultDemoId)
    const [activeTab, setActiveTab] = useState<'player' | 'embed' | 'steps'>(defaultTab)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [copied, setCopied] = useState(false)

    // Sync if defaultDemoId changes on opening
    React.useEffect(() => {
        if (isOpen) {
            setSelectedDemo(defaultDemoId)
            setActiveTab(defaultTab)
        }
    }, [isOpen, defaultDemoId, defaultTab])

    if (!isOpen) return null

    const handleCopyEmbed = async () => {
        try {
            const codeToCopy = selectedDemo === 'short-yt'
                ? YOUTUBE_SHORT_IFRAME_CODE
                : selectedDemo === 'deep-supademo'
                    ? SUPADEMO_DEEP_IFRAME_CODE
                    : SUPADEMO_IFRAME_CODE
            await navigator.clipboard.writeText(codeToCopy)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        } catch {
            // Fallback
        }
    }

    const currentDirectUrl = selectedDemo === 'short-yt'
        ? YOUTUBE_SHORT_DIRECT_URL
        : selectedDemo === 'deep-supademo'
            ? SUPADEMO_DEEP_DIRECT_URL
            : SUPADEMO_DIRECT_URL
    const currentStepsRoadmap = selectedDemo === 'deep-supademo' ? DEEP_STEPS_ROADMAP : STEPS_ROADMAP

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
            <div
                className={`relative w-full rounded-2xl border border-border bg-card shadow-2xl flex flex-col transition-all duration-300 overflow-hidden ${
                    isFullscreen
                        ? 'max-w-[98vw] h-[96vh]'
                        : 'max-w-5xl h-[88vh] max-h-[920px]'
                }`}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/40 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-foreground">
                                    {selectedDemo === 'short-yt'
                                        ? 'MergeWorks Video Walkthrough'
                                        : selectedDemo === 'deep-supademo'
                                            ? 'MergeWorks Deal Room Deep Dive'
                                            : 'MergeWorks Interactive Product Walkthrough'}
                                </h3>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-semibold">
                                    {selectedDemo === 'short-yt'
                                        ? 'YOUTUBE VIDEO'
                                        : selectedDemo === 'deep-supademo'
                                            ? '30-STEP LIVE TOUR'
                                            : '10-STEP LIVE TOUR'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                {selectedDemo === 'short-yt'
                                    ? 'Executive walkthrough: multi-document OCR, table extraction, and valuation matrix.'
                                    : selectedDemo === 'deep-supademo'
                                        ? 'In-depth interactive due diligence tour: OCR, add-backs, red flags & deal structuring.'
                                        : 'Interactive deal diligence simulation: Ingestion → Scorecards → Valuation → IC Report.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {/* Tab Switcher */}
                        <div className="flex items-center rounded-lg bg-background border border-border p-0.5 text-xs mr-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('player')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    activeTab === 'player'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Interactive Tour
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('steps')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    activeTab === 'steps'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Storyboard ({currentStepsRoadmap.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('embed')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                                    activeTab === 'embed'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                Embed
                            </button>
                        </div>

                        {/* Direct Link */}
                        <a
                            href={currentDirectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors hidden sm:inline-flex"
                            title="Open in new window"
                        >
                            <ExternalLink className="h-4 w-4" />
                        </a>

                        {/* Maximize Toggle */}
                        <button
                            type="button"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </button>

                        {/* Close Button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
                            title="Close modal"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Subheader Demo Variant Selector */}
                <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-muted/20 text-xs overflow-x-auto shrink-0 scrollbar-none">
                    <span className="font-semibold text-muted-foreground shrink-0 uppercase tracking-wider text-[10px]">
                        Select Tour:
                    </span>

                    <button
                        type="button"
                        onClick={() => { setSelectedDemo('short-supademo'); setActiveTab('player') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                            selectedDemo === 'short-supademo'
                                ? 'bg-primary/15 text-primary border border-primary/40 shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                        }`}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>⚡ 10-Step Tour (2 min)</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-emerald-400 border-emerald-400/30">
                            LIVE
                        </Badge>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSelectedDemo('deep-supademo'); setActiveTab('player') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                            selectedDemo === 'deep-supademo'
                                ? 'bg-primary/15 text-primary border border-primary/40 shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                        }`}
                    >
                        <Layers className="h-3.5 w-3.5" />
                        <span>🔍 30-Step Deep Dive (5 min)</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-emerald-400 border-emerald-400/30">
                            LIVE
                        </Badge>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSelectedDemo('short-yt'); setActiveTab('player') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                            selectedDemo === 'short-yt'
                                ? 'bg-primary/15 text-primary border border-primary/40 shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                        }`}
                    >
                        <Video className="h-3.5 w-3.5" />
                        <span>🎥 3-Min Video Summary</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-blue-400 border-blue-400/30">
                            YOUTUBE
                        </Badge>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setSelectedDemo('long-yt'); setActiveTab('player') }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
                            selectedDemo === 'long-yt'
                                ? 'bg-primary/15 text-primary border border-primary/40 shadow-xs'
                                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground border border-transparent'
                        }`}
                    >
                        <Film className="h-3.5 w-3.5" />
                        <span>🎓 15-Min M&amp;A Masterclass</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-purple-400 border-purple-400/30">
                            FULL WEBINAR
                        </Badge>
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-auto bg-background/50 flex flex-col">
                    {activeTab === 'player' && (
                        <div className="relative w-full flex-1 min-h-[420px] flex items-center justify-center p-2 sm:p-4 bg-black/95">
                            {selectedDemo === 'short-supademo' && (
                                <iframe
                                    src={SUPADEMO_EMBED_URL}
                                    loading="lazy"
                                    title="MergeWorks — Financial Due Diligence Engine (10-Step Tour)"
                                    allow="clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full rounded-xl shadow-2xl border border-white/10"
                                    style={{
                                        minHeight: '100%',
                                        aspectRatio: '16/9',
                                    }}
                                />
                            )}

                            {selectedDemo === 'deep-supademo' && (
                                <iframe
                                    src={SUPADEMO_DEEP_EMBED_URL}
                                    loading="lazy"
                                    title="MergeWorks — Full Deal Diligence Deep Dive (30 Steps)"
                                    allow="clipboard-write; fullscreen; autoplay; encrypted-media; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full rounded-xl shadow-2xl border border-white/10"
                                    style={{
                                        minHeight: '100%',
                                        aspectRatio: '16/9',
                                    }}
                                />
                            )}

                            {selectedDemo === 'short-yt' && (
                                <iframe
                                    src={`${YOUTUBE_SHORT_EMBED_URL}?autoplay=1&rel=0`}
                                    loading="lazy"
                                    title="MergeWorks — 2-Min Video Walkthrough"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="w-full h-full rounded-xl shadow-2xl border border-white/10"
                                    style={{
                                        minHeight: '100%',
                                        aspectRatio: '16/9',
                                    }}
                                />
                            )}

                            {selectedDemo === 'long-yt' && (
                                <div className="max-w-2xl text-center p-8 space-y-5 bg-card/80 rounded-2xl border border-border shadow-2xl">
                                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500 shadow-inner">
                                        <Film className="h-7 w-7" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">
                                            15-Minute M&amp;A Due Diligence Masterclass
                                        </h4>
                                        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                            Comprehensive technical breakdown for private equity associates and search funders: Quality of Earnings audits, cross-document reconciliation, and debt waterfall covenants.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="bg-primary text-primary-foreground font-semibold gap-1.5"
                                            onClick={() => setSelectedDemo('short-supademo')}
                                        >
                                            <Sparkles className="h-3.5 w-3.5" />
                                            Launch 10-Step Interactive Tour
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'steps' && (
                        <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto w-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
                                <div>
                                    <h4 className="text-base font-bold text-foreground">
                                        Interactive M&amp;A Diligence Storyboard ({currentStepsRoadmap.length} Steps)
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedDemo === 'deep-supademo'
                                            ? 'Full 30-milestone interactive walkthrough from raw intake to debt waterfalls & IC export.'
                                            : 'Summary of each curated milestone in the 10-step guided tour.'}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="default"
                                    className="gap-1.5 text-xs font-semibold"
                                    onClick={() => setActiveTab('player')}
                                >
                                    <Play className="h-3 w-3" />
                                    Launch Interactive Player
                                </Button>
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {currentStepsRoadmap.map((step) => (
                                    <div
                                        key={step.num}
                                        className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 hover:border-primary/40 hover:bg-muted/30 transition-all"
                                    >
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">
                                            {step.num}
                                        </div>
                                        <div className="space-y-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h5 className="text-xs font-bold text-foreground truncate">
                                                    {step.title}
                                                </h5>
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                    {step.tag}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'embed' && (
                        <div className="p-4 sm:p-6 space-y-5 max-w-3xl mx-auto w-full">
                            <div>
                                <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                                    <Code className="h-4 w-4 text-primary" />
                                    Embed This Guided Demo on Any Website or Portal
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Paste this responsive iframe code into Notion, Webflow, WordPress, your Investor Portal, or custom React applications.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">
                                        HTML Embed Snippet ({selectedDemo === 'deep-supademo' ? '30-Step Deep Dive' : '10-Step Tour'})
                                    </span>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                                        onClick={handleCopyEmbed}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                <span>Copied to Clipboard!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="h-3.5 w-3.5" />
                                                <span>Copy Embed Code</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <pre className="p-3.5 rounded-xl border border-border bg-muted/60 text-xs font-mono text-foreground overflow-x-auto select-all leading-relaxed">
                                    {selectedDemo === 'deep-supademo' ? SUPADEMO_DEEP_IFRAME_CODE : SUPADEMO_IFRAME_CODE}
                                </pre>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                    Embed Capabilities &amp; Features
                                </h5>
                                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                                    <li><strong>100% Responsive</strong>: Adapts automatically to desktop, tablet, and mobile viewports.</li>
                                    <li><strong>AI Voice Narration Supported</strong>: Integrated audio walkthrough narration across all milestones.</li>
                                    <li><strong>Zero Friction</strong>: Prospective buyers and investment partners can click through without signing up.</li>
                                    <li><strong>Hotspot Interactions</strong>: Full pulse animations and chapter navigation preserved.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-background text-muted-foreground border-border text-[11px]">
                            Powered by Supademo &amp; Dillon AI
                        </Badge>
                        <a
                            href={currentDirectUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                            <span>Open direct link in new tab</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={onClose}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="text-xs font-semibold bg-primary text-primary-foreground gap-1.5"
                            onClick={() => {
                                if (activeTab !== 'player') {
                                    setActiveTab('player')
                                } else {
                                    onClose()
                                }
                            }}
                        >
                            {activeTab === 'player' ? 'Done' : 'Back to Interactive Tour'}
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
