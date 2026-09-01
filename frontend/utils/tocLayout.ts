// Shared bounds for the resizable tab table-of-contents sidebar.
//
// The drag handler (TabSidebarTOC) and the persisted-width reader
// (useDealWorkspaceState) used to hard-code DIFFERENT bounds — the drag clamped
// to [85, 220] while the reader only accepted [90, 240]. A width dragged into
// 85–89 was therefore silently discarded on the next reload (it fell back to the
// default) even though the drag had allowed it. These shared constants and the
// helpers below are the single source of truth so the two can never drift again.

export const TOC_MIN_WIDTH = 85
export const TOC_MAX_WIDTH = 220
/** Initial width before the user has ever resized the sidebar. */
export const TOC_DEFAULT_WIDTH = 140

/** Clamps a width to the allowed range and rounds to a whole pixel. */
export function clampTocWidth(width: number): number {
    return Math.round(Math.max(TOC_MIN_WIDTH, Math.min(TOC_MAX_WIDTH, width)))
}

/**
 * Parses a persisted tocWidth string, returning the clamped width when it is a
 * usable in-range number, or null when it is missing / unparseable / out of
 * range (so the caller can fall back to the default).
 */
export function parseStoredTocWidth(stored: string | null | undefined): number | null {
    if (!stored) return null
    const parsed = parseInt(stored, 10)
    if (Number.isNaN(parsed) || parsed < TOC_MIN_WIDTH || parsed > TOC_MAX_WIDTH) {
        return null
    }
    return parsed
}
