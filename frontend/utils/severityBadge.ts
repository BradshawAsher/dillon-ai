// Pure colour-class mapping for the small severity badge. Extracted from
// ExpandableInsightGroup so the severity -> colour rule is tested once and the
// component just applies the returned classes around its label.

/**
 * Border/background/text classes for a severity badge. critical/high are
 * destructive, medium is amber, everything else is a muted neutral.
 */
export function severityBadgeClass(severity: string): string {
    const lower = severity.trim().toLowerCase()
    if (lower === 'critical' || lower === 'high') {
        return 'border-destructive/30 bg-destructive/10 text-destructive'
    }
    if (lower === 'medium') {
        return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    }
    return 'border-border bg-muted/40 text-muted-foreground'
}
