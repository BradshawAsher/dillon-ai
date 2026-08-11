import { useState, useEffect } from 'react'
import { createUnusedProjectId } from '../utils/diligenceDashboardUtils'
import type { WorkspaceTab } from '../components/DealWorkspaceNav'

export type { WorkspaceTab }

export { createUnusedProjectId }

export function useDealWorkspaceState() {
    const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('overview')
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
        askingPriceByProject,
        setAskingPriceByProject,
        projectChecklistById,
        setProjectChecklistById,
    }
}
