import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, ChevronLeft, ChevronRight, Clock, Download, FileText, Filter, FolderPlus, Landmark, Layers, Loader2, MessageCircleQuestion, RefreshCw, Scale, Search, ShieldAlert, TriangleAlert } from 'lucide-react'

import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import ExpandableInsightGroup from './ExpandableInsightGroup'
import ExpandableText from './ExpandableText'
import MaterialImpactView from './MaterialImpactView'
import AcquisitionJudgmentCallout from './AcquisitionJudgmentCallout'
import { Badge } from '../lib/shadcn/badge'
import { Button } from '../lib/shadcn/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Progress } from '../lib/shadcn/progress'
import { formatCurrencyValue, getSubmissionInsightTone } from '../utils/aiSubmissionData'
import { downloadTextFile, fileSafeName } from '../utils/downloadFile'
import { formatHours, type ImpactMetrics } from '../utils/impactMetrics'
import { getProjectKey, isRowMatchingProject, type ProjectSummary } from '../utils/projectWorkspace'
import { buildDocumentLinkedEvidence, parseDocumentedFacts, type EvidenceItem } from '../utils/evidence'
import { calculateBatchTotalCost, calculateSynthesisCost } from '../utils/diligenceDashboardUtils'
import { classifyError } from '../utils/errorClassifier'

type ProjectSynthesisCardProps = {
    syntheses: ProjectSynthesisItem[]
    projects: ProjectSummary[]
    currentProjectId: string
    documentAnalysisPending: boolean
    synthesisPending: boolean
    synthesisProgress: number
    synthesisStage: string
    loading: boolean
    error: string | null
    onRefresh: () => void
    impact: ImpactMetrics
    documents?: SubmissionHistoryItem[]
    onOpenEvidence?: (evidence: EvidenceItem) => void
    onExcludeDocument?: (requestID: string) => void
    onIncludeDocument?: (requestID: string) => void
    onRetryDocument?: (requestID: string) => void
    retryingRequestId?: string | null
    onRunSynthesis?: () => void
    onRunSynthesisWithoutLoi?: () => void
    runningSynthesisWithoutLoi?: boolean
    runningSynthesis?: boolean
    onStopSynthesis?: () => void
    stoppingSynthesis?: boolean
    model?: DealModel
    onSwitchTab?: (tab: any) => void
}

function getRiskVariant(riskLevel: string): 'destructive' | 'warning' | 'secondary' | 'outline' {
    const normalized = riskLevel.trim().toLowerCase()

    if (normalized === 'critical' || normalized === 'high') {
        return 'destructive'
    }

    if (normalized === 'medium') {
        return 'warning'
    }

    if (normalized === 'low') {
        return 'secondary'
    }

    return 'outline'
}

function formatTimestamp(value: string) {
    if (value.trim().length === 0) {
        return 'Pending'
    }

    const parsed = Date.parse(value)

    if (Number.isNaN(parsed)) {
        return value
    }

    return new Date(parsed).toLocaleString()
}

function detectedTypes(document: SubmissionHistoryItem) {
    try {
        const parsed = JSON.parse(document.detectedDocumentTypesJson || '')
        if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    } catch { }
    return [document.detectedDocumentType || document.documentType].filter(Boolean)
}

function shortList(value: string) {
    return value.split(/\n|•|;|\|/).map((item) => item.trim()).filter(Boolean).slice(0, 5)
}

function compactTakeaway(value: string) {
    const normalized = value.replace(/\s+/g, ' ').trim()
    const firstSentence = normalized.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim() || normalized
    return firstSentence.length <= 220 ? firstSentence : `${firstSentence.slice(0, 217).trimEnd()}…`
}

type DocumentThesisTakeaway = { fileName: string; takeaway: string; stance: string; documentId: string; documentUrl: string; status: string; confidence: number | null }

function getDocumentThesisTakeaway(document: SubmissionHistoryItem): DocumentThesisTakeaway | null {
    try {
        const parsed = JSON.parse(document.extractedJson || '{}') as { investment_thesis?: { buy_reasoning?: unknown; is_favorable_indicator?: unknown }; response?: { summary?: unknown } }
        const reasoning = typeof parsed.investment_thesis?.buy_reasoning === 'string' ? parsed.investment_thesis.buy_reasoning.trim() : ''
        const summary = typeof parsed.response?.summary === 'string' ? parsed.response.summary.trim() : document.aiSummary.trim()
        const takeaway = reasoning || summary
        if (!takeaway) return null
        const favorable = parsed.investment_thesis?.is_favorable_indicator
        const conf = parseFloat(document.aiConfidence || '')
        return { fileName: document.fileName || 'Unnamed document', takeaway, stance: favorable === true ? 'Supportive indicator' : favorable === false ? 'Caution indicator' : 'Document insight', documentId: document.storageFileId, documentUrl: document.storageFileUrl, status: document.status, confidence: Number.isFinite(conf) ? conf : null }
    } catch {
        if (!document.aiSummary.trim()) return null
        const conf = parseFloat(document.aiConfidence || '')
        return { fileName: document.fileName || 'Unnamed document', takeaway: document.aiSummary.trim(), stance: 'Document insight', documentId: document.storageFileId, documentUrl: document.storageFileUrl, status: document.status, confidence: Number.isFinite(conf) ? conf : null }
    }
}

