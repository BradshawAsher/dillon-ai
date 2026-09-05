// Maps an AI recommendation string (and/or a traffic-light signal) to a single
// semantic tone. The verbose per-tone badge/container styling lives in the card;
// this pure classifier is what actually decides which tone a verdict carries, so
// the branching precedence can be tested independently of the JSX.

export type VerdictTone = 'warning' | 'destructive' | 'success' | 'neutral'

/**
 * Precedence is deliberate and matches the original card logic:
 *   1. caution/hold language (or a YELLOW light) -> 'warning'
 *   2. abort/pass/reject/risk language (or RED)  -> 'destructive'
 *   3. proceed/buy/acquire language (or GREEN)   -> 'success'
 *   4. anything else                             -> 'neutral'
 * Because warning is checked first, "proceed with caution" resolves to warning.
 */
/** True when `word` appears as its own token (not a substring of a longer word). */
function hasWord(text: string, word: string): boolean {
    return new RegExp(`\\b${word}\\b`, 'i').test(text)
}

/** True when a word starts with `stem` (renegotiate / renegotiation, escalate / escalation). */
function hasStem(text: string, stem: string): boolean {
    return new RegExp(`\\b${stem}\\w*`, 'i').test(text)
}

export function classifyVerdictTone(rec?: string, trafficLight?: string): VerdictTone {
    const normRec = (rec || '').trim().toLowerCase()
    const normLight = (trafficLight || '').trim().toUpperCase()

    if (
        hasStem(normRec, 'renegotiat') ||
        hasWord(normRec, 'caution') ||
        hasWord(normRec, 'warn') ||
        hasWord(normRec, 'warning') ||
        hasWord(normRec, 'warnings') ||
        hasWord(normRec, 'hold') ||
        normLight === 'YELLOW'
    ) {
        return 'warning'
    }

    if (
        hasWord(normRec, 'abort') ||
        hasWord(normRec, 'pass') ||
        hasStem(normRec, 'reject') ||
        hasStem(normRec, 'escalat') ||
        hasWord(normRec, 'risk') ||
        normLight === 'RED'
    ) {
        return 'destructive'
    }

    if (
        hasStem(normRec, 'proceed') ||
        hasWord(normRec, 'buy') ||
        hasStem(normRec, 'acqui') ||
        hasWord(normRec, 'green') ||
        normLight === 'GREEN'
    ) {
        return 'success'
    }

    return 'neutral'
}
