// Pure EBITDA-quality letter grade from a weighted score.
//
// Extracted from EBITDAQualityScoreCard. This scale is intentionally distinct
// from the overall deal grade (see dealGrade.ts): A/B/C/D at 80/60/40 percent,
// with an explicit N/A when the max score is unknown. Pinned by tests so the
// two grade scales can be evolved independently without silent drift.

export type EbitdaQualityGrade = {
    grade: 'A' | 'B' | 'C' | 'D' | 'N/A'
    color: string
}

/** Maps a score/maxScore ratio to the EBITDA-quality grade with its colour. */
export function getEbitdaQualityGrade(totalScore: number, maxScore: number): EbitdaQualityGrade {
    if (maxScore <= 0) return { grade: 'N/A', color: 'text-muted-foreground' }
    const pct = totalScore / maxScore
    if (pct >= 0.8) return { grade: 'A', color: 'text-green-600' }
    if (pct >= 0.6) return { grade: 'B', color: 'text-blue-600' }
    if (pct >= 0.4) return { grade: 'C', color: 'text-amber-600' }
    return { grade: 'D', color: 'text-red-600' }
}
