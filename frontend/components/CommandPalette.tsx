import { useEffect, useRef, useState, useCallback } from 'react'
import {
    Search,
    Moon,
    FileDown,
    FileJson,
    Keyboard,
    Bot,
    LayoutDashboard,
    FlaskConical,
    TrendingUp,
    DollarSign,
    Handshake,
    FileText,
    FileSearch,
    Clock3,
    AlertTriangle,
    Sparkles,
} from 'lucide-react'

type CommandPaletteProps = {
    open: boolean
    onClose: () => void
    onSelectTab: (tab: string) => void
    onToggleTheme: () => void
    onExportMarkdown: () => void
    onExportJson: () => void
    onShowShortcuts: () => void
    onOpenChat: () => void
    onCopySummary?: () => void
    onScrollToUpload?: () => void
    onStartTour?: (tourId: 'core-fast' | 'deep-dive' | 'interactive-quest') => void
    onOpenWalkthrough?: () => void
}

type Command = {
    id: string
    label: string
    icon: React.ReactNode
    action: () => void
    group: string
}

export default function CommandPalette({
    open,
    onClose,
    onSelectTab,
    onToggleTheme,
    onExportMarkdown,
    onExportJson,
    onShowShortcuts,
    onOpenChat,
    onCopySummary,
    onScrollToUpload,
    onStartTour,
    onOpenWalkthrough,
}: CommandPaletteProps) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const commands: Command[] = [
        {
            id: 'tab-overview',
            label: 'Switch to Overview tab',
            icon: <LayoutDashboard className="h-4 w-4" />,
            action: () => onSelectTab('overview'),
            group: 'Navigation',
        },
        {
            id: 'tab-analysis',
            label: 'Switch to Analysis tab',
            icon: <FlaskConical className="h-4 w-4" />,
            action: () => onSelectTab('analysis'),
            group: 'Navigation',
        },
        {
            id: 'tab-synthesis',
            label: 'Switch to Synthesis tab',
            icon: <Sparkles className="h-4 w-4" />,
            action: () => onSelectTab('synthesis'),
            group: 'Navigation',
        },
        {
            id: 'tab-returns',
            label: 'Switch to Returns tab',
            icon: <TrendingUp className="h-4 w-4" />,
            action: () => onSelectTab('returns'),
            group: 'Navigation',
        },
        {
            id: 'tab-growth',
            label: 'Switch to Growth tab',
            icon: <FlaskConical className="h-4 w-4" />,
            action: () => onSelectTab('growth'),
            group: 'Navigation',
        },
        {
            id: 'tab-valuation',
            label: 'Switch to Valuation tab',
            icon: <DollarSign className="h-4 w-4" />,
            action: () => onSelectTab('valuation'),
            group: 'Navigation',
        },
        {
            id: 'tab-deal-structure',
            label: 'Switch to Deal Structure tab',
            icon: <Handshake className="h-4 w-4" />,
            action: () => onSelectTab('structure'),
            group: 'Navigation',
        },
        {
            id: 'tab-diligence',
            label: 'Switch to Diligence tab',
            icon: <FileSearch className="h-4 w-4" />,
            action: () => onSelectTab('diligence'),
            group: 'Navigation',
        },
        {
            id: 'tab-documents',
            label: 'Switch to Documents tab',
            icon: <FileText className="h-4 w-4" />,
            action: () => onSelectTab('documents'),
            group: 'Navigation',
        },
        {
            id: 'tab-history',
            label: 'Switch to History tab',
            icon: <Clock3 className="h-4 w-4" />,
            action: () => onSelectTab('history'),
            group: 'Navigation',
        },
        {
            id: 'tab-errors',
            label: 'Switch to Errors/Workflow tab',
            icon: <AlertTriangle className="h-4 w-4" />,
            action: () => onSelectTab('errors'),
            group: 'Navigation',
        },
        {
            id: 'toggle-dark-mode',
            label: 'Toggle dark mode',
            icon: <Moon className="h-4 w-4" />,
            action: onToggleTheme,
            group: 'Preferences',
        },
        {
            id: 'export-markdown',
            label: 'Export deal as Markdown',
            icon: <FileDown className="h-4 w-4" />,
            action: onExportMarkdown,
            group: 'Actions',
        },
        {
            id: 'export-json',
            label: 'Export deal as JSON',
            icon: <FileJson className="h-4 w-4" />,
            action: onExportJson,
            group: 'Actions',
        },
        {
            id: 'show-shortcuts',
            label: 'Show keyboard shortcuts',
            icon: <Keyboard className="h-4 w-4" />,
            action: onShowShortcuts,
            group: 'Actions',
        },
        {
            id: 'open-chat',
            label: 'Open AI chat assistant',
            icon: <Bot className="h-4 w-4" />,
            action: onOpenChat,
            group: 'Actions',
        },
        ...(onStartTour ? [
            {
                id: 'tour-core',
                label: 'Launch 10-Step Core Guided Tour (~90 sec)',
                icon: <Sparkles className="h-4 w-4 text-primary" />,
                action: () => onStartTour('core-fast'),
                group: 'Guided Tours',
            },
            {
                id: 'tour-deep',
                label: 'Launch 28-Step Diligence Deep Dive (~3.5 min)',
                icon: <FlaskConical className="h-4 w-4 text-emerald-500" />,
                action: () => onStartTour('deep-dive'),
                group: 'Guided Tours',
            },
            {
                id: 'tour-quest',
                label: 'Launch Interactive Hands-On Quest (Gamified Tutorial)',
                icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
                action: () => onStartTour('interactive-quest'),
                group: 'Guided Tours',
            },
        ] : []),
        ...(onOpenWalkthrough ? [
            {
                id: 'tour-launcher',
                label: 'Open Walkthroughs & Video Demos Launcher',
                icon: <Sparkles className="h-4 w-4 text-primary" />,
                action: onOpenWalkthrough,
                group: 'Guided Tours',
            },
        ] : []),
        ...(onCopySummary ? [{
            id: 'copy-summary',
            label: 'Copy deal summary to clipboard',
            icon: <FileDown className="h-4 w-4" />,
            action: onCopySummary,
            group: 'Actions',
        }] : []),
        ...(onScrollToUpload ? [{
            id: 'upload-docs',
            label: 'Upload documents',
            icon: <FileText className="h-4 w-4" />,
            action: onScrollToUpload,
            group: 'Actions',
        }] : []),
    ]

    const filtered = commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(query.toLowerCase())
    )

    const groupedCommands = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
        if (!acc[cmd.group]) acc[cmd.group] = []
        acc[cmd.group].push(cmd)
        return acc
    }, {})

    const executeCommand = useCallback(
        (cmd: Command) => {
            cmd.action()
            onClose()
        },
        [onClose]
    )

    // Reset state when palette opens/closes
    useEffect(() => {
        if (open) {
            setQuery('')
            setSelectedIndex(0)
            setTimeout(() => inputRef.current?.focus(), 0)
        }
    }, [open])

    // Global Ctrl+K / Cmd+K listener
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                if (open) {
                    onClose()
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    // Keyboard navigation within the palette
    useEffect(() => {
        if (!open) return

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
                return
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % filtered.length)
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
                return
            }
            if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered[selectedIndex]) {
                    executeCommand(filtered[selectedIndex])
                }
                return
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open, filtered, selectedIndex, onClose, executeCommand])

    // Reset selected index when query changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [query])

    // Scroll selected item into view
    useEffect(() => {
        if (!listRef.current) return
        const selected = listRef.current.querySelector('[data-selected="true"]')
        if (selected) {
            selected.scrollIntoView({ block: 'nearest' })
        }
    }, [selectedIndex])

    if (!open) return null

    let flatIndex = -1

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Palette */}
            <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-background shadow-2xl">
                {/* Search input */}
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        Esc
                    </kbd>
                </div>

                {/* Command list */}
                <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
                    {filtered.length === 0 && (
                        <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                            No commands found.
                        </p>
                    )}

                    {Object.entries(groupedCommands).map(([group, cmds]) => (
                        <div key={group} className="mb-1">
                            <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                {group}
                            </p>
                            {cmds.map((cmd) => {
                                flatIndex++
                                const isSelected = flatIndex === selectedIndex
                                const currentIndex = flatIndex

                                return (
                                    <button
                                        key={cmd.id}
                                        data-selected={isSelected}
                                        onClick={() => executeCommand(cmd)}
                                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                                            isSelected
                                                ? 'bg-accent text-accent-foreground'
                                                : 'text-foreground hover:bg-accent/50'
                                        }`}
                                    >
                                        <span className="shrink-0 text-muted-foreground">
                                            {cmd.icon}
                                        </span>
                                        <span className="flex-1">{cmd.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* Footer hint */}
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                                &uarr;&darr;
                            </kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                                &crarr;
                            </kbd>
                            select
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                            Ctrl
                        </kbd>
                        <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-mono">
                            K
                        </kbd>
                        <span>to toggle</span>
                    </div>
                </div>
            </div>
        </>
    )
}
