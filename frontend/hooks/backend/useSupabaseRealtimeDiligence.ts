import { useEffect, useRef, useState } from 'react'
import { supabaseAuthClient } from '../../services/supabaseAuth'
import { queryClient } from '../../lib/queryClient'

export interface RealtimeDiligenceOptions {
    enabled?: boolean
    projectId?: string
    onDocumentChange?: (payload: any) => void
    onSynthesisChange?: (payload: any) => void
}

/**
 * Subscribes to Supabase Realtime postgres_changes on `documents` and `project_syntheses` tables.
 * Seamlessly syncs WebSocket push notifications with TanStack Query in-memory cache.
 */
export function useSupabaseRealtimeDiligence({
    enabled = true,
    projectId,
    onDocumentChange,
    onSynthesisChange,
}: RealtimeDiligenceOptions = {}) {
    const [isConnected, setIsConnected] = useState(false)
    const onDocRef = useRef(onDocumentChange)
    const onSynthRef = useRef(onSynthesisChange)
    const activeProjectRef = useRef(projectId)

    useEffect(() => {
        onDocRef.current = onDocumentChange
        onSynthRef.current = onSynthesisChange
        activeProjectRef.current = projectId
    }, [onDocumentChange, onSynthesisChange, projectId])

    useEffect(() => {
        const scopedProjectId = projectId?.trim() || ''
        if (!enabled || !scopedProjectId) {
            setIsConnected(false)
            return
        }

        const projectFilter = `project_id=eq.${scopedProjectId}`
        const channelScope = scopedProjectId.replace(/[^a-zA-Z0-9_-]/g, '_')

        // Debounce triggers (2000ms) to coalesce burst events when multiple documents in a batch update simultaneously
        let docDebounceTimer: ReturnType<typeof setTimeout> | null = null
        let synthDebounceTimer: ReturnType<typeof setTimeout> | null = null

        const channel = supabaseAuthClient
            .channel(`mergeworks-diligence-realtime-${channelScope}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'documents',
                    filter: projectFilter,
                },
                (payload) => {
                    if (docDebounceTimer) clearTimeout(docDebounceTimer)
                    docDebounceTimer = setTimeout(() => {
                        const targetProjId = (payload.new as any)?.project_id || activeProjectRef.current
                        if (onDocRef.current) {
                            onDocRef.current(payload)
                        } else {
                            const invalidations = [queryClient.invalidateQueries({ queryKey: ['diligence', 'kpis'] })]
                            if (targetProjId) {
                                invalidations.push(queryClient.invalidateQueries({ queryKey: ['diligence', 'history', targetProjId] }))
                            }
                            void Promise.all(invalidations)
                        }
                    }, 2000)
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'project_syntheses',
                    filter: projectFilter,
                },
                (payload) => {
                    if (synthDebounceTimer) clearTimeout(synthDebounceTimer)
                    synthDebounceTimer = setTimeout(() => {
                        const targetProjId = (payload.new as any)?.project_id || activeProjectRef.current
                        if (onSynthRef.current) {
                            onSynthRef.current(payload)
                        } else {
                            const invalidations = [queryClient.invalidateQueries({ queryKey: ['diligence', 'kpis'] })]
                            if (targetProjId) {
                                invalidations.push(queryClient.invalidateQueries({ queryKey: ['diligence', 'synthesis', targetProjId] }))
                            }
                            void Promise.all(invalidations)
                        }
                    }, 2000)
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true)
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setIsConnected(false)
                }
            })

        return () => {
            if (docDebounceTimer) clearTimeout(docDebounceTimer)
            if (synthDebounceTimer) clearTimeout(synthDebounceTimer)
            setIsConnected(false)
            void supabaseAuthClient.removeChannel(channel)
        }
    }, [enabled, projectId])

    return { isConnected }
}
