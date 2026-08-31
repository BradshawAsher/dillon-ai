import { describe, it, expect } from 'vitest'
import { computeFloatingPosition } from './floatingPosition'

const base = {
    viewportWidth: 1280,
    viewportHeight: 800,
    preferredPlacement: 'bottom' as const,
    popoverWidth: 384,
    margin: 8,
    padding: 16,
}

describe('computeFloatingPosition', () => {
    it('places below the trigger when there is room', () => {
        const coords = computeFloatingPosition({ ...base, rect: { top: 100, bottom: 140, left: 200 } })
        expect(coords.placement).toBe('bottom')
        expect(coords.top).toBe(148) // rect.bottom + margin
        expect(coords.bottom).toBeUndefined()
    })

    it('flips above when space below is tight and above is larger', () => {
        const coords = computeFloatingPosition({ ...base, rect: { top: 700, bottom: 740, left: 200 } })
        expect(coords.placement).toBe('top')
        expect(coords.bottom).toBe(800 - 700 + 8)
        expect(coords.top).toBeUndefined()
    })

    it('does not flip when the preferred side is tight but still the roomier one', () => {
        // spaceBelow small but spaceAbove even smaller -> stay bottom
        const coords = computeFloatingPosition({ ...base, rect: { top: 30, bottom: 620, left: 200 } })
        expect(coords.placement).toBe('bottom')
    })

    it('aligns the left edge with the trigger on desktop', () => {
        const coords = computeFloatingPosition({ ...base, rect: { top: 100, bottom: 140, left: 200 } })
        expect(coords.left).toBe(200)
        expect(coords.width).toBe(384)
    })

    it('shifts left to avoid overflowing the right viewport edge', () => {
        const coords = computeFloatingPosition({ ...base, rect: { top: 100, bottom: 140, left: 1100 } })
        // 1100 + 384 > 1280 - 16 -> left = 1280 - 384 - 16
        expect(coords.left).toBe(1280 - 384 - 16)
    })

    it('clamps to padding when the trigger sits near the left edge', () => {
        const coords = computeFloatingPosition({ ...base, rect: { top: 100, bottom: 140, left: -50 } })
        expect(coords.left).toBe(16)
    })

    it('goes edge-to-edge with padding on narrow viewports', () => {
        const coords = computeFloatingPosition({
            ...base,
            viewportWidth: 375,
            rect: { top: 100, bottom: 140, left: 10 },
        })
        expect(coords.left).toBe(16)
        expect(coords.right).toBe(16)
        expect(coords.width).toBeUndefined()
    })

    it('keeps maxHeight within the clamp bounds', () => {
        const coords = computeFloatingPosition({ ...base, rect: { top: 100, bottom: 140, left: 200 } })
        expect(coords.maxHeight).toBeGreaterThanOrEqual(160)
        expect(coords.maxHeight).toBeLessThanOrEqual(520)
    })
})
