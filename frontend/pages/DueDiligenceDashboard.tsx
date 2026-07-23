import { useEffect, useMemo, useRef, useState } from 'react'
import {
    AlertCircle,
    ArrowUpRight,
    Clock3,
    FileSearch,
} from 'lucide-react'

import ExpandableInsightGroup from '../components/ExpandableInsightGroup'
import DealModelPendingCard from '../components/DealModelPendingCard'
import AllCashReturnsCard from '../components/AllCashReturnsCard'
import FinancedReturnsCard from '../components/FinancedReturnsCard'
import FinancedScenarioComparisonCard from '../components/FinancedScenarioComparisonCard'
import ScenarioComparisonCard from '../components/ScenarioComparisonCard'
import DealStructureVisualCard from '../components/DealStructureVisualCard'
import DealOverviewCard from '../components/DealOverviewCard'
import DealModelReadinessCard from '../components/DealModelReadinessCard'
import DataQualityChecksCard from '../components/DataQualityChecksCard'
import DealValuationCard from '../components/DealValuationCard'
import EvidenceDrawer, { type EvidenceItem } from '../components/EvidenceDrawer'
import ProjectChecklistCard, { type ProjectChecklistState } from '../components/ProjectChecklistCard'
import DealWorkspaceNav, { type WorkspaceTab } from '../components/DealWorkspaceNav'
import GrowthDecisionSummary from '../components/GrowthDecisionSummary'
import ReturnsDecisionSummary from '../components/ReturnsDecisionSummary'
import ProjectIntakeCard from '../components/ProjectIntakeCard'
import ProjectPortfolioCard from '../components/ProjectPortfolioCard'
import ProjectSynthesisCard from '../components/ProjectSynthesisCard'
import ManagementQuestionTracker from '../components/ManagementQuestionTracker'
import SectionHeader from '../components/SectionHeader'
import SubmissionHistoryCard from '../components/SubmissionHistoryCard'
import WorkflowErrorLogCard from '../components/WorkflowErrorLogCard'
import {
    exampleProjectSyntheses,
    exampleSubmissionHistoryRows,
    type DealModel,
    useGetDiligenceData,
    useGetDealModels,
    useGetProjectActionTracker,
    useGetProjectSynthesis,
    useGetWorkflowErrors,
    useGetSubmissionHistory,
    useSubmitDealPacket,
    useSaveDealModel,
    useSaveProjectActionTracker,
    useUpdateSubmissionConsideration,
} from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { getDataSource, setDataSource } from '../lib/dataSource'
import { Progress } from '../lib/shadcn/progress'
import { Switch } from '../lib/shadcn/switch'
import { Textarea } from '../lib/shadcn/textarea'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../lib/shadcn/table'
import { cn } from '../lib/shadcn/utils'
import {
    getAiSubmissionViewModel,
    getSubmissionInsightTone,
    splitReadableText,
} from '../utils/aiSubmissionData'
import {
    type SubmissionHistoryItem,
    formatSubmissionStatus,
    isActiveSubmissionStatus,
} from '../utils/submissionHistory'
import { createProjectSummaries, getProjectKey } from '../utils/projectWorkspace'
import { computeImpactMetrics, formatHours } from '../utils/impactMetrics'
import { fallbackDiligenceFindings, type FindingType, type Severity } from '../utils/diligence'
import { formatEasternTime } from '../utils/dateTime'
import { readFileAsBase64 } from '../utils/fileEncoding'
import { findCitedDocument } from '../utils/evidence'

function getFindingVariant(findingType: FindingType): 'destructive' | 'success' {
    return findingType === 'Red Flag' ? 'destructive' : 'success'
}

function getSeverityVariant(severity: Severity): 'destructive' | 'warning' | 'secondary' | 'outline' {
    if (severity === 'Critical') {
        return 'destructive'
    }

    if (severity === 'High') {
        return 'warning'
    }

    if (severity === 'Medium') {
        return 'secondary'
    }

    return 'outline'
}

function getSubmissionStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' | 'outline' {
    const normalized = status.trim().toLowerCase()

    if (normalized === 'completed' || normalized === 'approved') {
        return 'success'
    }

    if (
        normalized === 'accepted'
        || normalized === 'queued'
        || normalized === 'processing'
        || normalized === 'submitted'
        || normalized === 'human review'
        || normalized === 'human_review'
        || normalized === 'needs review'
    ) {
        return 'warning'
    }

    if (normalized === 'error' || normalized === 'failed' || normalized === 'rejected') {
        return 'destructive'
    }

    return 'secondary'
}

function createUnusedProjectId(usedProjectIds: Iterable<string> = []) {
    const used = new Set(
        Array.from(usedProjectIds, (id) => id.trim().toLowerCase()).filter((id) => id.length > 0)
    )

    let candidate = ''
    do {
        const randomSuffix = typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().slice(0, 8)
            : Math.random().toString(36).slice(2, 10)
        candidate = 'project-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-' + randomSuffix
    } while (used.has(candidate.toLowerCase()))

    return candidate
}

const terminalBatchStatuses = new Set(['completed', 'failed', 'error', 'rejected', 'needs_review', 'needs review'])
// Retains the retired Retool sample implementation as a code backup without
// exposing it in the project-based live workspace.
const SHOW_LEGACY_DILIGENCE_BACKUP = false
const processingReachedStatuses = new Set([
    'processing',
    'running',
    'human review',
    'human_review',
    'needs review',
    'approved',
    ...terminalBatchStatuses,
])
const activeSynthesisStatuses = new Set(['queued', 'pending', 'processing', 'running', 'synthesis_pending', 'synthesizing'])

function parseIllustrativeFacts(raw: string) {
    try {
        const parsed = JSON.parse(raw) as Record<string, { value?: number; status?: string }>
        const confirmed = (key: string) => parsed[key]?.status === 'confirmed' && typeof parsed[key]?.value === 'number' ? parsed[key].value ?? null : null
        return { revenue: confirmed('revenue'), ebitda: confirmed('ebitda_sde') }
    } catch {
        return { revenue: null, ebitda: null }
    }
}

function hydrateModelFactsFromDocuments(model: DealModel, documents: SubmissionHistoryItem[]) {
    let merged: Record<string, Record<string, unknown>> = {}
    try {
        const parsed = JSON.parse(model.documentedFactsJson || '{}') as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) merged = parsed as Record<string, Record<string, unknown>>
    } catch {}

    for (const document of documents) {
        if (document.status.trim().toLowerCase() !== 'completed' || !document.financialFactsJson?.trim()) continue
        try {
            const parsed = JSON.parse(document.financialFactsJson) as unknown
            const candidate = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'facts' in parsed
                ? (parsed as { facts?: unknown }).facts
                : parsed
            if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
            for (const [field, fact] of Object.entries(candidate as Record<string, Record<string, unknown>>)) {
                const current = merged[field]
                const isConfirmed = fact?.status === 'confirmed' && typeof fact.value === 'number' && Number.isFinite(fact.value)
                const currentConfirmed = current?.status === 'confirmed' && typeof current.value === 'number'
                if (!isConfirmed || currentConfirmed) continue
                merged[field] = {
                    ...fact,
                    provenance: fact.provenance || 'Completed document fact',
                    citations: Array.isArray(fact.citations) && fact.citations.length ? fact.citations : [{ source_file: document.fileName, row_or_cell: 'Document analysis' }],
                }
            }
        } catch {
            // A malformed document fact record must never prevent the workspace from rendering.
        }
    }

    return JSON.stringify(merged) === (model.documentedFactsJson || '{}') ? model : {
        ...model,
        documentedFactsJson: JSON.stringify(merged),
        documentedFactsStatus: model.documentedFactsStatus || 'Temporarily hydrated from completed documents',
    }
}

function buildReturnsDisplayModel(model: DealModel) {
    let facts: Record<string, Record<string, unknown>> = {}
    try {
        const parsed = JSON.parse(model.documentedFactsJson || '{}') as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) facts = parsed as Record<string, Record<string, unknown>>
    } catch {}
    const confirmedNumber = (field: string) => facts[field]?.status === 'confirmed' && typeof facts[field]?.value === 'number'
    const hasEbitda = confirmedNumber('ebitda_sde')
    const hasRevenue = confirmedNumber('revenue')
    const hasPrice = (model.purchasePrice ?? model.askingPrice) !== null
    if (hasEbitda && hasRevenue && hasPrice) return model

    // Rendering-only values: they give the live workspace a useful first
    // screen while facts are still loading, but are never saved or treated as
    // documentary evidence.
    return {
        ...model,
        askingPrice: model.askingPrice ?? 1_000_000,
        purchasePrice: model.purchasePrice ?? model.askingPrice ?? 1_000_000,
        transactionFees: model.transactionFees ?? 10_000,
        workingCapitalRequirement: model.workingCapitalRequirement ?? 20_000,
        holdPeriodYears: model.holdPeriodYears ?? 5,
        taxRate: model.taxRate ?? 0.25,
        maintenanceCapex: model.maintenanceCapex ?? 10_000,
        exitMultiple: model.exitMultiple ?? 4,
        exitCosts: model.exitCosts ?? 16_000,
        equityContributionPercent: model.equityContributionPercent ?? 0.3,
        interestRate: model.interestRate ?? 0.1,
        amortizationYears: model.amortizationYears ?? 10,
        sellerNoteAmount: model.sellerNoteAmount ?? 0,
        bearRevenueGrowth: model.bearRevenueGrowth ?? 0,
        baseRevenueGrowth: model.baseRevenueGrowth ?? 0.05,
        bullRevenueGrowth: model.bullRevenueGrowth ?? 0.1,
        bearEbitdaMargin: model.bearEbitdaMargin ?? 0.15,
        baseEbitdaMargin: model.baseEbitdaMargin ?? 0.2,
        bullEbitdaMargin: model.bullEbitdaMargin ?? 0.25,
        bearExitMultiple: model.bearExitMultiple ?? 3,
        baseExitMultiple: model.baseExitMultiple ?? 4,
        bullExitMultiple: model.bullExitMultiple ?? 5,
        documentedFactsJson: JSON.stringify({
            ...facts,
            revenue: hasRevenue ? facts.revenue : { value: 1_000_000, status: 'illustrative', currency: 'USD', period: 'Display preview', provenance: 'Illustrative preview' },
            ebitda_sde: hasEbitda ? facts.ebitda_sde : { value: 200_000, status: 'illustrative', currency: 'USD', period: 'Display preview', provenance: 'Illustrative preview' },
        }),
    } as DealModel
}

