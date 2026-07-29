type WorkspaceTab = 'overview' | 'analysis' | 'diligence' | 'synthesis' | 'valuation' | 'returns' | 'growth' | 'structure' | 'documents' | 'history' | 'errors' | 'email'

type DealWorkspaceNavProps = {
    activeTab: WorkspaceTab
    onTabChange: (tab: WorkspaceTab) => void
}

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'diligence', label: 'Diligence' },
    { id: 'synthesis', label: 'Synthesis' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'returns', label: 'Returns' },
    { id: 'growth', label: 'Growth' },
    { id: 'structure', label: 'Deal Structure' },
    { id: 'documents', label: 'Projects' },
    { id: 'history', label: 'Audit Trail' },
    { id: 'email', label: 'Email Drafts' },
    { id: 'errors', label: 'Errors' },
]

export type { WorkspaceTab }

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, History, Check } from 'lucide-react'

export default function DealWorkspaceNav({ activeTab, onTabChange }: DealWorkspaceNavProps) {
    const [navHistory, setNavHistory] = useState<WorkspaceTab[]>(() => {
        try {
            const stored = localStorage.getItem('mergeworks.tabHistory')
            return stored ? JSON.parse(stored) : [activeTab]
        } catch {
            return [activeTab]
        }
    })

    const [historyIndex, setHistoryIndex] = useState(() => {
        try {
            const stored = localStorage.getItem('mergeworks.tabHistoryIndex')
            return stored ? parseInt(stored, 10) : 0
        } catch {
            return 0
        }
    })

    const [isHistoryOpen, setIsHistoryOpen] = useState(false)

    // Sync state with native browser back and forward actions (hash/popstate listener)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) as WorkspaceTab
            if (hash && tabs.some(t => t.id === hash)) {
                onTabChange(hash)
            }
        }
        window.addEventListener('hashchange', handleHashChange)
        window.addEventListener('popstate', handleHashChange)
        return () => {
            window.removeEventListener('hashchange', handleHashChange)
            window.removeEventListener('popstate', handleHashChange)
        }
    }, [onTabChange])

    // Update browser URL hash when the active tab state changes
    useEffect(() => {
        if (window.location.hash.slice(1) !== activeTab) {
            window.history.pushState(null, '', `#${activeTab}`)
        }
    }, [activeTab])

    // Automatically record tab switches into our local Chrome-style history list
    useEffect(() => {
        if (navHistory[historyIndex] !== activeTab) {
            const updatedHistory = [...navHistory.slice(0, historyIndex + 1), activeTab].slice(-20) // Keep last 20
            setNavHistory(updatedHistory)
            const updatedIndex = updatedHistory.length - 1
            setHistoryIndex(updatedIndex)
            try {
                localStorage.setItem('mergeworks.tabHistory', JSON.stringify(updatedHistory))
                localStorage.setItem('mergeworks.tabHistoryIndex', String(updatedIndex))
            } catch { }
        }
    }, [activeTab, navHistory, historyIndex])

    const handleBack = useCallback(() => {
        if (historyIndex > 0) {
            const nextIndex = historyIndex - 1
            setHistoryIndex(nextIndex)
            try {
                localStorage.setItem('mergeworks.tabHistoryIndex', String(nextIndex))
            } catch { }
            onTabChange(navHistory[nextIndex])
        }
    }, [historyIndex, navHistory, onTabChange])

    const handleForward = useCallback(() => {
        if (historyIndex < navHistory.length - 1) {
            const nextIndex = historyIndex + 1
            setHistoryIndex(nextIndex)
            try {
                localStorage.setItem('mergeworks.tabHistoryIndex', String(nextIndex))
            } catch { }
            onTabChange(navHistory[nextIndex])
        }
    }, [historyIndex, navHistory, onTabChange])

    const handleJumpToHistoryIndex = useCallback((index: number) => {
        setHistoryIndex(index)
        try {
            localStorage.setItem('mergeworks.tabHistoryIndex', String(index))
        } catch { }
        onTabChange(navHistory[index])
        setIsHistoryOpen(false)
    }, [navHistory, onTabChange])

    const canGoBack = historyIndex > 0
    const canGoForward = historyIndex < navHistory.length - 1

    return (
        <nav id="deal-workspace" aria-label="Deal workspace" data-workspace-nav className="sticky top-3 z-20 flex items-center gap-3 rounded-xl border border-border/80 bg-card/90 p-2 shadow-sm backdrop-blur-md transition-shadow duration-200 hover:shadow-md print:hidden">
            {/* Chrome-like back, forward, and history dropdown controls */}
            <div className="flex items-center gap-1 shrink-0 border-r border-border/50 pr-2 print:hidden">
                <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={handleBack}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                    title="Back to previous tab"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    disabled={!canGoForward}
                    onClick={handleForward}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent"
                    title="Forward to next tab"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={`rounded-md p-1 transition-colors hover:bg-muted ${isHistoryOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        title="View tab history"
                    >
                        <History className="h-4 w-4" />
                    </button>
                    {isHistoryOpen && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setIsHistoryOpen(false)} />
                            <div className="absolute left-0 top-full z-40 mt-1.5 w-64 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-lg">
                                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">Tab History</p>
                                {navHistory.map((tabId, idx) => {
                                    const tabName = tabs.find(t => t.id === tabId)?.label || tabId
                                    const isCurrent = idx === historyIndex
                                    return (
                                        <button
                                            key={`${tabId}-${idx}`}
                                            type="button"
                                            onClick={() => handleJumpToHistoryIndex(idx)}
                                            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 ${isCurrent ? 'font-semibold text-primary bg-primary/5' : 'text-foreground'}`}
                                        >
                                            <span className="truncate">{idx + 1}. {tabName}</span>
                                            {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Scrollable horizontal tab list */}
            <div className="flex-1 overflow-x-auto">
                <div className="flex min-w-max gap-1" role="tablist" aria-label="Deal workspace sections">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={isActive
                                    ? 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 ease-out'
                                    : 'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 ease-out hover:bg-muted hover:text-foreground hover:shadow-sm'}
                                onClick={() => onTabChange(tab.id)}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}
