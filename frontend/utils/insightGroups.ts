// Shared taxonomy for synthesis insight groups and their severity tiering.
//
// Extracted from ProjectSynthesisCard so the group -> severity mapping that
// drives sorting and filtering is unit-tested. Note this scale carries an
// 'informational' tier (takeaways, negotiation levers) that the material-impact
// view's severity does not — the two are intentionally separate.

export type InsightGroupType =
    | 'red-flag'
    | 'yellow-flag'
    | 'green-flag'
    | 'takeaway'
    | 'conflict'
    | 'negotiation-lever'
    | 'missing-document'
    | 'open-question'

export type InsightSeverity = 'critical' | 'medium' | 'low' | 'informational'

/** Maps an insight group to its severity tier for sorting and filtering. */
export function getSeverityForGroup(groupType: InsightGroupType): InsightSeverity {
    switch (groupType) {
        case 'red-flag':
        case 'conflict':
            return 'critical'
        case 'yellow-flag':
        case 'missing-document':
        case 'open-question':
            return 'medium'
        case 'green-flag':
            return 'low'
        case 'takeaway':
        case 'negotiation-lever':
            return 'informational'
        default:
            // The union is exhaustive at compile time, but the group type is read
            // from synthesis JSON, so an unforeseen value can arrive at runtime.
            // Without this the function returned undefined while typed as
            // InsightSeverity, corrupting downstream sorting. Treat unknown groups
            // as low-signal 'informational' rather than a false critical/medium.
            return 'informational'
    }
}
