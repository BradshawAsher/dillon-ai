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
export function classifyVerdictTone(rec?: string, trafficLight?: string): VerdictTone {
    const normRec = (rec || '').trim().toLowerCase()
    const normLight = (trafficLight || '').trim().toUpperCase()

    if (
        normRec.includes('renegotiat') ||
        normRec.includes('caution') ||
        normRec.includes('warn') ||
        normRec.includes('hold') ||
        normLight === 'YELLOW'
    ) {
        return 'warning'
    }

    if (
        normRec.includes('abort') ||
        normRec.includes('pass') ||
        normRec.includes('reject') ||
        normRec.includes('escalat') ||
        normRec.includes('risk') ||
        normLight === 'RED'
    ) {
        return 'destructive'
    }

    if (
        normRec.includes('proceed') ||
        normRec.includes('buy') ||
        normRec.includes('acquire') ||
        normRec.includes('green') ||
        normLight === 'GREEN'
    ) {
        return 'success'
    }

    return 'neutral'
}
