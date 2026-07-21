import { useEffect, useMemo, useState } from 'react'
import {
    AlertCircle,
    ArrowUpRight,
    Clock3,
    FileSearch,
} from 'lucide-react'

import ExpandableInsightGroup from '../components/ExpandableInsightGroup'
import ProjectIntakeCard from '../components/ProjectIntakeCard'
import ProjectPortfolioCard from '../components/ProjectPortfolioCard'
import ProjectSynthesisCard from '../components/ProjectSynthesisCard'
import SubmissionHistoryCard from '../components/SubmissionHistoryCard'
import {
    exampleProjectSyntheses,
    exampleSubmissionHistoryRows,
    useGetDiligenceData,
    useGetProjectSynthesis,
    useGetSubmissionHistory,
    useSubmitDealPacket,
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
import { createProjectSummaries } from '../utils/projectWorkspace'
import { fallbackDiligenceFindings, type FindingType, type Severity } from '../utils/diligence'
import { formatEasternTime } from '../utils/dateTime'
import { readFileAsBase64 } from '../utils/fileEncoding'

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

const terminalBatchStatuses = new Set(['completed', 'failed', 'error', 'rejected'])
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

function hasReachedProcessingStage(status: string) {
    return processingReachedStatuses.has(status.trim().toLowerCase())
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
    const [projectId, setProjectId] = useState(() => createUnusedProjectId())
    const [projectStage, setProjectStage] = useState('post-loi')
    const [documentType, setDocumentType] = useState('auto-detect')
    const [selectedProjectKey, setSelectedProjectKey] = useState('new')
    const [submissionNotes, setSubmissionNotes] = useState('')
    const [isSubmittingFile, setIsSubmittingFile] = useState(false)
    const [batchSubmissionMessage, setBatchSubmissionMessage] = useState('')
    const [activeSubmissionBatch, setActiveSubmissionBatch] = useState<SubmissionBatch | null>(null)
    const [activeHistoryEnvironment, setActiveHistoryEnvironment] = useState<SubmitEnvironment>('production')
    const [hasRestoredLatestProject, setHasRestoredLatestProject] = useState(false)
    const [validationById, setValidationById] = useState<Record<string, boolean>>({})
    const [notesById, setNotesById] = useState<Record<string, string>>({})

    useEffect(() => {
        void trigger({})
        void triggerSubmissionHistory({ environment: 'production' })
        void triggerProjectSynthesis({ environment: 'production' })
    }, [trigger, triggerProjectSynthesis, triggerSubmissionHistory])

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
        const activeStatuses = new Set(['queued', 'pending', 'processing', 'running', 'synthesis_pending', 'synthesizing'])
        return visibleProjectSyntheses.some((row) => activeStatuses.has(row.projectStatus.trim().toLowerCase()))
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
            return { value: 82, stage: 'Synthesis starting' }
        }

        if (isCurrentProjectAwaitingSynthesis) {
            return { value: 82, stage: 'All documents complete — n8n is consolidating findings' }
        }

        return { value: 0, stage: 'Waiting for project documents' }
    }, [isCurrentProjectAwaitingSynthesis, projectId, projectSummaries])

    const shouldPollN8n = hasActiveSubmissions || hasActiveProjectSynthesis || isCurrentProjectAwaitingSynthesis

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
    const validatedCount = diligenceFindings.filter((finding) => validationById[finding.id]).length
    const highPriorityCount = diligenceFindings.filter(
        (finding) => finding.severity === 'Critical' || finding.severity === 'High'
    ).length
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
    const displayedSubmitTargetValue = displayedSubmissionRow?.aiTargetValue ?? ''
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
    const displayedSubmissionBatch = activeSubmissionBatch ?? latestSavedBatch
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
        return status === 'failed' || status === 'error' || status === 'rejected'
    }).length
    const activeBatchExpectedCount = displayedSubmissionBatch?.expectedDocumentCount ?? 0
    const activeBatchProgressPercent = activeBatchExpectedCount > 0
        ? Math.min(100, Math.round((activeBatchFinishedCount / activeBatchExpectedCount) * 100))
        : 0
    const activeBatchProcessingPercent = activeBatchExpectedCount > 0
        ? Math.min(100, Math.round((activeBatchProcessingCount / activeBatchExpectedCount) * 100))
        : 0

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
        setDealName('')
        setProjectId(createUnusedProjectId(usedProjectIds))
        setProjectStage('post-loi')
        setDocumentType('auto-detect')
        setSubmissionNotes('')
        setSelectedFiles([])
    }

    const handlePortfolioProjectSelect = (projectKey: string) => {
        setSelectedProjectKey(projectKey)
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

    const handleRefreshHistory = async (environment: SubmitEnvironment) => {
        setActiveHistoryEnvironment(environment)
        await triggerSubmissionHistory({ environment }, { skipCache: true }).result
        await triggerProjectSynthesis({ environment }, { skipCache: true }).result
    }

    const handleSubmit = async (environment: SubmitEnvironment) => {
        if (selectedFiles.length === 0) {
            return
        }

        setIsSubmittingFile(true)
        setBatchSubmissionMessage('')

        try {
            const submissionBatchId = crypto.randomUUID()
            const expectedBatchDocumentCount = selectedFiles.length
            const failedFileNames: string[] = []

            setActiveSubmissionBatch({
                id: submissionBatchId,
                expectedDocumentCount: expectedBatchDocumentCount,
                environment,
                startedAt: Date.now(),
            })

            for (const file of selectedFiles) {
                try {
                    const fileBase64 = await readFileAsBase64(file)

                    await triggerSubmitDealPacket({
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
                } catch {
                    failedFileNames.push(file.name)
                }
            }

            if (failedFileNames.length > 0) {
                const submittedFileCount = expectedBatchDocumentCount - failedFileNames.length
                setBatchSubmissionMessage(
                    submittedFileCount > 0
                        ? `${failedFileNames.length} file${failedFileNames.length === 1 ? '' : 's'} could not be queued (${failedFileNames.join(', ')}). The remaining ${submittedFileCount} file${submittedFileCount === 1 ? '' : 's'} were submitted. Re-upload the failed file${failedFileNames.length === 1 ? '' : 's'} before this batch can be synthesized.`
                        : `No files could be queued (${failedFileNames.join(', ')}). Please try the batch again; no synthesis will run for this batch.`
                )
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
                <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
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
                {!isExampleMode ? (
                    <div className="mx-auto max-w-[1600px] px-4 pb-5 sm:px-6 lg:px-8">
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
                    <div className="mx-auto max-w-[1600px] px-4 pb-5 sm:px-6 lg:px-8">
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

            <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                <ProjectIntakeCard
                    dealName={dealName}
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

                {submitError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Unable to queue the latest document: {submitError}
                    </div>
                ) : null}

                {batchSubmissionMessage ? (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
                        {batchSubmissionMessage}
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
                            <p className="text-xs text-muted-foreground">
                                {submitResponse
                                    ? `${submitResponse.method} to ${submitResponse.target} at ${submitResponse.submittedAt}`
                                    : 'Restored from the most recent n8n submission history row.'}
                            </p>

                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
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
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Target Value</p>
                                        <p className="mt-1 text-foreground">{displayedSubmitTargetValue || 'Pending'}</p>
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

                <ProjectPortfolioCard
                    rows={submissionHistory}
                    syntheses={visibleProjectSyntheses}
                    activeProjectKey={selectedProjectKey}
                    onProjectSelect={handlePortfolioProjectSelect}
                />

                <section id="project-synthesis" className="scroll-mt-6">
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
                        onRefresh={() => {
                            void triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
                        }}
                    />
                </section>

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
                />

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
                                                onClick={() => setSelectedFindingId(finding.id)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault()
                                                        setSelectedFindingId(finding.id)
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
        </div>
    )
}
