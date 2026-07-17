import { useEffect, useMemo, useState } from 'react'
import {
    AlertCircle,
    ArrowUpRight,
    FileSearch,
} from 'lucide-react'

import ProjectIntakeCard from '../components/ProjectIntakeCard'
import ProjectPortfolioCard from '../components/ProjectPortfolioCard'
import ProjectSynthesisCard from '../components/ProjectSynthesisCard'
import SubmissionHistoryCard from '../components/SubmissionHistoryCard'
import { useGetDiligenceData, useGetProjectSynthesis, useGetSubmissionHistory, useSubmitDealPacket } from '../hooks/backend/diligence'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
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
} from '../utils/aiSubmissionData'
import {
    type SubmissionHistoryItem,
    formatSubmissionStatus,
    isActiveSubmissionStatus,
} from '../utils/submissionHistory'
import { createProjectSummaries } from '../utils/projectWorkspace'
import { fallbackDiligenceFindings, type FindingType, type Severity } from '../utils/diligence'
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

type SubmitWebhookResponse = {
    requestID?: string
    status?: string
    receivedAt?: string
    id?: number
    createdAt?: string
    updatedAt?: string
}

type SubmitEnvironment = 'production' | 'test'

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

    const submissionHistory = (Array.isArray(submissionHistoryData)
        ? submissionHistoryData
        : []) as SubmissionHistoryItem[]
    const projectSummaries = useMemo(() => createProjectSummaries(submissionHistory), [submissionHistory])

    const fallbackFinding = diligenceFindings[0]
    const [selectedFindingId, setSelectedFindingId] = useState<string>(fallbackFinding?.id ?? '')
    const [selectedFiles, setSelectedFiles] = useState<File[]>([])
    const [dealName, setDealName] = useState('')
    const [companyName, setCompanyName] = useState('')
    const [projectId, setProjectId] = useState('project-1')
    const [projectStage, setProjectStage] = useState('post-loi')
    const [documentType, setDocumentType] = useState('auto-detect')
    const [submissionWorkstream, setSubmissionWorkstream] = useState(fallbackFinding?.workstream ?? 'Financial diligence')
    const [selectedProjectKey, setSelectedProjectKey] = useState('new')
    const [submissionNotes, setSubmissionNotes] = useState('')
    const [isSubmittingFile, setIsSubmittingFile] = useState(false)
    const [activeHistoryEnvironment, setActiveHistoryEnvironment] = useState<SubmitEnvironment>('production')
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
        if (fallbackFinding && submissionWorkstream.length === 0) {
            setSubmissionWorkstream(fallbackFinding.workstream)
        }
    }, [fallbackFinding, submissionWorkstream])

    const hasActiveSubmissions = useMemo(() => {
        return submissionHistory.some((row) => isActiveSubmissionStatus(row.status))
    }, [submissionHistory])

    useEffect(() => {
        if (!hasActiveSubmissions) {
            return
        }

        const intervalId = window.setInterval(() => {
            void triggerSubmissionHistory({ environment: activeHistoryEnvironment }, { skipCache: true }).result
        }, 5000)

        return () => {
            window.clearInterval(intervalId)
        }
    }, [activeHistoryEnvironment, hasActiveSubmissions, triggerSubmissionHistory])

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
        label: `${project.projectName} • ${project.companyName}`,
    }))
    const webhookResponse = submitResponse?.response as SubmitWebhookResponse | undefined
    const submitEnvironment = (submitResponse?.environment === 'test' ? 'test' : 'production') as SubmitEnvironment
    const latestSubmittedRequestId = webhookResponse?.requestID ?? ''
    const liveSubmittedRow = latestSubmittedRequestId.length > 0
        ? submissionHistory.find((row) => row.requestID === latestSubmittedRequestId)
        : undefined
    const displayedSubmitStatus = liveSubmittedRow?.status ?? webhookResponse?.status ?? submitResponse?.status ?? 'accepted'
    const displayedSubmitReceivedAt = liveSubmittedRow?.receivedAt ?? webhookResponse?.receivedAt ?? 'Pending'
    const displayedSubmitRowId = liveSubmittedRow?.id ?? webhookResponse?.id ?? 'Pending'
    const displayedSubmitRiskLevel = liveSubmittedRow?.riskLevel ?? ''
    const displayedSubmitTrafficLight = liveSubmittedRow?.trafficLight ?? ''
    const displayedSubmitCategory = liveSubmittedRow?.category ?? ''
    const displayedSubmitAiSummary = liveSubmittedRow?.aiSummary ?? ''
    const displayedSubmitTargetValue = liveSubmittedRow?.aiTargetValue ?? ''
    const displayedSubmitVariance = liveSubmittedRow?.aiVariance ?? ''
    const displayedSubmitConfidence = liveSubmittedRow?.aiConfidence ?? ''
    const displayedSubmitEscalationReason = liveSubmittedRow?.aiEscalationReason ?? ''
    const liveSubmitInsight = liveSubmittedRow ? getAiSubmissionViewModel(liveSubmittedRow) : null
    const displayedSubmitValuationCurrency = liveSubmittedRow?.valuationCurrency ?? ''

    useEffect(() => {
        if (selectedProjectKey === 'new') {
            return
        }

        const matchingProject = projectSummaries.find((project) => project.projectKey === selectedProjectKey)

        if (!matchingProject) {
            return
        }

        setDealName(matchingProject.projectName)
        setCompanyName(matchingProject.companyName === 'Unknown company' ? '' : matchingProject.companyName)
        setProjectId(matchingProject.projectId || matchingProject.projectKey)
        setProjectStage(matchingProject.stage || 'post-loi')
        setSubmissionWorkstream(matchingProject.workstream === 'All workstreams' ? '' : matchingProject.workstream)
    }, [projectSummaries, selectedProjectKey])

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

        try {
            for (const file of selectedFiles) {
                const fileBase64 = await readFileAsBase64(file)

                await triggerSubmitDealPacket({
                    environment,
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type || 'application/octet-stream',
                    fileBase64,
                    dealName: dealName || suggestedProjectName,
                    companyName,
                    workstream: submissionWorkstream,
                    submissionNotes,
                    projectId: projectId || suggestedProjectId,
                    projectStage,
                    documentType,
                }).result
            }

            setSubmissionNotes('')
            setDocumentType('auto-detect')
            setSelectedProjectKey('new')
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
                <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between lg:px-8">
                    <div className="space-y-2">
                        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                            Internal M&amp;A Due Diligence Workspace
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
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
            </header>

            <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-6 lg:px-8">
                <ProjectIntakeCard
                    dealName={dealName}
                    companyName={companyName}
                    projectId={projectId}
                    projectStage={projectStage}
                    documentType={documentType}
                    workstream={submissionWorkstream}
                    submissionNotes={submissionNotes}
                    selectedProjectKey={selectedProjectKey}
                    suggestedProjectName={suggestedProjectName}
                    suggestedProjectId={suggestedProjectId}
                    availableProjects={availableProjects}
                    selectedFiles={selectedFiles}
                    disabled={isSubmittingFile || submitLoading}
                    onDealNameChange={setDealName}
                    onCompanyNameChange={setCompanyName}
                    onProjectIdChange={setProjectId}
                    onProjectStageChange={setProjectStage}
                    onDocumentTypeChange={setDocumentType}
                    onWorkstreamChange={setSubmissionWorkstream}
                    onSubmissionNotesChange={setSubmissionNotes}
                    onSelectedProjectKeyChange={setSelectedProjectKey}
                    onFileSelect={setSelectedFiles}
                    onSubmit={(environment) => {
                        void handleSubmit(environment)
                    }}
                />

                {submitError ? (
                    <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        Unable to queue the latest document: {submitError}
                    </div>
                ) : null}

                {submitResponse ? (
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
                                    <Badge variant={liveSubmittedRow ? 'success' : 'secondary'}>
                                        {liveSubmittedRow ? 'Live project row found' : 'Waiting for history refresh'}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 p-4">
                            <p className="text-xs text-muted-foreground">
                                {submitResponse.method} to {submitResponse.target} at {submitResponse.submittedAt}
                            </p>

                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Request ID</p>
                                    <p className="mt-1 break-all font-mono text-foreground">{webhookResponse?.requestID ?? 'Pending'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project ID</p>
                                    <p className="mt-1 break-all font-mono text-foreground">{liveSubmittedRow?.projectId || projectId || 'Not set'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Project Stage</p>
                                    <p className="mt-1 text-foreground">{liveSubmittedRow?.projectStage || projectStage || 'Not set'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Document Type</p>
                                    <p className="mt-1 text-foreground">{liveSubmittedRow?.documentType || documentType || 'Not set'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">n8n Row ID</p>
                                    <p className="mt-1 font-mono text-foreground">{displayedSubmitRowId}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Received At</p>
                                    <p className="mt-1 text-foreground">{displayedSubmitReceivedAt}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Deal / Project</p>
                                    <p className="mt-1 text-foreground">{submitResponse?.payload?.dealName || 'Pending'}</p>
                                </div>
                                <div className="rounded-md border border-border bg-card px-3 py-2">
                                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">File Name</p>
                                    <p className="mt-1 break-all text-foreground">{submitResponse?.payload?.fileName ?? 'Pending'}</p>
                                </div>
                            </div>

                            {liveSubmittedRow ? (
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
                                        <p className="mt-1 text-foreground">Processing started: {liveSubmittedRow.processingStartedAt || 'Pending'}</p>
                                        <p className="mt-1 text-foreground">Processed at: {liveSubmittedRow.processedAt || 'Pending'}</p>
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
                                        <p className="mt-1 text-foreground">{liveSubmittedRow.ebitdaExtracted || 'Pending'}</p>
                                    </div>
                                    {displayedSubmitEscalationReason ? (
                                        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-foreground xl:col-span-4">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Escalation Reason</p>
                                            <p className="mt-1 text-sm">{displayedSubmitEscalationReason}</p>
                                        </div>
                                    ) : null}
                                    {displayedSubmitAiSummary ? (
                                        <div className="rounded-md border border-border bg-card px-3 py-2 xl:col-span-4">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">AI Summary</p>
                                            <p className="mt-1 text-sm leading-6 text-foreground">{displayedSubmitAiSummary}</p>
                                        </div>
                                    ) : null}
                                    {((liveSubmitInsight?.redFlags.length ?? 0) > 0 || (liveSubmitInsight?.yellowFlags.length ?? 0) > 0 || (liveSubmitInsight?.greenFlags.length ?? 0) > 0) ? (
                                        <div className="grid gap-2 xl:col-span-4 md:grid-cols-3">
                                            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Red Flags</p>
                                                <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.redFlags.length ?? 0}</p>
                                            </div>
                                            <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Yellow Flags</p>
                                                <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.yellowFlags.length ?? 0}</p>
                                            </div>
                                            <div className="rounded-md border border-success/30 bg-success/5 px-3 py-2">
                                                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Green Flags</p>
                                                <p className="mt-1 text-sm text-foreground">{liveSubmitInsight?.greenFlags.length ?? 0}</p>
                                            </div>
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
                                            <p className="mt-2 text-sm leading-6 text-foreground">
                                                {liveSubmitInsight.investmentBuyReasoning || 'No buy reasoning returned yet.'}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : null}

                <ProjectPortfolioCard rows={submissionHistory} />

                <ProjectSynthesisCard
                    syntheses={Array.isArray(projectSynthesisData) ? projectSynthesisData : []}
                    projects={projectSummaries}
                    loading={projectSynthesisLoading}
                    error={projectSynthesisError}
                    onRefresh={() => {
                        void triggerProjectSynthesis({ environment: activeHistoryEnvironment }, { skipCache: true }).result
                    }}
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
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                    <Card className="overflow-hidden">
                        <CardHeader className="border-b border-border bg-card/80">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl">Current extraction findings</CardTitle>
                                    <CardDescription>
                                        These are still document-level findings. The next backend step is to reconcile them across all documents inside a shared project.
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
                            <Table>
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
            </main>
        </div>
    )
}
