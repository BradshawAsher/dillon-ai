// Pure mapping from a synthesis finding's source group to a severity tier.
//
// Extracted from MaterialImpactView. Red flags and cross-document conflicts are
// critical; yellow flags, missing documents, and open questions are medium;
// everything else (e.g. negotiation levers, green flags) is low. Kept here so
// the tiering that drives sort order and colour is unit-tested.

export type MaterialSeverity = 'critical' | 'medium' | 'low'

export function severityForSourceGroup(sourceGroup: string | null | undefined): MaterialSeverity {
    // Normalize before matching: source groups arrive from the synthesis JSON,
    // where casing and stray whitespace vary ("Red-Flag", " conflict "). Exact
    // equality let those fall through to 'low', hiding a critical finding.
    const group = (sourceGroup ?? '').trim().toLowerCase()
    if (group === 'red-flag' || group === 'conflict') return 'critical'
    if (group === 'yellow-flag' || group === 'missing-document' || group === 'open-question') {
        return 'medium'
    }
    return 'low'
}
