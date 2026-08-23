import React, { useState, useEffect, useMemo } from 'react'
import {
    Keyboard,
    Search,
    Sparkles,
    Command,
    Compass,
    FileText,
    Zap,
    HelpCircle,
    Copy,
    Check,
    Volume2,
    Sliders,
    Layers,
    Bot,
} from 'lucide-react'
import CardInfoPopover from '../common/CardInfoPopover'
import type { WorkspaceTab } from '../DealWorkspaceNav'

interface ShortcutItem {
    id: string
    category: 'Navigation' | 'Dillon AI & Voice' | 'Diligence & Modeling' | 'Tours & HUD' | 'Overlays & Modals'
    keys: string[]
    label: string
    description: string
    actionHint?: string
    actionTab?: WorkspaceTab
}

const SHORTCUTS: ShortcutItem[] = [
    // Navigation
    {
        id: 'nav-overview',
        category: 'Navigation',
        keys: ['1'],
        label: 'Jump to Overview Tab',
        description: 'Switches directly to the Deal Overview & Executive Summary scorecard.',
        actionTab: 'overview',
    },
    {
        id: 'nav-analysis',
        category: 'Navigation',
        keys: ['2'],
        label: 'Jump to Analysis Tab',
        description: 'Opens EBITDA reconstruction, QoE adjustments, and customer concentration.',
        actionTab: 'analysis',
    },
    {
        id: 'nav-diagnostics',
        category: 'Navigation',
        keys: ['3'],
        label: 'Jump to Risk & Playbook',
        description: 'Inspects deal-killer risks, owner dependency, and Phase II checklist.',
        actionTab: 'diagnostics',
    },
    {
        id: 'nav-diligence',
        category: 'Navigation',
        keys: ['4'],
        label: 'Jump to Diligence Intake',
        description: 'Opens multi-doc batch upload, OCR parsing, and extraction facts.',
        actionTab: 'diligence',
    },
    {
        id: 'nav-synthesis',
        category: 'Navigation',
        keys: ['5'],
        label: 'Jump to Synthesis Pass',
        description: 'Views IC acquisition judgment, cross-document conflict matrix, and flags.',
        actionTab: 'synthesis',
    },
    {
        id: 'nav-valuation',
        category: 'Navigation',
        keys: ['6'],
        label: 'Jump to Valuation Models',
        description: 'Opens DCF model, precedent comps, and multiple explorer.',
        actionTab: 'valuation',
    },
    {
        id: 'nav-structure',
        category: 'Navigation',
        keys: ['7'],
        label: 'Jump to Deal Structure',
        description: 'Inspects Sources & Uses, SBA loan amortization, and DSCR coverage.',
        actionTab: 'structure',
    },
    {
        id: 'nav-negotiation',
        category: 'Navigation',
        keys: ['8'],
        label: 'Jump to Negotiation Levers',
        description: 'Views price impact bridge, escrow holdbacks, and broker scripts.',
        actionTab: 'negotiation',
    },
    {
        id: 'nav-toc-toggle',
        category: 'Navigation',
        keys: ['Alt', 'T'],
        label: 'Toggle Table of Contents Outline',
        description: 'Expands or collapses the quick section outline on the left sidebar.',
    },
    {
        id: 'nav-global-search',
        category: 'Navigation',
        keys: ['Ctrl', 'K'],
        label: 'Omnibar Deal Search',
        description: 'Opens the global omnibar to search across documents, metrics, and models.',
    },

    // Dillon AI & Voice
    {
        id: 'ai-toggle-chat',
        category: 'Dillon AI & Voice',
        keys: ['C'],
        label: 'Toggle Dillon AI Copilot Dock',
        description: 'Opens or closes the AI deal diligence copilot panel.',
    },
    {
        id: 'ai-voice-narration',
        category: 'Dillon AI & Voice',
        keys: ['Alt', 'V'],
        label: 'Toggle Voiceover & Audio Narration',
        description: 'Enables or disables institutional audio narration during guided tours.',
    },
    {
        id: 'ai-send-message',
        category: 'Dillon AI & Voice',
        keys: ['Ctrl', 'Enter'],
        label: 'Submit Prompt to Dillon AI',
        description: 'Sends the current prompt or financial question to Dillon AI without clicking.',
    },

    // Diligence & Modeling
    {
        id: 'deal-run-synthesis',
        category: 'Diligence & Modeling',
        keys: ['Alt', 'E'],
        label: 'Run 1-Click Pod 1 Synthesis Pass',
        description: 'Triggers multi-document AI reconciliation and IC judgment analysis.',
    },
    {
        id: 'deal-export-memo',
        category: 'Diligence & Modeling',
        keys: ['Alt', 'P'],
        label: 'Export Investment Committee Memo',
        description: 'Generates and downloads the audit-grade deal memo and summary package.',
    },
    {
        id: 'deal-new-project',
        category: 'Diligence & Modeling',
        keys: ['Alt', 'N'],
        label: 'Create New Diligence Project',
        description: 'Initializes a new isolated deal room workspace.',
    },

    // Tours & HUD
    {
        id: 'tour-help',
        category: 'Tours & HUD',
        keys: ['?'],
        label: 'Open Shortcuts Cheatsheet Modal',
        description: 'Displays a quick modal overlay of all keyboard hotkeys from anywhere in the app.',
    },
    {
        id: 'tour-play-pause',
        category: 'Tours & HUD',
        keys: ['Space'],
        label: 'Play / Pause Guided Tour',
        description: 'Pauses or resumes automated step playback during the walkthrough tour.',
    },
    {
        id: 'tour-next-step',
        category: 'Tours & HUD',
        keys: ['→', 'Enter'],
        label: 'Next Walkthrough Step',
        description: 'Advances forward to the next section or spotlight target.',
    },
    {
        id: 'tour-prev-step',
        category: 'Tours & HUD',
        keys: ['←'],
        label: 'Previous Walkthrough Step',
        description: 'Navigates back to the preceding step.',
    },
    {
        id: 'tour-exit',
        category: 'Tours & HUD',
        keys: ['Esc'],
        label: 'Close Interactive Viewers, Drawers & Modals',
        description: 'Closes any active interactive viewer, document inspector, modal dialog, drawer, or guided tour overlay.',
    },
]

