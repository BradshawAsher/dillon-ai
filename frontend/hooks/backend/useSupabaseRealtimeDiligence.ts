import { useEffect, useRef, useState } from 'react'
import { supabaseAuthClient } from '../../services/supabaseAuth'

export interface RealtimeDiligenceOptions {
    enabled?: boolean
    projectId?: string
    onDocumentChange?: (payload: any) => void
    onSynthesisChange?: (payload: any) => void
}

/**
 * Subscribes to Supabase Realtime postgres_changes on `documents` and `project_syntheses` tables.
 * This eliminates the need for high-frequency REST polling, saving >99% in Supabase egress bandwidth.
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

        // Debounce triggers slightly (150ms) to prevent burst re-renders when multiple documents finish simultaneously
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
                        onDocRef.current?.(payload)
                    }, 150)
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'project_syntheses' },
                (payload) => {
                    if (synthDebounceTimer) clearTimeout(synthDebounceTimer)
                    synthDebounceTimer = setTimeout(() => {
                        onSynthRef.current?.(payload)
                    }, 150)
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
