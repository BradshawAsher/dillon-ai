// Local-dev implementations of the hooks Retool generates from /backend/diligence.
//
// Default (live): calls the same-origin /api/diligence/* routes served by the
// Vite plugin in localApi.ts, which runs the real backend functions in Node and
// forwards to the n8n webhooks. The frontend itself never fetches external
// hosts, matching the handoff constraint.
//
// The Mock / Live n8n toggle (bottom-right of the page) switches sources at
// runtime; VITE_USE_MOCKS=true only sets the default. See lib/dataSource.ts.
//
// getDiligenceData is the exception: its backend reads Retool DB, which has no
// local equivalent, so it always returns null and the page shows its built-in
// sample findings.
import { useCallback, useState } from 'react'

import type { ProjectSynthesisItem } from '../../../backend/diligence/getProjectSynthesis'
import type { WorkflowErrorItem } from '../../../backend/diligence/getWorkflowErrors'
import type { WatchdogEventItem } from '../../../backend/diligence/getWatchdogEvents'
import { getDataSource } from '../../lib/dataSource'
import { identityHeaders } from '../../lib/identity'
import type { DiligenceFinding } from '../../utils/diligence'
import type { SubmissionHistoryItem } from '../../utils/submissionHistory'

export type { ProjectSynthesisItem, SubmissionHistoryItem, WatchdogEventItem }

const USE_MOCKS = getDataSource() === 'mock'

type TriggerPromise<T> = Promise<T> & { result: Promise<T> }

function withResult<T>(promise: Promise<T>): TriggerPromise<T> {
    const p = promise as TriggerPromise<T>
    p.result = promise
    return p
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

type QueryState<T> = {
    data: T | null
    loading: boolean
    error: string | null
}

export type DealModel = {
    projectId: string
    askingPrice: number | null
    purchasePrice: number | null
    debtAssumed: number | null
    cashAcquired: number | null
    workingCapitalRequirement: number | null
    transactionFees: number | null
    holdPeriodYears: number | null
    taxRate: number | null
    closingCosts: number | null
    maintenanceCapex: number | null
    exitMultiple: number | null
    exitCosts: number | null
    equityContributionPercent: number | null
    interestRate: number | null
    amortizationYears: number | null
    sellerNoteAmount: number | null
    bearRevenueGrowth: number | null
    baseRevenueGrowth: number | null
    bullRevenueGrowth: number | null
    bearEbitdaMargin: number | null
    baseEbitdaMargin: number | null
    bullEbitdaMargin: number | null
    bearExitMultiple: number | null
    baseExitMultiple: number | null
    bullExitMultiple: number | null
    revenueMultiple: number | null
    ebitdaMultiple: number | null
    assetHaircutPercent: number | null
    modelUpdatedAt: string
    modelUpdatedBy: string
    documentedFactsJson: string
    documentedFactsStatus: string
    // Derived at hydration time from the saved capital-stack inputs
    // (equityContributionPercent, sellerNoteAmount, purchase/asking price).
    // Left undefined until the analyst provides financing terms so that
    // "is financing defined?" checks and per-card fallbacks stay correct.
    seniorDebtAmount?: number | null
    equityAmount?: number | null
    loanTermYears?: number | null
    // Optional convenience fallbacks a few cards read only when no documented
    // fact is available. Not persisted; undefined unless a caller supplies them.
    revenue?: number | null
    ebitda?: number | null
    projectName?: string | null
}

function useQuery<T>(fetcher: (params?: Record<string, unknown>) => Promise<T>, initialData: T | null = null) {
    const [state, setState] = useState<QueryState<T>>({ data: initialData, loading: false, error: null })

    const trigger = useCallback(
        (params?: Record<string, unknown>, _options?: Record<string, unknown>) => {
            setState((previous) => ({ ...previous, loading: true }))
            const promise = (async () => {
                try {
                    const data = await fetcher(params)
                    setState({ data, loading: false, error: null })
                    return data
                } catch (error) {
                    const message = error instanceof Error ? error.message : String(error)
                    setState((previous) => ({ data: previous.data, loading: false, error: message }))
                    return null
                }
            })()
            return withResult(promise)
        },
        [fetcher]
    )

    return { ...state, trigger }
}

type SubmitPayload = {
    fileName: string
    fileSize: number
    fileType: string
    dealName: string
    companyName: string
    workstream: string
    submissionNotes: string
    projectId: string
    projectStage: string
    documentType: string
    analystName: string
    analystEmail: string
    triggerTimestamp: string
    requestID: string
    environment: 'production' | 'test'
    userAnthropicApiKey?: string
    userOpenAiApiKey?: string
    userGeminiApiKey?: string
    userDeepseekApiKey?: string
    userApiKey?: string
    userProvider?: string
}

type SubmitResponse = {
    status: string
    environment: 'production' | 'test'
    target: string
    method: 'POST'
    submittedAt: string
    submittedBy: string
    payload: SubmitPayload
    response: {
        requestID: string
        status: string
        receivedAt: string
        id?: number
        createdAt: string
        updatedAt: string
        environment: string
    }
}

// ---------------------------------------------------------------------------
// Live implementations (default): same-origin /api routes → real backend code
// ---------------------------------------------------------------------------

function getFriendlyErrorMessage(error: unknown): string {
    if (error instanceof TypeError && /fetch/i.test(error.message)) {
        return 'The local API server is not reachable. Start it with "cd frontend && npm start" (or "cd frontend && npm run dev" for the Vite dev server) and try again.'
    }

    if (error instanceof Error) {
        return error.message
    }

    return String(error)
}

async function fetchJson<T>(input: string, init?: RequestInit): Promise<T> {
    let response: Response

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 240_000)
        response = await fetch(input, { ...init, signal: controller.signal })
        clearTimeout(timeoutId)
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error('Request timed out. This usually means n8n has reached its execution limit or is unavailable. Try again later.')
        }
        throw new Error(getFriendlyErrorMessage(error))
    }

    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
        if (response.status === 504) {
            throw new Error('Vercel serverless timeout (HTTP 504). The submission pipeline took longer than the serverless execution limit while dispatching to n8n. Processing may still finish in the background — please check history or try again.')
        }
        if (response.status === 413) {
            throw new Error('Document payload exceeds Vercel Serverless Function limit (4.5 MB). Please upload a compressed version or smaller file.')
        }
        const message =
            body && typeof body === 'object' && 'error' in body
                ? String((body as { error: unknown }).error)
                : `Local API request failed with status ${response.status}`
        throw new Error(message)
    }

    return body as T
}

