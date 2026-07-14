// Local-dev mocks for the hooks Retool generates from /backend/diligence.
// The real backend (Retool DB + n8n webhooks) only exists inside Retool, so
// these return canned data and simulate the async submission lifecycle
// in-memory. Nothing here talks to the network.
import { useCallback, useState } from 'react'

import type { SubmissionHistoryItem } from '../../utils/submissionHistory'

type TriggerPromise<T> = Promise<T> & { result: Promise<T> }

function withResult<T>(promise: Promise<T>): TriggerPromise<T> {
  const p = promise as TriggerPromise<T>
  p.result = promise
  return p
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

type MockQueryState<T> = {
  data: T | null
  loading: boolean
  error: null
}

function useMockQuery<T>(fetcher: (params?: Record<string, unknown>) => Promise<T>, initialData: T | null = null) {
  const [state, setState] = useState<MockQueryState<T>>({ data: initialData, loading: false, error: null })

  const trigger = useCallback(
    (params?: Record<string, unknown>, _options?: Record<string, unknown>) => {
      setState((previous) => ({ ...previous, loading: true }))
      const promise = (async () => {
        await delay(250)
        const data = await fetcher(params)
        setState({ data, loading: false, error: null })
        return data
      })()
      return withResult(promise)
    },
    [fetcher]
  )

  return { ...state, trigger }
}

export function useGetDiligenceData() {
  // Returning null makes the page fall back to its built-in sample findings.
  return useMockQuery(useCallback(async () => null, []))
}

export function useGetSubmissionHistory() {
  return useMockQuery(
    useCallback(async () => mockHistoryStore.map((row) => ({ ...row })), []),
    mockHistoryStore.map((row) => ({ ...row }))
  )
}

export function useSubmitDealPacket() {
  return useMockQuery(
    useCallback(async (params: Record<string, unknown> = {}) => {
      const environment = params.environment === 'test' ? 'test' : 'production'
      const triggerTimestamp = new Date().toISOString()
      const requestID = crypto.randomUUID()

      const row: SubmissionHistoryItem = {
        ...blankHistoryRow(),
        requestID,
        dealName: String(params.dealName ?? ''),
        companyName: String(params.companyName ?? ''),
        workstream: String(params.workstream ?? ''),
        submissionNotes: String(params.submissionNotes ?? ''),
        analystName: 'Local Dev User',
        analystEmail: 'localdev@example.com',
        projectId: String(params.projectId ?? ''),
        projectStage: String(params.projectStage ?? ''),
        documentType: String(params.documentType ?? ''),
        fileName: String(params.fileName ?? ''),
        fileSize: Number(params.fileSize ?? 0),
        fileType: String(params.fileType ?? ''),
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
        method: 'POST' as const,
        submittedAt: triggerTimestamp,
        submittedBy: 'localdev@example.com',
        payload: params,
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