interface KeyboardShortcutsWorkspaceViewProps {
    onNavigateTab?: (tab: WorkspaceTab) => void
    onStartTour?: () => void
}

export default function KeyboardShortcutsWorkspaceView({
    onNavigateTab,
    onStartTour,
}: KeyboardShortcutsWorkspaceViewProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('All')
    const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set())
    const [lastMatchedShortcut, setLastMatchedShortcut] = useState<ShortcutItem | null>(null)
    const [copied, setCopied] = useState(false)

    // Live Key Listener for Interactive Simulator
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

            const key = e.key.toUpperCase()
            setPressedKeys((prev) => new Set(prev).add(key))

            // Check if matches any shortcut
            const match = SHORTCUTS.find((s) => {
                const sKeys = s.keys.map((k) => k.toUpperCase())
                if (sKeys.length === 1 && sKeys[0] === key) return true
                if (sKeys.includes('CTRL') && e.ctrlKey && sKeys.includes(key)) return true
                if (sKeys.includes('ALT') && e.altKey && sKeys.includes(key)) return true
                return false
            })

            if (match) {
                setLastMatchedShortcut(match)
            }
        }

        const handleKeyUp = (e: KeyboardEvent) => {
            const key = e.key.toUpperCase()
            setPressedKeys((prev) => {
                const next = new Set(prev)
                next.delete(key)
                return next
            })
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    }, [])

    const categories = ['All', 'Navigation', 'Dillon AI & Voice', 'Diligence & Modeling', 'Tours & HUD']

    const filteredShortcuts = useMemo(() => {
        return SHORTCUTS.filter((item) => {
            const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
            const matchesSearch =
                item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
            return matchesCategory && matchesSearch
        })
    }, [selectedCategory, searchQuery])

    const handleCopyAll = () => {
        const text = SHORTCUTS.map((s) => `[${s.keys.join(' + ')}] ${s.label} - ${s.description}`).join('\n')
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card/80 to-primary/5 p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                                <Keyboard className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                        Keyboard Shortcuts & Hotkeys
                                    </h2>
                                    <CardInfoPopover cardId="shortcuts-hotkeys" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Power-user navigation matrix and interactive live keypress simulator
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyAll}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-95"
                        >
                            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{copied ? 'Copied Cheatsheet' : 'Copy All Shortcuts'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Keyboard Simulator & Interactive Tester */}
            <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm backdrop-blur-sm" id="shortcuts-tester">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold text-foreground">
                            Live Keyboard Input Simulator
                        </h3>
                        <CardInfoPopover cardId="shortcuts-tester" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Press any key on your keyboard to test:</span>
                        {pressedKeys.size > 0 ? (
                            <div className="flex items-center gap-1">
                                {Array.from(pressedKeys).map((key) => (
                                    <kbd
                                        key={key}
                                        className="rounded-md border border-primary bg-primary/20 px-2 py-0.5 text-xs font-mono font-bold text-primary shadow animate-pulse"
                                    >
                                        {key}
                                    </kbd>
                                ))}
                            </div>
                        ) : (
                            <kbd className="rounded border bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">
                                Waiting for keypress...
                            </kbd>
                        )}
                    </div>
                </div>

                {lastMatchedShortcut && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs flex items-center justify-between animate-in fade-in-0 duration-150">
                        <div className="flex items-center gap-2.5">
                            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                {lastMatchedShortcut.keys.join(' + ')}
                            </span>
                            <span className="font-semibold text-foreground">
                                {lastMatchedShortcut.label}
                            </span>
                            <span className="hidden sm:inline text-muted-foreground">— {lastMatchedShortcut.description}</span>
                        </div>
                        {lastMatchedShortcut.actionTab && onNavigateTab && (
                            <button
                                type="button"
                                onClick={() => onNavigateTab(lastMatchedShortcut.actionTab!)}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                            >
                                Jump to {lastMatchedShortcut.actionTab}
                            </button>
                        )}
                    </div>
                )}

                {/* Virtual Top Row Key Visualizer */}
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                    {[
                        { key: '1', label: 'Overview' },
                        { key: '2', label: 'Analysis' },
                        { key: '3', label: 'Risk' },
                        { key: '4', label: 'Diligence' },
                        { key: '5', label: 'Synthesis' },
                        { key: '6', label: 'Valuation' },
                        { key: '7', label: 'Structure' },
                        { key: '8', label: 'Negotiate' },
                        { key: 'C', label: 'Dillon AI' },
                        { key: '?', label: 'Cheatsheet' },
                    ].map((item) => {
                        const isCurrentlyPressed = pressedKeys.has(item.key.toUpperCase())
                        return (
                            <div
                                key={item.key}
                                className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all duration-150 ${
                                    isCurrentlyPressed
                                        ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-105'
                                        : 'border-border/60 bg-muted/40 text-foreground hover:bg-muted'
                                }`}
                            >
                                <span className="font-mono text-xs font-bold">{item.key}</span>
                                <span className="text-[10px] text-muted-foreground truncate w-full">
                                    {item.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Category Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                                selectedCategory === cat
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search hotkeys..."
                        className="w-full rounded-xl border border-border bg-background py-1.5 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>
            </div>

            {/* Shortcuts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" id="shortcuts-hotkeys">
                {filteredShortcuts.map((shortcut) => (
                    <div
                        key={shortcut.id}
                        className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-4 transition-all hover:border-primary/40 hover:shadow-md"
                    >
                        <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    {shortcut.category}
                                </span>
                                <div className="flex items-center gap-1">
                                    {shortcut.keys.map((k, i) => (
                                        <kbd
                                            key={i}
                                            className="rounded-md border border-border bg-muted/80 px-2 py-0.5 font-mono text-[11px] font-bold text-foreground shadow-sm"
                                        >
                                            {k}
                                        </kbd>
                                    ))}
                                </div>
                            </div>
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                                {shortcut.label}
                            </h4>
                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                {shortcut.description}
                            </p>
                        </div>

                        {shortcut.actionTab && onNavigateTab && (
                            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-end">
                                <button
                                    type="button"
                                    onClick={() => onNavigateTab(shortcut.actionTab!)}
                                    className="text-[11px] font-semibold text-primary hover:underline"
                                >
                                    Jump to Tab →
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