function useLiveSubmissionHistory() {
    return useQuery(
        useCallback(async (params: Record<string, unknown> = {}) => {
            const environment = params.environment === 'test' ? 'test' : 'production'
            const projectId = typeof params.projectId === 'string' && params.projectId.trim().length > 0 ? params.projectId.trim() : ''
            const full = params.full === true || params.full === 'true'
            const limit = params.limit ? String(params.limit) : ''
            const CACHE_KEY = `mergeworks_history_cache_${environment}_${projectId}_${full}_${limit}`
            const CACHE_TTL_MS = 3_000
            if (!params.skipCache) {
                try {
                    const cached = sessionStorage.getItem(CACHE_KEY)
                    if (cached) {
                        const parsed = JSON.parse(cached)
                        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
                            return parsed.data as SubmissionHistoryItem[]
                        }
                    }
                } catch {}
            }

            const queryParams = new URLSearchParams({ environment })
            if (projectId) queryParams.set('projectId', projectId)
            if (full) queryParams.set('full', 'true')
            if (limit) queryParams.set('limit', limit)

            const data = await fetchJson<SubmissionHistoryItem[]>(`/api/diligence/history?${queryParams.toString()}`, {
                headers: identityHeaders(),
            })
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })) } catch {}
            return data
        }, [])
    )
}

