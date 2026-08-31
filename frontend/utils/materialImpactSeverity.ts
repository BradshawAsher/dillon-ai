// Pure mapping from a synthesis finding's source group to a severity tier.
//
// Extracted from MaterialImpactView. Red flags and cross-document conflicts are
// critical; yellow flags, missing documents, and open questions are medium;
// everything else (e.g. negotiation levers, green flags) is low. Kept here so
// the tiering that drives sort order and colour is unit-tested.

export type MaterialSeverity = 'critical' | 'medium' | 'low'

export function severityForSourceGroup(sourceGroup: string): MaterialSeverity {
    if (sourceGroup === 'red-flag' || sourceGroup === 'conflict') return 'critical'
    if (sourceGroup === 'yellow-flag' || sourceGroup === 'missing-document' || sourceGroup === 'open-question') {
        return 'medium'
    }
    return 'low'
}
