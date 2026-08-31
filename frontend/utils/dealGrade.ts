// Pure deal letter-grade from a weighted score.
//
// Extracted from DealGradeCard so the A/B/C/D/F cutoffs (85 / 70 / 55 / 40
// percent of the max) are pinned by tests. A grade is the headline number a
// user reads off the card, so an off-by-one on a boundary should fail loudly.

export type DealGrade = {
    letter: 'A' | 'B' | 'C' | 'D' | 'F'
    color: string
    bg: string
}

/** Maps a score/maxScore ratio to a letter grade with its badge colours. */
export function computeDealGrade(totalScore: number, maxScore: number): DealGrade {
    const pct = maxScore > 0 ? totalScore / maxScore : 0
    if (pct >= 0.85) return { letter: 'A', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/40' }
    if (pct >= 0.70) return { letter: 'B', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40' }
    if (pct >= 0.55) return { letter: 'C', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40' }
    if (pct >= 0.40) return { letter: 'D', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/40' }
    return { letter: 'F', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40' }
}