function useLiveProjectSynthesis() {
    return useQuery(
        useCallback(async (params: Record<string, unknown> = {}) => {
            const environment = params.environment === 'test' ? 'test' : 'production'
            const projectId = typeof params.projectId === 'string' && params.projectId.trim().length > 0 ? params.projectId.trim() : ''
            const limit = params.limit ? String(params.limit) : ''
            const CACHE_KEY = `mergeworks_synthesis_cache_${environment}_${projectId}_${limit}`
            const CACHE_TTL_MS = 3_000
            if (!params.skipCache) {
                try {
                    const cached = sessionStorage.getItem(CACHE_KEY)
                    if (cached) {
                        const parsed = JSON.parse(cached)
                        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
                            return parsed.data as ProjectSynthesisItem[]
                        }
                    }
                } catch {}
            }

            const queryParams = new URLSearchParams({ environment })
            if (projectId) queryParams.set('projectId', projectId)
            if (limit) queryParams.set('limit', limit)

            const data = await fetchJson<ProjectSynthesisItem[]>(`/api/diligence/synthesis?${queryParams.toString()}`, {
                headers: identityHeaders(),
            })
            try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })) } catch {}
            return data
        }, [])
    )
}

function useLiveDealModels() {
    return useQuery(useCallback(async (params: Record<string, unknown> = {}) => {
        const projectId = typeof params.projectId === 'string' ? params.projectId : ''
        return fetchJson<DealModel[]>(`/api/diligence/deal-models${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`, { headers: identityHeaders() })
    }, []))
}

function useLiveSaveDealModel() {
    return useQuery(useCallback(async (params: Record<string, unknown> = {}) => {
        return fetchJson<DealModel>('/api/diligence/deal-models', { method: 'POST', headers: { 'Content-Type': 'application/json', ...identityHeaders() }, body: JSON.stringify(params) })
    }, []))
}

export type ProjectActionTracker = { projectId: string; checklistJson: string; questionsJson: string; lastModifiedAt?: string; lastModifiedBy?: string } | null

function useLiveProjectActionTracker() {
    return useQuery(useCallback(async (params: Record<string, unknown> = {}) => {
        const projectId = typeof params.projectId === 'string' ? params.projectId : ''
        if (!projectId) return null
        return fetchJson<ProjectActionTracker>(`/api/diligence/project-action-tracker?projectId=${encodeURIComponent(projectId)}`, { headers: identityHeaders() })
    }, []))
}

function useLiveSaveProjectActionTracker() {
    return useQuery(useCallback(async (params: Record<string, unknown> = {}) => {
        return fetchJson<ProjectActionTracker>('/api/diligence/project-action-tracker', { method: 'POST', headers: { 'Content-Type': 'application/json', ...identityHeaders() }, body: JSON.stringify(params) })
    }, []))
}

function useLiveSubmitDealPacket() {
    return useQuery(
        useCallback(async (params: Record<string, unknown> = {}) => {
            return fetchJson<SubmitResponse>('/api/diligence/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...identityHeaders() },
                body: JSON.stringify(params),
            })
        }, [])
    )
}

// ---------------------------------------------------------------------------
// Mock implementations (VITE_USE_MOCKS=true): in-memory, no network
// ---------------------------------------------------------------------------

export function blankHistoryRow(): SubmissionHistoryItem {
    return {
        requestID: '',
        dealName: '',
        companyName: '',
        workstream: '',
        submissionNotes: '',
        analystName: '',
        analystEmail: '',
        projectId: '',
        projectStage: '',
        documentType: '',
        submissionBatchId: '',
        expectedBatchDocumentCount: 0,
        fileName: '',
        fileSize: 0,
        fileType: '',
        triggerTimestamp: '',
        status: '',
        environment: '',
        receivedAt: '',
        processingStartedAt: '',
        processedAt: '',
        errorMessage: '',
        riskLevel: '',
        category: '',
        trafficLight: '',
        ebitdaExtracted: '',
        needsHumanReview: false,
        extractedJson: '',
        storageFileId: '',
        storageFileUrl: '',
        aiSummary: '',
        aiTargetValue: '',
        aiVariance: '',
        aiEscalationReason: '',
        aiIntent: '',
        aiCitations: '',
        aiRedFlags: '',
        aiYellowFlags: '',
        aiGreenFlags: '',
        aiConfidence: '',
        valuationLowerBound: '',
        valuationBaseEstimate: '',
        valuationUpperBound: '',
        valuationCurrency: '',
        investmentIsFavorable: null,
        investmentBuyReasoning: '',
        isConsidered: true,
        id: 0,
        createdAt: '',
        updatedAt: '',
    }
}

