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

export const SUPADEMO_IFRAME_CODE = `<div style="position: relative; box-sizing: content-box; max-height: 80vh; max-height: 80svh; width: 100%; aspect-ratio: 1.78; padding: 40px 0 40px 0;">
  <iframe
    src="${SUPADEMO_EMBED_URL}"
    loading="lazy"
    title="MergeWorks — Financial Due Diligence Engine"
    allow="clipboard-write"
    frameborder="0"
    webkitallowfullscreen="true"
    mozallowfullscreen="true"
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
            await navigator.clipboard.writeText(SUPADEMO_IFRAME_CODE)
            setCopied(true)
            setTimeout(() => setCopied(false), 2500)
        } catch {
            // Fallback
        }
    }

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
                <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 bg-muted/40">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-foreground">
                                    Dillon AI Guided Demos &amp; Walkthroughs
                                </h3>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px] font-mono">
                                    {selectedDemo === 'short-supademo' && '10-STEP TOUR'}
                                    {selectedDemo === 'deep-supademo' && 'EXTENDED TOUR'}
                                    {selectedDemo === 'short-yt' && '3-MIN VIDEO'}
                                    {selectedDemo === 'long-yt' && '15-MIN MASTERCLASS'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground hidden sm:block">
                                Interactive Supademo and video walkthroughs of multi-document ingestion and valuation analysis.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {/* Tab Switcher */}
                        <div className="flex items-center rounded-lg bg-background p-1 border border-border text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('player')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'player'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Play className="h-3 w-3" />
                                <span className="hidden sm:inline">Tour Player</span>
                                <span className="sm:hidden">Player</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('steps')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'steps'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Layers className="h-3 w-3" />
                                <span className="hidden sm:inline">10 Steps Roadmap</span>
                                <span className="sm:hidden">Steps</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('embed')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'embed'
                                        ? 'bg-primary text-primary-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <Code className="h-3 w-3" />
                                <span className="hidden sm:inline">Embed Code</span>
                                <span className="sm:hidden">Embed</span>
                            </button>
                        </div>

                        {/* Fullscreen Toggle */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            title={isFullscreen ? 'Exit full view' : 'Expand full view'}
                        >
                            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                        </Button>

                        {/* Close */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={onClose}
                            title="Close walkthrough"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* 4 Demo Selector Switcher Bar */}
                <div className="border-b border-border bg-card/90 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider shrink-0 mr-1">
                        Select Demo:
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
                        <span>⚡ 10-Step Supademo (2m)</span>
                        <Badge variant="default" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/20 text-emerald-400 border-0">
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
                        <span>🔍 Extended Supademo (8m)</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 text-amber-400 border-amber-400/30">
                            DEEP DIVE
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
                                    title="MergeWorks — Financial Due Diligence Engine"
                                    allow="clipboard-write; fullscreen"
                                    frameBorder="0"
                                    webkitallowfullscreen="true"
                                    mozallowfullscreen="true"
                                    allowFullScreen
                                    className="w-full h-full rounded-xl shadow-2xl border border-white/10"
                                    style={{
                                        minHeight: '100%',
                                        aspectRatio: '16/9',
                                    }}
                                />
                            )}

                            {selectedDemo === 'deep-supademo' && (
                                <div className="max-w-2xl text-center p-8 space-y-5 bg-card/80 rounded-2xl border border-border shadow-2xl">
                                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                                        <Layers className="h-7 w-7" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">
                                            Extended 8-Minute Supademo
                                        </h4>
                                        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                            A complete walkthrough covering all 9 workspace tabs: EBITDA add-back schedules, LBO sensitivity matrices, customer concentration curves, and custom investment committee templates.
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
                                            Play Live 10-Step Tour Now
                                        </Button>
                                        <a
                                            href={SUPADEMO_DIRECT_URL}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg border border-border"
                                        >
                                            <span>Open Supademo Portal</span>
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </div>
                                </div>
                            )}

                            {selectedDemo === 'short-yt' && (
                                <div className="max-w-2xl text-center p-8 space-y-5 bg-card/80 rounded-2xl border border-border shadow-2xl">
                                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 shadow-inner">
                                        <Video className="h-7 w-7" />
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-xl font-bold text-foreground">
                                            3-Minute Executive Video Overview
                                        </h4>
                                        <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                                            High-tempo visual summary demonstrating multi-document OCR, table extraction, citation inspection, and valuation gap detection in under 180 seconds.
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
                                            Try Interactive Tour While Video Encodes
                                        </Button>
                                    </div>
                                </div>
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
                                        Interactive M&amp;A Diligence Storyboard
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        Summary of each curated milestone in the 10-step guided tour.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="default"
                                    className="gap-1.5 text-xs font-semibold"
                                    onClick={() => { setSelectedDemo('short-supademo'); setActiveTab('player') }}
                                >
                                    <Play className="h-3 w-3" />
                                    Launch Interactive Player
                                </Button>
                            </div>

                            <div className="grid gap-2.5 sm:grid-cols-2">
                                {STEPS_ROADMAP.map((step) => (
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
                                    <span className="font-semibold text-foreground">HTML Embed Snippet</span>
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
                                    {SUPADEMO_IFRAME_CODE}
                                </pre>
                            </div>

                            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                                <h5 className="text-xs font-bold text-foreground flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                    Embed Capabilities &amp; Features
                                </h5>
                                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                                    <li><strong>100% Responsive</strong>: Adapts automatically to desktop, tablet, and mobile viewports.</li>
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
                            href={SUPADEMO_DIRECT_URL}
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
