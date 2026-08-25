import { QueryClient } from '@tanstack/react-query'

/**
 * Global TanStack QueryClient configured for high-performance enterprise diligence workflows.
 * 
 * Configuration highlights:
 * - staleTime: 10,000ms (10s) to match Cloudflare Edge Worker s-maxage=10 caching
 * - gcTime: 300,000ms (5 min) for in-memory persistence across workspace view switches
 * - refetchOnWindowFocus: true for background reconciliation when analysts return to tab
 * - retry: 2 with exponential backoff for transient network resilience
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
})

/**
 * Invalidation helpers for Supabase Realtime CDC and workflow mutation triggers
 */
export const diligenceQueryKeys = {
  all: ['diligence'] as const,
  history: (projectId?: string, limit?: number) => ['diligence', 'history', projectId ?? 'all', limit ?? 100] as const,
  synthesis: (projectId?: string) => ['diligence', 'synthesis', projectId ?? 'all'] as const,
  kpis: () => ['diligence', 'kpis'] as const,
  dealModels: (projectId?: string) => ['diligence', 'deal-models', projectId ?? 'all'] as const,
  actionTracker: (projectId?: string) => ['diligence', 'action-tracker', projectId ?? 'all'] as const,
  workflowErrors: (environment?: string) => ['diligence', 'workflow-errors', environment ?? 'production'] as const,
  watchdogEvents: (environment?: string) => ['diligence', 'watchdog-events', environment ?? 'production'] as const,
  evalRuns: () => ['diligence', 'eval-runs'] as const,
}

/**
 * Invalidate all queries related to a specific project (e.g. after background document completion or synthesis)
 */
export async function invalidateProjectDiligence(projectId?: string) {
  if (projectId) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['diligence', 'history', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['diligence', 'synthesis', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['diligence', 'deal-models', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['diligence', 'action-tracker', projectId] }),
      queryClient.invalidateQueries({ queryKey: diligenceQueryKeys.kpis() }),
    ])
  } else {
    await queryClient.invalidateQueries({ queryKey: diligenceQueryKeys.all })
  }
}