export const exampleSubmissionHistoryRows: SubmissionHistoryItem[] = [
    {
        ...blankHistoryRow(),
        requestID: 'mock-req-0001',
        dealName: 'Werkheiser Commercial Cleaning',
        companyName: 'Werkheiser Commercial Cleaning',
        workstream: 'Financial diligence',
        submissionNotes: '2-Year P&L, Balance Sheet, and LOI package.',
        analystName: 'Demo Analyst',
        analystEmail: 'analyst@example.com',
        projectId: 'werkheiser-commercial-cleaning',
        projectStage: 'Post-LOI',
        documentType: 'Financial statements',
        detectedDocumentType: 'P&L / income statement',
        fileName: 'Werkheiser P&L 2025.pdf',
        fileSize: 482133,
        fileType: 'application/pdf',
        triggerTimestamp: '2026-07-13T15:04:00.000Z',
        status: 'completed',
        environment: 'production',
        receivedAt: '2026-07-13T15:04:02.000Z',
        processingStartedAt: '2026-07-13T15:04:05.000Z',
        processedAt: '2026-07-13T15:06:41.000Z',
        riskLevel: 'Low',
        category: 'Financial statements',
        trafficLight: 'Green',
        revenueExtracted: '$2,730,000 USD',
        ebitdaExtracted: '$682,500 USD',
        extractedJson: JSON.stringify({ revenueTTM: '$2,730,000 USD', ebitda: '$682,500 USD', grossMargin: '42.5%' }),
        aiSummary: 'Werkheiser package verified. Reconstructed EBITDA of $682.5K with 100% citation coverage.',
        valuationLowerBound: '$2.18M',
        valuationBaseEstimate: '$2.73M',
        valuationUpperBound: '$3.28M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
        id: 1,
    },
    {
        ...blankHistoryRow(),
        requestID: 'mock-req-0002',
        dealName: 'Iron Tree Asset Management',
        companyName: 'Iron Tree Asset Management',
        workstream: 'Asset diligence',
        submissionNotes: 'Fixed asset register and 2-year income statements.',
        analystName: 'Demo Analyst',
        analystEmail: 'analyst@example.com',
        projectId: 'irontree-tree-service',
        projectStage: 'Post-LOI',
        documentType: 'Financial statements',
        detectedDocumentType: 'P&L / income statement',
        fileName: 'Iron Tree Asset Register & Financials.pdf',
        fileSize: 521000,
        fileType: 'application/pdf',
        triggerTimestamp: '2026-07-14T10:15:00.000Z',
        status: 'completed',
        environment: 'production',
        receivedAt: '2026-07-14T10:15:02.000Z',
        processingStartedAt: '2026-07-14T10:15:05.000Z',
        processedAt: '2026-07-14T10:17:10.000Z',
        riskLevel: 'Medium',
        category: 'Asset Management',
        trafficLight: 'Yellow',
        revenueExtracted: '$4,255,000 USD',
        ebitdaExtracted: '$1,063,750 USD',
        extractedJson: JSON.stringify({ revenueTTM: '$4,255,000 USD', ebitda: '$1,063,750 USD' }),
        aiSummary: 'Iron Tree asset register confirmed. Fixed asset depreciation schedule verified against GL.',
        valuationLowerBound: '$3.65M',
        valuationBaseEstimate: '$4.25M',
        valuationUpperBound: '$4.88M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
        id: 2,
    },
    {
        ...blankHistoryRow(),
        requestID: 'mock-req-0003',
        dealName: 'TurnKey Product Management',
        companyName: 'TurnKey Product Management',
        workstream: 'Operations diligence',
        submissionNotes: 'Business summary, customer roster, and P&L Google Sheet export.',
        analystName: 'Demo Analyst',
        analystEmail: 'analyst@example.com',
        projectId: 'turnkey-logistics-group',
        projectStage: 'Post-LOI',
        documentType: 'Business summary & P&L',
        detectedDocumentType: 'P&L / income statement',
        fileName: '1) TurnKey Product Management Business Summary.pdf',
        fileSize: 610400,
        fileType: 'application/pdf',
        triggerTimestamp: '2026-07-15T09:00:00.000Z',
        status: 'completed',
        environment: 'production',
        receivedAt: '2026-07-15T09:00:02.000Z',
        processingStartedAt: '2026-07-15T09:00:05.000Z',
        processedAt: '2026-07-15T09:02:30.000Z',
        riskLevel: 'Low',
        category: 'Product & Operations',
        trafficLight: 'Green',
        revenueExtracted: '$3,500,000 USD',
        ebitdaExtracted: '$875,000 USD',
        extractedJson: JSON.stringify({ revenueTTM: '$3,500,000 USD', ebitda: '$875,000 USD' }),
        aiSummary: 'TurnKey package analyzed. High-margin product management contracts with strong client retention.',
        valuationLowerBound: '$2.80M',
        valuationBaseEstimate: '$3.50M',
        valuationUpperBound: '$4.20M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
        id: 3,
    },
    {
        ...blankHistoryRow(),
        requestID: 'mock-req-0004',
        dealName: 'ConversionXL Digital Agency',
        companyName: 'ConversionXL Digital Agency',
        workstream: 'Commercial diligence',
        submissionNotes: 'Client concentration schedule and 2-year P&L.',
        analystName: 'Demo Analyst',
        analystEmail: 'analyst@example.com',
        projectId: 'cxl-digital-agency',
        projectStage: 'Pre-LOI',
        documentType: 'Financial statements',
        fileName: 'ConversionXL Financials & Client List.pdf',
        fileSize: 390000,
        fileType: 'application/pdf',
        triggerTimestamp: '2026-07-16T11:20:00.000Z',
        status: 'completed',
        environment: 'production',
        receivedAt: '2026-07-16T11:20:02.000Z',
        processingStartedAt: '2026-07-16T11:20:05.000Z',
        processedAt: '2026-07-16T11:22:15.000Z',
        riskLevel: 'Medium',
        category: 'Agency',
        trafficLight: 'Yellow',
        revenueExtracted: '$2,480,000 USD',
        ebitdaExtracted: '$620,000 USD',
        extractedJson: JSON.stringify({ revenueTTM: '$2,480,000 USD', ebitda: '$620,000 USD' }),
        aiSummary: 'ConversionXL digital agency review. Top 2 clients account for 38% of TTM revenue.',
        valuationLowerBound: '$1.98M',
        valuationBaseEstimate: '$2.48M',
        valuationUpperBound: '$2.98M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
        id: 4,
    },
    {
        ...blankHistoryRow(),
        requestID: 'mock-req-0005',
        dealName: 'Medical Spa Wellness Clinic',
        companyName: 'Medical Spa Wellness Clinic',
        workstream: 'Healthcare diligence',
        submissionNotes: 'Patient roster, provider compensation, and 2-year income statement.',
        analystName: 'Demo Analyst',
        analystEmail: 'analyst@example.com',
        projectId: 'medspa-wellness-clinic',
        projectStage: 'Post-LOI',
        documentType: 'Financial & Clinical',
        fileName: 'MedSpa Financials & Provider Comp.pdf',
        fileSize: 580000,
        fileType: 'application/pdf',
        triggerTimestamp: '2026-07-17T14:10:00.000Z',
        status: 'completed',
        environment: 'production',
        receivedAt: '2026-07-17T14:10:02.000Z',
        processingStartedAt: '2026-07-17T14:10:05.000Z',
        processedAt: '2026-07-17T14:12:40.000Z',
        riskLevel: 'Low',
        category: 'Healthcare Wellness',
        trafficLight: 'Green',
        revenueExtracted: '$5,000,000 USD',
        ebitdaExtracted: '$1,250,000 USD',
        extractedJson: JSON.stringify({ revenueTTM: '$5,000,000 USD', ebitda: '$1,250,000 USD' }),
        aiSummary: 'MedSpa clinic review. Strong recurring membership revenue and clean physician comp schedules.',
        valuationLowerBound: '$4.12M',
        valuationBaseEstimate: '$5.00M',
        valuationUpperBound: '$5.88M',
        valuationCurrency: 'USD',
        investmentIsFavorable: true,
        id: 5,
    },
]

