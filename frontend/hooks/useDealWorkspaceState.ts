import { useState, useEffect } from 'react'

export type WorkspaceTab = 'overview' | 'diligence' | 'synthesis' | 'returns' | 'valuation' | 'growth' | 'structure' | 'negotiation' | 'analysis' | 'evals' | 'memo'

export function createUnusedProjectId(usedProjectIds: Iterable<string> = []) {
    const used = new Set(Array.from(usedProjectIds).map((id) => id.trim().toLowerCase()))
    let counter = 1
    let candidate = `project-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-a1`
    while (used.has(candidate.toLowerCase())) {
        counter++
        candidate = `project-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-a${counter}`
    }
    return candidate
}

export function useDealWorkspaceState() {
    const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('overview')
    const [projectId, setProjectId] = useState(() => createUnusedProjectId())
    const [projectStage, setProjectStage] = useState('post-loi')
    const [documentType, setDocumentType] = useState('auto-detect')
    const [selectedProjectKey, setSelectedProjectKey] = useState(() => {
        if (typeof window === 'undefined') return 'new'
        try {
            const stored = window.localStorage.getItem('mergeworks.selectedProjectKey')
            if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored)) {
                window.localStorage.removeItem('mergeworks.selectedProjectKey')
                return 'new'
            }
            return stored || 'new'
        } catch {
            return 'new'
        }
    })
    const [isBatchDrawerOpen, setIsBatchDrawerOpen] = useState(false)
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false)
    const [submissionNotes, setSubmissionNotes] = useState('')
    const [dealName, setDealName] = useState('')
    const [askingPrice, setAskingPrice] = useState('')

    useEffect(() => {
        try {
            if (selectedProjectKey) {
                window.localStorage.setItem('mergeworks.selectedProjectKey', selectedProjectKey)
            }
        } catch {}
    }, [selectedProjectKey])

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
        isApiKeyModalOpen,
        setIsApiKeyModalOpen,
        submissionNotes,
        setSubmissionNotes,
        dealName,
        setDealName,
        askingPrice,
        setAskingPrice,
    }
}
