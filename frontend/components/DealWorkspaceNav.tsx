type WorkspaceTab = 'overview' | 'analysis' | 'diagnostics' | 'diligence' | 'synthesis' | 'spending' | 'compare' | 'valuation' | 'returns' | 'growth' | 'structure' | 'negotiation' | 'documents' | 'shortcuts' | 'evals' | 'faqs' | 'history' | 'email' | 'errors' | 'report_issue' | 'account'

type DealWorkspaceNavProps = {
    activeTab: WorkspaceTab
    onTabChange: (tab: WorkspaceTab) => void
    isDiligenceComplete?: boolean
    isDiligenceRunning?: boolean
    isSynthesisReady?: boolean
    isSynthesisRunning?: boolean
    isSynthesisWaiting?: boolean
    synthesisElapsedSeconds?: number
    onStartTabTour?: (tabId: WorkspaceTab) => void
}

const tabs: Array<{ id: WorkspaceTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'analysis', label: 'Analysis' },
    { id: 'diagnostics', label: 'Risk & Playbook' },
    { id: 'diligence', label: 'Diligence' },
    { id: 'synthesis', label: 'Synthesis' },
    { id: 'spending', label: 'Spending & Billing' },
    { id: 'compare', label: 'Compare Deals' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'returns', label: 'Returns' },
    { id: 'growth', label: 'Growth' },
    { id: 'structure', label: 'Deal Structure' },
    { id: 'negotiation', label: 'Negotiation' },
    { id: 'documents', label: 'Projects' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'evals', label: 'Evals & Harness' },
    { id: 'faqs', label: 'FAQs & Guide' },
    { id: 'history', label: 'Audit Trail' },
    { id: 'email', label: 'Email Drafts' },
    { id: 'errors', label: 'Errors' },
    { id: 'report_issue', label: 'Report an Issue' },
    { id: 'account', label: 'Account & Settings' },
]

export type { WorkspaceTab }

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, History, Check } from 'lucide-react'
import TabInfoPopover from './walkthrough/TabInfoPopover'
import { useFloatingPosition } from '../hooks/useFloatingPosition'
import { formatElapsedDuration } from '../utils/diligenceDashboardUtils'