const mockHistoryStore: SubmissionHistoryItem[] = [...exampleSubmissionHistoryRows]
let nextRowId = 6

function completeRowLater(requestID: string) {
    setTimeout(() => {
        const row = mockHistoryStore.find((item) => item.requestID === requestID)
        if (!row) {
            return
        }
        const now = new Date().toISOString()
        row.status = 'completed'
        row.processingStartedAt = row.processingStartedAt || now
        row.processedAt = now
        row.updatedAt = now
        row.riskLevel = 'Low'
        row.trafficLight = 'Green'
        row.aiSummary = 'Mock processing complete. No material issues detected in the submitted document.'
        row.aiConfidence = '82'
        row.aiGreenFlags = JSON.stringify(['Document parsed cleanly in local mock mode.'])
    }, 8000)
}

import { benchmarkGroundTruthSyntheses, werkheiserGroundTruthPass2 } from '../../evals/ground_truths'

const mockSynthesisRow: ProjectSynthesisItem = werkheiserGroundTruthPass2

function useLiveWorkflowErrors() {
    return useQuery(useCallback(async (params: Record<string, unknown> = {}) => {
        const environment = params.environment === 'test' ? 'test' : 'production'
        return fetchJson<WorkflowErrorItem[]>(`/api/diligence/workflow-errors?environment=${environment}`, { headers: identityHeaders() })
    }, []))
}

