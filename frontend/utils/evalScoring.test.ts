import { describe, expect, it } from 'vitest'

import { evaluateDocument, extractYear, type ActualRunDoc, type GroundTruth } from '../../scripts/evalScoring'

function baseGroundTruth(overrides: Partial<GroundTruth> = {}): GroundTruth {
    return {
        documentType: 'Profit and Loss Statement',
        documentTypes: ['Profit and Loss Statement'],
        trafficLight: 'YELLOW',
        riskLevel: 'MEDIUM',
        financialFacts: [],
        expectedRedFlags: [],
        expectedYellowFlags: [],
        falsePositiveFlags: [],
        valuation: null,
        employeeEvidence: null,
        expectedMathCheckStatus: 'passed',
        ...overrides,
    }
}

function baseActual(overrides: Partial<ActualRunDoc> = {}): ActualRunDoc {
    return {
        fileName: 'doc.pdf',
        fileType: 'PDF',
        status: 'completed',
        detectedDocumentType: 'Profit and Loss Statement',
        detectedDocumentTypes: ['Profit and Loss Statement'],
        trafficLight: 'YELLOW',
        riskLevel: 'MEDIUM',
        financialFacts: [],
        redFlags: [],
        yellowFlags: [],
        valuation: null,
        employeeEvidence: null,
        mathCheckStatus: 'passed',
        ...overrides,
    }
}

describe('extractYear', () => {
    it('pulls a 4-digit year from varied period labels', () => {
        expect(extractYear('Jan - Dec 2025')).toBe('2025')
        expect(extractYear('LTM 2025')).toBe('2025')
        expect(extractYear('FY2024')).toBe('2024')
        expect(extractYear('unknown')).toBe('')
        expect(extractYear(undefined)).toBe('')
    })
})

describe('evaluateDocument financial-fact matching', () => {
    it('scores period-differentiated facts against the correct year (the bug fix)', () => {
        const gt = baseGroundTruth({
            financialFacts: [
                { metric: 'revenue', normalizedValue: 960117.77, period: 'Jan-Dec 2025' },
                { metric: 'revenue', normalizedValue: 550041.54, period: 'Jan-Dec 2024' },
            ],
        })
        const actual = baseActual({
            financialFacts: [
                { metric: 'revenue', normalizedValue: 960117.77, period: 'Jan - Dec 2025' },
                { metric: 'revenue', normalizedValue: 550041.54, period: 'Jan - Dec 2024' },
            ],
        })
        // Both years match to the penny -> full 10/10 facts.
        expect(evaluateDocument(gt, actual).factsScore).toBe(10)
    })

    it('the old metric-only match would have mis-scored; near-miss values are partial credit', () => {
        const gt = baseGroundTruth({
            financialFacts: [{ metric: 'revenue', normalizedValue: 1000, period: '2025' }],
        })
        // 3% off -> 5 pts out of 10
        const actual = baseActual({ financialFacts: [{ metric: 'revenue', normalizedValue: 1030, period: '2025' }] })
        expect(evaluateDocument(gt, actual).factsScore).toBe(5)
    })

    it('gives full facts credit when ground truth lists no facts', () => {
        expect(evaluateDocument(baseGroundTruth(), baseActual()).factsScore).toBe(10)
    })
})

describe('evaluateDocument component scores', () => {
    it('awards full classification for an exact document-type match', () => {
        expect(evaluateDocument(baseGroundTruth(), baseActual()).classificationScore).toBe(10)
    })

    it('awards partial classification for a secondary-type match', () => {
        const gt = baseGroundTruth({ documentType: 'Financial Model', documentTypes: ['Financial Model', 'Profit and Loss Statement'] })
        const actual = baseActual({ detectedDocumentType: 'Profit and Loss Statement' })
        expect(evaluateDocument(gt, actual).classificationScore).toBe(7)
    })

    it('penalizes an adjacent traffic-light mismatch', () => {
        const score = evaluateDocument(baseGroundTruth({ trafficLight: 'YELLOW' }), baseActual({ trafficLight: 'RED' }))
        // 5 (traffic light) + 10 (no expected flags -> full recall) = 15
        expect(score.riskScore).toBe(15)
    })

    it('flags a passing document at/above the 80% threshold', () => {
        expect(evaluateDocument(baseGroundTruth(), baseActual()).pass).toBe(true)
    })
})
