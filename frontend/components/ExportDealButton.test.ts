import { describe, expect, it } from 'vitest'

import { buildMarkdownReport, buildOnePageSnapshot } from './ExportDealButton'
import type { DealModel, ProjectSynthesisItem } from '../hooks/backend/diligence'

function model(over: Partial<DealModel> = {}): DealModel {
    return { documentedFactsJson: '{}', ...over } as DealModel
}

function factsJson(ebitda: number) {
    return JSON.stringify({ ebitda_sde: { value: ebitda, status: 'confirmed' } })
}

describe('export entry multiple', () => {
    it('reports a positive entry multiple for a profitable target', () => {
        const m = model({ purchasePrice: 6_000_000, documentedFactsJson: factsJson(1_500_000) })
        expect(buildOnePageSnapshot(m, undefined, 'Deal')).toContain('4.0x EBITDA/SDE')
        expect(buildMarkdownReport(m, undefined, 'Deal')).toContain('Entry Multiple:** 4.0x')
    })

    it('shows "Not available" rather than a negative multiple for a loss-making target', () => {
        const m = model({ purchasePrice: 6_000_000, documentedFactsJson: factsJson(-500_000) })
        const snapshot = buildOnePageSnapshot(m, undefined, 'Deal')
        expect(snapshot).toContain('Entry multiple:** Not available')
        expect(snapshot).not.toMatch(/-\d+(\.\d+)?x/)
        // The markdown report simply omits the meaningless multiple line.
        expect(buildMarkdownReport(m, undefined, 'Deal')).not.toContain('Entry Multiple')
    })

    it('shows "Not available" when EBITDA is not documented', () => {
        const m = model({ purchasePrice: 6_000_000, documentedFactsJson: '{}' })
        expect(buildOnePageSnapshot(m, undefined as unknown as ProjectSynthesisItem, 'Deal')).toContain('Entry multiple:** Not available')
    })

    it('places the minus before the dollar sign for a negative fact value', () => {
        const facts = JSON.stringify({ ebitda_sde: { value: -500_000, status: 'confirmed' } })
        const snapshot = buildOnePageSnapshot(model({ documentedFactsJson: facts }), undefined as unknown as ProjectSynthesisItem, 'Deal')
        expect(snapshot).toContain('EBITDA/SDE: -$500,000')
        expect(snapshot).not.toContain('$-500,000')
    })
})

describe('markdown report confidence', () => {
    function synth(over: Partial<ProjectSynthesisItem> = {}): ProjectSynthesisItem {
        return {
            redFlags: [], yellowFlags: [], greenFlags: [], openQuestions: [],
            valuationBaseEstimate: '5000000', valuationLowerBound: '4000000', valuationUpperBound: '6000000',
            ...over,
        } as ProjectSynthesisItem
    }

    it('renders a fractional confidence as a percentage', () => {
        const md = buildMarkdownReport(model(), synth({ valuationConfidence: '0.82' }), 'Deal')
        expect(md).toContain('Confidence:** 82% (High)')
    })

    it('does not rescale a percent-sign confidence', () => {
        const md = buildMarkdownReport(model(), synth({ valuationConfidence: '1%' }), 'Deal')
        expect(md).toContain('Confidence:** 1% (Low)')
    })
})