function useLiveWatchdogEvents() {
    return useQuery(useCallback(async (params: Record<string, unknown> = {}) => {
        const environment = params.environment === 'test' ? 'test' : 'production'
        return fetchJson<WatchdogEventItem[]>(`/api/diligence/watchdog-events?environment=${environment}`, { headers: identityHeaders() })
    }, []))
}

function useLiveUpdateSubmissionConsideration() {
    return useQuery(useCallback(async (params: Record<string, unknown> = {}) => {
        const environment = params.environment === 'test' ? 'test' : 'production'
        return fetchJson<{ ok: boolean }>('/api/diligence/submission-consideration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...identityHeaders() },
        })
    }, []))
}

export const exampleProjectSyntheses: ProjectSynthesisItem[] = benchmarkGroundTruthSyntheses

function useMockProjectSynthesis() {
    return useQuery(
        useCallback(async () => {
            await delay(250)
            return exampleProjectSyntheses.map((row) => ({ ...row }))
        }, []),
        exampleProjectSyntheses.map((row) => ({ ...row }))
    )
}

function useMockSubmissionHistory() {
    return useQuery(
        useCallback(async () => {
            await delay(250)
            return mockHistoryStore.map((row) => ({ ...row }))
        }, []),
        mockHistoryStore.map((row) => ({ ...row }))
    )
}

function useMockWorkflowErrors() {
    return useQuery(useCallback(async (): Promise<WorkflowErrorItem[]> => {
        await delay(100)
        return []
    }, []), [])
}

function useMockWatchdogEvents() {
    return useQuery(useCallback(async (): Promise<WatchdogEventItem[]> => {
        await delay(100)
        return []
    }, []), [])
}

