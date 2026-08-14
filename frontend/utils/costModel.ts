// Anthropic & OpenAI token pricing and per-document cost estimation.
//
// The live per-document and synthesis workflow routes across benchmark models:
// Claude Sonnet 5 for main document extraction & financial analysis,
// and OpenAI 5.6 Terra for synthesis passes and consolidation.

export type AnthropicModel = 'sonnet-5' | 'openai-5-6-terra'

/** USD per 1M tokens, per benchmark provider price lists. */
export const MODEL_RATES: Record<AnthropicModel, { inputPerMTok: number; outputPerMTok: number }> = {
    'sonnet-5': { inputPerMTok: 3.0, outputPerMTok: 15.0 },
    'openai-5-6-terra': { inputPerMTok: 2.5, outputPerMTok: 10.0 },
}

export type ModelLeg = {
    model: AnthropicModel
    inputTokens: number
    outputTokens: number
}

/**
 * Token counts measured from representative production execution:
 * Claude Sonnet 5 document extraction pass plus OpenAI 5.6 Terra consolidation pass.
 */
export const SAMPLE_DOCUMENT_LEGS: ModelLeg[] = [
    { model: 'sonnet-5', inputTokens: 2554, outputTokens: 1090 },
    { model: 'openai-5-6-terra', inputTokens: 3121, outputTokens: 1103 },
]

/** USD cost of one model call from its token counts. */
export function estimateCallCost(inputTokens: number, outputTokens: number, model: AnthropicModel): number {
    const rate = MODEL_RATES[model] || MODEL_RATES['sonnet-5']
    return (inputTokens / 1_000_000) * rate.inputPerMTok + (outputTokens / 1_000_000) * rate.outputPerMTok
}

/** USD cost of one document from all of its model calls (legs). */
export function estimatePerDocumentCost(legs: ModelLeg[]): number {
    return legs.reduce((acc, leg) => acc + estimateCallCost(leg.inputTokens, leg.outputTokens, leg.model), 0)
}

/**
 * What the same legs would cost if every call ran on Claude Sonnet 5 instead of its
 * assigned model — the baseline for measuring routing optimization.
 */
export function estimateAllSonnetCost(legs: ModelLeg[]): number {
    return legs.reduce((acc, leg) => acc + estimateCallCost(leg.inputTokens, leg.outputTokens, 'sonnet-5'), 0)
}

/** Fractional saving (0..1) from routing vs. single model. */
export function routingSavingsFraction(legs: ModelLeg[]): number {
    const sonnetOnly = estimateAllSonnetCost(legs)
    if (sonnetOnly <= 0) {
        return 0
    }
    return Math.max(0, (sonnetOnly - estimatePerDocumentCost(legs)) / sonnetOnly)
}

/** Default measured per-document cost (USD) from the representative sample. */
export const MEASURED_COST_PER_DOCUMENT = estimatePerDocumentCost(SAMPLE_DOCUMENT_LEGS)

/** Default measured routing saving vs. all-Sonnet, as a fraction (0..1). */
export const MEASURED_ROUTING_SAVINGS = routingSavingsFraction(SAMPLE_DOCUMENT_LEGS)

export type SpendDriver = {
    /** Human label, e.g. "Claude Sonnet 5 output". */
    label: string
    model: AnthropicModel
    direction: 'input' | 'output'
    tokens: number
    costUsd: number
    /** Share of total run cost, 0..1. */
    share: number
}

/**
 * Breaks a run's legs into individual cost contributors ranked most-expensive first.
 */
export function topSpendDrivers(legs: ModelLeg[], limit = 3): SpendDriver[] {
    const modelLabel: Record<AnthropicModel, string> = {
        'sonnet-5': 'Claude Sonnet 5',
        'openai-5-6-terra': 'OpenAI 5.6 Terra',
    }
    const contributors: Omit<SpendDriver, 'share'>[] = []
    for (const leg of legs) {
        const rate = MODEL_RATES[leg.model] || MODEL_RATES['sonnet-5']
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

    // Fold duplicate model+direction legs together
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

export type MeasuredCostInput = {
    /** Per-document telemetry rows. */
    documents: Array<{ costUsd?: number; totalTokens?: number }>
    /** The project's synthesis row, when one exists. */
    synthesis?: { costUsd?: number; totalTokens?: number } | null
}

export type MeasuredCostSummary = {
    docCost: number
    docTokens: number
    synthesisCost: number
    synthesisTokens: number
    totalCost: number
    totalTokens: number
    /** True when any real token telemetry was found (vs. all zeros). */
    hasMeasured: boolean
}

/**
 * Aggregates real logged token/cost telemetry across a project's documents and
 * its synthesis.
 */
export function sumMeasuredCost(input: MeasuredCostInput): MeasuredCostSummary {
    const docCost = input.documents.reduce((sum, d) => sum + (d.costUsd ?? 0), 0)
    const docTokens = input.documents.reduce((sum, d) => sum + (d.totalTokens ?? 0), 0)
    const synthesisCost = input.synthesis?.costUsd ?? 0
    const synthesisTokens = input.synthesis?.totalTokens ?? 0
    const totalCost = docCost + synthesisCost
    const totalTokens = docTokens + synthesisTokens
    return {
        docCost,
        docTokens,
        synthesisCost,
        synthesisTokens,
        totalCost,
        totalTokens,
        hasMeasured: totalTokens > 0 || totalCost > 0,
    }
}

/**
 * Projects monthly spend at a given throughput.
 */
export function estimateMonthlyCost(
    documentsPerMonth: number,
    synthesesPerMonth: number,
    costPerSynthesis = 0.12,
): number {
    const nonNegative = (value: number) => (Number.isFinite(value) && value > 0 ? value : 0)
    const docs = nonNegative(documentsPerMonth)
    const syntheses = nonNegative(synthesesPerMonth)
    return docs * MEASURED_COST_PER_DOCUMENT + syntheses * costPerSynthesis
}
