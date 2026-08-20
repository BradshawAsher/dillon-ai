import { describe, expect, it } from 'vitest'

import { buildMemoText } from './DealMemoView'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'

function model(over: Partial<DealModel> = {}): DealModel {
    return { documentedFactsJson: '{}', ...over } as DealModel
}

function facts(ebitda: number) {
    return JSON.stringify({ ebitda_sde: { value: ebitda, status: 'confirmed' } })
}

function synth(over: Partial<ProjectSynthesisItem> = {}): ProjectSynthesisItem {
    return {
        redFlags: [], yellowFlags: [], greenFlags: [], openQuestions: [],
        valuationBaseEstimate: '5000000', valuationLowerBound: '4000000', valuationUpperBound: '6000000',
        ...over,
    } as ProjectSynthesisItem
}

describe('buildMemoText', () => {
    it('prints a positive entry multiple for a profitable target', () => {
        const m = model({ purchasePrice: 6_000_000, documentedFactsJson: facts(1_500_000) })
        expect(buildMemoText(m, undefined, 'Deal')).toContain('Entry Multiple: 4.0x EBITDA')
    })

    it('omits the entry multiple for a loss-making target instead of printing a negative one', () => {
        const m = model({ purchasePrice: 6_000_000, documentedFactsJson: facts(-500_000) })
        const memo = buildMemoText(m, undefined, 'Deal')
        expect(memo).not.toContain('Entry Multiple')
        expect(memo).not.toMatch(/-\d+(\.\d+)?x/)
    })

    it('normalizes confidence and does not rescale a percent-sign value', () => {
        expect(buildMemoText(model(), synth({ valuationConfidence: '0.82' }), 'Deal')).toContain('Confidence: 82%')
        expect(buildMemoText(model(), synth({ valuationConfidence: '1%' }), 'Deal')).toContain('Confidence: 1%')
    })
})
