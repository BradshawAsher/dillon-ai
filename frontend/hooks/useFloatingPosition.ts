import { useState, useEffect, useCallback, RefObject } from 'react'

export interface FloatingCoords {
    top?: number
    bottom?: number
    left?: number
    right?: number
    maxHeight?: number
    width?: number
    placement: 'bottom' | 'top'
}

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
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        const actualWidth = Math.min(popoverWidth, viewportWidth - padding * 2)
        const estimatedHeight = 440

        // Vertical calculation
        const spaceBelow = viewportHeight - rect.bottom - margin
        const spaceAbove = rect.top - margin

        let placement: 'bottom' | 'top' = preferredPlacement

        if (preferredPlacement === 'bottom') {
            if (spaceBelow < 240 && spaceAbove > spaceBelow) {
                placement = 'top'
            }
        } else {
            if (spaceAbove < 240 && spaceBelow > spaceAbove) {
                placement = 'bottom'
            }
        }

        const newCoords: FloatingCoords = { placement }

        if (placement === 'top') {
            newCoords.bottom = viewportHeight - rect.top + margin
            newCoords.maxHeight = Math.min(520, Math.max(160, spaceAbove - padding))
        } else {
            newCoords.top = rect.bottom + margin
            newCoords.maxHeight = Math.min(520, Math.max(160, spaceBelow - padding))
        }

        // Horizontal calculation
        if (viewportWidth < 640) {
            // Full width card with padding on mobile screens
            newCoords.left = padding
            newCoords.right = padding
        } else {
            // Align left edge of popover with left edge of trigger button
            let left = rect.left
            // If it would overflow viewport on the right, shift it left to keep inside viewport
            if (left + actualWidth > viewportWidth - padding) {
                left = viewportWidth - actualWidth - padding
            }
            // If it would overflow viewport on the left, clamp to padding
            if (left < padding) {
                left = padding
            }
            newCoords.left = left
            newCoords.width = actualWidth
        }

        setCoords(newCoords)
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
