import { useState, useEffect } from 'react'
import { createUnusedProjectId } from '../utils/diligenceDashboardUtils'
import type { WorkspaceTab } from '../components/DealWorkspaceNav'
import { parseUrlDeepLinkState } from '../utils/deepLinking'

export type { WorkspaceTab }

export { createUnusedProjectId }

export function useDealWorkspaceState() {
    const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>(() => {
        if (typeof window !== 'undefined') {
            const parsed = parseUrlDeepLinkState(window.location.search, window.location.hash)
            if (parsed.tab) return parsed.tab as WorkspaceTab
        }
        return 'overview'
    })
    const [activeViewProjectId, setActiveViewProjectId] = useState<string>(() => {
        if (typeof window !== 'undefined') {
            const parsed = parseUrlDeepLinkState(window.location.search, window.location.hash)
            if (parsed.projectQuery) return parsed.projectQuery
            try {
                const stored = window.localStorage.getItem('mergeworks.activeProjectKey') || ''
                // Ignore ephemeral unsubmitted draft IDs (e.g. project-20260821-28a7ed75)
                if (/^project-\d{8}-[a-f0-9]+$/i.test(stored)) {
                    return ''
                }
                return stored
            } catch {
                return ''
            }
        }
        return ''
    })
    const [projectId, setProjectId] = useState(() => createUnusedProjectId())
    const [projectStage, setProjectStage] = useState('post-loi')
    const [documentType, setDocumentType] = useState('auto-detect')
    const [selectedProjectKey, setSelectedProjectKey] = useState('new')
    const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false)
    const [isFaqSidebarOpen, setIsFaqSidebarOpen] = useState(false)
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false)
    const [isProjectsPanelOpen, setIsProjectsPanelOpen] = useState(false)
    const [isShortcutsOpen, setIsShortcutsOpen] = useState(false)
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
    const [submissionNotes, setSubmissionNotes] = useState('')
    const [dealName, setDealName] = useState('')
    const [askingPrice, setAskingPrice] = useState('')
    const [activeEvidence, setActiveEvidence] = useState<any>(null)
    const [isTocCollapsed, setIsTocCollapsed] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        try {
            const stored = localStorage.getItem('mergeworks.tocCollapsed')
            return stored === 'true'
        } catch {
            return false
        }
    })
    const [tocWidth, setTocWidth] = useState<number>(() => {
        if (typeof window === 'undefined') return 140
        try {
            const stored = localStorage.getItem('mergeworks.tocWidth')
            if (stored) {
                const parsed = parseInt(stored, 10)
                if (!Number.isNaN(parsed) && parsed >= 90 && parsed <= 240) {
                    return parsed
                }
            }
        } catch { }
        return 140
    })
    const [askingPriceByProject, setAskingPriceByProject] = useState<Record<string, string>>(() => {
        if (typeof window === 'undefined') return {}
        try {
            const stored = window.localStorage.getItem('mergeworks.askingPriceByProject')
            return stored ? (JSON.parse(stored) as Record<string, string>) : {}
        } catch {
            return {}
        }
    })
    const [projectChecklistById, setProjectChecklistById] = useState<Record<string, any>>(() => {
        if (typeof window === 'undefined') return {}
        try {
            const stored = window.localStorage.getItem('mergeworks.projectChecklistById')
            return stored ? (JSON.parse(stored) as Record<string, any>) : {}
        } catch {
            return {}
        }
    })

    useEffect(() => {
        try {
            if (activeViewProjectId) {
                window.localStorage.setItem('mergeworks.activeProjectKey', activeViewProjectId)
            }
        } catch {}
    }, [activeViewProjectId])

    useEffect(() => {
        try {
            if (selectedProjectKey) {
                window.localStorage.setItem('mergeworks.selectedProjectKey', selectedProjectKey)
            }
        } catch {}
    }, [selectedProjectKey])

    useEffect(() => {
        try {
            window.localStorage.setItem('mergeworks.askingPriceByProject', JSON.stringify(askingPriceByProject))
        } catch {}
    }, [askingPriceByProject])

    useEffect(() => {
        try {
            window.localStorage.setItem('mergeworks.projectChecklistById', JSON.stringify(projectChecklistById))
        } catch {}
    }, [projectChecklistById])

    useEffect(() => {
        try {
            window.localStorage.setItem('mergeworks.tocCollapsed', String(isTocCollapsed))
        } catch {}
    }, [isTocCollapsed])

    useEffect(() => {
        try {
            window.localStorage.setItem('mergeworks.tocWidth', String(tocWidth))
        } catch {}
    }, [tocWidth])

    useEffect(() => {
        const handleLocationChange = () => {
            const parsed = parseUrlDeepLinkState(window.location.search, window.location.hash)
            if (parsed.tab) {
                setActiveWorkspaceTab(parsed.tab as WorkspaceTab)
            }
            if (parsed.projectQuery) {
                setActiveViewProjectId(parsed.projectQuery)
            }
        }
        window.addEventListener('hashchange', handleLocationChange)
        window.addEventListener('popstate', handleLocationChange)
        return () => {
            window.removeEventListener('hashchange', handleLocationChange)
            window.removeEventListener('popstate', handleLocationChange)
        }
    }, [])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
                e.preventDefault()
                setIsBatchDrawerOpen((prev) => !prev)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    return {
        activeWorkspaceTab,
        setActiveWorkspaceTab,
        activeViewProjectId,
        setActiveViewProjectId,
        projectId,
        setProjectId,
        projectStage,
        setProjectStage,
        documentType,
        setDocumentType,
        selectedProjectKey,
        setSelectedProjectKey,
        isBatchDrawerOpen,
        setIsBatchDrawerOpen,
        isFaqSidebarOpen,
        setIsFaqSidebarOpen,
        isApiKeyModalOpen,
        setIsApiKeyModalOpen,
        isProjectsPanelOpen,
        setIsProjectsPanelOpen,
        isShortcutsOpen,
        setIsShortcutsOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        submissionNotes,
        setSubmissionNotes,
        dealName,
        setDealName,
        askingPrice,
        setAskingPrice,
        activeEvidence,
        setActiveEvidence,
        isTocCollapsed,
        setIsTocCollapsed,
        tocWidth,
        setTocWidth,
        askingPriceByProject,
        setAskingPriceByProject,
        projectChecklistById,
        setProjectChecklistById,
    }
}
