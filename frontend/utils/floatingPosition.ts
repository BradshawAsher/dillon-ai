// Pure geometry for popover/floating-panel placement.
//
// The vertical-flip + horizontal-clamp math used to live inline inside
// useFloatingPosition, where it could not be unit-tested without a DOM and a
// real viewport. Extracting it keeps the hook thin (measure -> compute -> set)
// and lets the placement decisions be verified deterministically.

export interface FloatingCoords {
    top?: number
    bottom?: number
    left?: number
    right?: number
    maxHeight?: number
    width?: number
    placement: 'bottom' | 'top'
}

export interface FloatingRect {
    top: number
    bottom: number
    left: number
}

export interface ComputeFloatingPositionInput {
    rect: FloatingRect
    viewportWidth: number
    viewportHeight: number
    preferredPlacement: 'bottom' | 'top'
    popoverWidth: number
    margin: number
    padding: number
}

/** Space (px) below which we consider flipping the panel to the other side. */
export const FLIP_THRESHOLD = 240
/** Clamp bounds for the panel's scrollable max-height. */
export const MIN_PANEL_HEIGHT = 160
export const MAX_PANEL_HEIGHT = 520
/** Below this viewport width the panel goes edge-to-edge with padding. */
export const MOBILE_BREAKPOINT = 640

/**
 * Resolves the concrete top/bottom/left/right/maxHeight for a floating panel
 * anchored to `rect`, flipping vertically when the preferred side lacks room
 * and clamping horizontally to stay inside the viewport.
 */
export function computeFloatingPosition({
    rect,
    viewportWidth,
    viewportHeight,
    preferredPlacement,
    popoverWidth,
    margin,
    padding,
}: ComputeFloatingPositionInput): FloatingCoords {
    const actualWidth = Math.min(popoverWidth, viewportWidth - padding * 2)

    const spaceBelow = viewportHeight - rect.bottom - margin
    const spaceAbove = rect.top - margin

    let placement: 'bottom' | 'top' = preferredPlacement
    if (preferredPlacement === 'bottom') {
        if (spaceBelow < FLIP_THRESHOLD && spaceAbove > spaceBelow) {
            placement = 'top'
        }
    } else if (spaceAbove < FLIP_THRESHOLD && spaceBelow > spaceAbove) {
        placement = 'bottom'
    }

    const newCoords: FloatingCoords = { placement }

    if (placement === 'top') {
        newCoords.bottom = viewportHeight - rect.top + margin
        newCoords.maxHeight = Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, spaceAbove - padding))
    } else {
        newCoords.top = rect.bottom + margin
        newCoords.maxHeight = Math.min(MAX_PANEL_HEIGHT, Math.max(MIN_PANEL_HEIGHT, spaceBelow - padding))
    }

    if (viewportWidth < MOBILE_BREAKPOINT) {
        // Edge-to-edge card with symmetric padding on narrow screens.
        newCoords.left = padding
        newCoords.right = padding
    } else {
        let left = rect.left
        // Shift left if it would overflow the right edge, then clamp to padding
        // if that (or a naturally left-positioned trigger) pushes it off-screen.
        if (left + actualWidth > viewportWidth - padding) {
            left = viewportWidth - actualWidth - padding
        }
        if (left < padding) {
            left = padding
        }
        newCoords.left = left
        newCoords.width = actualWidth
    }

    return newCoords
}
