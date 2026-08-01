// Anthropic token pricing and per-document cost estimation.
//
// The dashboard previously showed a single hardcoded "$/doc" guess and named
// only Sonnet. The live per-document workflow actually routes across two
// models: Haiku 4.5 for cheaper validation / classification passes, and
// Sonnet 4.6 for the main financial analysis. These helpers price real token
// counts and quantify what the Haiku routing saves versus an all-Sonnet run.

export type AnthropicModel = 'haiku-4-5' | 'sonnet-4-6'

/** USD per 1M tokens, per the published Anthropic price list. */
export const MODEL_RATES: Record<AnthropicModel, { inputPerMTok: number; outputPerMTok: number }> = {
    'haiku-4-5': { inputPerMTok: 1, outputPerMTok: 5 },
    'sonnet-4-6': { inputPerMTok: 3, outputPerMTok: 15 },
}

export type ModelLeg = {
    model: AnthropicModel
    inputTokens: number
    outputTokens: number
}

/**
 * Token counts measured from a representative production run (n8n execution
 * 50414): the Sonnet financial-analysis pass plus a Haiku output-recovery
 * (validation) pass. Used as the default per-document estimate until per-run
 * token logging is wired end to end.
 */
export const SAMPLE_DOCUMENT_LEGS: ModelLeg[] = [
    { model: 'sonnet-4-6', inputTokens: 2554, outputTokens: 1090 },
    { model: 'haiku-4-5', inputTokens: 3121, outputTokens: 1103 },
]

/** USD cost of one model call from its token counts. */
export function estimateCallCost(inputTokens: number, outputTokens: number, model: AnthropicModel): number {
    const rate = MODEL_RATES[model]
    return (inputTokens / 1_000_000) * rate.inputPerMTok + (outputTokens / 1_000_000) * rate.outputPerMTok
}

/** USD cost of one document from all of its model calls (legs). */
export function estimatePerDocumentCost(legs: ModelLeg[]): number {
    return legs.reduce((acc, leg) => acc + estimateCallCost(leg.inputTokens, leg.outputTokens, leg.model), 0)
}

/**
 * What the same legs would cost if every call ran on Sonnet instead of its
 * assigned model — the baseline for measuring the benefit of Haiku routing.
 */
export function estimateAllSonnetCost(legs: ModelLeg[]): number {
    return legs.reduce((acc, leg) => acc + estimateCallCost(leg.inputTokens, leg.outputTokens, 'sonnet-4-6'), 0)
}

/** Fractional saving (0..1) from the actual routing vs. an all-Sonnet pipeline. */
export function routingSavingsFraction(legs: ModelLeg[]): number {
    const sonnetOnly = estimateAllSonnetCost(legs)
    if (sonnetOnly <= 0) {
        return 0
    }
    return (sonnetOnly - estimatePerDocumentCost(legs)) / sonnetOnly
}

/** Default measured per-document cost (USD) from the representative sample. */
export const MEASURED_COST_PER_DOCUMENT = estimatePerDocumentCost(SAMPLE_DOCUMENT_LEGS)

/** Default measured Haiku-routing saving vs. all-Sonnet, as a fraction (0..1). */
export const MEASURED_ROUTING_SAVINGS = routingSavingsFraction(SAMPLE_DOCUMENT_LEGS)
