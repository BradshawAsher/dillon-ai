import { describe, it, expect, vi } from 'vitest'
import { queryClient, diligenceQueryKeys, invalidateProjectDiligence } from '../lib/queryClient'

describe('TanStack Query Diligence Integration', () => {
  it('configures QueryClient with enterprise defaults', () => {
    const defaultOptions = queryClient.getDefaultOptions()
    expect(defaultOptions.queries?.staleTime).toBe(10_000)
    expect(defaultOptions.queries?.gcTime).toBe(300_000)
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(true)
    expect(defaultOptions.queries?.retry).toBe(2)
  })

  it('generates consistent hierarchical query keys', () => {
    expect(diligenceQueryKeys.all).toEqual(['diligence'])
    expect(diligenceQueryKeys.history('proj-123', 50)).toEqual(['diligence', 'history', 'proj-123', 50])
    expect(diligenceQueryKeys.history()).toEqual(['diligence', 'history', 'all', 100])
    expect(diligenceQueryKeys.synthesis('proj-123')).toEqual(['diligence', 'synthesis', 'proj-123'])
    expect(diligenceQueryKeys.kpis()).toEqual(['diligence', 'kpis'])
    expect(diligenceQueryKeys.dealModels('proj-123')).toEqual(['diligence', 'deal-models', 'proj-123'])
    expect(diligenceQueryKeys.actionTracker('proj-123')).toEqual(['diligence', 'action-tracker', 'proj-123'])
    expect(diligenceQueryKeys.workflowErrors('production')).toEqual(['diligence', 'workflow-errors', 'production'])
  })

  it('invalidates project-specific queries accurately', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    
    await invalidateProjectDiligence('proj-abc')

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['diligence', 'history', 'proj-abc'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['diligence', 'synthesis', 'proj-abc'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['diligence', 'deal-models', 'proj-abc'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['diligence', 'action-tracker', 'proj-abc'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['diligence', 'kpis'] })

    invalidateSpy.mockRestore()
  })

  it('invalidates all diligence queries when no projectId is provided', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await invalidateProjectDiligence()

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['diligence'] })

    invalidateSpy.mockRestore()
  })
})
