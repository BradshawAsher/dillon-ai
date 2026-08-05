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

export type SpendDriver = {
    /** Human label, e.g. "Sonnet 4.6 output". */
    label: string
    model: AnthropicModel
    direction: 'input' | 'output'
    tokens: number
    costUsd: number
    /** Share of total run cost, 0..1. */
    share: number
}

/**
 * Breaks a run's legs into individual cost contributors (each model's input and
 * output separately) ranked most-expensive first. Answers "where does the money
 * actually go?" — Track A's top-spend-drivers question.
 */
export function topSpendDrivers(legs: ModelLeg[], limit = 3): SpendDriver[] {
    const modelLabel: Record<AnthropicModel, string> = {
        'haiku-4-5': 'Haiku 4.5',
        'sonnet-4-6': 'Sonnet 4.6',
    }
    const contributors: Omit<SpendDriver, 'share'>[] = []
    for (const leg of legs) {
        const rate = MODEL_RATES[leg.model]
        contributors.push({
            label: `${modelLabel[leg.model]} input`,
            model: leg.model,
            direction: 'input',
            tokens: leg.inputTokens,
            costUsd: (leg.inputTokens / 1_000_000) * rate.inputPerMTok,
        })
        contributors.push({
            label: `${modelLabel[leg.model]} output`,
            model: leg.model,
            direction: 'output',
            tokens: leg.outputTokens,
            costUsd: (leg.outputTokens / 1_000_000) * rate.outputPerMTok,
        })
    }

    // Fold duplicate model+direction legs together (a document can call the same
    // model more than once) before ranking.
    const merged = new Map<string, Omit<SpendDriver, 'share'>>()
    for (const c of contributors) {
        const key = `${c.model}:${c.direction}`
        const existing = merged.get(key)
        if (existing) {
            existing.tokens += c.tokens
            existing.costUsd += c.costUsd
        } else {
            merged.set(key, { ...c })
        }
    }

    const total = [...merged.values()].reduce((sum, c) => sum + c.costUsd, 0)
    return [...merged.values()]
        .map((c) => ({ ...c, share: total > 0 ? c.costUsd / total : 0 }))
        .sort((a, b) => b.costUsd - a.costUsd)
        .slice(0, limit)
}

/**
 * Projects monthly spend at a given throughput. Documents use the measured
 * per-document cost; each project synthesis adds an (estimated) Sonnet pass.
 */
export function estimateMonthlyCost(
    documentsPerMonth: number,
    synthesesPerMonth: number,
    costPerSynthesis = 0.12,
): number {
    const docs = Math.max(0, documentsPerMonth)
    const syntheses = Math.max(0, synthesesPerMonth)
    return docs * MEASURED_COST_PER_DOCUMENT + syntheses * costPerSynthesis
}
