import { useState, useEffect, useCallback, RefObject } from 'react'
import { computeFloatingPosition, type FloatingCoords } from '../utils/floatingPosition'

export type { FloatingCoords }

export interface UseFloatingPositionOptions {
    isOpen: boolean
    targetRef: RefObject<HTMLElement | null>
    preferredPlacement?: 'bottom' | 'top'
    popoverWidth?: number
    margin?: number
    padding?: number
}

export function useFloatingPosition({
    isOpen,
    targetRef,
    preferredPlacement = 'bottom',
    popoverWidth = 384,
    margin = 8,
    padding = 16,
}: UseFloatingPositionOptions): FloatingCoords {
    const [coords, setCoords] = useState<FloatingCoords>({
        placement: preferredPlacement,
    })

    const updatePosition = useCallback(() => {
        if (!isOpen || !targetRef.current || typeof window === 'undefined') return

        const rect = targetRef.current.getBoundingClientRect()

        setCoords(computeFloatingPosition({
            rect,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            preferredPlacement,
            popoverWidth,
            margin,
            padding,
        }))
    }, [isOpen, targetRef, preferredPlacement, popoverWidth, margin, padding])

    useEffect(() => {
        if (!isOpen) return

        updatePosition()

        const handleScroll = () => {
            updatePosition()
        }

        const handleResize = () => {
            updatePosition()
        }

        window.addEventListener('scroll', handleScroll, true)
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('scroll', handleScroll, true)
            window.removeEventListener('resize', handleResize)
        }
    }, [isOpen, updatePosition])

    return coords
}