function IllustrativeModelPreviewNotice() {
    return <div role="alert" className="rounded-lg border-2 border-destructive/60 bg-destructive/10 p-4 text-sm text-foreground shadow-sm"><div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5 shrink-0" /><p className="font-bold uppercase tracking-wide">Illustrative model preview — not source-backed</p></div><p className="mt-2 font-medium">This card uses display-only starting values because this project is still missing confirmed revenue/EBITDA or a saved price.</p><p className="mt-1 text-muted-foreground">Nothing in this preview is saved to the project; returned facts and your inputs replace it automatically.</p></div>
}

function hasReachedProcessingStage(status: string) {
    return processingReachedStatuses.has(status.trim().toLowerCase())
}

function isDuplicateProjectDocument(file: File, projectId: string, rows: SubmissionHistoryItem[]) {
    const normalizedProjectId = projectId.trim().toLowerCase()
    const normalizedFileName = file.name.trim().toLowerCase()

    return rows.some((row) => {
        return row.projectId.trim().toLowerCase() === normalizedProjectId
            && row.fileName.trim().toLowerCase() === normalizedFileName
            && row.fileSize === file.size
    })
}

type SubmitWebhookResponse = {
    requestID?: string
    status?: string
    receivedAt?: string
    id?: number
    createdAt?: string
    updatedAt?: string
}

type SubmitEnvironment = 'production' | 'test'

type SubmissionBatch = {
    id: string
    expectedDocumentCount: number
    environment: SubmitEnvironment
    startedAt: number
    endedAt?: number
}