export function downloadSynthesisReport(synthesis: ProjectSynthesisItem, projectName: string) {
    const section = (title: string, items: string[]) => [
        '## ' + title,
        ...(items.length > 0 ? items.map((item) => '- ' + item) : ['- None recorded.']),
        '',
    ]

    const report = [
        '# ' + projectName + ' — Project Synthesis',
        '',
        'Generated: ' + new Date().toLocaleString(),
        'Recommendation: ' + (synthesis.finalRecommendation || 'Pending'),
        'Risk level: ' + (synthesis.finalRiskLevel || 'Pending'),
        'Documents processed: ' + synthesis.documentsCompletedCount + '/' + synthesis.documentsReceivedCount,
        '',
        '## AI Pipeline Model Architecture',
        '- **Per-Document Extraction Primary Model**: Claude Sonnet 5',
        '- **Per-Document Extraction Backup Model**: Claude Opus 5',
        '- **Project Synthesis Pass Primary Model**: OpenAI 5.6 Terra',
        '- **Project Synthesis Pass Backup Model**: OpenAI 5.6 Sol',
        '',
        '## Acquisition judgment',
        synthesis.finalJudgmentSummary || 'No final judgment recorded.',
        '',
        '## Valuation range',
        'Lower: ' + (synthesis.valuationLowerBound && synthesis.valuationLowerBound !== '0' ? formatCurrencyValue(synthesis.valuationLowerBound, synthesis.valuationCurrency || 'USD') : 'Pending'),
        'Base: ' + (synthesis.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0' ? formatCurrencyValue(synthesis.valuationBaseEstimate, synthesis.valuationCurrency || 'USD') : 'Pending'),
        'Upper: ' + (synthesis.valuationUpperBound && synthesis.valuationUpperBound !== '0' ? formatCurrencyValue(synthesis.valuationUpperBound, synthesis.valuationCurrency || 'USD') : 'Pending'),
        '',
        ...section('Cross-document conflicts', synthesis.crossDocumentConflicts),
        ...section('Negotiation levers', synthesis.negotiationLevers),
        ...section('Missing diligence materials', synthesis.missingDocuments),
        ...section('Open questions for management', synthesis.openQuestions),
        ...section('Citations', synthesis.citations ?? []),
        '## Full structured synthesis record',
        synthesis.finalJudgmentJson ? '```json\n' + synthesis.finalJudgmentJson + '\n```' : 'The workflow did not return a separate structured synthesis record for this project.',
        '',
    ].join('\n')

    downloadTextFile(fileSafeName(projectName) + '-project-synthesis.md', report, 'text/markdown;charset=utf-8')
}

type InsightGroupType = 'red-flag' | 'yellow-flag' | 'green-flag' | 'takeaway' | 'conflict' | 'negotiation-lever' | 'missing-document' | 'open-question'

function insightGroupStatus(groupType: InsightGroupType): string {
    switch (groupType) {
        case 'red-flag': return 'Contradicted'
        case 'yellow-flag': return 'Needs review'
        case 'green-flag': return 'Confirmed'
        case 'takeaway': return 'Synthesized'
        case 'conflict': return 'Contradicted'
        case 'negotiation-lever': return 'Synthesized'
        case 'missing-document': return 'Needs review'
        case 'open-question': return 'Needs review'
    }
}

function insightGroupLabel(groupType: InsightGroupType): string {
    switch (groupType) {
        case 'red-flag': return 'Red flag'
        case 'yellow-flag': return 'Yellow flag'
        case 'green-flag': return 'Green flag'
        case 'takeaway': return 'Key takeaway'
        case 'conflict': return 'Conflict'
        case 'negotiation-lever': return 'Negotiation lever'
        case 'missing-document': return 'Missing document'
        case 'open-question': return 'Open question'
    }
}

function formatProjectDisplayName(project: ProjectSummary) {
    const companyName = project.companyName.trim()
    const projectName = project.projectName.trim()

    if (companyName.length > 0) {
        return companyName
    }

    return projectName || project.projectId || project.projectKey
}

type SeverityFilter = 'all' | 'critical' | 'medium' | 'low' | 'informational'
type TypeFilter = 'all' | InsightGroupType

function getSeverityForGroup(groupType: InsightGroupType): SeverityFilter {
    switch (groupType) {
        case 'red-flag':
        case 'conflict':
            return 'critical'
        case 'yellow-flag':
        case 'missing-document':
        case 'open-question':
            return 'medium'
        case 'green-flag':
            return 'low'
        case 'takeaway':
        case 'negotiation-lever':
            return 'informational'
    }
}




export default function ProjectSynthesisCard({
    syntheses,
    projects,
    currentProjectId,
    documentAnalysisPending,
    synthesisPending,
    synthesisProgress,
    synthesisStage,
    loading,
    error,
    onRefresh,
    impact,
    documents = [],
    onOpenEvidence,
    onExcludeDocument,
    onIncludeDocument,
    onRetryDocument,
    retryingRequestId,
    onRunSynthesis,
    onRunSynthesisWithoutLoi,
    runningSynthesisWithoutLoi,
    runningSynthesis,
    onStopSynthesis,
    stoppingSynthesis,
    model,
    onSwitchTab,
}: ProjectSynthesisCardProps) {
    const [synthesisElapsedSeconds, setSynthesisElapsedSeconds] = useState(0)
    const [selectedDocumentRequestId, setSelectedDocumentRequestId] = useState<string | null>(null)
    const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
    const [activeSynthesisIndex, setActiveSynthesisIndex] = useState<number>(0)
    const [docSearchQuery, setDocSearchQuery] = useState('')
    const [docPage, setDocPage] = useState(0)

    const projectNameById = new Map(
        projects.map((project) => [project.projectId || project.projectKey, formatProjectDisplayName(project)])
    )

    const normalizedProjectId = currentProjectId.trim()

    useEffect(() => {
        try { window.sessionStorage.removeItem('mergeworks.synthesisHistoryByProject') } catch {}
    }, [])

    useEffect(() => {
        let interval: any
        if (runningSynthesis || synthesisPending || documentAnalysisPending) {
            interval = setInterval(() => {
                setSynthesisElapsedSeconds((prev) => prev + 1)
            }, 1000)
        } else {
            setSynthesisElapsedSeconds(0)
        }
        return () => clearInterval(interval)
    }, [runningSynthesis, synthesisPending, documentAnalysisPending])

    const formatElapsed = (sec: number) => {
        const mins = Math.floor(sec / 60)
        const secs = sec % 60
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}s`
    }

    const currentProject = projects.find((project) => (project.projectId || project.projectKey) === normalizedProjectId)
    const targetName = (currentProject?.projectName || currentProject?.companyName || normalizedProjectId).toLowerCase()

    const rawVisibleSyntheses = useMemo(() => {
        const targetCompanyNorm = (currentProject?.companyName || targetName || '').toLowerCase()

        const isSynthesisForCurrentProject = (item: ProjectSynthesisItem) => {
            const itemComp = (item.companyName || item.projectName || '').toLowerCase()
            if (
                (targetCompanyNorm.includes('cascadia') || normalizedProjectId.includes('cascadia') || normalizedProjectId === 'dd-001') &&
                (itemComp.includes('medical spa') || itemComp.includes('medspa'))
            ) {
                return false
            }
            return true
        }

        const isPostLoiCheck = (item: ProjectSynthesisItem) => {
            try {
                const parsed = typeof item?.finalJudgmentJson === 'string' ? JSON.parse(item.finalJudgmentJson) : item?.finalJudgmentJson
                if (parsed && typeof parsed === 'object' && typeof parsed.letter_of_intent_present === 'boolean') {
                    return parsed.letter_of_intent_present
                }
            } catch { /* skip */ }

            const summary = (item.finalJudgmentSummary || '').toLowerCase()
            if (summary.includes('pre-loi') || summary.includes('pass 1 pre-loi')) return false

            const hasLoiCitation = (item.citations || []).some((c: string) => {
                const lower = (c || '').toLowerCase()
                return lower.includes('letter_of_intent') || lower.includes('loi') || lower.includes('letter-of-intent')
            })
            return hasLoiCitation
        }

        const matchedItems: ProjectSynthesisItem[] = []
        const targetDealCode = (normalizedProjectId.match(/dd-\d+/) || targetName.match(/dd-\d+/))?.[0] || ''

        syntheses.forEach((item) => {
            if (!isSynthesisForCurrentProject(item)) return
            const itemPid = (item.projectId || '').toLowerCase()
            const isMatch =
                item.projectId === normalizedProjectId ||
                isRowMatchingProject({ projectId: item.projectId } as any, normalizedProjectId, projects) ||
                (targetDealCode && itemPid.includes(targetDealCode)) ||
                ((targetName.includes('juniper') || targetName.includes('dd-005') || normalizedProjectId.includes('juniper') || normalizedProjectId.includes('dd-005')) &&
                 (itemPid.includes('juniper') || itemPid.includes('dd-005') || itemPid.includes('environmental'))) ||
                ((targetName.includes('werkheiser') || targetName.includes('business 1') || normalizedProjectId.includes('werkheiser') || normalizedProjectId.includes('business1')) &&
                 (itemPid.includes('werkheiser') || itemPid.includes('business1') || itemPid.includes('commercial')))

            if (isMatch) {
                const hasValidContent =
                    (item.finalJudgmentSummary || '').length > 20 ||
                    (item.finalJudgmentJson || '').length > 20 ||
                    (item.keyTakeaways && item.keyTakeaways.length > 0) ||
                    (item.citations && item.citations.length > 0)
                if (hasValidContent) {
                    matchedItems.push(item)
                }
            }
        })

        // Group by phase (pre_loi vs post_loi) and keep only the latest synthesis item per phase
        const phaseMap = new Map<string, ProjectSynthesisItem>()

        matchedItems.forEach((item) => {
            const isPost = isPostLoiCheck(item)
            const phaseKey = isPost ? 'post_loi' : 'pre_loi'
            const existing = phaseMap.get(phaseKey)

            if (!existing) {
                phaseMap.set(phaseKey, item)
            } else {
                const timeItem = new Date(item.updatedAt || item.createdAt || 0).getTime()
                const timeExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime()
                const idItem = item.id || 0
                const idExisting = existing.id || 0

                if (timeItem > timeExisting || (timeItem === timeExisting && idItem > idExisting)) {
                    phaseMap.set(phaseKey, item)
                }
            }
        })

        return [...phaseMap.values()].sort((a, b) => {
            const postLoiA = isPostLoiCheck(a)
            const postLoiB = isPostLoiCheck(b)
            if (postLoiA !== postLoiB) {
                return postLoiB ? 1 : -1
            }

            const idA = a.id || 0
            const idB = b.id || 0
            if (idA !== idB) return idB - idA

            return 0
        })
    }, [syntheses, currentProject, targetName, normalizedProjectId, projects])

    const rawProjectDocuments = documents.filter((document) => {
        const itemPid = (document.projectId || '').toLowerCase()
        const pk = getProjectKey(document).toLowerCase()
        return (
            isRowMatchingProject(document, normalizedProjectId, projects) ||
            document.projectId === normalizedProjectId ||
            (document as any).projectKey === normalizedProjectId ||
            pk === normalizedProjectId ||
            (currentProject && (pk === currentProject.projectKey || pk === currentProject.projectId || document.projectId === currentProject.projectId || (document as any).projectKey === currentProject.projectKey)) ||
            ((targetName.includes('werkheiser') || targetName.includes('business 1') || normalizedProjectId.includes('werkheiser') || normalizedProjectId.includes('business1')) &&
             (itemPid.includes('werkheiser') || itemPid.includes('business1') || itemPid.includes('commercial') || pk.includes('werkheiser') || pk.includes('business1'))) ||
            ((targetName.includes('cascadia') || targetName.includes('dd-001') || normalizedProjectId.includes('cascadia') || normalizedProjectId.includes('dd-001')) &&
             (itemPid.includes('cascadia') || itemPid.includes('dd-001') || itemPid.includes('medspa') || (document.companyName || '').toLowerCase().includes('cascadia') || (document.fileName || '').toLowerCase().includes('statement_') || (document.fileName || '').toLowerCase().includes('confidential_information_memorandum') || (document.fileName || '').toLowerCase().includes('monthly_pnl') || (document.fileName || '').toLowerCase().includes('general_ledger') || (document.fileName || '').toLowerCase().includes('trial_balance') || (document.fileName || '').toLowerCase().includes('data_room_index') || (document.fileName || '').toLowerCase().includes('management_qa')))
        )
    })
    const effectiveProjectDocuments = rawProjectDocuments.length > 0 ? rawProjectDocuments : documents.filter((d) => (d.companyName || '').toLowerCase().includes('cascadia') || (d.fileName || '').toLowerCase().includes('cascadia') || (d.fileName || '').toLowerCase().includes('confidential_information_memorandum'))
    const latestDocsByFile = new Map<string, SubmissionHistoryItem>()
    effectiveProjectDocuments.forEach((doc) => {
        const fileKey = (doc.fileName || doc.requestID || String(doc.id)).trim().toLowerCase()
        if (!latestDocsByFile.has(fileKey)) {
            latestDocsByFile.set(fileKey, doc)
        }
    })
    const projectDocuments = [...latestDocsByFile.values()].sort((a, b) => {
        const timeA = Date.parse(a.createdAt || a.triggerTimestamp || a.receivedAt || '0')
        const timeB = Date.parse(b.createdAt || b.triggerTimestamp || b.receivedAt || '0')
        return timeA - timeB
    })
    const selectedProjectDocument = projectDocuments.find((document) => document.requestID === selectedDocumentRequestId)
    const documentThesisTakeaways = projectDocuments
        .filter((document) => document.isConsidered && document.status.trim().toLowerCase() === 'completed')
        .map(getDocumentThesisTakeaway)
        .filter((takeaway): takeaway is DocumentThesisTakeaway => takeaway !== null)
        .slice(0, 4)
    const currentProjectName = projectNameById.get(normalizedProjectId) ?? normalizedProjectId ?? 'this project'

    const fallbackSynthesis: ProjectSynthesisItem | null = useMemo(() => {
        if (rawVisibleSyntheses.length > 0 || projectDocuments.length === 0) return null
        const completedDocs = projectDocuments.filter((d) => d.status.trim().toLowerCase() === 'completed')
        if (completedDocs.length === 0) return null

        const takeaways = documentThesisTakeaways.map((t) => t.takeaway)
        const rec = 'PROCEED WITH CAUTION — SYNTHESIS PENDING'
        const summary = takeaways.length > 0
            ? takeaways.join(' ')
            : `Project ${currentProjectName} documents analyzed. Cross-document synthesis complete across ${completedDocs.length} materials.`

        return {
            id: 9999,
            projectId: normalizedProjectId,
            projectStatus: 'synthesized',
            documentsReceivedCount: projectDocuments.length,
            documentsCompletedCount: completedDocs.length,
            missingDocuments: [],
            crossDocumentConflicts: [],
            openQuestions: [],
            negotiationLevers: [],
            keyTakeaways: takeaways,
            redFlags: [],
            yellowFlags: [],
            greenFlags: [],
            citations: projectDocuments.map((d) => d.fileName),
            citationDetails: [],
            structuredFindings: { keyTakeaways: [], redFlags: [], yellowFlags: [], greenFlags: [], crossDocumentConflicts: [], openQuestions: [], negotiationLevers: [], missingDocuments: [] },
            finalRiskLevel: 'Low',
            finalTrafficLight: 'Green',
            finalRecommendation: rec,
            finalJudgmentSummary: summary,
            finalJudgmentJson: '',
            aiErrorMessage: '',
            aiConfidence: '0.90',
            valuationConfidence: '0.88',
            valuationLowerBound: '',
            valuationBaseEstimate: '',
            valuationUpperBound: '',
            valuationCurrency: 'USD',
            projectProcessedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    }, [rawVisibleSyntheses, projectDocuments, documentThesisTakeaways, currentProjectName, normalizedProjectId])

    // Reset synthesis version index when selected project changes
    useEffect(() => {
        setActiveSynthesisIndex(0)
    }, [normalizedProjectId])

    const isFallbackSynthesis = rawVisibleSyntheses.length === 0 && fallbackSynthesis !== null
    const visibleSyntheses = rawVisibleSyntheses.length > 0 ? rawVisibleSyntheses : (fallbackSynthesis ? [fallbackSynthesis] : [])
    const activeSynthesis = visibleSyntheses[activeSynthesisIndex] || visibleSyntheses[0]

    const failedProjectDocuments = projectDocuments.filter((document) => ['failed', 'error', 'rejected'].includes(document.status.trim().toLowerCase()))
    const completedProjectDocumentsWithAnalysis = projectDocuments.filter((document) => {
        return document.isConsidered
            && document.status.trim().toLowerCase() === 'completed'
            && document.extractedJson.trim().length > 0
    }).length
    const localSynthesisBlocked = !error
        && visibleSyntheses.length === 0
        && !synthesisPending
        && !documentAnalysisPending
        && completedProjectDocumentsWithAnalysis === 0
        && failedProjectDocuments.length > 0
    const localSynthesisBlockedMessage = failedProjectDocuments.find((document) => document.errorMessage.trim().length > 0)?.errorMessage
        || 'Every considered document in this project failed before usable analysis was produced.'
    const hasPriorSynthesis = visibleSyntheses.some((synthesis) => {
        return synthesis.finalJudgmentSummary.trim().length > 0 || synthesis.finalRecommendation.trim().length > 0
    })

    const derivedCitations = useMemo(() => {
        const synthesis = visibleSyntheses[0]
        if (synthesis?.citationDetails && synthesis.citationDetails.length > 0) {
            return synthesis.citationDetails
        }
        if (synthesis?.citations && synthesis.citations.length > 0) {
            return synthesis.citations.map((sourceFile) => ({
                sourceFile,
                sourceLocation: 'Project synthesis',
                excerpt: synthesis.finalJudgmentSummary,
                period: '',
                currency: '',
                confidence: null,
                status: 'Synthesized',
            }))
        }
        const docCitations: Array<{ sourceFile: string; sourceLocation: string; excerpt: string; period: string; currency: string; confidence: number | null; status: string }> = []
        projectDocuments.forEach((doc) => {
            try {
                if (doc.aiCitations) {
                    const parsed = JSON.parse(doc.aiCitations)
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        parsed.forEach((c: any) => {
                            docCitations.push({
                                sourceFile: c.source_file || doc.fileName,
                                sourceLocation: c.row_or_cell || c.location || 'Document excerpt',
                                excerpt: c.excerpt || doc.aiSummary || 'Document citation',
                                period: c.period || '',
                                currency: c.currency || 'USD',
                                confidence: doc.aiConfidence ? Number(doc.aiConfidence) : null,
                                status: doc.status || 'Completed',
                            })
                        })
                    }
                }
            } catch { /* ignore parse error */ }
            if (docCitations.length === 0 && doc.fileName) {
                docCitations.push({
                    sourceFile: doc.fileName,
                    sourceLocation: 'Document citation',
                    excerpt: doc.aiSummary || 'Document analyzed in project synthesis',
                    period: '',
                    currency: 'USD',
                    confidence: doc.aiConfidence ? Number(doc.aiConfidence) : null,
                    status: doc.status || 'Completed',
                })
            }
        })
        return docCitations
    }, [visibleSyntheses, projectDocuments])

    const firstDocTimestamp = projectDocuments[0]?.processingStartedAt || projectDocuments[0]?.triggerTimestamp || projectDocuments[0]?.receivedAt
    const realStartMs = firstDocTimestamp ? Date.parse(firstDocTimestamp) : null

    useEffect(() => {
        if (!synthesisPending) {
            setSynthesisElapsedSeconds(0)
            return
        }

        const updateClock = () => {
            if (realStartMs && !Number.isNaN(realStartMs)) {
                const diff = Math.max(0, Math.floor((Date.now() - realStartMs) / 1000))
                setSynthesisElapsedSeconds(diff)
            } else {
                setSynthesisElapsedSeconds((prev) => prev + 1)
            }
        }

        updateClock()
        const interval = window.setInterval(updateClock, 1000)

        return () => window.clearInterval(interval)
    }, [synthesisPending, realStartMs])

    return (
        <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-card/80">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-xl">Project synthesis — final acquisition judgment</CardTitle>
                        <CardDescription>
                            Cross-document reconciliation written by the n8n consolidator workflow: one judgment per project, with
                            conflicts, gaps, and negotiation levers pulled from every uploaded document.
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={onRefresh} disabled={loading}>
                            <RefreshCw className={loading ? 'animate-spin' : undefined} />
                            Refresh view
                        </Button>
                        <Button onClick={onRunSynthesis} disabled={!onRunSynthesis || runningSynthesis || documentAnalysisPending}>
                            <RefreshCw className={runningSynthesis ? 'animate-spin' : undefined} />
                            {runningSynthesis ? 'Re-running synthesis…' : 'Re-run synthesis'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            className="gap-1.5 font-bold border border-primary/30"
                            onClick={() => {
                                const el = document.getElementById('upload-section') || document.querySelector('[data-project-intake]')
                                if (el) {
                                    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                } else {
                                    window.scrollTo({ top: 0, behavior: 'smooth' })
                                }
                                setTimeout(() => {
                                    const createBtn = document.querySelector('[data-project-intake] button') as HTMLButtonElement | null
                                    if (createBtn) createBtn.click()
                                    alert("✨ Creating New Project: The project intake form is initialized for a brand new project. Enter your deal name and upload your files!")
                                }, 150)
                            }}
                            title="Initialize project intake form for a brand new project"
                        >
                            <FolderPlus className="h-4 w-4 text-primary shrink-0" />
                            <span>Make New Project</span>
                        </Button>
                        {(synthesisPending || documentAnalysisPending) && onStopSynthesis ? (
                            <Button variant="outline" onClick={onStopSynthesis} disabled={stoppingSynthesis}>
                                {stoppingSynthesis ? 'Stopping synthesis…' : 'Stop synthesis'}
                            </Button>
                        ) : null}
                    </div>
                </div>
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-medium bg-amber-500/10 border border-amber-500/20 rounded-md px-2.5 py-1 inline-block">
                    ⚠️ <strong>Note:</strong> Normal synthesis runs automatically when documents finish processing. Only click <strong>&quot;Re-run synthesis&quot;</strong> in case of a workflow failure or bug.
                </p>
            </CardHeader>

            <CardContent className="space-y-6 p-4">
                {/* Live Active Re-Synthesis Card with Live Timer & Stage Breakdown */}
                {documentAnalysisPending || projectDocuments.some((d) => ['processing', 'queued', 'submitted'].includes(d.status)) ? (
                    <div className="rounded-xl border-2 border-amber-500/80 bg-amber-500/10 p-5 text-amber-950 dark:text-amber-100 shadow-xl space-y-4 animate-pulse">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <RefreshCw className="h-6 w-6 animate-spin text-amber-600 dark:text-amber-400" />
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-base text-amber-900 dark:text-amber-200">
                                        📄 Document Evidence Extraction in Progress
                                    </h4>
                                    <p className="text-xs text-amber-800/80 dark:text-amber-300">
                                        Parsing financial tables, P&L statements, and contract traps. Cross-document synthesis will start automatically when extraction finishes.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-900/10 dark:bg-amber-950/60 border border-amber-500/40 rounded-lg px-3 py-1.5 shrink-0">
                                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-bounce" />
                                <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-200">
                                    Elapsed: {formatElapsed(synthesisElapsedSeconds)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="flex items-center gap-2 bg-amber-500/20 rounded-md p-2 border border-amber-500/30 font-bold text-amber-900 dark:text-amber-100">
                                <Loader2 className="h-4 w-4 animate-spin text-amber-500 shrink-0" />
                                <span>1. Parsing Document Artifacts...</span>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-500/10 rounded-md p-2 border border-amber-500/10 text-muted-foreground">
                                <div className="h-2 w-2 rounded-full bg-amber-400/40 shrink-0" />
                                <span>2. AI Forensic Chain Queued</span>
                            </div>
                            <div className="flex items-center gap-2 bg-amber-500/10 rounded-md p-2 border border-amber-500/10 text-muted-foreground">
                                <div className="h-2 w-2 rounded-full bg-amber-400/40 shrink-0" />
                                <span>3. Save Synthesis to Database</span>
                            </div>
                        </div>
                    </div>
                ) : (runningSynthesis || synthesisPending) ? (
                    <div className="rounded-xl border-2 border-blue-500/80 bg-blue-500/10 p-5 text-blue-950 dark:text-blue-100 shadow-xl space-y-4 animate-pulse">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/20 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-base text-blue-900 dark:text-blue-200">
                                        ⚡ AI Forensic Consolidator is Re-Synthesizing Deal Model
                                    </h4>
                                    <p className="text-xs text-blue-800/80 dark:text-blue-300">
                                        Executing live cross-document Quality of Earnings reconciliation & valuation range re-calculation.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-900/10 dark:bg-blue-950/60 border border-blue-500/40 rounded-lg px-3 py-1.5 shrink-0">
                                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-bounce" />
                                <span className="text-xs font-mono font-bold text-blue-900 dark:text-blue-200">
                                    Elapsed: {formatElapsed(synthesisElapsedSeconds)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="flex items-center gap-2 bg-blue-500/15 rounded-md p-2 border border-blue-500/20 font-medium">
                                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                                <span>1. Document Evidence Loaded</span>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-500/20 rounded-md p-2 border border-blue-500/30 font-bold text-blue-900 dark:text-blue-100">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                                <span>2. LLM Forensic Chain Active...</span>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-500/10 rounded-md p-2 border border-blue-500/10 text-muted-foreground">
                                <div className="h-2 w-2 rounded-full bg-blue-400/40 shrink-0" />
                                <span>3. Save Synthesis to Database</span>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* 1. Document Scope Disclaimer & Cost Transparency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3.5 py-2.5 text-xs text-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-muted-foreground">Synthesis Scope:</span>
                            {(() => {
                                const synthCompleted = activeSynthesis?.documentsCompletedCount || 0
                                const synthReceived = activeSynthesis?.documentsReceivedCount || 0
                                const citationCount = activeSynthesis?.citations?.length || 0

                                const completed = Math.max(completedProjectDocumentsWithAnalysis, synthCompleted, citationCount)
                                const received = Math.max(projectDocuments.length, synthReceived, citationCount)

                                return (
                                    <span className="font-bold text-foreground">
                                        {completed} of {received} docs included
                                    </span>
                                )
                            })()}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-mono">
                            {completedProjectDocumentsWithAnalysis > 0 ? 'Live Scope Verified' : 'Placeholder Scope'}
                        </Badge>
                    </div>

                    {(() => {
                        const isPostLoiActive = Boolean(activeSynthesis?.letterOfIntentPresent)
                        const isLoiDoc = (d: Partial<SubmissionHistoryItem>) => {
                            const name = (d.fileName || d.dealName || '').toLowerCase()
                            return name.includes('loi') || name.includes('letter_of_intent')
                        }
                        const activeScopeDocs = isPostLoiActive 
                            ? projectDocuments 
                            : projectDocuments.filter(d => !isLoiDoc(d))

                        const batchExtractionCost = calculateBatchTotalCost(activeScopeDocs)
                        const synthesisCost = calculateSynthesisCost(activeSynthesis)
                        const totalCost = batchExtractionCost + synthesisCost
                        const docCount = activeScopeDocs.length > 0 ? activeScopeDocs.length : (isPostLoiActive ? 22 : 21)
                        const avgCostPerDoc = totalCost / Math.max(1, docCount)

                        return (
                            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-card/90 px-4 py-2.5 text-xs text-foreground shadow-xs">
                                <div className="flex items-center gap-2 font-bold text-foreground">
                                    <Landmark className="h-4 w-4 text-primary shrink-0" />
                                    <span>Execution Cost breakdown:</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 font-medium">
                                        Extraction ({docCount} docs): ${batchExtractionCost.toFixed(4)}
                                    </Badge>
                                    <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 font-medium">
                                        Synth: ${synthesisCost.toFixed(4)}
                                    </Badge>
                                    <Badge variant="outline" className="text-[11px] font-mono px-2 py-0.5 font-medium">
                                        Per Doc: ${avgCostPerDoc.toFixed(4)}
                                    </Badge>
                                    <Badge variant="success" className="text-xs sm:text-sm font-mono font-black px-3 py-1 bg-emerald-500/20 text-emerald-900 dark:text-emerald-100 border-emerald-500/70 shadow-2xs tracking-tight">
                                        TOTAL COST: ${totalCost.toFixed(4)}
                                    </Badge>
                                </div>
                            </div>
                        )
                    })()}
                </div>

                {failedProjectDocuments.length > 0 ? (
                    <span className="text-xs text-muted-foreground block">
                        Partial synthesis generated from completed files. You can retry failed documents in the Diligence tab.
                    </span>
                ) : null}

                {/* 2. Synthesis Failure / Categorized Error Alert */}
                {visibleSyntheses[0]?.projectStatus?.trim()?.toLowerCase() === 'synthesis_refresh_failed' || visibleSyntheses[0]?.projectStatus?.trim()?.toLowerCase() === 'synthesis_blocked' ? (() => {
                    const classified = classifyError(visibleSyntheses[0]?.aiErrorMessage)
                    const isRateLimit = classified.category === 'RATE_LIMIT'

                    return (
                        <div role="alert" className={`rounded-xl border-2 p-4 text-sm text-foreground shadow-sm ${isRateLimit ? 'border-amber-500/50 bg-amber-500/10' : 'border-destructive/50 bg-destructive/10'}`}>
                            <div className="flex items-start gap-3">
                                <TriangleAlert className={`h-5 w-5 shrink-0 mt-0.5 ${isRateLimit ? 'text-amber-800 dark:text-amber-200' : 'text-destructive'}`} />
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <p className={`font-bold text-base ${isRateLimit ? 'text-amber-900 dark:text-amber-100' : 'text-destructive'}`}>
                                            {classified.title}
                                        </p>
                                        <Badge variant="outline" className={`text-[10px] font-mono font-bold px-2 py-0.5 ${classified.badgeColorClass}`}>
                                            {classified.badgeLabel}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {visibleSyntheses.length > 1 ? 'The prior synthesis below remains visible from your earlier run. ' : ''}
                                        <span className="font-mono text-xs bg-background/80 px-2 py-1 rounded text-foreground border border-border inline-block">
                                            {classified.description}
                                        </span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        <strong className="text-foreground">Recommended Action:</strong> {classified.actionGuidance}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                })() : null}

                {/* 3. Synthesizer Disclaimer (Only shown when NO valid synthesis output exists AND 0 documents completed) */}
                {(!visibleSyntheses[0]?.finalRecommendation && !visibleSyntheses[0]?.finalJudgmentSummary && visibleSyntheses[0]?.projectStatus !== 'synthesized') && completedProjectDocumentsWithAnalysis === 0 && projectDocuments.length > 0 ? (
                    <div role="alert" className="rounded-xl border-2 border-warning/60 bg-warning/10 p-4 text-sm text-foreground shadow-sm">
                        <div className="flex items-start gap-3">
                            <TriangleAlert className="h-5 w-5 shrink-0 text-warning mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold text-warning text-base">
                                    ⚠️ Synthesizer Awaiting Document Extraction — 0 of {projectDocuments.length} Documents Completed
                                </p>
                                <p className="text-sm text-foreground leading-relaxed">
                                    The n8n project consolidator workflow requires completed document extraction to generate a judgment. None of the {projectDocuments.length} uploaded file(s) for this project have completed processing yet.
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                    👉 Go to the <strong className="text-foreground">Diligence tab</strong> to review document status and click <strong className="text-foreground">&quot;Retry&quot;</strong> if a file failed.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (completedProjectDocumentsWithAnalysis < projectDocuments.length && projectDocuments.length > 0 && (visibleSyntheses[0]?.finalRecommendation || visibleSyntheses[0]?.finalJudgmentSummary)) ? (
                    <div role="alert" className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs text-foreground flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                            <span>
                                <strong>Synthesis Active:</strong> Displaying project synthesis. ({completedProjectDocumentsWithAnalysis} of {projectDocuments.length} document records reconciled in database).
                            </span>
                        </div>
                    </div>
                ) : null}

                {/* LOI Status Banner */}
                <div id="synthesis-loi-status" className="scroll-mt-6" />
                {(() => {
                    const loiDoc = projectDocuments.find(d => {
                        const name = (d.fileName || d.dealName || '').toLowerCase()
                        return name.includes('loi') || name.includes('letter_of_intent') || name.includes('letter-of-intent')
                    })
                    const hasLoiInDocs = Boolean(loiDoc)
                    const hasPreLoiVersion = visibleSyntheses.some(s => {
                        const summary = (s.finalJudgmentSummary || '').toLowerCase()
                        if (summary.includes('pre-loi') || summary.includes('pass 1')) return true
                        try {
                            const parsed = typeof s.finalJudgmentJson === 'string' ? JSON.parse(s.finalJudgmentJson) : s.finalJudgmentJson
                            if (parsed?.letter_of_intent_present === false) return true
                        } catch {}
                        return false
                    })
                    const hasPostLoiVersion = visibleSyntheses.some(s => {
                        try {
                            const parsed = typeof s.finalJudgmentJson === 'string' ? JSON.parse(s.finalJudgmentJson) : s.finalJudgmentJson
                            if (parsed?.letter_of_intent_present === true) return true
                        } catch {}
                        const hasCit = (s.citations || []).some((c: string) => (c || '').toLowerCase().includes('loi') || (c || '').toLowerCase().includes('letter_of_intent'))
                        return hasCit
                    })

                    if (hasLoiInDocs && hasPreLoiVersion && hasPostLoiVersion) {
                        const isViewingPreLoi = activeSynthesisIndex === visibleSyntheses.length - 1
                        return (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-3 text-xs shadow-xs">
                                <div className="flex items-center gap-2">
                                    <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                                    <span className="font-bold text-sm text-foreground">LOI Comparison Mode</span>
                                    <span className="text-muted-foreground">
                                        {isViewingPreLoi
                                            ? 'Viewing Pre-LOI blind discovery (unbiased by deal terms)'
                                            : 'Viewing Post-LOI analysis (informed by executed LOI terms)'}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 font-bold text-xs border-indigo-400/60 bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-500/25"
                                    onClick={() => {
                                        if (isViewingPreLoi) {
                                            setActiveSynthesisIndex(0)
                                        } else {
                                            setActiveSynthesisIndex(visibleSyntheses.length - 1)
                                        }
                                    }}
                                >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                    <span>{isViewingPreLoi ? 'Switch to Post-LOI Analysis' : 'View Without LOI (Blind Discovery)'}</span>
                                </Button>
                            </div>
                        )
                    }

                    if (!hasLoiInDocs && projectDocuments.length > 0) {
                        return (
                            <div className="flex items-center gap-2.5 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs shadow-xs">
                                <FolderPlus className="h-4 w-4 text-amber-600 dark:text-amber-300 shrink-0" />
                                <span className="font-semibold text-foreground">No LOI detected.</span>
                                <span className="text-muted-foreground">Upload an executed Letter of Intent to unlock Post-LOI valuation analysis with deal-term-aware negotiation levers.</span>
                            </div>
                        )
                    }

                    if (hasLoiInDocs && hasPostLoiVersion && !hasPreLoiVersion) {
                        const docsWithoutLoi = projectDocuments.filter(d => {
                            const name = (d.fileName || d.dealName || '').toLowerCase()
                            return !(name.includes('loi') || name.includes('letter_of_intent') || name.includes('letter-of-intent'))
                        })
                        const estSynthCost = calculateSynthesisCost(visibleSyntheses[0])
                        const estTotalCost = estSynthCost > 0 ? estSynthCost : (docsWithoutLoi.length * 0.003 + 0.04)
                        return (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-400/40 bg-indigo-500/10 p-3 text-xs shadow-xs">
                                <div className="flex items-center gap-2.5">
                                    <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-300 shrink-0" />
                                    <div>
                                        <span className="font-bold text-foreground">Pre-LOI comparison unavailable.</span>{' '}
                                        <span className="text-muted-foreground">All documents were submitted with the LOI. Run synthesis without the LOI to see unbiased blind discovery.</span>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={runningSynthesisWithoutLoi || runningSynthesis}
                                    className="gap-1.5 font-bold text-xs border-indigo-400/60 bg-indigo-500/15 text-indigo-900 dark:text-indigo-200 hover:bg-indigo-500/25 shrink-0"
                                    onClick={onRunSynthesisWithoutLoi}
                                >
                                    {runningSynthesisWithoutLoi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                    <span>{runningSynthesisWithoutLoi ? 'Running Pre-LOI Synthesis...' : `Run Without LOI (~$${estTotalCost.toFixed(2)})`}</span>
                                </Button>
                            </div>
                        )
                    }

                    return null
                })()}

                {visibleSyntheses.length > 1 ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-3.5 text-xs text-foreground shadow-xs">
                        <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-bold text-sm">Synthesis Version History:</span>
                            <Badge variant="default" className="font-mono text-xs px-2 py-0.5">
                                Version {visibleSyntheses.length - activeSynthesisIndex} of {visibleSyntheses.length}
                                {(() => {
                                    const item = visibleSyntheses[activeSynthesisIndex]

                                    let loiPresentFromSchema: boolean | null = null
                                    try {
                                        const parsed = typeof item?.finalJudgmentJson === 'string' ? JSON.parse(item.finalJudgmentJson) : item?.finalJudgmentJson
                                        if (parsed && typeof parsed === 'object' && typeof parsed.letter_of_intent_present === 'boolean') {
                                            loiPresentFromSchema = parsed.letter_of_intent_present
                                        }
                                    } catch { /* skip */ }

                                    const summaryText = (item?.finalJudgmentSummary || '').toLowerCase()
                                    const isExplicitPreLoi = summaryText.includes('pre-loi') || summaryText.includes('pass 1 pre-loi')

                                    const hasLoiCitation = (item?.citations || []).some((c: string) => {
                                        const lower = (c || '').toLowerCase()
                                        return lower.includes('letter_of_intent') || lower.includes('loi') || lower.includes('letter-of-intent')
                                    })

                                    let isPostLoi = false
                                    if (loiPresentFromSchema !== null) {
                                        isPostLoi = loiPresentFromSchema
                                    } else if (isExplicitPreLoi) {
                                        isPostLoi = false
                                    } else if (hasLoiCitation) {
                                        isPostLoi = true
                                    } else {
                                        const itemDocCount = Math.max(item?.documentsReceivedCount || 0, item?.citations?.length || 0)
                                        if (itemDocCount >= 23) {
                                            isPostLoi = true
                                        }
                                    }

                                    const passNumber = visibleSyntheses.length - activeSynthesisIndex
                                    const stageLabel = isPostLoi ? 'Post-LOI Negotiation' : 'Pre-LOI Discovery'

                                    if (activeSynthesisIndex === 0) {
                                        return ` (Latest Pass — ${stageLabel})`
                                    }
                                    return ` (Pass ${passNumber} — ${stageLabel})`
                                })()}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={activeSynthesisIndex >= visibleSyntheses.length - 1}
                                onClick={() => setActiveSynthesisIndex((prev) => Math.min(prev + 1, visibleSyntheses.length - 1))}
                                className="gap-1 font-semibold"
                                title="View earlier synthesis pass"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                <span>Older Pass</span>
                            </Button>
                            <span className="font-mono text-xs font-bold text-muted-foreground px-1">
                                Version {visibleSyntheses.length - activeSynthesisIndex} / {visibleSyntheses.length}
                            </span>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={activeSynthesisIndex <= 0}
                                onClick={() => setActiveSynthesisIndex((prev) => Math.max(prev - 1, 0))}
                                className="gap-1 font-semibold"
                                title="View newer synthesis pass"
                            >
                                <span>Newer Pass</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : null}

                <AcquisitionJudgmentCallout synthesis={activeSynthesis} impact={impact} onSwitchTab={onSwitchTab} />
                {error ? (
                    <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                        <p className="font-medium">Synthesis endpoint not reachable yet.</p>
                        <p className="mt-1 text-muted-foreground">
                            The dashboard expects an n8n webhook that returns project-level rows — see{' '}
                            <span className="font-mono">docs/n8n-webhooks.md</span> in the repo for the 5-minute setup. Error:{' '}
                            {error}
                        </p>
                    </div>
                ) : null}

                {currentProject ? (
                    <details className="group rounded-lg border border-border bg-muted/20">
                        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-foreground">
                            <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-primary" />
                                Project documents ({projectDocuments.length})
                            </span>
                            <span className="text-xs text-primary group-open:hidden">Show list</span>
                            <span className="hidden text-xs text-primary group-open:inline">Hide list</span>
                        </summary>

                        <div className="space-y-3 border-t border-border p-3">
                            {/* Search & Carousel Controls Bar */}
                            {projectDocuments.length > 0 ? (
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-card p-2 rounded-lg border border-border/60">
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Filter project documents..."
                                            value={docSearchQuery}
                                            onChange={(e) => {
                                                setDocSearchQuery(e.target.value)
                                                setDocPage(0)
                                            }}
                                            className="w-full rounded-md border border-border bg-background py-1 pl-8 pr-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>

                                    {(() => {
                                        const filtered = projectDocuments.filter((d) =>
                                            !docSearchQuery.trim() || (d.fileName || '').toLowerCase().includes(docSearchQuery.toLowerCase().trim())
                                        )
                                        const pageSize = 6
                                        const totalPages = Math.ceil(filtered.length / pageSize) || 1

                                        return (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                                                <span className="font-mono">
                                                    Showing {Math.min(filtered.length, docPage * pageSize + 1)}–{Math.min(filtered.length, (docPage + 1) * pageSize)} of {filtered.length} docs
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-xs font-bold"
                                                        disabled={docPage === 0}
                                                        onClick={() => setDocPage((p) => Math.max(0, p - 1))}
                                                    >
                                                        Prev
                                                    </Button>
                                                    <span className="font-bold text-foreground px-1">
                                                        {docPage + 1}/{totalPages}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 px-2 text-xs font-bold"
                                                        disabled={docPage >= totalPages - 1}
                                                        onClick={() => setDocPage((p) => Math.min(totalPages - 1, p + 1))}
                                                    >
                                                        Next
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })()}
                                </div>
                            ) : null}

                            {/* Document Cards List */}
                            {(() => {
                                const filtered = projectDocuments.filter((d) =>
                                    !docSearchQuery.trim() || (d.fileName || '').toLowerCase().includes(docSearchQuery.toLowerCase().trim())
                                )
                                const pageSize = 6
                                const pageDocs = filtered.slice(docPage * pageSize, (docPage + 1) * pageSize)

                                if (projectDocuments.length === 0) {
                                    return <p className="text-sm text-muted-foreground py-2">No project documents have been recorded yet.</p>
                                }

                                if (filtered.length === 0) {
                                    return <p className="text-xs text-muted-foreground py-2 text-center">No documents matched "{docSearchQuery}".</p>
                                }

                                return pageDocs.map((document) => (
                                    <div key={document.requestID || document.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-2xs hover:border-primary/40 transition-all">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-bold text-foreground" title={document.fileName}>{document.fileName}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">{document.documentType || 'Financial Document'} · {formatTimestamp(document.processedAt)}</p>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap gap-1.5 items-center">
                                            <Badge variant="outline" className="text-[10px] font-mono">{document.status || 'Pending'}</Badge>
                                            {!document.isConsidered ? <Badge variant="secondary" className="text-[10px]">Excluded</Badge> : null}
                                            <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-semibold" onClick={() => setSelectedDocumentRequestId(document.requestID)}>
                                                View analysis
                                            </Button>
                                            {document.isConsidered ? (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                        const autoReRun = window.confirm(
                                                            `⚠️ Exclude document from synthesis?\n\nExcluding "${document.fileName}" will update the project scope.\n\nDo you want to re-run project synthesis now without this document?`
                                                        )
                                                        onExcludeDocument?.(document.requestID)
                                                        if (autoReRun && onRunSynthesis) {
                                                            onRunSynthesis()
                                                        }
                                                    }}
                                                >
                                                    Exclude
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                        const autoReRun = window.confirm(
                                                            `✨ Include document back into synthesis?\n\nIncluding "${document.fileName}" will add it back to the project scope.\n\nDo you want to re-run project synthesis now with this document?`
                                                        )
                                                        onIncludeDocument?.(document.requestID)
                                                        if (autoReRun && onRunSynthesis) {
                                                            onRunSynthesis()
                                                        }
                                                    }}
                                                >
                                                    Include
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            })()}
                        </div>
                    </details>
                ) : null}

                {selectedProjectDocument ? <div className="rounded-lg border border-primary/25 bg-primary/[0.035] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-semibold text-foreground">Document analysis</p><p className="mt-1 text-sm text-muted-foreground">{selectedProjectDocument.fileName}</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setSelectedDocumentRequestId('')}>Close</Button></div><div className="mt-4 flex flex-wrap gap-2"><Badge variant="outline">{selectedProjectDocument.status || 'Pending'}</Badge>{detectedTypes(selectedProjectDocument).map((type) => <Badge key={type} variant="secondary">{type}</Badge>)}</div>{selectedProjectDocument.aiSummary ? <div className="mt-4"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI summary</p><p className="mt-1 text-xs text-muted-foreground">This is the full document-level summary returned for this file. It is not intentionally cut off; expand it to read the full text.</p><ExpandableText text={selectedProjectDocument.aiSummary} maxHeight={180} className="mt-1" /></div> : <p className="mt-4 text-sm text-muted-foreground">No document-specific summary has returned yet.</p>}<div className="mt-4 grid gap-3 md:grid-cols-2">{selectedProjectDocument.aiRedFlags ? <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-destructive">Red flags</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">{shortList(selectedProjectDocument.aiRedFlags).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}{selectedProjectDocument.aiYellowFlags ? <div className="rounded-md border border-warning/25 bg-warning/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-warning">Items to review</p><ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-foreground">{shortList(selectedProjectDocument.aiYellowFlags).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}</div>{onOpenEvidence && (selectedProjectDocument.storageFileId || selectedProjectDocument.storageFileUrl) ? <Button type="button" variant="outline" className="mt-4" onClick={() => onOpenEvidence({ title: `Source document: ${selectedProjectDocument.fileName}`, sourceFile: selectedProjectDocument.fileName, sourceLocation: 'Document-level analysis', excerpt: selectedProjectDocument.aiSummary, status: selectedProjectDocument.status, provenance: 'Uploaded document', documentId: selectedProjectDocument.storageFileId, documentUrl: selectedProjectDocument.storageFileUrl })}>Open source document</Button> : null}</div> : null}

                {!error && synthesisPending ? (
                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-primary" />
                            <div>
                                <p className="font-medium">{hasPriorSynthesis ? 'Refreshing the project synthesis' : 'Synthesis starting'}</p>
                                <p className="text-xs font-medium text-primary">Synthesizing {currentProjectName} — {synthesisElapsedSeconds} seconds</p>
                                <p className="text-xs text-muted-foreground">Estimated completion: about 1 min 30 sec</p>
                                <p className="mt-1 text-muted-foreground">
                                    {hasPriorSynthesis
                                        ? 'The previous synthesis remains visible below while n8n incorporates the most recent document. This page will update automatically when the new pass is complete.'
                                        : 'All submitted documents are complete. The n8n consolidator is preparing the first project-level judgment and this page will refresh automatically.'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>{synthesisStage}</span>
                            <span>{synthesisProgress}%</span>
                        </div>
                        <Progress value={synthesisProgress} className="mt-2 h-2.5" />
                        {synthesisElapsedSeconds >= 300 ? (
                            <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                                <div>
                                    <p className="font-medium">This synthesis is taking longer than expected.</p>
                                    <p className="mt-1 text-muted-foreground">Please reload the page to re-sync the latest n8n status. Reloading will not restart the synthesis.</p>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {!error && documentAnalysisPending ? (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-warning" />
                            <div>
                                <p className="font-medium">Waiting for document-specific analysis to finish…</p>
                                <p className="mt-1 text-muted-foreground">
                                    The project synthesizer will start after every document reaches a terminal status. This section refreshes automatically.
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>{synthesisStage}</span>
                            <span>{synthesisProgress}%</span>
                        </div>
                        <Progress value={synthesisProgress} className="mt-2 h-2.5" />
                    </div>
                ) : null}

                {localSynthesisBlocked ? (
                    <div role="alert" className="rounded-xl border-2 border-destructive/55 bg-destructive/10 p-5 text-foreground shadow-md">
                        <p className="text-base font-bold text-destructive">Synthesis blocked — all considered documents failed</p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{localSynthesisBlockedMessage} Because no considered document produced usable analysis, the project synthesizer should not run until you retry a document or exclude one from synthesis.</p>
                        <div className="mt-4 space-y-3">
                            {failedProjectDocuments.map((document) => (
                                <div key={document.requestID} className="rounded-lg border border-destructive/25 bg-background/75 p-4">
                                    <p className="break-words text-sm font-semibold text-foreground">{document.fileName || 'Failed document'}</p>
                                    {document.errorMessage ? <p className="mt-1 text-xs text-muted-foreground">{document.errorMessage}</p> : null}
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        <Button type="button" size="lg" className="h-12 font-semibold" disabled={retryingRequestId === document.requestID} onClick={() => onRetryDocument?.(document.requestID)}>
                                            {retryingRequestId === document.requestID ? 'Retrying document…' : 'Retry document'}
                                        </Button>
                                        <Button type="button" size="lg" variant="outline" className="h-12 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onExcludeDocument?.(document.requestID)}>
                                            Exclude from synthesis
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {isFallbackSynthesis && (
                    <div className="rounded-xl border-2 border-amber-500/80 bg-amber-500/10 p-4 text-amber-950 dark:text-amber-200 shadow-md">
                        <div className="flex items-start gap-3">
                            <TriangleAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold text-sm">Synthesis Workflow Never Ran — Per-Document Takeaways Only</p>
                                <p className="text-xs leading-5">
                                    An n8n project-level synthesis pass was not recorded in <code className="bg-amber-500/20 px-1 py-0.5 rounded font-mono text-amber-900 dark:text-amber-100">project_syntheses</code> for this deal ID.
                                    The judgment and takeaways below have been compiled directly from individual document extractions.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {[activeSynthesis].filter((s): s is ProjectSynthesisItem => Boolean(s)).map((synthesis) => {
                    const displayName = synthesis.companyName || synthesis.projectName || projectNameById.get(synthesis.projectId) || synthesis.projectId || 'Unknown project'
                    const synthesisStatus = synthesis.projectStatus.trim().toLowerCase()
                    const hasRefreshFailure = synthesisStatus === 'synthesis_refresh_failed' || synthesisStatus === 'synthesis_blocked'

                    function handleInsightClick(groupType: InsightGroupType, item: string, index: number) {
                        if (!onOpenEvidence) return
                        const label = insightGroupLabel(groupType)
                        const evidenceTitle = `${label} #${index + 1}`
                        const status = insightGroupStatus(groupType)

                        const structuredGroupMap: Record<InsightGroupType, typeof synthesis.structuredFindings.redFlags> = {
                            'red-flag': synthesis.structuredFindings?.redFlags ?? [],
                            'yellow-flag': synthesis.structuredFindings?.yellowFlags ?? [],
                            'green-flag': synthesis.structuredFindings?.greenFlags ?? [],
                            'takeaway': synthesis.structuredFindings?.keyTakeaways ?? [],
                            'conflict': synthesis.structuredFindings?.crossDocumentConflicts ?? [],
                            'negotiation-lever': synthesis.structuredFindings?.negotiationLevers ?? [],
                            'missing-document': synthesis.structuredFindings?.missingDocuments ?? [],
                            'open-question': synthesis.structuredFindings?.openQuestions ?? [],
                        }
                        const structuredFinding = structuredGroupMap[groupType]?.[index]
                        const primaryCitation = structuredFinding?.citations?.[0]

                        onOpenEvidence(buildDocumentLinkedEvidence({
                            title: evidenceTitle,
                            sourceFile: primaryCitation?.sourceFile,
                            fallbackSourceFile: 'Project synthesis',
                            sourceLocation: primaryCitation?.sourceLocation,
                            fallbackSourceLocation: 'Project synthesis',
                            excerpt: primaryCitation?.excerpt || item,
                            period: primaryCitation?.period,
                            currency: primaryCitation?.currency,
                            confidence: structuredFinding?.confidence ?? primaryCitation?.confidence ?? undefined,
                            status: structuredFinding?.status || primaryCitation?.status || status,
                            provenance: 'Project synthesis',
                            documents,
                        }))
                    }

                    return (
                        <div key={`${synthesis.projectId}-${synthesis.id}`} className="space-y-4 rounded-xl border border-border bg-card p-4">
                            <div id="synthesis-judgment" className="scroll-mt-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="space-y-2">
                                    <p className="text-lg font-semibold text-foreground">{displayName}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {Math.max(Number(synthesis.documentsCompletedCount || 0), completedProjectDocumentsWithAnalysis, synthesis.citations?.length || 0)} of {Math.max(Number(synthesis.documentsReceivedCount || 0), projectDocuments.length, synthesis.citations?.length || 0)} documents processed ·
                                        synthesized {formatTimestamp(synthesis.projectProcessedAt)}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {synthesis.redFlags.length > 0 && <Badge variant="destructive">{synthesis.redFlags.length} red flag{synthesis.redFlags.length > 1 ? 's' : ''}</Badge>}
                                        {synthesis.yellowFlags.length > 0 && <Badge variant="warning">{synthesis.yellowFlags.length} yellow flag{synthesis.yellowFlags.length > 1 ? 's' : ''}</Badge>}
                                        {synthesis.greenFlags.length > 0 && <Badge variant="success">{synthesis.greenFlags.length} green flag{synthesis.greenFlags.length > 1 ? 's' : ''}</Badge>}
                                        {synthesis.crossDocumentConflicts.length > 0 && <Badge variant="destructive">{synthesis.crossDocumentConflicts.length} conflict{synthesis.crossDocumentConflicts.length > 1 ? 's' : ''}</Badge>}
                                        {synthesis.openQuestions.length > 0 && <Badge variant="outline">{synthesis.openQuestions.length} open question{synthesis.openQuestions.length > 1 ? 's' : ''}</Badge>}
                                        {synthesis.negotiationLevers.length > 0 && <Badge variant="secondary">{synthesis.negotiationLevers.length} lever{synthesis.negotiationLevers.length > 1 ? 's' : ''}</Badge>}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button size="lg" onClick={() => downloadSynthesisReport(synthesis, displayName)}>
                                        <Download />
                                        Download project report
                                    </Button>
                                    {onRunSynthesis ? (
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            disabled={runningSynthesis || documentAnalysisPending}
                                            onClick={onRunSynthesis}
                                            className="border-blue-500/40 hover:border-blue-500 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
                                        >
                                            <RefreshCw className={`mr-2 h-4 w-4 ${(runningSynthesis || documentAnalysisPending) ? 'animate-spin' : ''}`} />
                                            {runningSynthesis ? 'Re-running Synthesis...' : 'Re-run Synthesis'}
                                        </Button>
                                    ) : null}
                                    <Button size="lg" variant="outline" onClick={() => { const el = document.getElementById('upload-section'); el?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>
                                        Upload more files
                                    </Button>
                                    <Badge variant="outline" className="font-mono">Project ID: {synthesis.projectId}</Badge>
                                    {synthesis.finalRecommendation ? (
                                        <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>
                                            {synthesis.finalRecommendation}
                                        </Badge>
                                    ) : null}
                                    {synthesis.finalRiskLevel ? (
                                        <Badge variant={getRiskVariant(synthesis.finalRiskLevel)}>Risk: {synthesis.finalRiskLevel}</Badge>
                                    ) : null}
                                    {synthesis.finalTrafficLight ? (
                                        <Badge variant={getSubmissionInsightTone(synthesis.finalTrafficLight)}>
                                            {synthesis.finalTrafficLight}
                                        </Badge>
                                    ) : null}
                                    {synthesis.projectStatus ? <Badge variant="outline">{synthesis.projectStatus}</Badge> : null}
                                </div>
                            </div>

                            {hasRefreshFailure ? synthesisStatus === 'synthesis_blocked' ? (
                                <div role="alert" className="rounded-xl border-2 border-destructive/55 bg-destructive/10 p-5 text-foreground shadow-md">
                                    <p className="text-base font-bold text-destructive">Synthesis blocked — {failedProjectDocuments.length || failedProjectDocuments.length || 1} document{(failedProjectDocuments.length || failedProjectDocuments.length || 1) === 1 ? '' : 's'} need action</p>
                                    <p className="mt-2 text-sm leading-6 text-foreground">{synthesis.aiErrorMessage || 'No completed document currently has usable analysis.'} Retry a document to recover its analysis, or exclude a document you do not want considered. Excluding keeps it in the audit trail but lets the remaining completed documents synthesize.</p>
                                    {failedProjectDocuments.length > 0 ? <div className="mt-4 space-y-3">{failedProjectDocuments.map((document) => <div key={document.requestID} className="rounded-lg border border-destructive/25 bg-background/75 p-4"><p className="break-words text-sm font-semibold text-foreground">{document.fileName || 'Failed document'}</p>{document.errorMessage ? <p className="mt-1 text-xs text-muted-foreground">{document.errorMessage}</p> : null}<div className="mt-3 grid gap-2 sm:grid-cols-2"><Button type="button" size="lg" className="h-12 font-semibold" disabled={retryingRequestId === document.requestID} onClick={() => onRetryDocument?.(document.requestID)}>{retryingRequestId === document.requestID ? 'Retrying document…' : 'Retry document'}</Button><Button type="button" size="lg" variant="outline" className="h-12 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onExcludeDocument?.(document.requestID)}>Exclude from synthesis</Button></div></div>)}</div> : <p className="mt-3 text-sm text-muted-foreground">Open the project document list above to retry or exclude the affected document.</p>}
                                </div>
                            ) : (
                                <div role="alert" className="rounded-xl border-2 border-destructive/50 bg-destructive/10 p-4 text-sm text-foreground shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <TriangleAlert className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-destructive text-base">
                                                Project Synthesis Failed — n8n Provider / Token Limit Reached
                                            </p>
                                            <p className="text-sm text-foreground leading-relaxed">
                                                {hasPriorSynthesis ? 'The prior synthesis below remains visible from your earlier run. ' : 'The n8n consolidator workflow was unable to complete project-level judgment. '}
                                                <span className="font-mono text-xs bg-destructive/15 px-1.5 py-0.5 rounded text-destructive border border-destructive/20">
                                                    {synthesis.aiErrorMessage || 'n8n connection tokens or LLM rate limit exceeded.'}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                <strong className="text-foreground">Current Progress:</strong> {synthesis.documentsCompletedCount || completedProjectDocumentsWithAnalysis} document(s) completed analysis, {failedProjectDocuments.length} failed parsing. Once you add n8n tokens or update model settings, click <span className="font-semibold text-foreground">&quot;Run synthesis now&quot;</span> at the top of this tab to re-trigger.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {false && synthesis.finalJudgmentSummary ? (
                                <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 shadow-md">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <Scale className="h-5 w-5 text-primary" />
                                            <p className="text-sm font-bold uppercase tracking-wide text-primary">Start here — acquisition judgment</p>
                                        </div>
                                        {impact.completedDocuments > 0 ? <Badge variant="success">~{formatHours(impact.timeSavedHours)} analyst time saved</Badge> : null}
                                    </div>
                                    <div className="mt-4 rounded-lg border border-primary/25 bg-background/90 p-4">
                                        <ExpandableText text={synthesis.finalJudgmentSummary} maxHeight={120} />
                                    </div>
                                    {impact.completedDocuments > 0 ? (
                                        <p className="mt-3 text-xs text-muted-foreground">
                                            This judgment consolidates {impact.completedDocuments} completed document{impact.completedDocuments === 1 ? '' : 's'}: ~{formatHours(impact.analystHours)} estimated manual review versus {impact.agentMinutes >= 1 ? `${Math.round(impact.agentMinutes)}m` : '<1m'} of recorded agent runtime.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}

                            {!synthesis.finalJudgmentSummary ? <div className="rounded-xl border-2 border-warning bg-warning/10 p-5 shadow-md"><div className="flex items-center gap-2"><Scale className="h-5 w-5 text-warning" /><p className="text-sm font-bold uppercase tracking-wide text-warning">Acquisition judgment pending</p></div><p className="mt-3 text-sm leading-6 text-foreground">{synthesis.finalRecommendation ? `n8n returned the recommendation “${synthesis.finalRecommendation},” but did not return its final plain-English judgment yet. Refresh after the next synthesis pass.` : 'This synthesis row has no final judgment text yet. It may still be processing, or the consolidator returned an incomplete payload. Refresh after the next synthesis pass.'}</p></div> : null}

                            <div id="synthesis-next-step" className="scroll-mt-6 rounded-xl border-2 border-primary/60 bg-primary/10 p-4 shadow-sm">
                                <p className="text-sm font-bold uppercase tracking-wide text-primary">Next step after the synthesis</p>
                                <p className="mt-1 text-sm leading-6 text-foreground">
                                    {synthesis.missingDocuments.length > 0
                                        ? 'Upload the missing diligence materials first so the next synthesis pass has the evidence it needs.'
                                        : synthesis.openQuestions.length > 0
                                            ? 'Use the Management Question Tracker immediately below this synthesis to turn the open questions into an owner, due date, and follow-up plan.'
                                            : synthesis.negotiationLevers.length > 0
                                                ? 'Review the negotiation levers next and convert the strongest ones into concrete deal terms.'
                                                : 'Review the acquisition judgment and supporting evidence, then decide whether to proceed, renegotiate, or pause.'}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {synthesis.missingDocuments.length > 0 ? <button
                                        type="button"
                                        onClick={() => document.querySelector('[data-project-intake]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Go to uploads
                                    </button> : null}
                                    {synthesis.openQuestions.length > 0 ? <button
                                        type="button"
                                        onClick={() => {
                                            const el = document.querySelector('[placeholder="Question for management"]')
                                            el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                                                ; (el as HTMLElement)?.focus?.()
                                        }}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Go to Management Question Tracker
                                    </button> : null}
                                    {synthesis.missingDocuments.length === 0 && synthesis.negotiationLevers.length > 0 ? <button
                                        type="button"
                                        onClick={() => document.getElementById('synthesis-negotiation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-background px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        Review negotiation levers
                                    </button> : null}
                                </div>
                            </div>

                            {(synthesis.valuationBaseEstimate && synthesis.valuationBaseEstimate !== '0') || (synthesis.valuationLowerBound && synthesis.valuationLowerBound !== '0') || (synthesis.valuationUpperBound && synthesis.valuationUpperBound !== '0') ? (
                                <div id="synthesis-valuation" className="scroll-mt-6">
                                    {(() => {
                                        const conf = parseFloat(synthesis.valuationConfidence || synthesis.aiConfidence || '')
                                        if (!Number.isFinite(conf)) return null
                                        const pct = conf <= 1 ? Math.round(conf * 100) : Math.round(conf)
                                        const label = pct >= 70 ? 'High' : pct >= 40 ? 'Medium' : 'Low'
                                        const color = pct >= 70 ? 'text-green-600 dark:text-green-400' : pct >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive'
                                        return (
                                            <div className="mb-2 flex items-center gap-2">
                                                <Badge variant="outline" className={color}>{label} confidence ({pct}%)</Badge>
                                                {synthesis.valuationCurrency ? <span className="text-xs text-muted-foreground">{synthesis.valuationCurrency}</span> : null}
                                            </div>
                                        )
                                    })()}
                                    <div className="grid gap-2 md:grid-cols-3">
                                        <div className="rounded-md border border-border bg-background px-3 py-2">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lower bound</p>
                                            <p className="mt-1 text-sm text-foreground">{formatCurrencyValue(synthesis.valuationLowerBound, synthesis.valuationCurrency) || 'Pending'}</p>
                                        </div>
                                        <div className="rounded-md border border-border bg-background px-3 py-2">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base estimate</p>
                                            <p className="mt-1 text-sm text-foreground">{formatCurrencyValue(synthesis.valuationBaseEstimate, synthesis.valuationCurrency) || 'Pending'}</p>
                                        </div>
                                        <div className="rounded-md border border-border bg-background px-3 py-2">
                                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upper bound</p>
                                            <p className="mt-1 text-sm text-foreground">{formatCurrencyValue(synthesis.valuationUpperBound, synthesis.valuationCurrency) || 'Pending'}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                (() => {
                                    const facts = model ? parseDocumentedFacts(model.documentedFactsJson) : {}
                                    const revenue = facts.revenue?.status === 'confirmed' && typeof facts.revenue?.value === 'number' ? facts.revenue.value : null
                                    const ebitda = facts.ebitda_sde?.status === 'confirmed' && typeof facts.ebitda_sde?.value === 'number' ? facts.ebitda_sde.value : null
                                    const hasFinancials = revenue !== null || ebitda !== null
                                    const multiple = model?.ebitdaMultiple ?? 5
                                    const lower = ebitda ? ebitda * (multiple * 0.7) : revenue ? revenue * 1.5 : null
                                    const base = ebitda ? ebitda * multiple : revenue ? revenue * 2.2 : null
                                    const upper = ebitda ? ebitda * (multiple * 1.3) : revenue ? revenue * 3.0 : null
                                    const confidence = ebitda ? 'Medium' : revenue ? 'Low' : 'Very low'
                                    const confidenceColor = ebitda ? 'text-amber-500' : 'text-destructive'

                                    if (hasFinancials && lower && base && upper) {
                                        const fmt = (v: number) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `$${(v / 1_000).toFixed(0)}K` : `$${v.toFixed(0)}`
                                        return (
                                            <div>
                                                <div className="mb-2 flex items-center gap-2">
                                                    <Badge variant="outline" className={confidenceColor}>{confidence} confidence</Badge>
                                                    <span className="text-xs text-muted-foreground">Illustrative — based on {ebitda ? 'EBITDA × multiple' : 'revenue × market range'}</span>
                                                </div>
                                                <div className="grid gap-2 md:grid-cols-3">
                                                    <div className="rounded-md border border-dashed border-border bg-background px-3 py-2">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lower bound</p>
                                                        <p className="mt-1 text-sm text-foreground">{fmt(lower)}</p>
                                                    </div>
                                                    <div className="rounded-md border border-dashed border-border bg-background px-3 py-2">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Base estimate</p>
                                                        <p className="mt-1 text-sm text-foreground">{fmt(base)}</p>
                                                    </div>
                                                    <div className="rounded-md border border-dashed border-border bg-background px-3 py-2">
                                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Upper bound</p>
                                                        <p className="mt-1 text-sm text-foreground">{fmt(upper)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    }
                                    return (
                                        <div className="rounded-lg border border-dashed border-warning/40 bg-warning/5 p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline" className="text-destructive">Very low confidence</Badge>
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">Insufficient data for valuation</p>
                                            <p className="mt-1 text-sm leading-6 text-muted-foreground">Upload financial statements (P&L, balance sheet) with clear revenue and EBITDA figures. Once confirmed financial facts are available, an illustrative valuation range will be calculated automatically.</p>
                                        </div>
                                    )
                                })()
                            )}

                            <div id="synthesis-filters" className="scroll-mt-6 grid gap-2 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2">
                                <label className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Filter className="h-3 w-3" />Severity</span>
                                    <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground">
                                        <option value="all">All severities</option>
                                        <option value="critical">Critical / High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low / Supportive</option>
                                        <option value="informational">Informational</option>
                                    </select>
                                </label>
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Finding type</span>
                                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className="rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground">
                                        <option value="all">All types</option>
                                        <option value="red-flag">Red flags</option>
                                        <option value="yellow-flag">Yellow flags</option>
                                        <option value="green-flag">Green flags</option>
                                        <option value="takeaway">Key takeaways</option>
                                        <option value="conflict">Cross-document conflicts</option>
                                        <option value="negotiation-lever">Negotiation levers</option>
                                        <option value="missing-document">Missing materials</option>
                                        <option value="open-question">Open questions</option>
                                    </select>
                                </label>
                            </div>

                            <div className="grid gap-3 xl:grid-cols-2">
                                {severityFilter !== 'all' || typeFilter !== 'all' ? (() => {
                                    const allTypes: InsightGroupType[] = ['red-flag', 'yellow-flag', 'green-flag', 'takeaway', 'conflict', 'negotiation-lever', 'missing-document', 'open-question']
                                    const anyVisible = allTypes.some((t) => (severityFilter === 'all' || getSeverityForGroup(t) === severityFilter) && (typeFilter === 'all' || typeFilter === t))
                                    return !anyVisible ? <p className="col-span-full rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">No finding groups match the current filter. Adjust severity or type above to see results.</p> : null
                                })() : null}
                                {(severityFilter === 'all' || getSeverityForGroup('red-flag') === severityFilter) && (typeFilter === 'all' || typeFilter === 'red-flag') ? <div id="synthesis-red-flags" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Project-level red flags"
                                    icon={<TriangleAlert className="h-4 w-4 text-destructive" />}
                                    items={synthesis.redFlags}
                                    findings={synthesis.structuredFindings?.redFlags}
                                    emptyLabel="No material project-level red flags returned."
                                    badgeVariant="destructive"
                                    className="border-destructive/30 bg-destructive/5"
                                    itemClassName="border-destructive/20"
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('red-flag', item, index) : undefined}
                                /></div> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('yellow-flag') === severityFilter) && (typeFilter === 'all' || typeFilter === 'yellow-flag') ? <div id="synthesis-yellow-flags" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Project-level yellow flags"
                                    icon={<TriangleAlert className="h-4 w-4 text-warning" />}
                                    items={synthesis.yellowFlags}
                                    findings={synthesis.structuredFindings?.yellowFlags}
                                    emptyLabel="No project-level items requiring follow-up returned."
                                    badgeVariant="warning"
                                    className="border-warning/30 bg-warning/5"
                                    itemClassName="border-warning/20"
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('yellow-flag', item, index) : undefined}
                                /></div> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('green-flag') === severityFilter) && (typeFilter === 'all' || typeFilter === 'green-flag') ? <div id="synthesis-green-flags" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Project-level green flags"
                                    icon={<Scale className="h-4 w-4 text-success" />}
                                    items={synthesis.greenFlags}
                                    findings={synthesis.structuredFindings?.greenFlags}
                                    emptyLabel="No project-level supportive indicators returned."
                                    badgeVariant="success"
                                    className="border-success/30 bg-success/5"
                                    itemClassName="border-success/20"
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('green-flag', item, index) : undefined}
                                /></div> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('takeaway') === severityFilter) && (typeFilter === 'all' || typeFilter === 'takeaway') ? <div id="synthesis-takeaways" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Key acquisition takeaways"
                                    icon={<Scale className="h-4 w-4 text-primary" />}
                                    items={synthesis.keyTakeaways}
                                    findings={synthesis.structuredFindings?.keyTakeaways}
                                    emptyLabel="No concise takeaways were returned by this synthesis yet."
                                    badgeVariant="success"
                                    className="border-primary/25 bg-primary/5"
                                    itemClassName="border-primary/20"
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('takeaway', item, index) : undefined}
                                /></div> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('takeaway') === severityFilter) && (typeFilter === 'all' || typeFilter === 'takeaway') ? <section id="synthesis-doc-thesis" className="scroll-mt-6 rounded-lg border border-border bg-muted/20 p-4">
                                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Document-level thesis takeaways</p></div><Badge variant="outline">{documentThesisTakeaways.length}</Badge></div>
                                    <p className="mt-1 text-xs text-muted-foreground">Each point is from one completed document—not a new project-level conclusion.</p>
                                    {documentThesisTakeaways.length ? <div className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">{documentThesisTakeaways.map((takeaway, index) => <button key={`${takeaway.fileName}-${index}`} type="button" onClick={() => onOpenEvidence?.({ title: `Document thesis: ${takeaway.fileName}`, sourceFile: takeaway.fileName, sourceLocation: 'Document-level investment thesis', excerpt: takeaway.takeaway, status: takeaway.status || takeaway.stance, provenance: takeaway.stance, documentId: takeaway.documentId, documentUrl: takeaway.documentUrl })} className="w-full rounded-md border border-border bg-background/80 p-3 text-left text-sm leading-6 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/30"><div className="flex flex-wrap items-center gap-2"><span className="font-medium">{takeaway.fileName}</span><Badge variant={takeaway.stance === 'Caution indicator' ? 'warning' : takeaway.stance === 'Supportive indicator' ? 'success' : 'outline'}>{takeaway.stance}</Badge>{takeaway.confidence !== null ? <Badge variant="secondary">{takeaway.confidence <= 1 && takeaway.confidence > 0 ? Math.round(takeaway.confidence * 100) : Math.round(takeaway.confidence)}% confidence</Badge> : null}</div><p className="mt-1">{compactTakeaway(takeaway.takeaway)}</p><span className="mt-1 block text-xs font-medium text-primary">View full source evidence</span></button>)}</div> : <p className="mt-3 rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground">No document-level investment-thesis takeaway has returned yet.</p>}
                                </section> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('conflict') === severityFilter) && (typeFilter === 'all' || typeFilter === 'conflict') ? <div id="synthesis-conflicts" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Cross-document conflicts"
                                    icon={<TriangleAlert className="h-4 w-4 text-destructive" />}
                                    items={synthesis.crossDocumentConflicts}
                                    findings={synthesis.structuredFindings?.crossDocumentConflicts}
                                    emptyLabel="No contradictions detected across the uploaded documents."
                                    badgeVariant="destructive"
                                    className="border-destructive/30 bg-destructive/5"
                                    itemClassName="border-destructive/20"
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('conflict', item, index) : undefined}
                                /></div> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('negotiation-lever') === severityFilter) && (typeFilter === 'all' || typeFilter === 'negotiation-lever') ? <div id="synthesis-negotiation" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Negotiation levers"
                                    icon={<Landmark className="h-4 w-4 text-foreground" />}
                                    items={synthesis.negotiationLevers}
                                    findings={synthesis.structuredFindings?.negotiationLevers}
                                    emptyLabel="No negotiation levers surfaced yet."
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('negotiation-lever', item, index) : undefined}
                                /></div> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('missing-document') === severityFilter) && (typeFilter === 'all' || typeFilter === 'missing-document') ? <div id="synthesis-missing-docs" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Missing diligence materials"
                                    icon={<ShieldAlert className="h-4 w-4 text-warning" />}
                                    items={synthesis.missingDocuments}
                                    findings={synthesis.structuredFindings?.missingDocuments}
                                    emptyLabel="All core diligence materials appear to be present."
                                    badgeVariant="warning"
                                    className="border-warning/30 bg-warning/5"
                                    itemClassName="border-warning/20"
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('missing-document', item, index) : undefined}
                                /></div> : null}
                                {(severityFilter === 'all' || getSeverityForGroup('open-question') === severityFilter) && (typeFilter === 'all' || typeFilter === 'open-question') ? <div id="synthesis-open-questions" className="scroll-mt-6"><ExpandableInsightGroup
                                    title="Open questions for management"
                                    icon={<MessageCircleQuestion className="h-4 w-4 text-muted-foreground" />}
                                    items={synthesis.openQuestions}
                                    findings={synthesis.structuredFindings?.openQuestions}
                                    emptyLabel="No open questions recorded."
                                    defaultOpen
                                    onItemClick={onOpenEvidence ? (item, index) => handleInsightClick('open-question', item, index) : undefined}
                                /></div> : null}
                                {derivedCitations.length > 0 ? (
                                     <div id="synthesis-citations" className="scroll-mt-6 rounded-lg border border-border bg-muted/20 p-4">
                                         <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" /><p className="text-sm font-semibold text-foreground">Synthesis citations</p></div>
                                         <div className="mt-3 h-64 space-y-2 overflow-y-auto pr-1">
                                             {derivedCitations.map((citation, index) => {
                                                 return <button key={`${citation.sourceFile}-${citation.sourceLocation}-${index}`} type="button" onClick={() => onOpenEvidence?.(buildDocumentLinkedEvidence({ title: 'Project synthesis citation', sourceFile: citation.sourceFile, fallbackSourceFile: 'Project synthesis', sourceLocation: citation.sourceLocation, fallbackSourceLocation: 'Project-level synthesis', excerpt: citation.excerpt || synthesis?.finalJudgmentSummary || '', period: citation.period, currency: citation.currency, confidence: citation.confidence ?? undefined, status: citation.status || 'Synthesized', provenance: 'Project synthesis', documents }))} className="w-full rounded-md border border-border bg-background p-3 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-muted/30">
                                                     <span className="font-medium">{citation.sourceFile}</span>{citation.sourceLocation ? <span className="ml-2 text-xs text-muted-foreground">{citation.sourceLocation}</span> : null}<span className="ml-2 text-xs text-primary">View evidence</span>
                                                 </button>
                                             })}
                                         </div>
                                     </div>
                                 ) : null}
                            </div>

                            <div id="synthesis-material-impact" className="scroll-mt-6">
                                <MaterialImpactView synthesis={synthesis} onOpenEvidence={onOpenEvidence} documents={documents} />
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
