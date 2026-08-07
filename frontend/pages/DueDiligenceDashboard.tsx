import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
    Activity,
    AlertCircle,
    Key,
    Keyboard,
    Loader2,
    SlidersHorizontal,
    X,
} from 'lucide-react'

import { ApiKeyModal } from '../components/ApiKeyModal'
import { ProjectsSidePanel } from '../components/ProjectsSidePanel'
import DealHealthKPIs from '../components/DealHealthKPIs'
import DealEmailDraftCard from '../components/DealEmailDraftCard'
const CommandPalette = lazy(() => import('../components/CommandPalette'))
const SystemArchitectureCard = lazy(() => import('../components/SystemArchitectureCard'))
import LoginButton, { getStoredAuth, isDataIsolationEnabled } from '../components/AuthGate'
import { buildMarkdownReport, buildJsonExport, downloadFile } from '../components/ExportDealButton'
import KeyboardShortcutsDialog from '../components/KeyboardShortcutsDialog'
import { type Notification } from '../components/NotificationCenter'
import { BatchProcessingSidePanel } from '../components/BatchProcessingSidePanel'
import EvidenceDrawer from '../components/EvidenceDrawer'
import { OverviewWorkspaceView } from '../components/views/OverviewWorkspaceView'
import { DiligenceWorkspaceView } from '../components/views/DiligenceWorkspaceView'
import { ReturnsWorkspaceView } from '../components/views/ReturnsWorkspaceView'
import { ValuationWorkspaceView } from '../components/views/ValuationWorkspaceView'
import { GrowthWorkspaceView } from '../components/views/GrowthWorkspaceView'
import { StructureWorkspaceView } from '../components/views/StructureWorkspaceView'
import { NegotiationWorkspaceView } from '../components/views/NegotiationWorkspaceView'
import { AnalysisWorkspaceView } from '../components/views/AnalysisWorkspaceView'
import { DocumentsWorkspaceView } from '../components/views/DocumentsWorkspaceView'
import { WorkspaceHeader } from '../components/views/WorkspaceHeader'
import { useDealWorkspaceState, type WorkspaceTab } from '../hooks/useDealWorkspaceState'
import DealWorkspaceNav from '../components/DealWorkspaceNav'
import SectionHeader from '../components/SectionHeader'

const ProjectIntakeCard = lazy(() => import('../components/ProjectIntakeCard'))
const ProjectSynthesisCard = lazy(() => import('../components/ProjectSynthesisCard'))
import ManagementQuestionTracker from '../components/ManagementQuestionTracker'
const SubmissionHistoryCard = lazy(() => import('../components/SubmissionHistoryCard'))
const DealChatPanel = lazy(() => import('../components/DealChatPanel'))
const WorkflowErrorLogCard = lazy(() => import('../components/WorkflowErrorLogCard'))
const EvalDashboardTab = lazy(() => import('../components/EvalDashboardTab'))
import LatestSubmissionSection from '../components/dashboard/LatestSubmissionSection'
import { BatchProgressCard } from '../components/dashboard/BatchProgressCard'
import LegacyDiligenceBackupCard from '../components/dashboard/LegacyDiligenceBackupCard'

import {
    exampleProjectSyntheses,
    exampleSubmissionHistoryRows,
    type DealModel,
    useGetDiligenceData,
    useGetDealModels,
    useGetProjectSynthesis,
    useGetWorkflowErrors,
    useGetSubmissionHistory,
    useGetEvalRuns,
    useSubmitDealPacket,
    useSaveDealModel,
    useUpdateSubmissionConsideration,
} from '../hooks/backend/diligence'
import { Button } from '../lib/shadcn/button'
import { getStoredTheme, setStoredTheme } from '../lib/darkMode'
import { getDataSource, setDataSource } from '../lib/dataSource'
import {
    buildReturnsDisplayModel,
    createUnusedProjectId,
    hydrateModelFactsFromDocuments,
    isDuplicateProjectDocument,
    PENDING_EXAMPLE_MODE_SUBMISSION_KEY,
    withDerivedCapitalStack,
    type PendingExampleModeSubmission,
    type SubmissionBatch,
    type SubmitEnvironment,
} from '../utils/diligenceDashboardUtils'
import { fallbackDiligenceFindings } from '../utils/diligence'
import {
    createProjectSummaries,
    getProjectKey,
} from '../utils/projectWorkspace'
import { isActiveSubmissionStatus, type SubmissionHistoryItem } from '../utils/submissionHistory'
import { isOwnedByUser, claimProject } from '../utils/projectOwnership'
import {
    playCompletionSound,
    playErrorSound,
    triggerFailureAlert,
} from '../utils/audioAlert'
import { computeImpactMetrics } from '../utils/impactMetrics'
import { getAiSubmissionViewModel } from '../utils/aiSubmissionData'
import { base64ToFile, readFileAsBase64 } from '../utils/fileEncoding'

const SHOW_LEGACY_DILIGENCE_BACKUP = false

function deriveBatchProgress(rows: SubmissionHistoryItem[]) {
    const finishedCount = rows.filter(r => !isActiveSubmissionStatus(r.status)).length
    const processingCount = rows.filter(r => isActiveSubmissionStatus(r.status)).length
    const failedCount = rows.filter(r => ['failed', 'error', 'rejected'].includes(r.status.trim().toLowerCase())).length
    const completedCount = rows.filter(r => r.status.trim().toLowerCase() === 'completed').length
    return {
        expectedCount: rows.length,
        finishedCount,
        processingCount,
        failedCount,
        completedCount,
        stuckRows: [],
        errors: rows.filter(r => r.errorMessage).map(r => ({ fileName: r.fileName, errorMessage: r.errorMessage, requestID: r.requestID })),
        advisories: [],
    }
}

function deriveSynthesisProgress(status?: string, awaiting?: boolean) {
    if (awaiting) return { value: 65, stage: 'Consolidating project findings...' }
    const norm = (status || '').trim().toLowerCase()
    if (['synthesized', 'completed', 'success'].includes(norm)) return { value: 100, stage: 'Synthesis complete' }
    return { value: 0, stage: 'Awaiting documents' }
}