function useMockSubmitDealPacket() {
    return useQuery(
        useCallback(async (params: Record<string, unknown> = {}): Promise<SubmitResponse> => {
            await delay(250)
            const environment = params.environment === 'test' ? 'test' : 'production'
            const triggerTimestamp = new Date().toISOString()
            const requestID = crypto.randomUUID()

            // Mirrors the payload echoed back by backend/diligence/submitDealPacket.ts.
            const payload: SubmitPayload = {
                fileName: String(params.fileName ?? ''),
                fileSize: Number(params.fileSize ?? 0),
                fileType: String(params.fileType ?? ''),
                dealName: String(params.dealName ?? ''),
                companyName: String(params.companyName ?? ''),
                workstream: String(params.workstream ?? ''),
                submissionNotes: String(params.submissionNotes ?? ''),
                projectId: String(params.projectId ?? ''),
                projectStage: String(params.projectStage ?? ''),
                documentType: String(params.documentType ?? ''),
                analystName: 'Local Dev User',
                analystEmail: 'localdev@example.com',
                triggerTimestamp,
                requestID,
                environment,
            }

            const row: SubmissionHistoryItem = {
                ...blankHistoryRow(),
                requestID,
                dealName: payload.dealName,
                companyName: payload.companyName,
                workstream: payload.workstream,
                submissionNotes: payload.submissionNotes,
                analystName: payload.analystName,
                analystEmail: payload.analystEmail,
                projectId: payload.projectId,
                projectStage: payload.projectStage,
                documentType: payload.documentType,
                fileName: payload.fileName,
                fileSize: payload.fileSize,
                fileType: payload.fileType,
                triggerTimestamp,
                status: 'processing',
                environment,
                receivedAt: triggerTimestamp,
                processingStartedAt: triggerTimestamp,
                id: nextRowId++,
                createdAt: triggerTimestamp,
                updatedAt: triggerTimestamp,
            }
            mockHistoryStore.unshift(row)
            completeRowLater(requestID)

            return {
                status: 'accepted',
                environment,
                target: 'mock://local-dev (no network calls)',
                method: 'POST',
                submittedAt: triggerTimestamp,
                submittedBy: payload.analystEmail,
                payload,
                response: {
                    requestID,
                    status: 'queued',
                    receivedAt: triggerTimestamp,
                    id: row.id,
                    createdAt: triggerTimestamp,
                    updatedAt: triggerTimestamp,
                    environment,
                },
            }
        }, [])
    )
}

// ---------------------------------------------------------------------------
// Exports: the hook names the page imports
// ---------------------------------------------------------------------------

export function useGetDiligenceData() {
    // Returning null makes the page fall back to its built-in sample findings.
    return useQuery(useCallback(async (): Promise<DiligenceFinding[] | null> => null, []))
}

export function useGetEvalRuns() {
    return useQuery(
        useCallback(async () => {
            // Check 5-minute browser cache first to minimize Supabase egress
            const CACHE_KEY = 'mergeworks_eval_runs_cache'
            const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
            try {
                const cached = sessionStorage.getItem(CACHE_KEY)
                if (cached) {
                    const parsed = JSON.parse(cached)
                    if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
                        return parsed.data
                    }
                }
            } catch {
                // ignore cache read error
            }

            // Eval runs are served by the same-origin API, which reads them
            // server-side (the Supabase service-role key stays on the server —
            // see backend/diligence/getEvalRuns.ts, which also falls back to the
            // local report file). The browser never holds a database key.
            try {
                const response = await fetch('/api/diligence/eval-runs', {
                    headers: identityHeaders(),
                })
                if (response.ok) {
                    const text = await response.text()
                    if (text.trim().startsWith('[')) {
                        const data = JSON.parse(text)
                        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data })) } catch {}
                        return data
                    }
                }
            } catch {
                // network/endpoint error — return no runs; the UI seeds a default.
            }
            return []
        }, [])
    )
}

export const useGetSubmissionHistory = USE_MOCKS ? useMockSubmissionHistory : useLiveSubmissionHistory
export const useUpdateSubmissionConsideration = useLiveUpdateSubmissionConsideration

export const useSubmitDealPacket = USE_MOCKS ? useMockSubmitDealPacket : useLiveSubmitDealPacket

export const useGetProjectSynthesis = USE_MOCKS ? useMockProjectSynthesis : useLiveProjectSynthesis
export const useGetWorkflowErrors = USE_MOCKS ? useMockWorkflowErrors : useLiveWorkflowErrors
export const useGetWatchdogEvents = USE_MOCKS ? useMockWatchdogEvents : useLiveWatchdogEvents
export const useGetDealModels = useLiveDealModels
export const useSaveDealModel = useLiveSaveDealModel
export const useGetProjectActionTracker = useLiveProjectActionTracker
export const useSaveProjectActionTracker = useLiveSaveProjectActionTracker