export default function DealWorkspaceNav({
    activeTab,
    onTabChange,
    isDiligenceComplete = false,
    isDiligenceRunning = false,
    isSynthesisReady = false,
    isSynthesisRunning = false,
    isSynthesisWaiting = false,
    synthesisElapsedSeconds = 0,
    onStartTabTour,
}: DealWorkspaceNavProps) {
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
    const historyBtnRef = useRef<HTMLButtonElement>(null)

    const historyCoords = useFloatingPosition({
        isOpen: isHistoryOpen,
        targetRef: historyBtnRef,
        popoverWidth: 260,
        preferredPlacement: 'bottom',
        margin: 6,
        padding: 16,
    })

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

    const activeTabRef = useRef<HTMLButtonElement | null>(null)
    useEffect(() => {
        activeTabRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }, [activeTab])

    return (
        <nav id="deal-workspace" aria-label="Deal workspace" data-workspace-nav className="sticky top-3 z-20 flex items-center gap-3 rounded-xl border border-border/80 bg-card/90 p-2 shadow-sm backdrop-blur-md transition-shadow duration-200 hover:shadow-md print:hidden">
            {/* Chrome-like back, forward, and history dropdown controls */}
            <div className="flex items-center gap-1 shrink-0 border-r border-border/50 pr-2 print:hidden">
                <button
                    type="button"
                    disabled={!canGoBack}
                    onClick={handleBack}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    title="Back to previous tab"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    disabled={!canGoForward}
                    onClick={handleForward}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                    title="Forward to next tab"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
                <div className="relative">
                    <button
                        ref={historyBtnRef}
                        type="button"
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={`rounded-md p-1 transition-colors hover:bg-muted cursor-pointer ${isHistoryOpen ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        title="View tab history"
                    >
                        <History className="h-4 w-4" />
                    </button>
                    {isHistoryOpen && typeof document !== 'undefined' && createPortal(
                        <>
                            <div
                                className="fixed inset-0 z-[99998] bg-black/10 dark:bg-black/25 backdrop-blur-[0.5px]"
                                onClick={() => setIsHistoryOpen(false)}
                            />
                            <div
                                style={{
                                    position: 'fixed',
                                    top: historyCoords.top !== undefined ? `${historyCoords.top}px` : undefined,
                                    bottom: historyCoords.bottom !== undefined ? `${historyCoords.bottom}px` : undefined,
                                    left: historyCoords.left !== undefined ? `${historyCoords.left}px` : undefined,
                                    right: historyCoords.right !== undefined ? `${historyCoords.right}px` : undefined,
                                    width: historyCoords.width !== undefined ? `${historyCoords.width}px` : undefined,
                                    maxHeight: historyCoords.maxHeight !== undefined ? `${historyCoords.maxHeight}px` : '80vh',
                                    zIndex: 99999,
                                }}
                                className="overflow-y-auto rounded-lg border border-border bg-popover p-1.5 shadow-2xl ring-1 ring-border/50 animate-in fade-in-0 zoom-in-95 duration-150"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">Tab History</p>
                                {navHistory.map((tabId, idx) => {
                                    const tabName = tabs.find(t => t.id === tabId)?.label || tabId
                                    const isCurrent = idx === historyIndex
                                    return (
                                        <button
                                            key={`${tabId}-${idx}`}
                                            type="button"
                                            onClick={() => handleJumpToHistoryIndex(idx)}
                                            className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 cursor-pointer ${isCurrent ? 'font-semibold text-primary bg-primary/5' : 'text-foreground'}`}
                                        >
                                            <span className="truncate">{idx + 1}. {tabName}</span>
                                            {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </>,
                        document.body
                    )}
                </div>
            </div>

            {/* Scrollable horizontal tab list */}
            <div className="flex-1 overflow-x-auto">
                <div className="flex min-w-max gap-1" role="tablist" aria-label="Deal workspace sections">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        const isDiligenceRunningHighlighted = tab.id === 'diligence' && isDiligenceRunning
                        const isDiligenceHighlighted = tab.id === 'diligence' && isDiligenceComplete && !isDiligenceRunning
                        const isSynthesisRunningHighlighted = tab.id === 'synthesis' && isSynthesisRunning
                        const isSynthesisReadyHighlighted = tab.id === 'synthesis' && isSynthesisReady && !isSynthesisRunning
                        const isSynthesisWaitingHighlighted = tab.id === 'synthesis' && !isSynthesisRunning && !isSynthesisReady && Boolean(isSynthesisWaiting || isDiligenceRunning)

                        let buttonClass = isActive
                            ? 'rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 ease-out cursor-pointer'
                            : 'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all duration-200 ease-out hover:bg-muted hover:text-foreground hover:shadow-sm cursor-pointer'

                        if (isDiligenceRunningHighlighted || isSynthesisRunningHighlighted) {
                            buttonClass = isActive
                                ? 'rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white shadow-sm ring-2 ring-amber-500/50 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                                : 'rounded-lg bg-amber-500/15 dark:bg-amber-500/25 border border-amber-500/50 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-300 shadow-xs shadow-amber-500/20 hover:bg-amber-500/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                        } else if (isSynthesisWaitingHighlighted) {
                            buttonClass = isActive
                                ? 'rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white shadow-sm ring-2 ring-blue-500/50 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                                : 'rounded-lg bg-blue-500/15 dark:bg-blue-500/25 border border-blue-500/50 px-3 py-2 text-sm font-bold text-blue-700 dark:text-blue-300 shadow-xs shadow-blue-500/20 hover:bg-blue-500/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                        } else if (isDiligenceHighlighted) {
                            buttonClass = isActive
                                ? 'rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white shadow-sm ring-2 ring-emerald-500/50 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                                : 'rounded-lg bg-emerald-500/15 dark:bg-emerald-500/25 border border-emerald-500/50 px-3 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-300 shadow-xs shadow-emerald-500/20 hover:bg-emerald-500/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                        } else if (isSynthesisReadyHighlighted) {
                            buttonClass = isActive
                                ? 'rounded-lg bg-purple-600 px-3 py-2 text-sm font-bold text-white shadow-sm ring-2 ring-purple-500/50 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                                : 'rounded-lg bg-purple-500/15 dark:bg-purple-500/25 border border-purple-500/50 px-3 py-2 text-sm font-bold text-purple-900 dark:text-purple-200 shadow-xs shadow-purple-500/20 hover:bg-purple-500/30 flex items-center gap-1.5 transition-all duration-200 cursor-pointer'
                        }

                        return (
                            <div key={tab.id} className="inline-flex items-center gap-0.5 group shrink-0">
                                <button
                                    id={`tab-nav-${tab.id}`}
                                    data-tab-nav={tab.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    ref={isActive ? activeTabRef : undefined}
                                    className={buttonClass}
                                    onClick={() => onTabChange(tab.id)}
                                >
                                    <span>{tab.label}</span>
                                    {isDiligenceRunningHighlighted && (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                            isActive
                                                ? 'bg-white/20 text-white border border-white/30'
                                                : 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-900 dark:text-amber-100 border border-amber-500/30'
                                        }`}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-white' : 'bg-amber-400'} opacity-75`}></span>
                                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-white' : 'bg-amber-500'}`}></span>
                                            </span>
                                            Running
                                        </span>
                                    )}
                                    {isDiligenceHighlighted && (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                            isActive
                                                ? 'bg-white/20 text-white border border-white/30'
                                                : 'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-900 dark:text-emerald-100 border border-emerald-500/30'
                                        }`}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-white' : 'bg-emerald-400'} opacity-75`}></span>
                                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-white' : 'bg-emerald-500'}`}></span>
                                            </span>
                                            Done
                                        </span>
                                    )}
                                    {isSynthesisWaitingHighlighted && (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                            isActive
                                                ? 'bg-white/20 text-white border border-white/30'
                                                : 'bg-blue-500/20 dark:bg-blue-500/30 text-blue-900 dark:text-blue-100 border border-blue-500/30'
                                        }`}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-white' : 'bg-blue-400'} opacity-75`}></span>
                                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-white' : 'bg-blue-500'}`}></span>
                                            </span>
                                            Waiting
                                        </span>
                                    )}
                                    {isSynthesisRunningHighlighted && (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider font-mono ${
                                            isActive
                                                ? 'bg-white/20 text-white border border-white/30'
                                                : 'bg-amber-500/20 dark:bg-amber-500/30 text-amber-900 dark:text-amber-100 border border-amber-500/30'
                                        }`}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-white' : 'bg-amber-400'} opacity-75`}></span>
                                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-white' : 'bg-amber-500'}`}></span>
                                            </span>
                                            Running{synthesisElapsedSeconds > 0 ? ` (${formatElapsedDuration(synthesisElapsedSeconds)})` : ''}
                                        </span>
                                    )}
                                    {isSynthesisReadyHighlighted && (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                                            isActive
                                                ? 'bg-white/25 text-white border border-white/40 shadow-xs'
                                                : 'bg-purple-100 dark:bg-purple-950/80 text-purple-950 dark:text-purple-100 border border-purple-400/50 dark:border-purple-500/50 shadow-xs'
                                        }`}>
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isActive ? 'bg-white' : 'bg-purple-400'} opacity-75`}></span>
                                                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-white' : 'bg-purple-600 dark:bg-purple-300'}`}></span>
                                            </span>
                                            Done
                                        </span>
                                    )}
                                </button>
                                <TabInfoPopover
                                    tabId={tab.id}
                                    onStartTour={onStartTabTour}
                                    className="opacity-60 transition-opacity group-hover:opacity-100 hover:opacity-100"
                                />
                            </div>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}