export default function DueDiligenceDashboard() {
    const {
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
    } = useDealWorkspaceState()

    const [isLeftQuickDockVisible, setIsLeftQuickDockVisible] = useState(true)
    const { data: diligenceData, error } = useGetDiligenceData()
    const {
        data: submissionHistoryData,
        loading: submissionHistoryLoading,
        error: submissionHistoryError,
        trigger: triggerSubmissionHistory,
    } = useGetSubmissionHistory()
    const {
        data: submitResponse,
        loading: submitLoading,
        error: submitError,
        trigger: triggerSubmitDealPacket,
    } = useSubmitDealPacket()
    const {
        data: projectSynthesisData,
        loading: projectSynthesisLoading,
        error: projectSynthesisError,
        trigger: triggerProjectSynthesis,
    } = useGetProjectSynthesis()
    const { data: dealModelsData, trigger: triggerDealModels } = useGetDealModels()
    const { trigger: triggerSaveDealModel } = useSaveDealModel()
    const { data: workflowErrorData, loading: workflowErrorsLoading, error: workflowErrorsError, trigger: triggerWorkflowErrors } = useGetWorkflowErrors()
    const { data: evalRunsData, trigger: triggerEvalRuns } = useGetEvalRuns()
    const { trigger: triggerSubmissionConsideration } = useUpdateSubmissionConsideration()

    // Fetch initial backend data on mount
    useEffect(() => {
        void triggerSubmissionHistory({ environment: 'production' })
        void triggerProjectSynthesis({ environment: 'production' })
        void triggerDealModels()
        void triggerWorkflowErrors({ environment: 'production' })
        void triggerEvalRuns()
    }, [triggerSubmissionHistory, triggerProjectSynthesis, triggerDealModels, triggerWorkflowErrors, triggerEvalRuns])

    const diligenceFindings = useMemo(() => {
        if (Array.isArray(diligenceData) && diligenceData.length > 0) {
            return diligenceData
        }
        return fallbackDiligenceFindings
    }, [diligenceData])

    const liveSubmissionHistory = (Array.isArray(submissionHistoryData) ? submissionHistoryData : []) as SubmissionHistoryItem[]
    const isExampleMode = getDataSource() === 'mock'
    const rawSubmissionHistory = isExampleMode ? exampleSubmissionHistoryRows : liveSubmissionHistory
    const rawProjectSyntheses = isExampleMode ? exampleProjectSyntheses : (Array.isArray(projectSynthesisData) ? projectSynthesisData : [])

    const submissionHistory = useMemo(() => {
        const isolationEnabled = isDataIsolationEnabled()
        const user = getStoredAuth()
        if (!isolationEnabled || !user || user.role === 'admin') {
            return rawSubmissionHistory
        }
        return rawSubmissionHistory.filter((row: SubmissionHistoryItem) => isOwnedByUser(getProjectKey(row), user.email))
    }, [rawSubmissionHistory])

    const visibleProjectSyntheses = useMemo(() => {
        const isolationEnabled = isDataIsolationEnabled()
        const user = getStoredAuth()
        if (!isolationEnabled || !user || user.role === 'admin') {
            return rawProjectSyntheses
        }
        return rawProjectSyntheses.filter((s: any) => isOwnedByUser(s.projectId || '', user.email))
    }, [rawProjectSyntheses])

    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [isSubmittingFile, setIsSubmittingFile] = useState(false)
    const [batchSubmissionMessage, setBatchSubmissionMessage] = useState('')
    const lastUploadAttemptAtRef = useRef(0)
    const [retryingRequestId, setRetryingRequestId] = useState<string | null>(null)
    const [isStoppingBatch, setIsStoppingBatch] = useState(false)
    const [isStoppingSynthesis, setIsStoppingSynthesis] = useState(false)
    const [activeSubmissionBatch, setActiveSubmissionBatch] = useState<SubmissionBatch | null>(() => {
        try {
            const stored = window.sessionStorage.getItem('mergeworks.activeSubmissionBatch')
            if (!stored) return null
            const parsed = JSON.parse(stored) as SubmissionBatch
            if (parsed?.id && (Date.now() - (parsed.startedAt || 0) > 3600000)) {
                window.sessionStorage.removeItem('mergeworks.activeSubmissionBatch')
                return null
            }
            return parsed
        } catch { return null }
    })

    useEffect(() => {
        try {
            if (activeSubmissionBatch) {
                window.sessionStorage.setItem('mergeworks.activeSubmissionBatch', JSON.stringify(activeSubmissionBatch))
            } else {
                window.sessionStorage.removeItem('mergeworks.activeSubmissionBatch')
            }
        } catch { }
    }, [activeSubmissionBatch])

    const inFlightBatchPlaceholder = useMemo(() => {
        if (activeSubmissionBatch?.id && !activeSubmissionBatch.endedAt && !activeSubmissionBatch.stoppedAt) {
            const batchRows = submissionHistory.filter((r) => r.submissionBatchId === activeSubmissionBatch.id || r.projectId === activeSubmissionBatch.id)
            const hasPendingBatchRows = batchRows.some((r) => isActiveSubmissionStatus(r.status))
            if (!hasPendingBatchRows && batchRows.length > 0) {
                return null
            }

            return {
                projectId: activeSubmissionBatch.id,
                dealName: dealName || activeSubmissionBatch.id,
                projectStage,
                expectedDocumentCount: activeSubmissionBatch.expectedDocumentCount,
            }
        }
        return null
    }, [activeSubmissionBatch, dealName, projectStage, submissionHistory])

    const projectSummaries = useMemo(
        () => createProjectSummaries(submissionHistory, inFlightBatchPlaceholder),
        [submissionHistory, inFlightBatchPlaceholder]
    )

    const availableProjects = useMemo(() => {
        return projectSummaries.map((ps: any) => ({
            key: ps.projectKey,
            label: ps.projectName,
            name: ps.projectName,
            id: ps.projectId || ps.projectKey,
        }))
    }, [projectSummaries])

    const [activeHistoryEnvironment, setActiveHistoryEnvironment] = useState<SubmitEnvironment>('production')
    const [currentTheme, setCurrentTheme] = useState(getStoredTheme)
    const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
        return Notification.permission
    })

    const [dealModelDraftByProject, setDealModelDraftByProject] = useState<Record<string, DealModel>>({})
    const dealModelSaveTimeout = useRef<number | null>(null)
    const [hasRestoredLatestProject, setHasRestoredLatestProject] = useState(false)

    // Automatically select the latest run/project if no explicit project is currently selected
    useEffect(() => {
        if (hasRestoredLatestProject || projectSummaries.length === 0) return
        const matchingProject = projectSummaries.find((p: any) => p.projectKey === selectedProjectKey || p.projectId === selectedProjectKey)
        if (selectedProjectKey !== 'new' && matchingProject) {
            setDealName(matchingProject.projectName)
            setProjectId(matchingProject.projectId || matchingProject.projectKey)
            setProjectStage(matchingProject.stage || 'post-loi')
            setHasRestoredLatestProject(true)
            return
        }

        const newestProject = projectSummaries[0]
        if (newestProject) {
            setSelectedProjectKey(newestProject.projectKey)
            setProjectId(newestProject.projectId || newestProject.projectKey)
            setDealName(newestProject.projectName)
            setProjectStage(newestProject.stage || 'post-loi')
        }
        setHasRestoredLatestProject(true)
    }, [hasRestoredLatestProject, projectSummaries, selectedProjectKey, setDealName, setProjectId, setProjectStage, setSelectedProjectKey])

    // Keep project fields in sync whenever selectedProjectKey changes
    useEffect(() => {
        if (selectedProjectKey === 'new') return
        const matchingProject = projectSummaries.find((p: any) => p.projectKey === selectedProjectKey || p.projectId === selectedProjectKey)
        if (!matchingProject) return
        setDealName(matchingProject.projectName)
        setProjectId(matchingProject.projectId || matchingProject.projectKey)
        setProjectStage(matchingProject.stage || 'post-loi')
    }, [projectSummaries, selectedProjectKey, setDealName, setProjectId, setProjectStage])

    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const now = new Date()
        return [
            { id: '1', type: 'info', title: 'Welcome to MergeWorks', description: 'Upload documents or switch to example data to explore.', timestamp: now, read: false },
        ]
    })

    const handleMarkNotificationRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const handleMarkAllNotificationsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    const handleClearNotifications = () => setNotifications([])

    useEffect(() => {
        if (isExampleMode || typeof window === 'undefined') return

        let cancelled = false
        const restorePendingExampleModeSubmission = async () => {
            let pending: PendingExampleModeSubmission | null = null
            try {
                const stored = window.sessionStorage.getItem(PENDING_EXAMPLE_MODE_SUBMISSION_KEY)
                pending = stored ? JSON.parse(stored) as PendingExampleModeSubmission : null
            } catch {
                pending = null
            }
            if (!pending) return

            try {
                setSelectedProjectKey(pending.selectedProjectKey || 'new')
                setDealName(pending.dealName)
                setAskingPrice(pending.askingPrice)
                setProjectId(pending.projectId)
                setProjectStage(pending.projectStage)
                setDocumentType(pending.documentType)
                setSubmissionNotes(pending.submissionNotes)
                const restoredFiles = pending.files.map((file) => base64ToFile(file.base64, file.name, file.type || 'application/octet-stream'))
                if (!cancelled) {
                    setSelectedFiles(restoredFiles)
                    window.sessionStorage.removeItem(PENDING_EXAMPLE_MODE_SUBMISSION_KEY)
                    setBatchSubmissionMessage('Switched from Example to Live n8n automatically. Your selected files were restored — press Queue in production again to submit them live.')
                }
            } catch {
                window.sessionStorage.removeItem(PENDING_EXAMPLE_MODE_SUBMISSION_KEY)
            }
        }

        void restorePendingExampleModeSubmission()
        return () => { cancelled = true }
    }, [isExampleMode, setAskingPrice, setDealName, setDocumentType, setProjectId, setProjectStage, setSelectedProjectKey, setSubmissionNotes])

    const activeProjectId = isExampleMode ? 'atlas-001' : projectId

    const prevFailedCountRef = useRef<number | null>(null)
    useEffect(() => {
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
        const recentFailedDocs = submissionHistory.filter((row) => {
            const isFailedStatus = ['failed', 'error', 'rejected'].includes((row.status || '').trim().toLowerCase()) ||
                (row.errorMessage || row.aiEscalationReason || '').toLowerCase().includes('credit') ||
                (row.errorMessage || row.aiEscalationReason || '').toLowerCase().includes('balance')
            if (!isFailedStatus) return false

            const rowTime = row.updatedAt ? new Date(row.updatedAt).getTime() : (row.createdAt ? new Date(row.createdAt).getTime() : 0)
            return rowTime > fifteenMinutesAgo || (activeProjectId && row.projectId === activeProjectId)
        })

        if (prevFailedCountRef.current !== null && recentFailedDocs.length > prevFailedCountRef.current) {
            const newlyFailedCount = recentFailedDocs.length - prevFailedCountRef.current
            const sampleDoc = recentFailedDocs[0]
            const projLabel = sampleDoc?.dealName || sampleDoc?.companyName || 'diligence project'
            triggerFailureAlert(
                '🔴 AI Processing Error — Due Diligence Pipeline',
                `${newlyFailedCount} document(s) in ${projLabel} failed processing or hit credit limits. Check the Diligence tab to retry.`
            )
        }
        prevFailedCountRef.current = recentFailedDocs.length
    }, [submissionHistory, activeProjectId])

    const activeDealModel = useMemo<DealModel>(() => {
        const saved = Array.isArray(dealModelsData) ? dealModelsData.find((model) => model.projectId === activeProjectId) : undefined
        const exampleModel: DealModel = {
            projectId: 'atlas-001', askingPrice: 110_000_000, purchasePrice: 108_000_000, debtAssumed: 13_200_000, cashAcquired: 2_400_000, workingCapitalRequirement: 2_000_000, transactionFees: 1_500_000, holdPeriodYears: 5, taxRate: 0.25, closingCosts: 1_500_000, maintenanceCapex: 1_200_000, exitMultiple: 9, exitCosts: 1_000_000, equityContributionPercent: 0.3, interestRate: 0.1, amortizationYears: 10, sellerNoteAmount: 0, bearRevenueGrowth: 0, baseRevenueGrowth: 0.05, bullRevenueGrowth: 0.1, bearEbitdaMargin: 0.15, baseEbitdaMargin: 0.2, bullEbitdaMargin: 0.25, bearExitMultiple: 3, baseExitMultiple: 4, bullExitMultiple: 5, revenueMultiple: 2.1, ebitdaMultiple: 8.4, assetHaircutPercent: 0.1, modelUpdatedAt: '', modelUpdatedBy: 'Example data', documentedFactsStatus: 'confirmed', documentedFactsJson: JSON.stringify({ revenue: { value: 48_100_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 18' }] }, ebitda_sde: { value: 12_400_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 18' }] }, debt: { value: 13_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22' }] }, total_assets: { value: 60_000_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22' }] }, total_liabilities: { value: 22_000_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22' }] } }),
        }
        if (isExampleMode) return exampleModel
        return dealModelDraftByProject[activeProjectId] ?? saved ?? {
            projectId: activeProjectId,
            askingPrice: askingPrice.trim().length > 0 ? Number(askingPrice.replace(/[^0-9.]/g, '')) || null : null,
            purchasePrice: null, debtAssumed: null, cashAcquired: null, workingCapitalRequirement: null,
            transactionFees: null, holdPeriodYears: null, taxRate: null, closingCosts: null,
            maintenanceCapex: null, exitMultiple: null, exitCosts: null, equityContributionPercent: null,
            interestRate: null, amortizationYears: null, sellerNoteAmount: null, bearRevenueGrowth: null,
            baseRevenueGrowth: null, bullRevenueGrowth: null, bearEbitdaMargin: null, baseEbitdaMargin: null,
            bullEbitdaMargin: null, bearExitMultiple: null, baseExitMultiple: null, bullExitMultiple: null,
            revenueMultiple: null, ebitdaMultiple: null, assetHaircutPercent: null, modelUpdatedAt: '',
            modelUpdatedBy: '', documentedFactsJson: '', documentedFactsStatus: '',
        }
    }, [activeProjectId, askingPrice, dealModelDraftByProject, dealModelsData, isExampleMode])

    const activeProjectDocuments = useMemo(() => {
        return submissionHistory.filter((row) => getProjectKey(row) === activeProjectId)
    }, [activeProjectId, submissionHistory])

    const hydratedDealModel = useMemo(
        () => hydrateModelFactsFromDocuments(activeDealModel, activeProjectDocuments),
        [activeDealModel, activeProjectDocuments]
    )

    const returnsDisplayModel = useMemo(
        () => withDerivedCapitalStack(isExampleMode ? hydratedDealModel : buildReturnsDisplayModel(hydratedDealModel)),
        [hydratedDealModel, isExampleMode]
    )

    const isReturnsIllustrativePreview = useMemo(() => {
        if (isExampleMode) return false
        try {
            const facts = JSON.parse(hydratedDealModel.documentedFactsJson || '{}')
            const hasConfirmedEbitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number'
            const hasConfirmedPrice = hydratedDealModel.askingPrice != null || hydratedDealModel.purchasePrice != null
            return !(hasConfirmedEbitda && hasConfirmedPrice)
        } catch { return true }
    }, [hydratedDealModel, isExampleMode])

    const isGrowthIllustrativePreview = useMemo(() => {
        if (isExampleMode) return false
        try {
            const facts = JSON.parse(hydratedDealModel.documentedFactsJson || '{}')
            const hasConfirmedRevenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number'
            const hasConfirmedEbitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number'
            return !(hasConfirmedRevenue || hasConfirmedEbitda)
        } catch { return true }
    }, [hydratedDealModel, isExampleMode])

    const activeProjectSynthesis = useMemo(() => {
        return visibleProjectSyntheses.find((s: any) => s.projectId === activeProjectId) ?? null
    }, [activeProjectId, visibleProjectSyntheses])

    const suggestedProjectName = useMemo(() => {
        if (selectedFiles.length > 0) {
            return selectedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
        }
        return dealName || 'New Project'
    }, [dealName, selectedFiles])

    const suggestedProjectId = useMemo(() => {
        const used = projectSummaries.map((p: any) => p.projectId || p.projectKey)
        return createUnusedProjectId(used)
    }, [projectSummaries])

    const handleAskingPriceChange = (value: string) => {
        setAskingPrice(value)
        if (activeProjectId) {
            setAskingPriceByProject((current) => ({ ...current, [activeProjectId]: value }))
        }
    }

    const handleDealModelChange = (updated: Partial<DealModel>) => {
        setDealModelDraftByProject((current) => {
            const existing = current[activeProjectId] ?? activeDealModel
            const next = { ...existing, ...updated }
            if (dealModelSaveTimeout.current) window.clearTimeout(dealModelSaveTimeout.current)
            dealModelSaveTimeout.current = window.setTimeout(() => {
                void triggerSaveDealModel(next)
            }, 800)
            return { ...current, [activeProjectId]: next }
        })
    }

    const handleDealModelDefaults = () => {
        handleDealModelChange(returnsDisplayModel)
    }

    const impact = useMemo(() => computeImpactMetrics(submissionHistory), [submissionHistory])
    const activeProjectImpact = useMemo(() => computeImpactMetrics(activeProjectDocuments), [activeProjectDocuments])

    const hasActiveSubmissions = useMemo(() => {
        return submissionHistory.some((row) => isActiveSubmissionStatus(row.status))
    }, [submissionHistory])

    const isCurrentProjectProcessingDocuments = useMemo(() => {
        return activeProjectDocuments.some((doc) => {
            const st = (doc.status || '').trim().toLowerCase()
            return ['queued', 'uploading', 'received', 'pending', 'processing', 'running'].includes(st)
        })
    }, [activeProjectDocuments])

    // Periodic refresh effect (3s polling when batch/processing active, 10s idle)
    useEffect(() => {
        const pollInterval = (activeSubmissionBatch || hasActiveSubmissions || isCurrentProjectProcessingDocuments) ? 3_000 : 10_000

        const interval = setInterval(() => {
            void triggerSubmissionHistory({ environment: 'production' })
            void triggerProjectSynthesis({ environment: 'production' })
            void triggerEvalRuns()
        }, pollInterval)
        return () => clearInterval(interval)
    }, [
        triggerSubmissionHistory,
        triggerProjectSynthesis,
        triggerEvalRuns,
        activeSubmissionBatch,
        hasActiveSubmissions,
        isCurrentProjectProcessingDocuments,
    ])

    const isCurrentProjectAwaitingSynthesis = useMemo(() => {
        if (isExampleMode || activeProjectDocuments.length === 0) return false

        const hasPendingDoc = activeProjectDocuments.some((d) =>
            ['processing', 'pending', 'queued', 'running'].includes((d.status || '').trim().toLowerCase())
        )
        if (hasPendingDoc) return true

        const completedDocCount = activeProjectDocuments.filter((d) =>
            ['completed', 'approved'].includes((d.status || '').trim().toLowerCase())
        ).length

        if (completedDocCount === 0) return true
        if (!activeProjectSynthesis) return true

        const synthDocCount = Number(
            activeProjectSynthesis.documentsCompletedCount ??
            activeProjectSynthesis.documentsReceivedCount ?? 0
        )

        if (completedDocCount > synthDocCount) return true

        const synthStatus = (activeProjectSynthesis.projectStatus || '').trim().toLowerCase()
        if (['processing', 'pending', 'queued', 'running', 'synthesis_in_progress'].includes(synthStatus)) return true

        if (
            ['synthesized', 'completed', 'success'].includes(synthStatus) &&
            ((activeProjectSynthesis.finalRecommendation || '').trim().length > 0 ||
                (activeProjectSynthesis.finalJudgmentSummary || '').trim().length > 0)
        ) {
            return false
        }

        return true
    }, [activeProjectDocuments, activeProjectSynthesis, isExampleMode])

    const activeProjectSynthesisSucceeded = useMemo(() => {
        if (!activeProjectSynthesis || isCurrentProjectAwaitingSynthesis) return false
        const st = (activeProjectSynthesis.projectStatus || '').trim().toLowerCase()
        return ['synthesized', 'completed', 'success'].includes(st) || (activeProjectSynthesis.finalRecommendation || '').trim().length > 0
    }, [activeProjectSynthesis, isCurrentProjectAwaitingSynthesis])

    const currentSynthesisProgress = useMemo(
        () => deriveSynthesisProgress(activeProjectSynthesis?.projectStatus, isCurrentProjectAwaitingSynthesis),
        [activeProjectSynthesis?.projectStatus, isCurrentProjectAwaitingSynthesis]
    )

    const activeBatchRows = useMemo(() => {
        if (activeSubmissionBatch?.id) {
            const matchingBatch = submissionHistory.filter((row) => row.submissionBatchId === activeSubmissionBatch.id || row.projectId === activeSubmissionBatch.id)
            if (matchingBatch.length > 0) return matchingBatch
        }
        return submissionHistory.filter((row) => (getProjectKey(row) === activeProjectId) || (row.projectId === activeProjectId))
    }, [activeProjectId, activeSubmissionBatch, submissionHistory])

    const batchProgress = useMemo(() => deriveBatchProgress(activeBatchRows), [activeBatchRows])
    const activeBatchExpectedCount = activeSubmissionBatch?.expectedDocumentCount || batchProgress.expectedCount
    const activeBatchFinishedCount = batchProgress.finishedCount
    const activeBatchProcessingCount = batchProgress.processingCount
    const activeBatchFailedCount = batchProgress.failedCount
    const activeBatchCompletedCount = batchProgress.completedCount
    const activeBatchStuckRows = batchProgress.stuckRows
    const activeBatchErrors = batchProgress.errors
    const activeBatchAdvisories = batchProgress.advisories
    const activeBatchProcessingPercent = Math.min(100, Math.round((activeBatchProcessingCount / (activeBatchExpectedCount || 1)) * 100))
    const activeBatchProgressPercent = Math.min(100, Math.round((activeBatchFinishedCount / (activeBatchExpectedCount || 1)) * 100))

    const [batchNowTimestamp, setBatchNowTimestamp] = useState(() => Date.now())
    useEffect(() => {
        if (!activeSubmissionBatch?.startedAt || activeBatchFinishedCount >= activeBatchExpectedCount) return
        const timer = setInterval(() => setBatchNowTimestamp(Date.now()), 1000)
        return () => clearInterval(timer)
    }, [activeBatchExpectedCount, activeBatchFinishedCount, activeSubmissionBatch?.startedAt])

    const batchElapsedSeconds = activeSubmissionBatch?.startedAt ? Math.max(0, Math.floor(((activeSubmissionBatch.endedAt || batchNowTimestamp) - activeSubmissionBatch.startedAt) / 1000)) : 0
    const activeBatchImpact = useMemo(() => computeImpactMetrics(activeBatchRows), [activeBatchRows])

    const latestBatchRows = useMemo(() => {
        const batchId = activeSubmissionBatch?.id
        const rows = submissionHistory.filter((row) => {
            if (batchId && (row.submissionBatchId === batchId || row.projectId === batchId)) return true
            return getProjectKey(row) === activeProjectId || row.projectId === activeProjectId
        })
        return rows.sort((a, b) => new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime())
    }, [activeProjectId, activeSubmissionBatch?.id, submissionHistory])

    const [selectedBatchDocIndex, setSelectedBatchDocIndex] = useState(0)
    const safeBatchDocIndex = Math.min(selectedBatchDocIndex, Math.max(0, latestBatchRows.length - 1))
    const displayedSubmissionRow = latestBatchRows[safeBatchDocIndex] ?? activeProjectDocuments[0] ?? submissionHistory[0]
    const liveSubmittedRow = displayedSubmissionRow

    const webhookResponse = useMemo(() => {
        if (!submitResponse) return null
        return submitResponse
    }, [submitResponse])

    const displayedSubmitStatus = displayedSubmissionRow?.status ?? (webhookResponse as any)?.status ?? (submitLoading ? 'queued' : '')
    const displayedSubmitRowId = displayedSubmissionRow ? String(displayedSubmissionRow.id) : ((webhookResponse as any)?.id ? String((webhookResponse as any).id) : 'Pending')
    const displayedSubmitReceivedAt = displayedSubmissionRow?.receivedAt ?? (webhookResponse as any)?.receivedAt ?? (webhookResponse as any)?.createdAt ?? ''
    const displayedSubmitTrafficLight = displayedSubmissionRow?.trafficLight ?? ''
    const displayedSubmitRiskLevel = displayedSubmissionRow?.riskLevel ?? ''
    const displayedSubmitCategory = displayedSubmissionRow?.documentType ?? ''
    const displayedSubmitConfidence = displayedSubmissionRow?.aiConfidence ?? ''
    const displayedSubmitVariance = ''
    const displayedSubmitValuationCurrency = displayedSubmissionRow?.valuationCurrency ?? 'USD'
    const displayedSubmitAiSummary = displayedSubmissionRow?.aiSummary ?? ''
    const liveSubmitInsight = displayedSubmissionRow ? getAiSubmissionViewModel(displayedSubmissionRow) : null
    const liveSubmitCitations = useMemo(() => liveSubmitInsight?.citations ?? [], [liveSubmitInsight])
    const submitEnvironment = activeHistoryEnvironment

    const highPriorityCount = diligenceFindings.filter((f) => f.severity === 'Critical' || f.severity === 'High').length
    const validatedCount = Object.values(projectChecklistById).filter((item: any) => item?.completed).length

    const batchInProgressNotificationId = useRef<string | null>(null)
    const synthesisInProgressNotificationProjectId = useRef<string | null>(null)

    useEffect(() => {
        if (!activeSubmissionBatch || activeBatchExpectedCount === 0) return
        if (activeBatchFinishedCount < activeBatchExpectedCount && activeBatchProcessingCount > 0) {
            if (batchInProgressNotificationId.current === activeSubmissionBatch.id) return
            batchInProgressNotificationId.current = activeSubmissionBatch.id
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Document batch is processing', { body: `All ${activeBatchExpectedCount} documents have reached processing. Analysis is still running.` })
            }
        }
    }, [activeBatchExpectedCount, activeBatchFinishedCount, activeBatchProcessingCount, activeSubmissionBatch])

    useEffect(() => {
        if (!activeSubmissionBatch || activeBatchExpectedCount === 0) return
        if (activeBatchFinishedCount < activeBatchExpectedCount) {
            batchInProgressNotificationId.current = activeSubmissionBatch.id
            return
        }
        if (batchInProgressNotificationId.current !== activeSubmissionBatch.id) return
        batchInProgressNotificationId.current = null
        playCompletionSound()
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Document batch complete', { body: `${activeBatchFinishedCount}/${activeBatchExpectedCount} documents have reached a final status.` })
        }
        setNotifications(prev => [{ id: `batch-${Date.now()}`, type: 'document_processed', title: 'Document batch complete', description: `${activeBatchFinishedCount}/${activeBatchExpectedCount} documents processed.`, timestamp: new Date(), read: false }, ...prev])
    }, [activeBatchExpectedCount, activeBatchFinishedCount, activeSubmissionBatch])

    useEffect(() => {
        if (isCurrentProjectAwaitingSynthesis) {
            synthesisInProgressNotificationProjectId.current = activeProjectId
            return
        }
        if (synthesisInProgressNotificationProjectId.current !== activeProjectId || !activeProjectSynthesisSucceeded) return
        synthesisInProgressNotificationProjectId.current = null
        playCompletionSound()
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Project synthesis complete', { body: 'Your due diligence synthesis is ready to review.' })
        }
        setNotifications(prev => [{ id: `synth-${Date.now()}`, type: 'synthesis_complete', title: 'Synthesis complete', description: 'Your due diligence synthesis is ready to review.', timestamp: new Date(), read: false }, ...prev])
    }, [activeProjectId, activeProjectSynthesisSucceeded, isCurrentProjectAwaitingSynthesis])

    const enableDesktopNotifications = async () => {
        playCompletionSound()
        if (!('Notification' in window)) { setDesktopNotificationPermission('unsupported'); return }
        const permission = await Notification.requestPermission()
        setDesktopNotificationPermission(permission)
    }

    useEffect(() => {
        function handleCtrlK(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                setCommandPaletteOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleCtrlK)
        return () => window.removeEventListener('keydown', handleCtrlK)
    }, [setCommandPaletteOpen])

    useEffect(() => {
        function handleCtrlShiftP(e: KeyboardEvent) {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
                e.preventDefault()
                setIsProjectsPanelOpen(prev => !prev)
            }
        }
        window.addEventListener('keydown', handleCtrlShiftP)
        return () => window.removeEventListener('keydown', handleCtrlShiftP)
    }, [setIsProjectsPanelOpen])

    const handleCreateProject = () => {
        const usedProjectIds = projectSummaries.map((project: any) => project.projectId || project.projectKey)

        setSelectedProjectKey('new')
        setBatchSubmissionMessage('')
        setDealName('')
        setProjectId(createUnusedProjectId(usedProjectIds))
        setProjectStage('post-loi')
        setDocumentType('auto-detect')
        setSubmissionNotes('')
    }

    const handlePortfolioProjectSelect = (projectKey: string, targetTab: WorkspaceTab = 'synthesis') => {
        setSelectedProjectKey(projectKey)
        setActiveWorkspaceTab(targetTab)
        const project = projectSummaries.find((candidate: any) => candidate.projectKey === projectKey || candidate.projectId === projectKey)

        if (project) {
            setProjectId(project.projectId || project.projectKey)
            setDealName(project.projectName)
            setProjectStage(project.stage || 'post-loi')
        }

        if (typeof window !== 'undefined') {
            window.localStorage.setItem('mergeworks.selectedProjectKey', projectKey)
        }

        window.setTimeout(() => {
            document.getElementById('project-synthesis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    const handleExcludeDocument = async (requestID: string) => {
        if (!requestID || !window.confirm('Exclude this document from the project checklist and future synthesis? Its n8n record will be retained for audit.')) return
        const result = await triggerSubmissionConsideration({ requestID, action: 'nonconsidered', environment: activeHistoryEnvironment }).result
        if (result) await handleRefreshHistory(activeHistoryEnvironment)
    }

    const handleAuditProjectOpen = (targetProjectId: string) => {
        const project = projectSummaries.find((candidate: any) => (candidate.projectId || candidate.projectKey) === targetProjectId)
        setSelectedProjectKey(project?.projectKey || targetProjectId)
        setProjectId(project?.projectId || targetProjectId)
        if (project) {
            setDealName(project.projectName)
            setProjectStage(project.stage || 'post-loi')
        }
        setActiveWorkspaceTab('documents')
        window.setTimeout(() => {
            document.getElementById('project-portfolio')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    const handleOpenProjectSynthesis = (targetProjectId: string) => {
        const project = projectSummaries.find((candidate: any) => (candidate.projectId || candidate.projectKey) === targetProjectId)
        setSelectedProjectKey(project?.projectKey || targetProjectId)
        setProjectId(project?.projectId || targetProjectId)
        if (project) {
            setDealName(project.projectName)
            setProjectStage(project.stage || 'post-loi')
        }
        setActiveWorkspaceTab('synthesis')
        window.setTimeout(() => {
            document.getElementById('project-synthesis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
    }

    const handleIncludeDocument = async (requestID: string) => {
        if (!requestID || !window.confirm('Include this document in the project checklist and future synthesis again?')) return
        const result = await triggerSubmissionConsideration({ requestID, action: 'considered', environment: activeHistoryEnvironment }).result
        if (result) await handleRefreshHistory(activeHistoryEnvironment)
    }

    const handleRunSynthesis = async () => {
        const sourceDocument = submissionHistory.find((row) => getProjectKey(row) === activeProjectId
            && row.isConsidered
            && row.status.trim().toLowerCase() === 'completed'
            && row.extractedJson.trim().length > 0
            && row.extractedJson.trim() !== 'null')
        if (!sourceDocument) {
            setBatchSubmissionMessage('A completed document with saved analysis is required before synthesis can run.')
            return
        }
        if (!window.confirm('Run a new project synthesis using the currently completed, included documents? This does not re-upload or reprocess files.')) return
        setBatchSubmissionMessage('Starting a new project synthesis from the completed documents…')
        try {
            const result = await triggerSubmissionConsideration({ requestID: sourceDocument.requestID, action: 'considered', environment: activeHistoryEnvironment }).result
            if (!result) throw new Error('Unable to start synthesis')
            await handleRefreshHistory(activeHistoryEnvironment)
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to start synthesis')
        }
    }

    const handleRetryFailedDocument = async (requestID: string) => {
        const targetRow = submissionHistory.find((r) => r.requestID === requestID || String(r.id) === requestID)
        const targetProjectId = targetRow?.projectId || activeProjectId

        setActiveWorkspaceTab('diligence')
        window.setTimeout(() => {
            document.getElementById('deal-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 0)
        setRetryingRequestId(requestID)
        setBatchSubmissionMessage('')
        try {
            const response = await fetch('/api/diligence/retry-failed-document', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestID, environment: activeHistoryEnvironment }),
            })
            const body = await response.json() as { error?: string; status?: string }
            if (!response.ok) throw new Error(body.error || 'Unable to queue retry')

            if (targetProjectId) {
                setActiveSubmissionBatch({
                    id: targetProjectId,
                    expectedDocumentCount: 1,
                    environment: activeHistoryEnvironment,
                    startedAt: Date.now(),
                })
                setSelectedProjectKey(targetRow ? getProjectKey(targetRow) : targetProjectId)
            }

            setBatchSubmissionMessage('Retry queued. The existing document is being processed again in real-time.')
            await triggerSubmissionHistory({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to queue retry')
        } finally {
            setRetryingRequestId(null)
        }
    }

    const handleRequeueNewProject = (requestID?: string) => {
        const targetRow = requestID ? submissionHistory.find((r) => r.requestID === requestID || String(r.id) === requestID) : null
        handleCreateProject()
        if (targetRow) {
            setDealName(targetRow.dealName ? `${targetRow.dealName} (Retry)` : '')
            setDocumentType(targetRow.documentType || 'auto-detect')
            setSubmissionNotes(targetRow.submissionNotes || '')
        }
        setBatchSubmissionMessage('Pre-filled new project intake form. Drop your document file above to queue under a new project.')
        document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    const handleStopBatch = async () => {
        const candidateRows = activeBatchRows.length > 0
            ? activeBatchRows
            : submissionHistory.filter((row) => {
                const isProjectMatch = (getProjectKey(row) === activeProjectId) || (row.projectId === activeProjectId)
                return isProjectMatch || isActiveSubmissionStatus(row.status)
            })

        const stoppableRequestIds = candidateRows
            .filter((row) => isActiveSubmissionStatus(row.status))
            .map((row) => row.requestID)
            .filter((reqId) => reqId.trim().length > 0)

        if (stoppableRequestIds.length === 0) {
            setBatchSubmissionMessage('No active documents are currently processing to stop.')
            return
        }

        if (!window.confirm(`Stop ${stoppableRequestIds.length} active document${stoppableRequestIds.length === 1 ? '' : 's'}? Completed documents will be kept, and synthesis will not run until you retry or re-queue documents.`)) return
        setIsStoppingBatch(true)
        try {
            const response = await fetch('/api/diligence/stop-batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestIDs: stoppableRequestIds, environment: activeHistoryEnvironment }),
            })
            const body = await response.json() as { error?: string; stopped?: number }
            if (!response.ok) throw new Error(body.error || 'Unable to stop the active batch')
            setBatchSubmissionMessage(`Stopped ${body.stopped ?? stoppableRequestIds.length} active document${(body.stopped ?? stoppableRequestIds.length) === 1 ? '' : 's'}.`)
            setActiveSubmissionBatch((current) => current ? { ...current, stoppedAt: Date.now(), endedAt: Date.now() } : current)
            await handleRefreshHistory(activeHistoryEnvironment)
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to stop the active batch')
        } finally {
            setIsStoppingBatch(false)
        }
    }

    const handleStopSynthesis = async () => {
        if (!activeProjectId) return
        if (!window.confirm('Stop the current synthesis for this project? This marks the synthesis as stopped so you can retry or re-run it later.')) return
        setIsStoppingSynthesis(true)
        try {
            const response = await fetch('/api/diligence/stop-synthesis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: activeProjectId, environment: activeHistoryEnvironment }),
            })
            const body = await response.json() as { error?: string }
            if (!response.ok) throw new Error(body.error || 'Unable to stop synthesis')
            setBatchSubmissionMessage('Synthesis marked as stopped. You can refresh, retry document analysis, or run synthesis again when ready.')
            await triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        } catch (err) {
            setBatchSubmissionMessage(err instanceof Error ? err.message : 'Unable to stop synthesis')
        } finally {
            setIsStoppingSynthesis(false)
        }
    }

    const handleRefreshHistory = async (environment: SubmitEnvironment) => {
        setActiveHistoryEnvironment(environment)
        await triggerSubmissionHistory({ environment }, { skipCache: true }).result
        await triggerProjectSynthesis({ environment }, { skipCache: true }).result
    }

    const handleSubmit = async (environment: SubmitEnvironment) => {
        if (selectedFiles.length === 0) return

        if (isExampleMode && environment === 'production') {
            setDataSource('live')
        }

        const now = Date.now()
        if (isSubmittingFile || now - lastUploadAttemptAtRef.current < 10_000) {
            setBatchSubmissionMessage('Upload is already in progress or was just started. Wait a few seconds before submitting another batch so the same files are not queued twice.')
            return
        }
        lastUploadAttemptAtRef.current = now

        const refreshedHistory = await triggerSubmissionHistory({ environment }, { skipCache: true }).result
        const duplicateCheckRows = Array.isArray(refreshedHistory) ? refreshedHistory as SubmissionHistoryItem[] : submissionHistory
        const resolvedProjectId = projectId || suggestedProjectId
        const duplicateFileNames: string[] = []
        const selectedMetadataKeys = new Set<string>()
        const filesToQueue = selectedFiles.filter((file) => {
            const metadataKey = `${file.name.trim().toLowerCase()}::${file.size}`
            const isDuplicate = selectedMetadataKeys.has(metadataKey)
                || isDuplicateProjectDocument(file, resolvedProjectId, duplicateCheckRows)

            selectedMetadataKeys.add(metadataKey)
            if (isDuplicate) {
                duplicateFileNames.push(file.name)
                return false
            }

            return true
        })

        if (filesToQueue.length === 0) {
            playErrorSound()
            setBatchSubmissionMessage(`No documents were queued. ${duplicateFileNames.join(', ')} ${duplicateFileNames.length === 1 ? 'has' : 'have'} already been added to this project.`)
            return
        }

        if (environment === 'production' && desktopNotificationPermission === 'default') {
            void enableDesktopNotifications()
        }

        if (environment === 'production') {
            setActiveWorkspaceTab('diligence')
            window.setTimeout(() => {
                document.getElementById('deal-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }, 0)
        }

        setIsSubmittingFile(true)
        setBatchSubmissionMessage('')

        try {
            const targetProjectId = (selectedProjectKey === 'new' || !projectId) ? (suggestedProjectId || `project-${Date.now().toString(36)}`) : projectId
            setSelectedProjectKey(targetProjectId)
            setProjectId(targetProjectId)

            const submissionBatchId = targetProjectId
            const expectedBatchDocumentCount = filesToQueue.length
            const failedFileNames: string[] = []

            setActiveSubmissionBatch({
                id: targetProjectId,
                expectedDocumentCount: expectedBatchDocumentCount,
                environment,
                startedAt: Date.now(),
            })

            for (const file of filesToQueue) {
                try {
                    const fileBase64 = await readFileAsBase64(file)

                    const result = await triggerSubmitDealPacket({
                        environment,
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type || 'application/octet-stream',
                        fileBase64,
                        dealName: dealName || suggestedProjectName,
                        companyName: dealName || suggestedProjectName,
                        workstream: '',
                        submissionNotes,
                        projectId: targetProjectId,
                        projectStage,
                        documentType,
                        submissionBatchId,
                        expectedBatchDocumentCount,
                    }).result

                    if (result?.status === 'duplicate') {
                        duplicateFileNames.push(file.name)
                    }
                } catch {
                    failedFileNames.push(file.name)
                }
            }

            const queuedFileCount = expectedBatchDocumentCount - failedFileNames.length - duplicateFileNames.length
            const submissionMessages: string[] = []
            if (duplicateFileNames.length > 0) {
                submissionMessages.push(`${duplicateFileNames.join(', ')} ${duplicateFileNames.length === 1 ? 'was' : 'were'} not queued because ${duplicateFileNames.length === 1 ? 'this document has' : 'these documents have'} already been added to this project.`)
            }
            if (failedFileNames.length > 0) {
                submissionMessages.push(
                    queuedFileCount > 0
                        ? `${failedFileNames.length} file${failedFileNames.length === 1 ? '' : 's'} could not be queued (${failedFileNames.join(', ')}). Re-upload the failed file${failedFileNames.length === 1 ? '' : 's'} before relying on synthesis.`
                        : `No new files could be queued (${failedFileNames.join(', ')}). Please try the non-duplicate files again.`
                )
            }
            if (submissionMessages.length > 0) {
                if (duplicateFileNames.length > 0) playErrorSound()
                setBatchSubmissionMessage(submissionMessages.join(' '))
            }

            setSubmissionNotes('')
            setDocumentType('auto-detect')
            const resolvedKey = projectId || suggestedProjectId
            setSelectedProjectKey(resolvedKey)
            setSelectedFiles([])
            if (dealName.length === 0) setDealName(suggestedProjectName)
            if (projectId.length === 0) setProjectId(suggestedProjectId)
            const currentUser = getStoredAuth()
            if (currentUser?.email && resolvedKey) {
                claimProject(resolvedKey, currentUser.email)
            }
            await handleRefreshHistory(environment)
        } finally {
            setIsSubmittingFile(false)
        }
    }

    const openFindingEvidence = (finding: any) => {
        setActiveEvidence({
            title: finding.summary,
            sourceFile: finding.owner,
            sourceLocation: finding.sourceCitation,
            excerpt: finding.sourceExcerpt,
            status: finding.findingType,
            provenance: 'Retool Legacy',
        })
    }

    const hasDuplicateSubmissionMessage = batchSubmissionMessage.toLowerCase().includes('duplicate') || batchSubmissionMessage.toLowerCase().includes('already been added')

    return (
        <div className="min-h-screen bg-background text-foreground">
            <WorkspaceHeader
                isExampleMode={isExampleMode}
                activeProjectDocuments={activeProjectDocuments}
                setIsProjectsPanelOpen={setIsProjectsPanelOpen}
                projectSummaries={projectSummaries}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
                setStoredTheme={setStoredTheme}
                hydratedDealModel={hydratedDealModel}
                activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                dealName={dealName}
                suggestedProjectName={suggestedProjectName}
                notifications={notifications}
                handleMarkNotificationRead={handleMarkNotificationRead}
                handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                handleClearNotifications={handleClearNotifications}
                setActiveWorkspaceTab={setActiveWorkspaceTab}
                setIsApiKeyModalOpen={setIsApiKeyModalOpen}
                isActiveSubmissionStatus={isActiveSubmissionStatus}
            />

            {isExampleMode ? (
                <div className="mx-auto max-w-[1440px] px-4 pb-5 sm:px-6 lg:px-8">
                    <div className="rounded-xl border-2 border-primary/35 bg-primary/10 px-5 py-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
                        <div className="max-w-3xl">
                            <p className="text-lg font-semibold text-foreground">Viewing sample data in Example mode</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Test document uploads, batch tracking, and synthesis output with sample records.
                            </p>
                        </div>
                        <Button size="lg" className="mt-4 w-full shrink-0 sm:mt-0 sm:w-auto" onClick={() => setDataSource('mock')}>
                            Open example workspace
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mx-auto max-w-[1440px] px-4 pb-5 sm:px-6 lg:px-8">
                    <div className="rounded-xl border-2 border-success/35 bg-success/10 px-5 py-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
                        <div className="max-w-3xl">
                            <p className="text-lg font-semibold text-foreground">Ready to try it with your own documents?</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                Switch to Live n8n to queue a real project document and follow its document-level analysis through project synthesis.
                            </p>
                        </div>
                        <Button size="lg" className="mt-4 w-full shrink-0 sm:mt-0 sm:w-auto" onClick={() => setDataSource('live')}>
                            Go to Live n8n
                        </Button>
                    </div>
                </div>
            )}

            <div className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 lg:px-8">
                <DealHealthKPIs
                    synthesis={activeProjectSynthesis ?? undefined}
                    model={hydratedDealModel}
                    impact={activeProjectImpact}
                    documentsCount={activeProjectDocuments.length}
                />
            </div>

            <main className="mx-auto max-w-[1440px] space-y-8 px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
                <div id="upload-section" className="scroll-mt-6" />
                <ProjectIntakeCard
                    dealName={dealName}
                    askingPrice={askingPrice}
                    projectId={projectId}
                    projectStage={projectStage}
                    documentType={documentType}
                    submissionNotes={submissionNotes}
                    selectedProjectKey={selectedProjectKey}
                    suggestedProjectName={suggestedProjectName}
                    suggestedProjectId={suggestedProjectId}
                    availableProjects={availableProjects}
                    selectedFiles={selectedFiles}
                    disabled={isSubmittingFile || submitLoading}
                    onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
                    onDealNameChange={setDealName}
                    onAskingPriceChange={handleAskingPriceChange}
                    onProjectIdChange={setProjectId}
                    onProjectStageChange={setProjectStage}
                    onDocumentTypeChange={setDocumentType}
                    onSubmissionNotesChange={setSubmissionNotes}
                    onSelectedProjectKeyChange={setSelectedProjectKey}
                    onCreateProject={handleCreateProject}
                    onFileSelect={setSelectedFiles}
                    onSubmit={(environment) => { void handleSubmit(environment) }}
                />

                {submitError ? (
                    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Unable to queue the latest document: {submitError}
                    </div>
                ) : null}

                {batchSubmissionMessage ? (
                    <div role={hasDuplicateSubmissionMessage ? 'alert' : 'status'} aria-live={hasDuplicateSubmissionMessage ? 'assertive' : 'polite'} className={hasDuplicateSubmissionMessage ? 'rounded-xl border-2 border-destructive/60 bg-destructive/10 px-4 py-4 text-sm text-foreground shadow-md' : 'rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground'}>
                        <div className="flex items-start gap-3">
                            <AlertCircle className={hasDuplicateSubmissionMessage ? 'mt-0.5 h-5 w-5 shrink-0 text-destructive' : 'mt-0.5 h-5 w-5 shrink-0 text-warning'} />
                            <div>
                                <p className={hasDuplicateSubmissionMessage ? 'font-semibold text-destructive' : 'font-semibold'}>{hasDuplicateSubmissionMessage ? 'Duplicate document blocked' : 'Upload notice'}</p>
                                <p className="mt-1 leading-6 text-foreground">{batchSubmissionMessage}</p>
                            </div>
                        </div>
                    </div>
                ) : null}

                <DealWorkspaceNav
                    activeTab={activeWorkspaceTab}
                    isDiligenceComplete={activeProjectDocuments.length > 0 && !isCurrentProjectProcessingDocuments}
                    isSynthesisReady={Boolean(activeProjectSynthesis && !isCurrentProjectAwaitingSynthesis)}
                    onTabChange={(tab) => {
                        setActiveWorkspaceTab(tab)
                        const workspace = document.getElementById('deal-workspace')
                        if (workspace) {
                            workspace.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        } else {
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }
                    }}
                />

                {activeWorkspaceTab === 'overview' ? (
                    <OverviewWorkspaceView
                        hydratedDealModel={hydratedDealModel}
                        activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                        dealName={dealName}
                        suggestedProjectName={suggestedProjectName}
                        activeProjectDocuments={activeProjectDocuments}
                        activeProjectImpact={activeProjectImpact}
                        setActiveWorkspaceTab={setActiveWorkspaceTab}
                    />
                ) : null}

                {activeWorkspaceTab === 'analysis' ? (
                    <AnalysisWorkspaceView
                        hydratedDealModel={hydratedDealModel}
                        activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                        dealName={dealName}
                        suggestedProjectName={suggestedProjectName}
                        activeProjectDocuments={activeProjectDocuments}
                        activeProjectImpact={activeProjectImpact}
                        activeProjectId={activeProjectId}
                        setActiveWorkspaceTab={setActiveWorkspaceTab}
                    />
                ) : null}

                <Suspense fallback={<div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/20 p-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Loading tab…</span></div>}>
                    {activeWorkspaceTab === 'valuation' ? (
                        <ValuationWorkspaceView
                            hydratedDealModel={hydratedDealModel}
                            activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                            askingPrice={askingPrice}
                            handleDealModelChange={handleDealModelChange}
                            submissionHistory={submissionHistory}
                            setActiveEvidence={setActiveEvidence}
                            returnsDisplayModel={returnsDisplayModel}
                            activeProjectDocuments={activeProjectDocuments}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'returns' ? (
                        <ReturnsWorkspaceView
                            activeDealModel={activeDealModel}
                            returnsDisplayModel={returnsDisplayModel}
                            isReturnsIllustrativePreview={isReturnsIllustrativePreview}
                            submissionHistory={submissionHistory}
                            setActiveEvidence={setActiveEvidence}
                            activeProjectDocuments={activeProjectDocuments}
                            handleDealModelChange={handleDealModelChange}
                            handleDealModelDefaults={handleDealModelDefaults}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'growth' ? (
                        <GrowthWorkspaceView
                            activeDealModel={activeDealModel}
                            isGrowthIllustrativePreview={isGrowthIllustrativePreview}
                            returnsDisplayModel={returnsDisplayModel}
                            submissionHistory={submissionHistory}
                            setActiveEvidence={setActiveEvidence}
                            activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                            activeProjectDocuments={activeProjectDocuments}
                            handleDealModelChange={handleDealModelChange}
                            handleDealModelDefaults={handleDealModelDefaults}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'structure' ? (
                        <StructureWorkspaceView
                            activeDealModel={activeDealModel}
                            hydratedDealModel={hydratedDealModel}
                            setActiveEvidence={setActiveEvidence}
                            handleDealModelChange={handleDealModelChange}
                            handleDealModelDefaults={handleDealModelDefaults}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'negotiation' ? (
                        <NegotiationWorkspaceView
                            activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                            hydratedDealModel={hydratedDealModel}
                            activeProjectId={activeProjectId}
                            activeProjectDocuments={activeProjectDocuments}
                            dealName={dealName}
                            suggestedProjectName={suggestedProjectName}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'diligence' ? (
                        <div className="space-y-6">
                            {(activeSubmissionBatch || activeBatchProcessingCount > 0) ? (
                                <BatchProgressCard
                                    activeSubmissionBatch={activeSubmissionBatch ?? {
                                        id: activeProjectId,
                                        expectedDocumentCount: activeBatchExpectedCount,
                                        environment: 'production',
                                        startedAt: Date.now(),
                                    }}
                                    activeBatchFinishedCount={activeBatchFinishedCount}
                                    activeBatchExpectedCount={activeBatchExpectedCount}
                                    activeBatchFailedCount={activeBatchFailedCount}
                                    isStoppingBatch={isStoppingBatch}
                                    handleStopBatch={() => { void handleStopBatch() }}
                                    activeBatchProcessingCount={activeBatchProcessingCount}
                                    activeBatchProcessingPercent={activeBatchProcessingPercent}
                                    activeBatchProgressPercent={activeBatchProgressPercent}
                                    batchElapsedSeconds={batchElapsedSeconds}
                                    activeBatchImpact={activeBatchImpact}
                                    activeBatchStuckRows={activeBatchStuckRows}
                                    activeBatchErrors={activeBatchErrors}
                                    activeBatchAdvisories={activeBatchAdvisories}
                                    activeBatchCompletedCount={activeBatchCompletedCount}
                                    activeProjectId={activeProjectId}
                                    retryingRequestId={retryingRequestId ?? undefined}
                                    handleRetryFailedDocument={(requestID) => { void handleRetryFailedDocument(requestID) }}
                                    handleOpenProjectSynthesis={handleOpenProjectSynthesis}
                                />
                            ) : null}

                            {!isExampleMode && isCurrentProjectAwaitingSynthesis ? (
                                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/15">
                                    <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-amber-600" />
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Project synthesis in progress</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            All documents finished processing, so the agent is now consolidating them into one project judgment.
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            {!isExampleMode && (submitResponse || displayedSubmissionRow || activeProjectDocuments.length > 0) ? (
                                <LatestSubmissionSection
                                    displayedSubmissionRow={displayedSubmissionRow}
                                    displayedSubmitStatus={displayedSubmitStatus}
                                    submitEnvironment={submitEnvironment}
                                    liveSubmittedRow={liveSubmittedRow}
                                    latestBatchRows={latestBatchRows}
                                    safeBatchDocIndex={safeBatchDocIndex}
                                    setSelectedBatchDocIndex={setSelectedBatchDocIndex}
                                    retryingRequestId={retryingRequestId ?? undefined}
                                    handleRetryFailedDocument={(reqId) => { void handleRetryFailedDocument(reqId) }}
                                    handleOpenProjectSynthesis={handleOpenProjectSynthesis}
                                    projectId={projectId}
                                    projectStage={projectStage}
                                    documentType={documentType}
                                    submitResponse={submitResponse}
                                    webhookResponse={webhookResponse}
                                    displayedSubmitRowId={displayedSubmitRowId}
                                    displayedSubmitReceivedAt={displayedSubmitReceivedAt}
                                    displayedSubmitTrafficLight={displayedSubmitTrafficLight}
                                    displayedSubmitRiskLevel={displayedSubmitRiskLevel}
                                    displayedSubmitCategory={displayedSubmitCategory}
                                    displayedSubmitConfidence={displayedSubmitConfidence}
                                    displayedSubmitVariance={displayedSubmitVariance}
                                    displayedSubmitValuationCurrency={displayedSubmitValuationCurrency}
                                    displayedSubmitAiSummary={displayedSubmitAiSummary}
                                    liveSubmitCitations={liveSubmitCitations}
                                    activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                                    isCurrentProjectAwaitingSynthesis={isCurrentProjectAwaitingSynthesis}
                                    setActiveEvidence={setActiveEvidence}
                                />
                            ) : null}

                            <DiligenceWorkspaceView
                                projectSummaries={projectSummaries}
                                dealModelsData={dealModelsData}
                                visibleProjectSyntheses={visibleProjectSyntheses}
                                activeProjectId={activeProjectId}
                                setSelectedProjectKey={setSelectedProjectKey}
                                askingPrice={askingPrice}
                                handleAskingPriceChange={handleAskingPriceChange}
                                activeProjectImpact={activeProjectImpact}
                                activeDealModel={activeDealModel}
                                submissionHistory={submissionHistory}
                                getProjectKey={getProjectKey}
                                setActiveEvidence={setActiveEvidence}
                                isExampleMode={isExampleMode}
                                setActiveWorkspaceTab={setActiveWorkspaceTab}
                                hydratedDealModel={hydratedDealModel}
                                activeProjectDocuments={activeProjectDocuments}
                                activeProjectSynthesis={activeProjectSynthesis ?? undefined}
                                dealName={dealName}
                                suggestedProjectName={suggestedProjectName}
                                projectChecklistById={projectChecklistById}
                                setProjectChecklistById={setProjectChecklistById}
                                impact={impact}
                            />
                        </div>
                    ) : null}

                    {activeWorkspaceTab === 'documents' ? (
                        <DocumentsWorkspaceView
                            submissionHistory={submissionHistory}
                            visibleProjectSyntheses={visibleProjectSyntheses}
                            selectedProjectKey={selectedProjectKey}
                            handlePortfolioProjectSelect={handlePortfolioProjectSelect}
                            handleExcludeDocument={handleExcludeDocument}
                            handleIncludeDocument={handleIncludeDocument}
                            handleRetryFailedDocument={handleRetryFailedDocument}
                            handleRequeueNewProject={handleRequeueNewProject}
                            retryingRequestId={retryingRequestId}
                            handleRunSynthesis={handleRunSynthesis}
                            isCurrentProjectAwaitingSynthesis={isCurrentProjectAwaitingSynthesis}
                            setSelectedProjectKey={setSelectedProjectKey}
                        />
                    ) : null}

                    {activeWorkspaceTab === 'synthesis' ? (
                        <section id="project-synthesis" className="scroll-mt-6 space-y-4">
                            <SectionHeader
                                step={1}
                                title="Final acquisition judgment"
                                description="The consolidator's cross-document verdict for the selected project."
                            />
                            <ProjectSynthesisCard
                                syntheses={visibleProjectSyntheses}
                                projects={projectSummaries}
                                currentProjectId={isExampleMode ? 'atlas-001' : projectId}
                                documentAnalysisPending={isCurrentProjectProcessingDocuments}
                                synthesisPending={isCurrentProjectAwaitingSynthesis}
                                synthesisProgress={isExampleMode ? 100 : currentSynthesisProgress.value}
                                synthesisStage={isExampleMode ? 'Example synthesis complete' : currentSynthesisProgress.stage}
                                loading={projectSynthesisLoading}
                                error={projectSynthesisError}
                                model={hydratedDealModel}
                                impact={activeProjectImpact}
                                documents={submissionHistory.filter((row) => getProjectKey(row) === activeProjectId)}
                                onOpenEvidence={setActiveEvidence}
                                onExcludeDocument={handleExcludeDocument}
                                onIncludeDocument={handleIncludeDocument}
                                onRetryDocument={handleRetryFailedDocument}
                                retryingRequestId={retryingRequestId}
                                onStopSynthesis={handleStopSynthesis}
                                stoppingSynthesis={isStoppingSynthesis}
                                onRefresh={() => {
                                    void triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
                                }}
                            />
                            <ManagementQuestionTracker
                                projectId={activeProjectId}
                                suggestedQuestions={activeProjectSynthesis?.openQuestions ?? []}
                            />
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'history' ? (
                        <section className="space-y-4">
                            <SectionHeader
                                step={1}
                                title="Submission audit trail"
                                description="Per-document processing status and AI output, newest first."
                            />
                            <SubmissionHistoryCard
                                rows={submissionHistory}
                                loading={submissionHistoryLoading}
                                error={submissionHistoryError}
                                activeEnvironment={activeHistoryEnvironment}
                                onRefreshProduction={() => { void handleRefreshHistory('production') }}
                                onRefreshTest={() => { void handleRefreshHistory('test') }}
                                isPolling={hasActiveSubmissions}
                                onRetryFailedDocument={handleRetryFailedDocument}
                                retryingRequestId={retryingRequestId}
                                onOpenProject={handleAuditProjectOpen}
                                onOpenEvidence={setActiveEvidence}
                            />
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'email' ? (
                        <section className="space-y-4">
                            <SectionHeader
                                step={1}
                                title="Email drafts"
                                description="Ready-to-send updates for the current deal, based on the selected project and synthesis state."
                            />
                            <DealEmailDraftCard
                                model={hydratedDealModel}
                                synthesis={activeProjectSynthesis ?? undefined}
                                projectName={dealName || suggestedProjectName}
                            />
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'evals' ? (
                        <section id="evals-harness" className="scroll-mt-6 space-y-6">
                            <EvalDashboardTab evalRuns={Array.isArray(evalRunsData) ? evalRunsData : []} onTriggerEvalRuns={triggerEvalRuns} />
                        </section>
                    ) : null}

                    {activeWorkspaceTab === 'errors' ? (
                        <section id="workflow-errors" className="scroll-mt-6 space-y-6">
                            <WorkflowErrorLogCard
                                rows={Array.isArray(workflowErrorData) ? workflowErrorData : []}
                                loading={workflowErrorsLoading}
                                error={workflowErrorsError}
                                onRefresh={() => { void triggerWorkflowErrors({ environment: activeHistoryEnvironment }) }}
                            />
                            <SystemArchitectureCard />
                        </section>
                    ) : null}
                </Suspense>

                {SHOW_LEGACY_DILIGENCE_BACKUP ? (
                    <LegacyDiligenceBackupCard
                        diligenceFindings={diligenceFindings}
                        highPriorityCount={highPriorityCount}
                        validatedCount={validatedCount}
                        error={error}
                        openFindingEvidence={openFindingEvidence}
                    />
                ) : null}
            </main>

            <button
                type="button"
                onClick={() => setIsBatchDrawerOpen(true)}
                className={`fixed left-0 top-1/3 z-40 flex items-center gap-2.5 rounded-r-xl border border-l-0 border-border/80 bg-background/90 px-3 py-2.5 shadow-xl backdrop-blur-md transition-all duration-200 hover:bg-muted hover:pr-4 group ${
                    hasActiveSubmissions || inFlightBatchPlaceholder ? 'border-primary/60 text-primary animate-pulse' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Open Batch Processing Activity (Ctrl+Shift+B)"
                aria-label="Open batch processing drawer"
            >
                <div className="flex flex-col gap-1 w-4">
                    <span className="h-0.5 w-full bg-current rounded-full transition-transform group-hover:scale-x-110" />
                    <span className="h-0.5 w-full bg-current rounded-full transition-transform group-hover:scale-x-110" />
                    <span className="h-0.5 w-full bg-current rounded-full transition-transform group-hover:scale-x-110" />
                </div>
                <span className="text-xs font-bold tracking-tight hidden sm:inline">
                    {hasActiveSubmissions || inFlightBatchPlaceholder ? 'Batch Running…' : 'Activity'}
                </span>
            </button>

            <aside
                aria-label="Quick Actions"
                className={`fixed bottom-4 left-4 z-40 transition-all duration-300 ${
                    activeEvidence ? 'opacity-0 pointer-events-none -translate-x-10 scale-95' : 'opacity-100 translate-x-0 scale-100'
                }`}
            >
                {isLeftQuickDockVisible ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 p-1.5 shadow-xl backdrop-blur-md animate-in fade-in-0 duration-200">
                        <LoginButton />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setIsApiKeyModalOpen(true)}
                            title="Configure custom Anthropic API Key (BYOK)"
                        >
                            <Key className="h-3.5 w-3.5" />
                            <span className="sr-only">API Key</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full transition-colors ${hasActiveSubmissions || inFlightBatchPlaceholder ? 'text-primary animate-pulse bg-primary/10' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'}`}
                            onClick={() => setIsBatchDrawerOpen(true)}
                            title="Batch processing activity (Ctrl+Shift+B)"
                        >
                            <Activity className="h-3.5 w-3.5" />
                            <span className="sr-only">Batch activity</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                            onClick={() => setIsShortcutsOpen(true)}
                            title="Keyboard shortcuts (?)"
                        >
                            <Keyboard className="h-3.5 w-3.5" />
                            <span className="sr-only">Keyboard shortcuts</span>
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors ml-0.5"
                            onClick={() => setIsLeftQuickDockVisible(false)}
                            title="Dismiss quick actions toolbar"
                        >
                            <X className="h-3.5 w-3.5" />
                            <span className="sr-only">Close toolbar</span>
                        </Button>
                    </div>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-full border-border/80 bg-background/90 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-md hover:text-foreground hover:bg-muted/80 transition-all duration-200"
                        onClick={() => setIsLeftQuickDockVisible(true)}
                        title="Re-open quick actions toolbar"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                        <span>Quick actions</span>
                    </Button>
                )}
            </aside>

            <EvidenceDrawer evidence={activeEvidence} onClose={() => setActiveEvidence(null)} />

            <ProjectsSidePanel
                isOpen={isProjectsPanelOpen}
                onClose={() => setIsProjectsPanelOpen(false)}
                projects={projectSummaries}
                activeProjectKey={selectedProjectKey}
                syntheses={visibleProjectSyntheses}
                onSelectProject={(key) => handlePortfolioProjectSelect(key)}
                onOpenIntake={() => {
                    handleCreateProject()
                    document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' })
                }}
            />

            <BatchProcessingSidePanel
                isOpen={isBatchDrawerOpen}
                onClose={() => setIsBatchDrawerOpen(false)}
                inFlightBatch={inFlightBatchPlaceholder}
                activeBatchRows={activeBatchRows}
                batchProgressPercent={activeBatchProgressPercent}
                batchProcessingCount={activeBatchProcessingCount}
                batchExpectedCount={activeBatchExpectedCount}
                batchFinishedCount={activeBatchFinishedCount}
                batchFailedCount={activeBatchFailedCount}
                batchElapsedSeconds={batchElapsedSeconds}
                batchSubmissionMessage={batchSubmissionMessage}
                isStoppingBatch={isStoppingBatch}
                onStopBatch={() => { void handleStopBatch() }}
                onRetryDocument={(requestID) => { void handleRetryFailedDocument(requestID) }}
                onRequeueNewProject={handleRequeueNewProject}
                retryingRequestId={retryingRequestId}
                submissionHistory={submissionHistory}
            />

            <Suspense fallback={null}>
                <DealChatPanel
                    synthesis={activeProjectSynthesis ?? undefined}
                    model={hydratedDealModel}
                    projectName={dealName || suggestedProjectName}
                    documents={activeProjectDocuments}
                    allSyntheses={visibleProjectSyntheses}
                    onSuggestProjectSwitch={(targetProjectId) => {
                        const targetProject = projectSummaries.find((p: any) => (p.projectId || p.projectKey) === targetProjectId)
                        if (!targetProject) return
                        handlePortfolioProjectSelect(targetProject.projectKey)
                    }}
                    onOpenProjectsPanel={() => setIsProjectsPanelOpen(true)}
                    projectsCount={projectSummaries.length}
                />
            </Suspense>

            <Suspense fallback={null}>
                <CommandPalette
                    open={commandPaletteOpen}
                    onClose={() => setCommandPaletteOpen(false)}
                    onSelectTab={(tab) => setActiveWorkspaceTab(tab as WorkspaceTab)}
                    onToggleTheme={() => { const next = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark'; setCurrentTheme(next); setStoredTheme(next) }}
                    onExportMarkdown={() => { const name = dealName || suggestedProjectName; const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'deal'; downloadFile(buildMarkdownReport(hydratedDealModel, activeProjectSynthesis ?? undefined, name), `${safeName}_summary.md`, 'text/markdown') }}
                    onExportJson={() => { const name = dealName || suggestedProjectName; const safeName = name.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50) || 'deal'; downloadFile(JSON.stringify(buildJsonExport(hydratedDealModel, activeProjectSynthesis ?? undefined, name), null, 2), `${safeName}_export.json`, 'application/json') }}
                    onShowShortcuts={() => { }}
                    onOpenChat={() => { }}
                    onCopySummary={() => { const name = dealName || suggestedProjectName; navigator.clipboard.writeText(buildMarkdownReport(hydratedDealModel, activeProjectSynthesis ?? undefined, name)) }}
                    onScrollToUpload={() => { document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth' }) }}
                />
            </Suspense>

            <ApiKeyModal open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen} />
            <KeyboardShortcutsDialog open={isShortcutsOpen} onOpenChange={setIsShortcutsOpen} showTrigger={false} />
        </div>
    )
}
