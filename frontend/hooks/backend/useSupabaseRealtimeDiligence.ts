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
        if (!enabled) {
            setIsConnected(false)
            return
        }

        // Debounce triggers (1200ms) to coalesce burst events when multiple documents in a batch update simultaneously
        let docDebounceTimer: ReturnType<typeof setTimeout> | null = null
        let synthDebounceTimer: ReturnType<typeof setTimeout> | null = null

        const channel = supabaseAuthClient
            .channel('mergeworks-diligence-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'documents' },
                (payload) => {
                    if (docDebounceTimer) clearTimeout(docDebounceTimer)
                    docDebounceTimer = setTimeout(() => {
                        const targetProjId = (payload.new as any)?.project_id || activeProjectRef.current
                        void queryClient.invalidateQueries({ queryKey: ['diligence', 'history'] })
                        if (targetProjId) {
                            void queryClient.invalidateQueries({ queryKey: ['diligence', 'history', targetProjId] })
                        }
                        void queryClient.invalidateQueries({ queryKey: ['diligence', 'kpis'] })
                        onDocRef.current?.(payload)
                    }, 1200)
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'project_syntheses' },
                (payload) => {
                    if (synthDebounceTimer) clearTimeout(synthDebounceTimer)
                    synthDebounceTimer = setTimeout(() => {
                        const targetProjId = (payload.new as any)?.project_id || activeProjectRef.current
                        void queryClient.invalidateQueries({ queryKey: ['diligence', 'synthesis'] })
                        if (targetProjId) {
                            void queryClient.invalidateQueries({ queryKey: ['diligence', 'synthesis', targetProjId] })
                        }
                        void queryClient.invalidateQueries({ queryKey: ['diligence', 'kpis'] })
                        onSynthRef.current?.(payload)
                    }, 1200)
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true)
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setIsConnected(false)
                }
            })

        return () => {
            if (docDebounceTimer) clearTimeout(docDebounceTimer)
            if (synthDebounceTimer) clearTimeout(synthDebounceTimer)
            void supabaseAuthClient.removeChannel(channel)
        }
    }, [enabled])

    return { isConnected }
}
