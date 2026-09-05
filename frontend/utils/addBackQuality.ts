// Pure add-back quality roll-up.
//
// Extracted from AddBackQualityCard so the "any unsupported add-back drags the
// whole set to needs-verification" precedence is unit-tested rather than only
// visually checked. An add-back a buyer cannot tie to a supporting schedule is
// exactly the kind of item that should dominate the summary badge.

export type AddBackQualityInput = {
    /** 'supported' | 'partial' | 'unsupported' (other values count as supported). */
    quality?: string
}

export type AddBackQuality = {
    label: string
    variant: 'success' | 'warning' | 'destructive'
}

/**
 * Rolls per-item add-back quality into one badge: any unsupported item makes the
 * set need verification; else any partially-supported item makes it partial;
 * else it is well-supported. An empty set is treated as clean.
 */
export function getOverallAddBackQuality(items: AddBackQualityInput[]): AddBackQuality {
    if (items.length === 0) return { label: 'No add-backs found', variant: 'success' }
    // Normalize case/whitespace before matching: the AI pipeline is not
    // guaranteed to emit an exact lowercase 'unsupported'/'partial', and a
    // strict === match would silently treat 'Unsupported' as supported —
    // exactly the item that must dominate the badge.
    const norm = (quality?: string) => (quality ?? '').trim().toLowerCase()
    let unsupported = 0
    let partial = 0
    for (const item of items) {
        const q = norm(item.quality)
        if (q === 'unsupported') unsupported += 1
        else if (q === 'partial') partial += 1
    }
    if (unsupported > 0) return { label: 'Add-backs need verification', variant: 'destructive' }
    if (partial > 0) return { label: 'Partially supported', variant: 'warning' }
    return { label: 'Well-supported', variant: 'success' }
}
