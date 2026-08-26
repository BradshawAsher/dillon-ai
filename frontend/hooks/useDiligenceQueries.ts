import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SubmissionHistoryItem } from '../utils/submissionHistory'
import type { ProjectSynthesisItem } from '../../backend/diligence/getProjectSynthesis'
import type { WorkflowErrorItem } from '../../backend/diligence/getWorkflowErrors'
import type { WatchdogEventItem } from '../../backend/diligence/getWatchdogEvents'
import type { DealModel, ProjectActionTracker } from './backend/diligence'
import { identityHeaders } from '../lib/identity'
import { diligenceQueryKeys } from '../lib/queryClient'

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  const text = await response.text()
  const body = text ? JSON.parse(text) : null

  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `API request failed with status ${response.status}`
    throw new Error(message)
  }

  return body as T
}

// -----------------------------------------------------------------------------
// Submission History Query
// -----------------------------------------------------------------------------
export type SubmissionHistoryQueryParams = {
  projectId?: string
  environment?: 'production' | 'test'
  full?: boolean
  limit?: number
  enabled?: boolean
}

export function useSubmissionHistoryQuery(params: SubmissionHistoryQueryParams = {}) {
  const { projectId = '', environment = 'production', full = false, limit, enabled = true } = params

  return useQuery({
    queryKey: diligenceQueryKeys.history(projectId, limit),
    queryFn: async () => {
      const queryParams = new URLSearchParams({ environment })
      if (projectId) queryParams.set('projectId', projectId)
      if (full) queryParams.set('full', 'true')
      if (limit) queryParams.set('limit', String(limit))

      return fetchJson<SubmissionHistoryItem[]>(`/api/diligence/history?${queryParams.toString()}`, {
        headers: identityHeaders(),
      })
    },
    enabled,
    staleTime: 30_000,
  })
}

// -----------------------------------------------------------------------------
// Project Synthesis Query
// -----------------------------------------------------------------------------
export type ProjectSynthesisQueryParams = {
  projectId?: string
  environment?: 'production' | 'test'
  limit?: number
  enabled?: boolean
}

export function useProjectSynthesisQuery(params: ProjectSynthesisQueryParams = {}) {
  const { projectId = '', environment = 'production', limit, enabled = true } = params

  return useQuery({
    queryKey: diligenceQueryKeys.synthesis(projectId),
    queryFn: async () => {
      const queryParams = new URLSearchParams({ environment })
      if (projectId) queryParams.set('projectId', projectId)
      if (limit) queryParams.set('limit', String(limit))

      return fetchJson<ProjectSynthesisItem[]>(`/api/diligence/synthesis?${queryParams.toString()}`, {
        headers: identityHeaders(),
      })
    },
    enabled,
    staleTime: 30_000,
  })
}

// -----------------------------------------------------------------------------
// Portfolio KPIs Query (PostgreSQL Stored Procedure Aggregation)
// -----------------------------------------------------------------------------
export type PortfolioKpis = {
  total_deals: number
  avg_deal_score: number
  total_pipeline_value: number
  flagged_risks_count: number
}

export function usePortfolioKpisQuery(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: diligenceQueryKeys.kpis(),
    queryFn: async () => {
      return fetchJson<PortfolioKpis>('/api/diligence/kpis', {
        headers: identityHeaders(),
      })
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  })
}

// -----------------------------------------------------------------------------
// Deal Models Query & Mutation
// -----------------------------------------------------------------------------
export function useDealModelsQuery(projectId?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: diligenceQueryKeys.dealModels(projectId),
    queryFn: async () => {
      const url = `/api/diligence/deal-models${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`
      return fetchJson<DealModel[]>(url, { headers: identityHeaders() })
    },
    enabled: options.enabled ?? true,
    staleTime: 30_000,
  })
}

export function useSaveDealModelMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: Partial<DealModel> & { projectId: string }) => {
      return fetchJson<DealModel>('/api/diligence/deal-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...identityHeaders() },
        body: JSON.stringify(params),
      })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: diligenceQueryKeys.dealModels(variables.projectId) })
      queryClient.invalidateQueries({ queryKey: diligenceQueryKeys.kpis() })
    },
  })
}

// -----------------------------------------------------------------------------
// Project Action Tracker Query & Mutation
// -----------------------------------------------------------------------------
export function useProjectActionTrackerQuery(projectId?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: diligenceQueryKeys.actionTracker(projectId),
    queryFn: async () => {
      if (!projectId) return null
      return fetchJson<ProjectActionTracker>(
        `/api/diligence/project-action-tracker?projectId=${encodeURIComponent(projectId)}`,
        { headers: identityHeaders() }
      )
    },
    enabled: Boolean(projectId) && (options.enabled ?? true),
    staleTime: 30_000,
  })
}

export function useSaveProjectActionTrackerMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { projectId: string; checklistJson?: string; questionsJson?: string }) => {
      return fetchJson<ProjectActionTracker>('/api/diligence/project-action-tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...identityHeaders() },
        body: JSON.stringify(params),
      })
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: diligenceQueryKeys.actionTracker(variables.projectId) })
    },
  })
}

// -----------------------------------------------------------------------------
// Document Retry & Workflow Mutation
// -----------------------------------------------------------------------------
export function useRetryDocumentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { id?: number; requestID?: string; projectId?: string }) => {
      return fetchJson<{ ok: boolean; status?: string }>('/api/diligence/retry-failed-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...identityHeaders() },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (_data, variables) => {
      if (variables.projectId) {
        queryClient.invalidateQueries({ queryKey: ['diligence', 'history', variables.projectId] })
      } else {
        queryClient.invalidateQueries({ queryKey: ['diligence', 'history'] })
      }
    },
  })
}
