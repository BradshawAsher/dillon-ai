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
import { getDataSource } from '../../lib/dataSource'
import { identityHeaders } from '../../lib/identity'
import type { DiligenceFinding } from '../../utils/diligence'
import type { SubmissionHistoryItem } from '../../utils/submissionHistory'

export type { ProjectSynthesisItem }

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
        response = await fetch(input, init)
    } catch (error) {
        throw new Error(getFriendlyErrorMessage(error))
    }

    const body: unknown = await response.json().catch(() => null)

    if (!response.ok) {
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
            return fetchJson<SubmissionHistoryItem[]>(`/api/diligence/history?environment=${environment}`, {
                headers: identityHeaders(),
            })
        }, [])
    )
}

function useLiveProjectSynthesis() {
  return useQuery(
    useCallback(async (params: Record<string, unknown> = {}) => {
      const environment = params.environment === 'test' ? 'test' : 'production'
      return fetchJson<ProjectSynthesisItem[]>(`/api/diligence/synthesis?environment=${environment}`, {
        headers: identityHeaders(),
      })
    }, [])
  )
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

function blankHistoryRow(): SubmissionHistoryItem {
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
        id: 0,
        createdAt: '',
        updatedAt: '',
    }
}

const seededCompletedRow: SubmissionHistoryItem = {
    ...blankHistoryRow(),
    requestID: 'mock-req-0001',
    dealName: 'Project Atlas',
    companyName: 'Northwind Analytics',
    workstream: 'Financial diligence',
    submissionNotes: 'Q4 financial package for review.',
    analystName: 'Demo Analyst',
    analystEmail: 'analyst@example.com',
    projectId: 'atlas-001',
    projectStage: 'Post-LOI',
    documentType: 'Financial statements',
    fileName: 'northwind-q4-financials.pdf',
    fileSize: 482133,
    fileType: 'application/pdf',
    triggerTimestamp: '2026-07-13T15:04:00.000Z',
    status: 'completed',
    environment: 'production',
    receivedAt: '2026-07-13T15:04:02.000Z',
    processingStartedAt: '2026-07-13T15:04:05.000Z',
    processedAt: '2026-07-13T15:06:41.000Z',
    riskLevel: 'Medium',
    category: 'Financial statements',
    trafficLight: 'Yellow',
    ebitdaExtracted: '12.4M USD',
    extractedJson: JSON.stringify({
        revenueTTM: '48.1M USD',
        ebitda: '12.4M USD',
        grossMargin: '61.2%',
        netRevenueRetention: '118%',
    }),
    aiSummary:
        'Q4 package shows healthy margins and retention, offset by customer concentration risk. EBITDA of 12.4M USD is within 4% of the target model.',
    aiTargetValue: '12.9M USD',
    aiVariance: '-3.9%',
    aiIntent: 'financial_review',
    aiCitations: JSON.stringify([
        { sourceFile: 'northwind-q4-financials.pdf', rowOrCell: 'Page 18' },
    ]),
    aiRedFlags: JSON.stringify(['Top customer is 41% of TTM revenue with renewal pending.']),
    aiYellowFlags: JSON.stringify(['Deferred revenue recognition policy changed in Q3.']),
    aiGreenFlags: JSON.stringify(['Net revenue retention above 118% for six straight quarters.']),
    aiConfidence: '87',
    valuationLowerBound: '96M',
    valuationBaseEstimate: '112M',
    valuationUpperBound: '128M',
    valuationCurrency: 'USD',
    investmentIsFavorable: true,
    investmentBuyReasoning:
        'Durable expansion revenue and margin profile support the base case; concentration risk is priced into the lower bound.',
    id: 1,
    createdAt: '2026-07-13T15:04:02.000Z',
    updatedAt: '2026-07-13T15:06:41.000Z',
}

const mockHistoryStore: SubmissionHistoryItem[] = [seededCompletedRow]
let nextRowId = 2

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

const mockSynthesisRow: ProjectSynthesisItem = {
  projectId: 'atlas-001',
  projectStatus: 'synthesized',
  documentsReceivedCount: 4,
  documentsCompletedCount: 4,
  missingDocuments: ['General ledger / trial balance', 'Customer concentration / revenue detail'],
  crossDocumentConflicts: [
    'P&L shows FY23 revenue of 48.1M USD but the bank statements support roughly 45.6M USD of deposits.',
    'Add-back schedule claims 900K USD of one-time legal fees; the GL shows recurring legal spend each quarter.',
  ],
  openQuestions: [
    'Is the top-customer renewal (41% of TTM revenue) executed or still in commercial review?',
    'Why did deferred revenue recognition policy change in Q3?',
  ],
  negotiationLevers: [
    'Revenue support gap of ~2.5M USD justifies a purchase price adjustment or an expanded escrow.',
    'Unsupported add-backs reduce adjusted EBITDA by up to 0.9M USD.',
  ],
  citations: [
    'FY23 P&L and bank statements',
    'Add-back schedule and general ledger',
  ],
  finalRiskLevel: 'Medium',
  finalTrafficLight: 'Yellow',
  finalRecommendation: 'Proceed with revised terms',
  finalJudgmentSummary:
    'The dossier supports proceeding at a reduced valuation. Revenue quality is the core risk: bank deposits do not fully support reported revenue, and one large customer is unrenewed. Margin profile and retention remain genuinely strong.',
  finalJudgmentJson: '',
  valuationLowerBound: '92M',
  valuationBaseEstimate: '104M',
  valuationUpperBound: '118M',
  valuationCurrency: 'USD',
  projectProcessedAt: '2026-07-13T16:20:00.000Z',
  id: 1,
  createdAt: '2026-07-13T16:20:00.000Z',
  updatedAt: '2026-07-13T16:20:00.000Z',
}

function useMockProjectSynthesis() {
  return useQuery(
    useCallback(async () => {
      await delay(250)
      return [{ ...mockSynthesisRow }]
    }, []),
    [{ ...mockSynthesisRow }]
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

export const useGetSubmissionHistory = USE_MOCKS ? useMockSubmissionHistory : useLiveSubmissionHistory

export const useSubmitDealPacket = USE_MOCKS ? useMockSubmitDealPacket : useLiveSubmitDealPacket

export const useGetProjectSynthesis = USE_MOCKS ? useMockProjectSynthesis : useLiveProjectSynthesis