function formatElapsedDuration(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return minutes > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${remainingSeconds}s`
}

export default function DueDiligenceDashboard() {
    const { data: diligenceData, loading: _loading, error, trigger } = useGetDiligenceData()
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
    const { trigger: triggerSubmissionConsideration } = useUpdateSubmissionConsideration()

    const diligenceFindings = useMemo(() => {
        if (Array.isArray(diligenceData) && diligenceData.length > 0) {
            return diligenceData
        }

        return fallbackDiligenceFindings
    }, [diligenceData])

    const liveSubmissionHistory = (Array.isArray(submissionHistoryData)
        ? submissionHistoryData
        : []) as SubmissionHistoryItem[]
    const isShowingExampleWorkspace = !submissionHistoryLoading
        && !submissionHistoryError
        && liveSubmissionHistory.length === 0
    const isExampleMode = getDataSource() === 'mock' || isShowingExampleWorkspace
    const submissionHistory = isShowingExampleWorkspace
        ? exampleSubmissionHistoryRows
        : liveSubmissionHistory
    const visibleProjectSyntheses = isShowingExampleWorkspace
        ? exampleProjectSyntheses
        : (Array.isArray(projectSynthesisData) ? projectSynthesisData : [])
    const projectSummaries = useMemo(() => createProjectSummaries(submissionHistory), [submissionHistory])

    const fallbackFinding = diligenceFindings[0]
    const [selectedFindingId, setSelectedFindingId] = useState<string>(fallbackFinding?.id ?? '')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [dealName, setDealName] = useState('')
    const [askingPrice, setAskingPrice] = useState('')
    const [askingPriceByProject, setAskingPriceByProject] = useState<Record<string, string>>(() => {
        if (typeof window === 'undefined') return {}

        try {
            const stored = window.localStorage.getItem('mergeworks.askingPriceByProject')
            const parsed = stored ? JSON.parse(stored) : {}
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, string> : {}
        } catch {
            return {}
        }
    })
    const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('overview')
    const [projectId, setProjectId] = useState(() => createUnusedProjectId())
    const [projectStage, setProjectStage] = useState('post-loi')
    const [documentType, setDocumentType] = useState('auto-detect')
    const [selectedProjectKey, setSelectedProjectKey] = useState('new')
    const [submissionNotes, setSubmissionNotes] = useState('')
    const [isSubmittingFile, setIsSubmittingFile] = useState(false)
    const [batchSubmissionMessage, setBatchSubmissionMessage] = useState('')
    const [retryingRequestId, setRetryingRequestId] = useState<string | null>(null)
    const [activeSubmissionBatch, setActiveSubmissionBatch] = useState<SubmissionBatch | null>(null)
    const [activeHistoryEnvironment, setActiveHistoryEnvironment] = useState<SubmitEnvironment>('production')
    const [desktopNotificationPermission, setDesktopNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
        return Notification.permission
    })
    const [activeEvidence, setActiveEvidence] = useState<EvidenceItem | null>(null)
    const [projectChecklistById, setProjectChecklistById] = useState<Record<string, ProjectChecklistState>>(() => {
        try { return JSON.parse(window.localStorage.getItem('mergeworks.projectChecklistById') || '{}') as Record<string, ProjectChecklistState> } catch { return {} }
    })
    const [actionTrackerProjectId, setActionTrackerProjectId] = useState('')
    const [dealModelDraftByProject, setDealModelDraftByProject] = useState<Record<string, DealModel>>({})
    const completionAudioContext = useRef<AudioContext | null>(null)
    const dealModelSaveTimeout = useRef<number | null>(null)
    const checklistSaveTimeout = useRef<number | null>(null)
    const [hasRestoredLatestProject, setHasRestoredLatestProject] = useState(false)
    const [validationById, setValidationById] = useState<Record<string, boolean>>({})
    const [notesById, setNotesById] = useState<Record<string, string>>({})
    const { data: sharedActionTracker, trigger: triggerProjectActionTracker } = useGetProjectActionTracker()
    const { trigger: saveProjectActionTracker } = useSaveProjectActionTracker()
    const activeProjectId = isExampleMode ? 'atlas-001' : projectId
    const activeDealModel = useMemo<DealModel>(() => {
        const saved = Array.isArray(dealModelsData) ? dealModelsData.find((model) => model.projectId === activeProjectId) : undefined
        const exampleModel: DealModel = {
            projectId: 'atlas-001', askingPrice: 110_000_000, purchasePrice: 108_000_000, debtAssumed: 13_200_000, cashAcquired: 2_400_000, workingCapitalRequirement: 2_000_000, transactionFees: 1_500_000, holdPeriodYears: 5, taxRate: 0.25, closingCosts: 1_500_000, maintenanceCapex: 1_200_000, exitMultiple: 9, exitCosts: 1_000_000, equityContributionPercent: 0.3, interestRate: 0.1, amortizationYears: 10, sellerNoteAmount: 0, bearRevenueGrowth: 0, baseRevenueGrowth: 0.05, bullRevenueGrowth: 0.1, bearEbitdaMargin: 0.15, baseEbitdaMargin: 0.2, bullEbitdaMargin: 0.25, bearExitMultiple: 3, baseExitMultiple: 4, bullExitMultiple: 5, revenueMultiple: 2.1, ebitdaMultiple: 8.4, assetHaircutPercent: 0.1, modelUpdatedAt: '', modelUpdatedBy: 'Example data', documentedFactsStatus: 'confirmed', documentedFactsJson: JSON.stringify({ revenue: { value: 48_100_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 18' }] }, ebitda_sde: { value: 12_400_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 18' }] }, debt: { value: 13_200_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22' }] }, total_assets: { value: 60_000_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22' }] }, total_liabilities: { value: 22_000_000, status: 'confirmed', currency: 'USD', period: 'FY23', provenance: 'Example data', citations: [{ source_file: 'northwind-q4-financials.pdf', row_or_cell: 'Page 22' }] } }),
        }
        if (isExampleMode) return exampleModel
        return dealModelDraftByProject[activeProjectId] ?? saved ?? {
            projectId: activeProjectId, askingPrice: null, purchasePrice: null, debtAssumed: null, cashAcquired: null, workingCapitalRequirement: null, transactionFees: null, holdPeriodYears: null, taxRate: null, closingCosts: null, maintenanceCapex: null, exitMultiple: null, exitCosts: null, equityContributionPercent: null, interestRate: null, amortizationYears: null, sellerNoteAmount: null, bearRevenueGrowth: null, baseRevenueGrowth: null, bullRevenueGrowth: null, bearEbitdaMargin: null, baseEbitdaMargin: null, bullEbitdaMargin: null, bearExitMultiple: null, baseExitMultiple: null, bullExitMultiple: null, revenueMultiple: null, ebitdaMultiple: null, assetHaircutPercent: null, modelUpdatedAt: '', modelUpdatedBy: '', documentedFactsJson: '', documentedFactsStatus: '',
        }
    }, [activeProjectId, dealModelDraftByProject, dealModelsData, isExampleMode])
    const activeProjectDocuments = useMemo(() => submissionHistory.filter((row) => getProjectKey(row) === activeProjectId), [activeProjectId, submissionHistory])
    const hydratedDealModel = useMemo(() => isExampleMode ? activeDealModel : hydrateModelFactsFromDocuments(activeDealModel, activeProjectDocuments), [activeDealModel, activeProjectDocuments, isExampleMode])
    const returnsDisplayModel = useMemo(() => isExampleMode ? hydratedDealModel : buildReturnsDisplayModel(hydratedDealModel), [hydratedDealModel, isExampleMode])
    const isReturnsIllustrativePreview = !isExampleMode && returnsDisplayModel !== activeDealModel
    const isGrowthIllustrativePreview = !isExampleMode && returnsDisplayModel !== hydratedDealModel

    useEffect(() => {
        setAskingPrice(askingPriceByProject[activeProjectId] ?? '')
    }, [activeProjectId, askingPriceByProject])

    useEffect(() => {
        try {
            window.localStorage.setItem('mergeworks.askingPriceByProject', JSON.stringify(askingPriceByProject))
        } catch {
            // Local persistence is a convenience only; the workspace remains usable if storage is unavailable.
        }
    }, [askingPriceByProject])

    useEffect(() => {
        try { window.localStorage.setItem('mergeworks.projectChecklistById', JSON.stringify(projectChecklistById)) } catch {}
    }, [projectChecklistById])

    // The tracker is shared through n8n when it is reachable; local storage remains a
    // deliberately safe fallback for offline/demo use.
    useEffect(() => {
        if (!activeProjectId || isExampleMode) return
        setActionTrackerProjectId('')
        void triggerProjectActionTracker({ projectId: activeProjectId }).result.then((tracker) => {
            // A missing row is the normal first-use case. It is safe to create it
            // from the browser's current checklist; a returned row is hydrated below.
            if (tracker === null) setActionTrackerProjectId(activeProjectId)
        })
    }, [activeProjectId, isExampleMode, triggerProjectActionTracker])

    useEffect(() => {
        if (!sharedActionTracker?.projectId || sharedActionTracker.projectId !== activeProjectId) return
        try {
            const sharedChecklist = JSON.parse(sharedActionTracker.checklistJson || '{}') as ProjectChecklistState
            if (!sharedChecklist || typeof sharedChecklist !== 'object' || Array.isArray(sharedChecklist)) return
            setProjectChecklistById((current) => ({ ...current, [activeProjectId]: { ...(current[activeProjectId] ?? {}), ...sharedChecklist } }))
        } catch {
            // A malformed remote value must not prevent the local checklist from being used.
        }
        setActionTrackerProjectId(activeProjectId)
    }, [activeProjectId, sharedActionTracker])

    useEffect(() => {
        if (isExampleMode || actionTrackerProjectId !== activeProjectId) return
        const checklistJson = JSON.stringify(projectChecklistById[activeProjectId] ?? {})
        if (checklistSaveTimeout.current) window.clearTimeout(checklistSaveTimeout.current)
        checklistSaveTimeout.current = window.setTimeout(() => {
            void saveProjectActionTracker({
                projectId: activeProjectId,
                checklistJson,
                questionsJson: sharedActionTracker?.questionsJson || '[]',
            }).result
        }, 500)
        return () => { if (checklistSaveTimeout.current) window.clearTimeout(checklistSaveTimeout.current) }
    }, [actionTrackerProjectId, activeProjectId, isExampleMode, projectChecklistById, saveProjectActionTracker, sharedActionTracker?.questionsJson])

    useEffect(() => {
        void trigger({})
        void triggerSubmissionHistory({ environment: 'production' })
        void triggerProjectSynthesis({ environment: 'production' })
        void triggerWorkflowErrors({ environment: 'production' })
        void triggerDealModels({})
    }, [trigger, triggerDealModels, triggerProjectSynthesis, triggerSubmissionHistory, triggerWorkflowErrors])

    useEffect(() => {
        if (!Array.isArray(dealModelsData)) return
        setAskingPriceByProject((current) => ({
            ...current,
            ...Object.fromEntries(dealModelsData.filter((model) => model.projectId && model.askingPrice !== null).map((model) => [model.projectId, String(model.askingPrice)])),
        }))
    }, [dealModelsData])

    useEffect(() => {
        if (!fallbackFinding) {
            return
        }

        setSelectedFindingId((current) => {
            if (current.length > 0 && diligenceFindings.some((finding) => finding.id === current)) {
                return current
            }

            return fallbackFinding.id
        })

        setValidationById((current) => {
            const nextEntries = diligenceFindings.map((finding) => [finding.id, current[finding.id] ?? finding.validated] as const)
            return Object.fromEntries(nextEntries)
        })

        setNotesById((current) => {
            const nextEntries = diligenceFindings.map((finding) => [finding.id, current[finding.id] ?? finding.analystNotes] as const)
            return Object.fromEntries(nextEntries)
        })
    }, [diligenceFindings, fallbackFinding])

    useEffect(() => {
        if (hasRestoredLatestProject || isExampleMode || projectSummaries.length === 0) {
            return
        }

        const latestProject = projectSummaries[0]
        setSelectedProjectKey(latestProject.projectKey)
        setProjectId(latestProject.projectId || latestProject.projectKey)
        setDealName(latestProject.projectName)
        setProjectStage(latestProject.stage || 'post-loi')
        setHasRestoredLatestProject(true)
    }, [hasRestoredLatestProject, isExampleMode, projectSummaries])

    const hasActiveSubmissions = useMemo(() => {
        return submissionHistory.some((row) => isActiveSubmissionStatus(row.status))
    }, [submissionHistory])

    // A document can be complete while the project-level consolidator is still
    // running. Keep polling its independent status so the synthesis panel
    // updates without requiring a manual refresh.
    const hasActiveProjectSynthesis = useMemo(() => {
        return visibleProjectSyntheses.some((row) => activeSynthesisStatuses.has(row.projectStatus.trim().toLowerCase()))
    }, [visibleProjectSyntheses])

    const isCurrentProjectProcessingDocuments = useMemo(() => {
        const currentProjectId = projectId.trim()
        const currentProject = projectSummaries.find((project) => (project.projectId || project.projectKey) === currentProjectId)
        return (currentProject?.activeCount ?? 0) > 0
    }, [projectId, projectSummaries])

    const isCurrentProjectAwaitingSynthesis = useMemo(() => {
        const currentProjectId = projectId.trim()
        if (currentProjectId.length === 0) {
            return false
        }

        const currentProject = projectSummaries.find((project) => (project.projectId || project.projectKey) === currentProjectId)
        // The document-counter workflow starts synthesis once every document
        // reaches a terminal success state. Human-review flags should not hide
        // that transition from the UI.
        if (!currentProject || currentProject.documentCount === 0 || currentProject.activeCount > 0 || currentProject.failedCount > 0) {
            return false
        }

        const currentSyntheses = visibleProjectSyntheses.filter((row) => row.projectId === currentProjectId)
        const hasActiveSynthesis = currentSyntheses.some((row) => activeSynthesisStatuses.has(row.projectStatus.trim().toLowerCase()))

        if (hasActiveSynthesis) {
            return true
        }

        const hasFinalJudgment = currentSyntheses.some((row) => {
            return row.finalJudgmentSummary.trim().length > 0 || row.finalRecommendation.trim().length > 0
        })

        return !hasFinalJudgment
    }, [projectId, projectSummaries, visibleProjectSyntheses])

    const currentSynthesisProgress = useMemo(() => {
        const currentProject = projectSummaries.find((project) => (project.projectId || project.projectKey) === projectId.trim())
        const completed = currentProject?.completedCount ?? 0
        const received = currentProject?.documentCount ?? 0

        if (received > 0 && completed < received) {
            return {
                value: Math.round((completed / received) * 70),
                stage: 'Document analysis: ' + completed + '/' + received + ' complete',
            }
        }

        if (isCurrentProjectAwaitingSynthesis) {
            return { value: 82, stage: 'Synthesizing the latest project documents' }
        }

        return { value: 0, stage: 'Waiting for project documents' }
    }, [isCurrentProjectAwaitingSynthesis, projectId, projectSummaries])

    const shouldPollN8n = hasActiveSubmissions || hasActiveProjectSynthesis || isCurrentProjectAwaitingSynthesis
    const hasDuplicateSubmissionMessage = batchSubmissionMessage.toLowerCase().includes('already been added')

    useEffect(() => {
        if (!shouldPollN8n) {
            return
        }

        const intervalId = window.setInterval(() => {
            void triggerSubmissionHistory({ environment: activeHistoryEnvironment }, { skipCache: true }).result
            void triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        }, 5000)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [activeHistoryEnvironment, shouldPollN8n, triggerProjectSynthesis, triggerSubmissionHistory])

    if (!fallbackFinding) {
        return null
    }

    const selectedFinding = diligenceFindings.find((finding) => finding.id === selectedFindingId) ?? fallbackFinding
    const openFindingEvidence = (finding: typeof selectedFinding) => {
        const citation = finding.sourceCitation.toLowerCase()
        const document = findCitedDocument(finding.sourceCitation, submissionHistory)
        setActiveEvidence({
            title: finding.summary,
            sourceFile: document?.fileName || finding.sourceCitation,
            sourceLocation: finding.sourceCitation,
            excerpt: finding.sourceExcerpt,
            confidence: finding.confidenceScore,
            status: validationById[finding.id] ? 'Validated' : 'Pending analyst review',
            provenance: finding.workstream,
            documentUrl: document?.storageFileUrl,
            documentId: document?.storageFileId,
        })
    }
    const validatedCount = diligenceFindings.filter((finding) => validationById[finding.id]).length
    const highPriorityCount = diligenceFindings.filter(
        (finding) => finding.severity === 'Critical' || finding.severity === 'High'
    ).length
    const impact = useMemo(() => computeImpactMetrics(submissionHistory), [submissionHistory])
    const activeProjectImpact = useMemo(() => {
        const normalizedProjectId = activeProjectId.trim()
        return computeImpactMetrics(submissionHistory.filter((row) => getProjectKey(row) === normalizedProjectId))
    }, [activeProjectId, submissionHistory])
    const reviewProjectCount = projectSummaries.filter((project) => project.reviewCount > 0).length
    const activeProjectCount = projectSummaries.filter((project) => project.activeCount > 0).length
    const readyProjectCount = projectSummaries.filter((project) => project.statusLabel === 'Ready for synthesis').length
    const suggestedProjectName = dealName.length > 0 ? dealName : `Project ${projectSummaries.length + 1}`
    const suggestedProjectId = projectId.length > 0 ? projectId : `project-${projectSummaries.length + 1}`
    const availableProjects = projectSummaries.map((project) => ({
        key: project.projectKey,
        label: project.projectName,
    }))
    const webhookResponse = submitResponse?.response as SubmitWebhookResponse | undefined
    const submitEnvironment = (submitResponse?.environment === 'test' ? 'test' : 'production') as SubmitEnvironment
    const latestSubmittedRequestId = webhookResponse?.requestID ?? ''
    const liveSubmittedRow = latestSubmittedRequestId.length > 0
        ? submissionHistory.find((row) => row.requestID === latestSubmittedRequestId)
        : undefined
    const latestHistoryRow = [...submissionHistory].sort((left, right) => {
        const leftTimestamp = Date.parse(left.processedAt || left.processingStartedAt || left.receivedAt || left.createdAt || left.triggerTimestamp)
        const rightTimestamp = Date.parse(right.processedAt || right.processingStartedAt || right.receivedAt || right.createdAt || right.triggerTimestamp)
        return (Number.isNaN(rightTimestamp) ? 0 : rightTimestamp) - (Number.isNaN(leftTimestamp) ? 0 : leftTimestamp)
    })[0]
    const displayedSubmissionRow = liveSubmittedRow ?? latestHistoryRow
    const displayedSubmitStatus = displayedSubmissionRow?.status ?? webhookResponse?.status ?? submitResponse?.status ?? 'accepted'
    const displayedSubmitReceivedAt = displayedSubmissionRow?.receivedAt ?? webhookResponse?.receivedAt ?? 'Pending'
    const displayedSubmitRowId = displayedSubmissionRow?.id ?? webhookResponse?.id ?? 'Pending'
    const displayedSubmitRiskLevel = displayedSubmissionRow?.riskLevel ?? ''
    const displayedSubmitTrafficLight = displayedSubmissionRow?.trafficLight ?? ''
    const displayedSubmitCategory = displayedSubmissionRow?.category ?? ''
    const displayedSubmitAiSummary = displayedSubmissionRow?.aiSummary ?? ''
    const displayedSubmitVariance = displayedSubmissionRow?.aiVariance ?? ''
    const displayedSubmitConfidence = displayedSubmissionRow?.aiConfidence ?? ''
    const displayedSubmitEscalationReason = displayedSubmissionRow?.aiEscalationReason ?? ''
    const liveSubmitInsight = displayedSubmissionRow ? getAiSubmissionViewModel(displayedSubmissionRow) : null
    const displayedSubmitValuationCurrency = displayedSubmissionRow?.valuationCurrency ?? ''
    const latestSavedBatch = useMemo(() => {
        const rowsWithBatchId = submissionHistory.filter((row) => row.submissionBatchId.trim().length > 0)

        if (rowsWithBatchId.length === 0) {
            return null
        }

        const latestRow = [...rowsWithBatchId].sort((left, right) => {
            const leftTimestamp = Date.parse(left.processedAt || left.processingStartedAt || left.receivedAt || left.createdAt || left.triggerTimestamp)
            const rightTimestamp = Date.parse(right.processedAt || right.processingStartedAt || right.receivedAt || right.createdAt || right.triggerTimestamp)
            return (Number.isNaN(rightTimestamp) ? 0 : rightTimestamp) - (Number.isNaN(leftTimestamp) ? 0 : leftTimestamp)
        })[0]

        if (!latestRow) {
            return null
        }

        const batchRows = rowsWithBatchId.filter((row) => row.submissionBatchId === latestRow.submissionBatchId)
        const timestamps = batchRows
            .map((row) => Date.parse(row.receivedAt || row.triggerTimestamp || row.createdAt))
            .filter((value) => !Number.isNaN(value))
        const terminalTimestamps = batchRows
            .filter((row) => terminalBatchStatuses.has(row.status.trim().toLowerCase()))
            .map((row) => Date.parse(row.processedAt || row.updatedAt || row.receivedAt))
            .filter((value) => !Number.isNaN(value))

        return {
            id: latestRow.submissionBatchId,
            expectedDocumentCount: Math.max(batchRows.length, ...batchRows.map((row) => row.expectedBatchDocumentCount || 0)),
            environment: latestRow.environment === 'test' ? 'test' : 'production',
            startedAt: timestamps.length > 0 ? Math.min(...timestamps) : Date.now(),
            endedAt: terminalTimestamps.length === batchRows.length ? Math.max(...terminalTimestamps) : undefined,
        } satisfies SubmissionBatch
    }, [submissionHistory])
    const displayedSubmissionBatch = useMemo(() => {
        if (!activeSubmissionBatch) return latestSavedBatch
        if (!latestSavedBatch || latestSavedBatch.id !== activeSubmissionBatch.id) return activeSubmissionBatch

        // The submission state is created immediately, while the saved history is
        // refreshed asynchronously. Prefer the saved terminal timestamp once it
        // arrives so the elapsed timer freezes at the actual completion time.
        return {
            ...activeSubmissionBatch,
            expectedDocumentCount: Math.max(activeSubmissionBatch.expectedDocumentCount, latestSavedBatch.expectedDocumentCount),
            startedAt: Math.min(activeSubmissionBatch.startedAt, latestSavedBatch.startedAt),
            endedAt: latestSavedBatch.endedAt,
        }
    }, [activeSubmissionBatch, latestSavedBatch])
    const activeProjectSynthesis = visibleProjectSyntheses.find((synthesis) => synthesis.projectId === activeProjectId)
    const activeProjectSynthesisSucceeded = Boolean(
        activeProjectSynthesis
        && activeProjectSynthesis.projectStatus.trim().toLowerCase() === 'synthesized'
        && (activeProjectSynthesis.finalJudgmentSummary.trim().length > 0 || activeProjectSynthesis.finalRecommendation.trim().length > 0)
    )

    const handleAskingPriceChange = (value: string) => {
        setAskingPrice(value)
        setAskingPriceByProject((current) => ({ ...current, [activeProjectId]: value }))
        if (dealModelSaveTimeout.current !== null) window.clearTimeout(dealModelSaveTimeout.current)
        dealModelSaveTimeout.current = window.setTimeout(() => {
            void triggerSaveDealModel({ projectId: activeProjectId, askingPrice: value }).result
        }, 500)
    }

    const handleDealModelChange = (field: keyof DealModel, value: string) => {
        const numericValue = value.trim() === '' ? null : Number(value)
        if (numericValue !== null && !Number.isFinite(numericValue)) return
        const currentAskingPrice = askingPrice.trim() === '' ? activeDealModel.askingPrice : Number(askingPrice)
        const updated = { ...activeDealModel, askingPrice: typeof currentAskingPrice === 'number' && Number.isFinite(currentAskingPrice) ? currentAskingPrice : null, [field]: numericValue } as DealModel
        setDealModelDraftByProject((current) => ({ ...current, [activeProjectId]: updated }))
        void triggerSaveDealModel(updated).result
    }
    const handleDealModelDefaults = (values: Partial<DealModel>) => {
        // Do not write a null "default" into another null field. In the live
        // hydration path, a project can have revenue before EBITDA; repeatedly
        // writing those unresolved nulls would cause a React update loop.
        const missingOnly = Object.fromEntries(Object.entries(values).filter(([field, value]) => value !== null && value !== undefined && (activeDealModel[field as keyof DealModel] === null || activeDealModel[field as keyof DealModel] === undefined))) as Partial<DealModel>
        if (Object.keys(missingOnly).length === 0) return
        const updated = { ...activeDealModel, ...missingOnly } as DealModel
        setDealModelDraftByProject((current) => ({ ...current, [activeProjectId]: updated }))
        void triggerSaveDealModel(updated).result
    }

    useEffect(() => {
        if (isExampleMode) return
        const { revenue, ebitda } = parseIllustrativeFacts(activeDealModel.documentedFactsJson)
        if (revenue === null && ebitda === null) return

        // These are deliberately generic scenario inputs, not claims about a
        // target or its industry. They unlock a first-pass model and retain
        // null/user-entered values as the source of truth when available.
        const purchasePrice = activeDealModel.askingPrice ?? (ebitda === null ? null : ebitda * 4)
        const currentMargin = revenue !== null && ebitda !== null && revenue > 0 ? ebitda / revenue : null
        const defaults: Partial<DealModel> = {
            purchasePrice,
            transactionFees: purchasePrice === null ? null : purchasePrice * 0.01,
            workingCapitalRequirement: purchasePrice === null ? null : purchasePrice * 0.02,
            holdPeriodYears: 5,
            taxRate: 0.25,
            maintenanceCapex: ebitda === null ? null : ebitda * 0.03,
            exitMultiple: 4,
            exitCosts: purchasePrice === null ? null : purchasePrice * 0.01,
            equityContributionPercent: 0.3,
            interestRate: 0.1,
            amortizationYears: 10,
            sellerNoteAmount: 0,
            bearRevenueGrowth: 0,
            baseRevenueGrowth: 0.05,
            bullRevenueGrowth: 0.1,
            bearEbitdaMargin: currentMargin === null ? 0.15 : Math.max(0, currentMargin - 0.03),
            baseEbitdaMargin: currentMargin ?? 0.2,
            bullEbitdaMargin: currentMargin === null ? 0.25 : currentMargin + 0.03,
            bearExitMultiple: 3,
            baseExitMultiple: 4,
            bullExitMultiple: 5,
            revenueMultiple: 1,
            ebitdaMultiple: 4,
            assetHaircutPercent: 0.1,
        }
        handleDealModelDefaults(defaults)
    }, [activeDealModel, activeProjectId, isExampleMode])
    const activeBatchRows = useMemo(() => {
        if (!displayedSubmissionBatch) {
            return []
        }

        return submissionHistory.filter((row) => row.submissionBatchId === displayedSubmissionBatch.id)
    }, [displayedSubmissionBatch, submissionHistory])
    const activeBatchFinishedCount = activeBatchRows.filter((row) => {
        const status = row.status.trim().toLowerCase()
        return terminalBatchStatuses.has(status)
    }).length
    const activeBatchProcessingCount = activeBatchRows.filter((row) => hasReachedProcessingStage(row.status)).length
    const activeBatchFailedCount = activeBatchRows.filter((row) => {
        const status = row.status.trim().toLowerCase()
        return status === 'failed' || status === 'error' || status === 'rejected' || status === 'needs_review' || status === 'needs review'
    }).length
    const activeBatchErrors = activeBatchRows
        .filter((row) => row.errorMessage.trim().length > 0)
        .map((row) => ({
            fileName: row.fileName || 'Unnamed document',
            message: row.errorMessage,
            requestID: row.requestID,
            canRetry: ['failed', 'error', 'rejected', 'needs_review', 'needs review'].includes(row.status.trim().toLowerCase()),
        }))
    const activeBatchExpectedCount = displayedSubmissionBatch?.expectedDocumentCount ?? 0
    const activeBatchProgressPercent = activeBatchExpectedCount > 0
        ? Math.min(100, Math.round((activeBatchFinishedCount / activeBatchExpectedCount) * 100))
        : 0
    const activeBatchProcessingPercent = activeBatchExpectedCount > 0
        ? Math.min(100, Math.round((activeBatchProcessingCount / activeBatchExpectedCount) * 100))
        : 0
    const activeBatchImpact = useMemo(() => computeImpactMetrics(activeBatchRows), [activeBatchRows])
    const batchInProgressNotificationId = useRef<string | null>(null)
    const batchReachedProcessingNotificationId = useRef<string | null>(null)
    const synthesisInProgressNotificationProjectId = useRef<string | null>(null)

    const playCompletionSound = () => {
        const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextConstructor) return
        const context = completionAudioContext.current ?? new AudioContextConstructor()
        completionAudioContext.current = context
        const playTone = () => {
            const oscillator = context.createOscillator()
            const gain = context.createGain()
            oscillator.type = 'sine'
            oscillator.frequency.setValueAtTime(880, context.currentTime)
            oscillator.frequency.setValueAtTime(1175, context.currentTime + 0.13)
            gain.gain.setValueAtTime(0.0001, context.currentTime)
            gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32)
            oscillator.connect(gain).connect(context.destination)
            oscillator.start()
            oscillator.stop(context.currentTime + 0.34)
        }
        if (context.state === 'running') playTone()
        else void context.resume().then(playTone).catch(() => undefined)
    }

    const playErrorSound = () => {
        const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!AudioContextConstructor) return
        const context = completionAudioContext.current ?? new AudioContextConstructor()
        completionAudioContext.current = context
        const playTone = () => {
            ;[0, 0.18].forEach((offset) => {
                const oscillator = context.createOscillator()
                const gain = context.createGain()
                oscillator.type = 'square'
                oscillator.frequency.setValueAtTime(300, context.currentTime + offset)
                oscillator.frequency.exponentialRampToValueAtTime(190, context.currentTime + offset + 0.13)
                gain.gain.setValueAtTime(0.0001, context.currentTime + offset)
                gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + offset + 0.015)
                gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + offset + 0.15)
                oscillator.connect(gain).connect(context.destination)
                oscillator.start(context.currentTime + offset)
                oscillator.stop(context.currentTime + offset + 0.16)
            })
        }
        if (context.state === 'running') playTone()
        else void context.resume().then(playTone).catch(() => undefined)
    }

    const [batchElapsedSeconds, setBatchElapsedSeconds] = useState(0)

    useEffect(() => {
        if (!displayedSubmissionBatch) {
            setBatchElapsedSeconds(0)
            return
        }

        const updateElapsedTime = () => {
            const endTime = displayedSubmissionBatch.endedAt ?? Date.now()
            setBatchElapsedSeconds(Math.max(0, Math.floor((endTime - displayedSubmissionBatch.startedAt) / 1000)))
        }

        updateElapsedTime()

        if (activeBatchFinishedCount >= activeBatchExpectedCount) {
            return
        }

        const intervalId = window.setInterval(updateElapsedTime, 1000)
        return () => window.clearInterval(intervalId)
    }, [activeBatchExpectedCount, activeBatchFinishedCount, displayedSubmissionBatch])

    useEffect(() => {
        if (!displayedSubmissionBatch || activeBatchExpectedCount === 0) return
        if (activeBatchProcessingCount < activeBatchExpectedCount || activeBatchFinishedCount >= activeBatchExpectedCount) return
        if (batchReachedProcessingNotificationId.current === displayedSubmissionBatch.id) return
        batchReachedProcessingNotificationId.current = displayedSubmissionBatch.id
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Document batch is processing', { body: `All ${activeBatchExpectedCount} documents have reached processing. Analysis is still running.` })
        }
    }, [activeBatchExpectedCount, activeBatchFinishedCount, activeBatchProcessingCount, displayedSubmissionBatch])

    useEffect(() => {
        if (!displayedSubmissionBatch || activeBatchExpectedCount === 0) return
        if (activeBatchFinishedCount < activeBatchExpectedCount) {
            batchInProgressNotificationId.current = displayedSubmissionBatch.id
            return
        }
        if (batchInProgressNotificationId.current !== displayedSubmissionBatch.id) return
        batchInProgressNotificationId.current = null
        playCompletionSound()
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Document batch complete', { body: `${activeBatchFinishedCount}/${activeBatchExpectedCount} documents have reached a final status.` })
        }
    }, [activeBatchExpectedCount, activeBatchFinishedCount, displayedSubmissionBatch])

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
    }, [activeProjectId, activeProjectSynthesisSucceeded, isCurrentProjectAwaitingSynthesis])

    const enableDesktopNotifications = async () => {
        playCompletionSound()
        if (!('Notification' in window)) { setDesktopNotificationPermission('unsupported'); return }
        const permission = await Notification.requestPermission()
        setDesktopNotificationPermission(permission)
    }

    useEffect(() => {
        if (selectedProjectKey === 'new') {
            return
        }

        const matchingProject = projectSummaries.find((project) => project.projectKey === selectedProjectKey)

        if (!matchingProject) {
            return
        }

        setDealName(matchingProject.projectName)
        setProjectId(matchingProject.projectId || matchingProject.projectKey)
        setProjectStage(matchingProject.stage || 'post-loi')
    }, [projectSummaries, selectedProjectKey])

    useEffect(() => {
        if (selectedProjectKey !== 'new') {
            return
        }

        const usedProjectIds = projectSummaries.map((project) => project.projectId || project.projectKey)
        const normalizedCurrentId = projectId.trim().toLowerCase()

        if (normalizedCurrentId.length === 0 || usedProjectIds.some((id) => id.trim().toLowerCase() === normalizedCurrentId)) {
            setProjectId(createUnusedProjectId(usedProjectIds))
        }
    }, [projectId, projectSummaries, selectedProjectKey])

    const handleCreateProject = () => {
        const usedProjectIds = projectSummaries.map((project) => project.projectId || project.projectKey)

        setSelectedProjectKey('new')
        setBatchSubmissionMessage('')
        setDealName('')
        setProjectId(createUnusedProjectId(usedProjectIds))
        setProjectStage('post-loi')
        setDocumentType('auto-detect')
        setSubmissionNotes('')
        setSelectedFiles([])
    }

    const handlePortfolioProjectSelect = (projectKey: string) => {
        setSelectedProjectKey(projectKey)
        setActiveWorkspaceTab('diligence')
        const project = projectSummaries.find((candidate) => candidate.projectKey === projectKey)

        if (project) {
            setProjectId(project.projectId || project.projectKey)
            setDealName(project.projectName)
            setProjectStage(project.stage || 'post-loi')
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

    const handleAuditProjectOpen = (projectId: string) => {
        const project = projectSummaries.find((candidate) => (candidate.projectId || candidate.projectKey) === projectId)
        setSelectedProjectKey(project?.projectKey || projectId)
        setProjectId(project?.projectId || projectId)
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
        const project = projectSummaries.find((candidate) => (candidate.projectId || candidate.projectKey) === targetProjectId)
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

    const handleRetryFailedDocument = async (requestID: string) => {
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
            setBatchSubmissionMessage('Retry queued. The existing document is being processed again.')
            await triggerSubmissionHistory({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        } catch (error) {
            setBatchSubmissionMessage(error instanceof Error ? error.message : 'Unable to queue retry')
        } finally {
            setRetryingRequestId(null)
        }
    }

    const handleRefreshHistory = async (environment: SubmitEnvironment) => {
        setActiveHistoryEnvironment(environment)
        await triggerSubmissionHistory({ environment }, { skipCache: true }).result
        await triggerProjectSynthesis({ environment }, { skipCache: true }).result
    }

    const handleSubmit = async (environment: SubmitEnvironment) => {
        if (selectedFiles.length === 0) {
            return
        }

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
            const submissionBatchId = crypto.randomUUID()
            const expectedBatchDocumentCount = filesToQueue.length
            const failedFileNames: string[] = []

            setActiveSubmissionBatch({
                id: submissionBatchId,
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
                        projectId: projectId || suggestedProjectId,
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
            setSelectedProjectKey(projectId || suggestedProjectId)
            setSelectedFiles([])
            if (dealName.length === 0) {
                setDealName(suggestedProjectName)
            }
            if (projectId.length === 0) {
                setProjectId(suggestedProjectId)
            }
            await handleRefreshHistory(environment)
        } finally {
            setIsSubmittingFile(false)
        }
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
                    <div className="space-y-2">
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Internal M&amp;A Due Diligence Workspace
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                Project-based diligence cockpit
                            </h1>
                            <Badge variant="secondary" className="rounded-md px-3 py-1 text-xs font-medium">
                                Async intake + polling enabled
                            </Badge>
                            {desktopNotificationPermission !== 'unsupported' ? (
                                <Button type="button" size="sm" variant="outline" disabled={desktopNotificationPermission === 'denied'} onClick={() => { void enableDesktopNotifications() }}>
                                    {desktopNotificationPermission === 'granted' ? 'Completion alerts on' : desktopNotificationPermission === 'denied' ? 'Desktop alerts blocked' : 'Enable completion alerts'}
                                </Button>
                            ) : null}
                        </div>
                        <p className="max-w-4xl text-sm text-muted-foreground">
                            Shift from one-off document extraction to project-level diligence. Group uploads into a shared project,
                            poll n8n for document progress, and prepare the agent to reconcile multiple files into one acquisition judgment.
                        </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border border-border bg-background px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projects</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{projectSummaries.length}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Grouped from polled submissions</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active projects</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{activeProjectCount}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Still ingesting or processing</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Needs review</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{reviewProjectCount}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Human follow-up required</p>
                        </div>
                        <div className="rounded-lg border border-border bg-background px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ready for synthesis</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{readyProjectCount}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Project dossier has enough coverage</p>
                        </div>
                    </div>
                </div>

                {desktopNotificationPermission === 'default' ? (
                    <div className="mx-auto max-w-[1440px] px-4 pb-5 sm:px-6 lg:px-8">
                        <div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-foreground">Enable completion notifications</p>
                                <p className="mt-1 text-sm text-muted-foreground">Get a desktop alert and chime when a document batch or project synthesis finishes, even while you are elsewhere in the workspace.</p>
                            </div>
                            <Button type="button" size="sm" className="shrink-0" onClick={() => { void enableDesktopNotifications() }}>Enable notifications</Button>
                        </div>
                    </div>
                ) : null}

                <div className="mx-auto max-w-[1440px] px-4 pb-5 sm:px-6 lg:px-8">
                    <div className="grid gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-background/60 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Documents analyzed</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">{impact.completedDocuments}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Extracted and reconciled by the agent</p>
                        </div>
                        <div className="rounded-lg bg-background/60 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Analyst time saved</p>
                            <p className="mt-1 text-2xl font-semibold text-success">
                                {impact.completedDocuments > 0 ? `~${formatHours(impact.timeSavedHours)}` : '—'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {impact.completedDocuments > 0
                                    ? `${formatHours(impact.analystHours)} manual review vs ${impact.agentMinutes >= 1 ? `${Math.round(impact.agentMinutes)}m` : '<1m'} agent${impact.fasterMultiple && impact.fasterMultiple >= 2 ? ` · ${Math.round(impact.fasterMultiple)}× faster` : ''}`
                                    : 'Based on ~40 min manual review per document'}
                            </p>
                        </div>
                        <div className="rounded-lg bg-background/60 px-4 py-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg AI confidence</p>
                            <p className="mt-1 text-2xl font-semibold text-foreground">
                                {impact.avgConfidence !== null ? `${impact.avgConfidence}%` : '—'}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">Mean extraction confidence across completed docs</p>
                        </div>
                    </div>
                </div>
                {!isExampleMode ? (
                    <div className="mx-auto max-w-[1440px] px-4 pb-5 sm:px-6 lg:px-8">
                        <div className="rounded-xl border-2 border-primary/35 bg-primary/10 px-5 py-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
                            <div className="max-w-3xl">
                                <p className="text-lg font-semibold text-foreground">New to the dashboard?</p>
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                    Explore a completed diligence project with document analysis, batch progress, and final synthesis before submitting live data.
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
            </header>

            <main className="mx-auto max-w-[1440px] space-y-8 px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
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
                    onDealNameChange={setDealName}
                    onAskingPriceChange={handleAskingPriceChange}
                    onProjectIdChange={setProjectId}
                    onProjectStageChange={setProjectStage}
                    onDocumentTypeChange={setDocumentType}
                    onSubmissionNotesChange={setSubmissionNotes}
                    onSelectedProjectKeyChange={setSelectedProjectKey}
                    onCreateProject={handleCreateProject}
                    onFileSelect={setSelectedFiles}
                    onSubmit={(environment) => {
                        void handleSubmit(environment)
                    }}
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
                                {hasDuplicateSubmissionMessage ? <p className="mt-1 text-xs text-muted-foreground">No duplicate was sent to n8n. Choose a different file or switch to another project to upload it.</p> : null}
                            </div>
                        </div>
                    </div>
                ) : null}

                <DealWorkspaceNav activeTab={activeWorkspaceTab} onTabChange={setActiveWorkspaceTab} />

                {activeWorkspaceTab === 'overview' ? <section id="deal-overview" className="space-y-6 scroll-mt-6">
                    <DealOverviewCard
                        syntheses={visibleProjectSyntheses}
                        projects={projectSummaries}
                        currentProjectId={activeProjectId}
                        askingPrice={askingPrice}
                        onAskingPriceChange={handleAskingPriceChange}
                        impact={activeProjectImpact}
                        model={activeDealModel}
                        documents={submissionHistory.filter((row) => getProjectKey(row) === activeProjectId)}
                        onOpenEvidence={setActiveEvidence}
                        exampleMode={isExampleMode}
                    />
                    <DealModelReadinessCard
                        model={hydratedDealModel}
                        documents={activeProjectDocuments}
                        onOpenEvidence={setActiveEvidence}
                    />
                    <DataQualityChecksCard model={hydratedDealModel} />
                    <ProjectChecklistCard
                        projectId={activeProjectId}
                        state={projectChecklistById[activeProjectId] ?? {}}
                        onChange={(next) => setProjectChecklistById((current) => ({ ...current, [activeProjectId]: next }))}
                        missingDocuments={activeProjectSynthesis?.missingDocuments ?? []}
                        employeeConfirmed={Boolean(projectSummaries.find((project) => (project.projectId || project.projectKey) === activeProjectId)?.employeeCount) || isExampleMode}
                        hasAskingPrice={askingPrice.trim().length > 0 || activeDealModel.askingPrice !== null}
                    />
                </section> : null}

                {activeWorkspaceTab === 'valuation' ? <DealValuationCard synthesis={activeProjectSynthesis} askingPrice={askingPrice} model={hydratedDealModel} onModelChange={handleDealModelChange} documents={submissionHistory} onOpenEvidence={setActiveEvidence} /> : null}
                {activeWorkspaceTab === 'returns' ? <section className="space-y-6"><ReturnsDecisionSummary model={returnsDisplayModel} />{isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}<AllCashReturnsCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />{isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}<FinancedReturnsCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} />{isReturnsIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}<FinancedScenarioComparisonCard model={returnsDisplayModel} /><DealModelPendingCard area="returns" model={activeDealModel} onChange={handleDealModelChange} onApplyDefaults={handleDealModelDefaults} /></section> : null}
                {activeWorkspaceTab === 'growth' ? <section className="space-y-6">{isGrowthIllustrativePreview ? <IllustrativeModelPreviewNotice /> : null}<GrowthDecisionSummary model={returnsDisplayModel} /><ScenarioComparisonCard model={returnsDisplayModel} documents={submissionHistory} onOpenEvidence={setActiveEvidence} /><DealModelPendingCard area="growth" model={activeDealModel} onChange={handleDealModelChange} onApplyDefaults={handleDealModelDefaults} /></section> : null}
                {activeWorkspaceTab === 'structure' ? <section className="space-y-6"><DealStructureVisualCard model={hydratedDealModel} onOpenEvidence={setActiveEvidence} /><DealModelPendingCard area="structure" model={activeDealModel} onChange={handleDealModelChange} onApplyDefaults={handleDealModelDefaults} /></section> : null}

                {activeWorkspaceTab === 'diligence' ? <>

                {!isExampleMode && projectSummaries.length > 0 ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Review the current project-level result</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Project Synthesis consolidates the selected project&apos;s documents, risks, and negotiation levers. The Project Portfolio provides its document-level context.
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="lg"
                            className="mt-3 w-full shrink-0 sm:mt-0 sm:w-auto"
                            onClick={() => document.getElementById('project-synthesis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                        >
                            View project synthesis
                        </Button>
                    </div>
                ) : null}

                {isExampleMode ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-foreground">
                        <p className="font-medium">Example workspace</p>
                        <p className="mt-1 text-muted-foreground">
                            This sample project illustrates the document analysis, portfolio, and final synthesis views. It is not live n8n data.
                        </p>
                    </div>
                ) : null}

                {displayedSubmissionBatch ? (
                    <Card className="overflow-hidden">
                        <CardContent className="space-y-4 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">{activeSubmissionBatch ? 'Batch processing progress' : 'Most recent batch processing progress'}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Finished {activeBatchFinishedCount}/{activeBatchExpectedCount} documents
                                        {activeBatchFailedCount > 0 ? ` · ${activeBatchFailedCount} failed` : ''}
                                    </p>
                                </div>
                                <Badge variant={activeBatchFinishedCount >= activeBatchExpectedCount ? (activeBatchFailedCount > 0 ? 'destructive' : 'success') : 'warning'}>
                                    {activeBatchFinishedCount >= activeBatchExpectedCount ? 'Batch terminal' : 'Processing'}
                                </Badge>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <p className="font-medium text-foreground">Reached processing</p>
                                    <p className="text-muted-foreground">{activeBatchProcessingCount}/{activeBatchExpectedCount} documents</p>
                                </div>
                                <Progress value={activeBatchProcessingPercent} className="h-2.5" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <p className="font-medium text-foreground">Finished</p>
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        <p className="text-muted-foreground">{activeBatchFinishedCount}/{activeBatchExpectedCount} documents</p>
                                        <Badge variant={activeBatchFinishedCount >= activeBatchExpectedCount ? 'success' : 'secondary'} className="gap-1.5 px-2.5 py-1 font-mono text-xs">
                                            <Clock3 className="h-3.5 w-3.5" />
                                            {formatElapsedDuration(batchElapsedSeconds)} elapsed
                                        </Badge>
                                    </div>
                                </div>
                                <Progress value={activeBatchProgressPercent} className="h-2.5 [&>span]:bg-success" />
                            </div>
                            <div className="rounded-md border border-success/25 bg-success/5 px-3 py-2 text-sm">
                                <p className="font-medium text-foreground">Batch analyst time saved</p>
                                <p className="mt-1 text-muted-foreground">
                                    {activeBatchImpact.completedDocuments > 0
                                        ? `~${formatHours(activeBatchImpact.timeSavedHours)} saved across ${activeBatchImpact.completedDocuments} completed document${activeBatchImpact.completedDocuments === 1 ? '' : 's'} (40m manual-review baseline per document).`
                                        : 'Time saved will appear as documents complete (40m manual-review baseline per document).'}
                                </p>
                            </div>
                            {batchElapsedSeconds >= 300 && activeBatchFinishedCount < activeBatchExpectedCount ? (
                                <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                                    <div>
                                        <p className="font-medium">This batch is taking longer than expected.</p>
                                        <p className="mt-1 text-muted-foreground">Please reload the page to re-sync the latest n8n status. Reloading will not submit the documents again.</p>
                                    </div>
                                </div>
                            ) : null}
                            {activeBatchErrors.length > 0 ? (
                                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground">
                                    <p className="font-medium">Document processing issue{activeBatchErrors.length === 1 ? '' : 's'}</p>
                                    <ul className="mt-1 space-y-1 text-muted-foreground">
                                        {activeBatchErrors.map((item) => (
                                            <li key={`${item.fileName}-${item.message}`} className="flex flex-wrap items-center justify-between gap-2">
                                                <span>{item.fileName}: {item.message}</span>
                                                {item.canRetry && item.requestID ? (
                                                    <Button type="button" size="sm" variant="outline" disabled={retryingRequestId === item.requestID} onClick={() => handleRetryFailedDocument(item.requestID)}>
                                                        {retryingRequestId === item.requestID ? 'Retrying…' : 'Retry document'}
                                                    </Button>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                                {activeBatchFinishedCount >= activeBatchExpectedCount
                                    ? activeBatchFailedCount > 0
                                        ? 'All accepted documents are terminal. Review failed documents before relying on synthesis.'
                                        : 'All accepted documents are complete. The project synthesis can now run.'
                                    : `Waiting for ${activeBatchExpectedCount - activeBatchFinishedCount} more document${activeBatchExpectedCount - activeBatchFinishedCount === 1 ? '' : 's'} to reach a terminal status.`}
                            </p>
                            {activeBatchFinishedCount >= activeBatchExpectedCount && activeBatchFailedCount === 0 ? (
                                <div className="rounded-md border border-success/30 bg-success/10 p-3 text-sm text-foreground">
                                    <p>All documents are finished. Review the Project Portfolio and Project Synthesis for the complete project-level picture.</p>
                                    <Button
                                        type="button"
                                        size="lg"
                                        className="mt-3 w-full"
                                        onClick={() => document.getElementById('project-synthesis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                    >
                                        View project synthesis
                                    </Button>
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : null}

                {isExampleMode && !submitResponse ? (
                    <Card className="overflow-hidden border-primary/30">
                        <CardHeader className="border-b border-primary/20 bg-primary/5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <CardDescription>Example latest project document submission</CardDescription>
                                    <CardTitle className="text-lg">{exampleSubmissionHistoryRows[0].fileName}</CardTitle>
                                </div>
                                <Badge variant="success">Completed</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 p-4">
                            <p className="text-sm text-muted-foreground">
                                This is the document-level result that appears after a queued upload completes, before the project-wide synthesis is reviewed.
                            </p>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-border bg-background p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{exampleSubmissionHistoryRows[0].riskLevel}</p>
                                </div>
                                <div className="rounded-lg border border-border bg-background p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confidence</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{exampleSubmissionHistoryRows[0].aiConfidence}%</p>
                                </div>
                                <div className="rounded-lg border border-border bg-background p-3">
                                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground">{exampleSubmissionHistoryRows[0].projectId}</p>
                                </div>
                            </div>
                            <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-6 text-foreground">
                                {exampleSubmissionHistoryRows[0].aiSummary}
                            </p>
                        </CardContent>
                    </Card>
                ) : null}

                {!isExampleMode && (submitResponse || displayedSubmissionRow) ? (
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b border-border bg-card/80">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl">Latest project document submission</CardTitle>
                                    <CardDescription>
                                        The most recent document was accepted quickly, then the UI switched to polling for the live n8n row and extracted outputs.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    {displayedSubmissionRow && ['failed', 'error', 'rejected', 'needs_review', 'needs review'].includes(displayedSubmitStatus.trim().toLowerCase()) && displayedSubmissionRow.requestID ? (
                                        <Button type="button" variant="outline" disabled={retryingRequestId === displayedSubmissionRow.requestID} onClick={() => handleRetryFailedDocument(displayedSubmissionRow.requestID)}>
                                            {retryingRequestId === displayedSubmissionRow.requestID ? 'Retrying document…' : 'Retry document'}
                                        </Button>
                                    ) : null}
                                    <Badge variant={getSubmissionStatusVariant(displayedSubmitStatus)}>
                                        {formatSubmissionStatus(displayedSubmitStatus)}
                                    </Badge>
                                    <Badge variant={submitEnvironment === 'test' ? 'warning' : 'outline'}>
                                        {submitEnvironment}
                                    </Badge>
                                    <Badge variant={displayedSubmissionRow ? 'success' : 'secondary'}>
                                        {liveSubmittedRow ? 'Live project row found' : 'Most recent saved submission'}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 p-4">
                            <Button type="button" variant="default" onClick={() => handleOpenProjectSynthesis(displayedSubmissionRow?.projectId || projectId)} disabled={!(displayedSubmissionRow?.projectId || projectId)}>
                                View this project&apos;s synthesis
                            </Button>
                            {liveSubmitInsight && (liveSubmitInsight.investmentBuyReasoning || liveSubmitInsight.investmentIsFavorable !== null) ? <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold uppercase tracking-wide text-primary">Investment thesis — start here</p>{liveSubmitInsight.investmentIsFavorable !== null ? <Badge variant={liveSubmitInsight.investmentIsFavorable ? 'success' : 'destructive'}>{liveSubmitInsight.investmentIsFavorable ? 'Favorable indicator' : 'Caution indicator'}</Badge> : null}</div><p className="mt-3 text-sm leading-6 text-foreground">{liveSubmitInsight.investmentBuyReasoning || 'No investment thesis returned yet.'}</p></div> : null}
                            <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md">
                                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold uppercase tracking-wide text-primary">Start here — latest document at a glance</p><Badge variant={getSubmissionStatusVariant(displayedSubmitStatus)}>{formatSubmissionStatus(displayedSubmitStatus)}</Badge></div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Risk signal</p><p className="mt-1 text-lg font-bold">{displayedSubmitTrafficLight || displayedSubmitRiskLevel || 'Still processing'}</p></div><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">AI confidence</p><p className="mt-1 text-lg font-bold">{liveSubmitInsight?.confidencePercent != null ? `${liveSubmitInsight.confidencePercent}%` : displayedSubmitConfidence || 'Pending'}</p></div><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Detected document type</p><p className="mt-1 text-lg font-bold">{displayedSubmissionRow?.detectedDocumentType || displayedSubmissionRow?.documentType || documentType || 'Pending'}</p></div><div className="rounded-lg border border-primary/25 bg-background/90 p-3"><p className="text-xs text-muted-foreground">Action needed</p><p className="mt-1 text-lg font-bold">{liveSubmitInsight?.escalationReasons.length ? 'Review flags' : displayedSubmitStatus.toLowerCase() === 'completed' ? 'Ready to use' : 'Wait for analysis'}</p></div></div>
                                <p className="mt-4 text-sm leading-6 text-foreground">{displayedSubmitAiSummary || (liveSubmitInsight?.escalationReasons.length ? 'The document has items that need review before relying on its findings.' : 'This panel will surface the document’s key result as soon as n8n returns it.')}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {submitResponse
                                    ? `${submitResponse.method} to ${submitResponse.target} at ${submitResponse.submittedAt}`
                                    : 'Restored from the most recent n8n submission history row.'}
                            </p>

                            <details className="group rounded-lg border border-border bg-muted/20">
                                <summary className="flex cursor-pointer items-center justify-between px-3 py-2.5 text-sm font-medium text-foreground">
                                    <span>Submission metadata — IDs, timestamps, file</span>
                                    <span className="text-xs text-primary group-open:hidden">Show</span>
                                    <span className="hidden text-xs text-primary group-open:inline">Hide</span>
                                </summary>
                                <div className="grid gap-2 p-3 pt-0 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Request ID</p>
                                    <p className="mt-1 break-all font-mono text-foreground">{webhookResponse?.requestID ?? displayedSubmissionRow?.requestID ?? 'Pending'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project ID</p>
                                    <p className="mt-1 break-all font-mono text-foreground">{displayedSubmissionRow?.projectId || projectId || 'Not set'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project Stage</p>
                                    <p className="mt-1 text-foreground">{displayedSubmissionRow?.projectStage || projectStage || 'Not set'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Document Type</p>
                                    <p className="mt-1 text-foreground">{displayedSubmissionRow?.documentType || documentType || 'Not set'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">n8n Row ID</p>
                                    <p className="mt-1 font-mono text-foreground">{displayedSubmitRowId}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Received At</p>
                                    <p className="mt-1 text-foreground">{formatEasternTime(displayedSubmitReceivedAt)}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Deal / Project</p>
                                    <p className="mt-1 text-foreground">{submitResponse?.payload?.dealName || displayedSubmissionRow?.dealName || 'Pending'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">File Name</p>
                                    <p className="mt-1 break-all text-foreground">{submitResponse?.payload?.fileName ?? displayedSubmissionRow?.fileName ?? 'Pending'}</p>
                                </div>
                                </div>
                            </details>

                            {displayedSubmissionRow ? (
                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                    <div className="rounded-md border border-border bg-card px-3 py-2 xl:col-span-2">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Live progress</p>
                                            {displayedSubmitTrafficLight ? (
                                                <Badge variant={getSubmissionInsightTone(displayedSubmitTrafficLight)}>
                                                    {displayedSubmitTrafficLight}
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <p className="mt-1 text-foreground">Processing started: {displayedSubmissionRow.processingStartedAt || 'Pending'}</p>
                                        <p className="mt-1 text-foreground">Processed at: {displayedSubmissionRow.processedAt || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Risk Level</p>
                                        <p className="mt-1 text-foreground">{displayedSubmitRiskLevel || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Category</p>
                                        <p className="mt-1 text-foreground">{displayedSubmitCategory || 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Confidence</p>
                                        <p className="mt-1 text-foreground">
                                            {liveSubmitInsight?.confidencePercent != null
                                                ? `${liveSubmitInsight.confidencePercent}%`
                                                : displayedSubmitConfidence || 'Pending'}
                                        </p>
                                        {liveSubmitInsight?.confidencePercent != null ? (
                                            <Progress value={liveSubmitInsight.confidencePercent} className="mt-2 h-2" />
                                        ) : null}
                                    </div>
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Variance</p>
                                        <p className="mt-1 text-foreground">{displayedSubmitVariance ? `${displayedSubmitVariance}%` : 'Pending'}</p>
                                    </div>
                                    <div className="rounded-md border border-border bg-card px-3 py-2">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">EBITDA Extracted</p>
                                        <p className="mt-1 text-foreground">{displayedSubmissionRow.ebitdaExtracted || 'Pending'}</p>
                                    </div>
                                    {(liveSubmitInsight?.escalationReasons.length || displayedSubmitAiSummary) ? (
                                        <div className="grid gap-3 xl:col-span-4 xl:grid-cols-2">
                                        {liveSubmitInsight?.escalationReasons.length ? (
                                        <div>
                                            <ExpandableInsightGroup
                                                title="Escalation reasons"
                                                items={liveSubmitInsight.escalationReasons.flatMap((reason) => splitReadableText(reason))}
                                                badgeVariant="warning"
                                                className="border-warning/30 bg-warning/10"
                                                itemClassName="border-warning/30"
                                                emptyLabel="No escalation reasons returned."
                                                defaultOpen
                                            />
                                        </div>
                                        ) : null}
                                        {displayedSubmitAiSummary ? (
                                        <div>
                                            <ExpandableInsightGroup
                                                title="AI Summary"
                                                items={splitReadableText(displayedSubmitAiSummary)}
                                                defaultOpen
                                                className="border-border bg-card"
                                                itemClassName="border-border"
                                                emptyLabel="No AI summary returned."
                                            />
                                        </div>
                                        ) : null}
                                        </div>
                                    ) : null}
                                    {liveSubmitInsight ? (
                                        <div className="grid gap-3 xl:col-span-4 xl:grid-cols-2">
                                            {[
                                                {
                                                    title: 'Red flags',
                                                    flags: liveSubmitInsight.redFlags,
                                                    badge: 'destructive' as const,
                                                    sectionClass: 'border-destructive/30 bg-destructive/5',
                                                    itemClass: 'border-destructive/20',
                                                },
                                                {
                                                    title: 'Yellow flags',
                                                    flags: liveSubmitInsight.yellowFlags,
                                                    badge: 'warning' as const,
                                                    sectionClass: 'border-warning/30 bg-warning/5',
                                                    itemClass: 'border-warning/20',
                                                },
                                                {
                                                    title: 'Green flags',
                                                    flags: liveSubmitInsight.greenFlags,
                                                    badge: 'success' as const,
                                                    sectionClass: 'border-success/30 bg-success/5',
                                                    itemClass: 'border-success/20',
                                                },
                                            ].map((group) => (
                                                <ExpandableInsightGroup
                                                    key={group.title}
                                                    title={group.title}
                                                    items={group.flags}
                                                    badgeVariant={group.badge}
                                                    className={group.sectionClass}
                                                    itemClassName={group.itemClass}
                                                    emptyLabel="None"
                                                    defaultOpen
                                                />
                                            ))}
                                        </div>
                                    ) : null}
                                    {(liveSubmitInsight?.formattedValuationLowerBound || liveSubmitInsight?.formattedValuationBaseEstimate || liveSubmitInsight?.formattedValuationUpperBound) ? (
                                        <div className="grid gap-2 xl:col-span-4 md:grid-cols-3">
                                            <div className="rounded-md border border-border bg-card px-3 py-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lower Bound</p>
                                                    {displayedSubmitValuationCurrency ? <Badge variant="outline">{displayedSubmitValuationCurrency}</Badge> : null}
                                                </div>
                                                <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.formattedValuationLowerBound || 'Pending'}</p>
                                            </div>
                                            <div className="rounded-md border border-border bg-card px-3 py-2">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base Estimate</p>
                                                <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.formattedValuationBaseEstimate || 'Pending'}</p>
                                            </div>
                                            <div className="rounded-md border border-border bg-card px-3 py-2">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upper Bound</p>
                                                <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.formattedValuationUpperBound || 'Pending'}</p>
                                            </div>
                                        </div>
                                    ) : null}
                                    {liveSubmitInsight && (liveSubmitInsight.investmentBuyReasoning || liveSubmitInsight.investmentIsFavorable !== null) ? (
                                        <div className="rounded-md border border-border bg-card px-3 py-2 xl:col-span-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Investment Thesis</p>
                                                {liveSubmitInsight.investmentIsFavorable !== null ? (
                                                    <Badge variant={liveSubmitInsight.investmentIsFavorable ? 'success' : 'destructive'}>
                                                        {liveSubmitInsight.investmentIsFavorable ? 'Favorable indicator' : 'Not favorable'}
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                                {liveSubmitInsight.investmentBuyReasoning || 'No buy reasoning returned yet.'}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : null}

                </> : null}

                {activeWorkspaceTab === 'documents' ? <>
                <section id="project-portfolio" className="scroll-mt-6 space-y-4">
                    <SectionHeader
                        step={1}
                        title="Document portfolio"
                        description="Every uploaded document grouped by project, with coverage and duplicates."
                    />
                    <ProjectPortfolioCard
                        rows={submissionHistory}
                        syntheses={visibleProjectSyntheses}
                        activeProjectKey={selectedProjectKey}
                        onProjectSelect={handlePortfolioProjectSelect}
                        onExcludeDocument={handleExcludeDocument}
                        onIncludeDocument={handleIncludeDocument}
                        onRetryDocument={handleRetryFailedDocument}
                        retryingRequestId={retryingRequestId}
                    />
                </section>

                </> : null}

                {activeWorkspaceTab === 'synthesis' ? <>
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
                        impact={activeProjectImpact}
                        documents={submissionHistory.filter((row) => getProjectKey(row) === activeProjectId)}
                        onOpenEvidence={setActiveEvidence}
                        onRefresh={() => {
                            void triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
                        }}
                    />
                    <ManagementQuestionTracker
                        projectId={activeProjectId}
                        suggestedQuestions={activeProjectSynthesis?.openQuestions ?? []}
                    />
                </section>

                </> : null}

                {activeWorkspaceTab === 'history' ? <>
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
                    onRefreshProduction={() => {
                        void handleRefreshHistory('production')
                    }}
                    onRefreshTest={() => {
                        void handleRefreshHistory('test')
                    }}
                    isPolling={hasActiveSubmissions}
                    onRetryFailedDocument={handleRetryFailedDocument}
                    retryingRequestId={retryingRequestId}
                    onOpenProject={handleAuditProjectOpen}
                />
                </section>

                </> : null}

                {activeWorkspaceTab === 'errors' ? <section id="workflow-errors" className="scroll-mt-6">
                    <WorkflowErrorLogCard
                        rows={Array.isArray(workflowErrorData) ? workflowErrorData : []}
                        loading={workflowErrorsLoading}
                        error={workflowErrorsError}
                        onRefresh={() => { void triggerWorkflowErrors({ environment: activeHistoryEnvironment }) }}
                    />
                </section> : null}

                {SHOW_LEGACY_DILIGENCE_BACKUP ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b border-border bg-card/80">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <CardTitle className="text-xl">Legacy sample extraction findings</CardTitle>
                                        <Badge variant="outline">Static placeholder</Badge>
                                    </div>
                                    <CardDescription>
                                        This panel is legacy demo data from the retired Retool query, not live n8n output. Use the project portfolio,
                                        synthesis, and submission history panels above for current workflow results.
                                    </CardDescription>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total findings</p>
                                        <p className="mt-1 text-2xl font-semibold text-foreground">{diligenceFindings.length}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">Query: getDiligenceData</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">High priority</p>
                                        <p className="mt-1 text-2xl font-semibold text-foreground">{highPriorityCount}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-background px-4 py-3">
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Validated</p>
                                        <p className="mt-1 text-2xl font-semibold text-foreground">{validatedCount}</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            {error ? (
                                <div className="flex items-center gap-2 border-b border-border bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    Unable to refresh live diligence data. Showing fallback records.
                                </div>
                            ) : null}
                            <Table className="min-w-[720px]">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[180px]">Finding Type</TableHead>
                                        <TableHead className="w-[140px]">Severity</TableHead>
                                        <TableHead>Summary</TableHead>
                                        <TableHead className="w-[180px]">Workstream</TableHead>
                                        <TableHead className="w-[140px]">Confidence</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {diligenceFindings.map((finding) => {
                                        const isSelected = selectedFinding.id === finding.id
                                        const isValidated = validationById[finding.id]
                                        const noteValue = notesById[finding.id] ?? finding.analystNotes

                                        return (
                                            <TableRow
                                                key={finding.id}
                                                role="button"
                                                tabIndex={0}
                                                aria-selected={isSelected}
                                                className={cn(
                                                    'cursor-pointer border-b border-border/80 align-top',
                                                    isSelected && 'bg-accent/60 hover:bg-accent/60'
                                                )}
                                                onClick={() => { setSelectedFindingId(finding.id); openFindingEvidence(finding) }}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        setSelectedFindingId(finding.id)
                                                        openFindingEvidence(finding)
                                                    }
                                                }}
                                            >
                                                <TableCell>
                                                    <div className="flex flex-col gap-2">
                                                        <Badge variant={getFindingVariant(finding.findingType)}>{finding.findingType}</Badge>
                                                        {isValidated ? <Badge variant="success">Validated</Badge> : <Badge variant="outline">Needs review</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getSeverityVariant(finding.severity)}>{finding.severity}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-2">
                                                        <p className="font-medium leading-6 text-foreground">{finding.summary}</p>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                            <span>Owner: {finding.owner}</span>
                                                            <span>•</span>
                                                            <span>{finding.sourceCitation}</span>
                                                        </div>
                                                        <p className="line-clamp-2 text-sm text-muted-foreground">{noteValue}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-1 text-sm text-foreground">
                                                        <p>{finding.workstream}</p>
                                                        <p className="text-xs text-muted-foreground">Source: {finding.owner}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-muted-foreground">Score</span>
                                                            <span className="font-medium text-foreground">{finding.confidenceScore}%</span>
                                                        </div>
                                                        <Progress value={finding.confidenceScore} className="h-2.5" />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <div className="space-y-6">
                        <Card className="overflow-hidden">
                            <CardHeader className="border-b border-border bg-card/80">
                                <div className="space-y-1">
                                    <CardDescription>Selected finding detail</CardDescription>
                                    <CardTitle className="text-lg leading-7">{selectedFinding.summary}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-5 p-5">
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant={getFindingVariant(selectedFinding.findingType)}>{selectedFinding.findingType}</Badge>
                                    <Badge variant={getSeverityVariant(selectedFinding.severity)}>{selectedFinding.severity}</Badge>
                                    <Badge variant={validationById[selectedFinding.id] ? 'success' : 'outline'}>
                                        {validationById[selectedFinding.id] ? 'Validated' : 'Pending analyst review'}
                                    </Badge>
                                    <Button type="button" size="sm" variant="outline" onClick={() => openFindingEvidence(selectedFinding)}>View evidence</Button>
                                </div>

                                <div className="space-y-3 rounded-lg border border-border bg-background p-4">
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source citation</p>
                                        <p className="mt-1 text-sm text-foreground">{selectedFinding.sourceCitation}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source excerpt</p>
                                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedFinding.sourceExcerpt}</p>
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background p-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-foreground">Confidence Score</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedFinding.confidenceScore}%</p>
                                    </div>
                                    <Progress value={selectedFinding.confidenceScore} className="mt-3 h-2.5" />
                                    <p className="mt-3 text-sm text-muted-foreground">
                                        Use this as a document-level extraction confidence score. In the project-based roadmap, these will roll into a project-level confidence assessment.
                                    </p>
                                </div>

                                <div className="rounded-lg border border-border bg-background p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-foreground">Analyst validation</p>
                                            <p className="text-sm text-muted-foreground">Mark whether this finding should feed project-level synthesis.</p>
                                        </div>
                                        <Switch
                                            checked={validationById[selectedFinding.id] ?? false}
                                            onCheckedChange={(checked) => {
                                                setValidationById((current) => ({
                                                    ...current,
                                                    [selectedFinding.id]: checked,
                                                }))
                                            }}
                                            aria-label={`Toggle validation for ${selectedFinding.summary}`}
                                        />
                                    </div>
                                </div>

                                <div className="rounded-lg border border-border bg-background p-4">
                                    <p className="text-sm font-medium text-foreground">Analyst notes</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Capture how this document-level point should affect the final acquisition narrative or negotiation strategy.
                                    </p>
                                    <Textarea
                                        value={notesById[selectedFinding.id] ?? selectedFinding.analystNotes}
                                        onChange={(event) => {
                                            const nextValue = event.target.value
                                            setNotesById((current) => ({
                                                ...current,
                                                [selectedFinding.id]: nextValue,
                                            }))
                                        }}
                                        className="mt-3 min-h-[120px]"
                                        placeholder="Document-level takeaway, cross-check needed, or potential negotiation lever."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="overflow-hidden">
                            <CardHeader className="border-b border-border bg-card/80">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-secondary p-2 text-secondary-foreground">
                                        <FileSearch className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">What still needs to happen</CardTitle>
                                        <CardDescription>
                                            UI is now aligned to a project-based diligence model, but the backend workflow still needs one more layer of project synthesis.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 p-5 text-sm text-foreground">
                                <div className="rounded-lg border border-border bg-background p-4">
                                    <p className="font-medium">Today</p>
                                    <p className="mt-2 text-muted-foreground">
                                        Each upload is processed independently, then polling surfaces the latest n8n row, AI findings, valuation, and investment-thesis metadata.
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-background p-4">
                                    <p className="font-medium">Next backend milestone</p>
                                    <p className="mt-2 text-muted-foreground">
                                        Build a project-level workflow that waits until enough project documents are present, reconciles overlaps and contradictions, and writes one final project judgment back to n8n.
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-background p-4">
                                    <p className="font-medium">Why this matters post-LOI</p>
                                    <p className="mt-2 text-muted-foreground">
                                        Negotiation leverage usually comes from gaps between documents, not from any single file. This UI now makes that project-centric operating model visible to analysts.
                                    </p>
                                </div>
                                <Button variant="outline" className="w-full justify-between">
                                    <span>Project-based diligence roadmap is now reflected in the workspace</span>
                                    <ArrowUpRight className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                ) : null}
            </main>
            <EvidenceDrawer evidence={activeEvidence} onClose={() => setActiveEvidence(null)} />
        </div>
    )
}
