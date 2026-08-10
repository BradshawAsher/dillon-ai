import { describe, expect, it } from 'vitest'

import { evaluateDocument, extractYear, normalizeActualDoc, summarizeResults, type ActualRunDoc, type DocScore, type GroundTruth } from '../../scripts/evalScoring'

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

function scoreWith(percentage: number, overrides: Partial<DocScore> = {}): DocScore {
    return {
        classificationScore: 10,
        factsScore: 10,
        riskScore: 20,
        valuationScore: 15,
        employeeScore: 5,
        mathScore: 10,
        recommendationScore: 10,
        totalScore: 80,
        maxScore: 80,
        percentage,
        pass: percentage >= 80,
        ...overrides,
    }
}

describe('summarizeResults', () => {
    it('passes the regression gate when overall meets the threshold', () => {
        const summary = summarizeResults([scoreWith(90), scoreWith(80)], 70)
        expect(summary.overallPercentage).toBe(85)
        expect(summary.regressionPassed).toBe(true)
        expect(summary.passedDocuments).toBe(2)
    })

    it('fails the regression gate when overall drops below the threshold', () => {
        const summary = summarizeResults([scoreWith(60), scoreWith(50)], 70)
        expect(summary.overallPercentage).toBe(55)
        expect(summary.regressionPassed).toBe(false)
    })

    it('identifies the weakest dimension from category averages', () => {
        // valuation deliberately low across both docs
        const summary = summarizeResults([
            scoreWith(80, { valuationScore: 0 }),
            scoreWith(80, { valuationScore: 0 }),
        ], 70)
        expect(summary.categoryAverages.valuation).toBe(0)
        expect(summary.weakestDimension).toBe('valuation')
        expect(summary.categoryAverages.classification).toBe(100)
    })

    it('treats an empty suite as a non-blocking pass', () => {
        const summary = summarizeResults([], 70)
        expect(summary.totalDocumentsEvaluated).toBe(0)
        expect(summary.regressionPassed).toBe(true)
        expect(summary.weakestDimension).toBeNull()
    })
})

describe('normalizeActualDoc', () => {
    it('passes through a row that already matches ActualRunDoc', () => {
        const row = baseActual({ fileName: 'x.pdf' })
        expect(normalizeActualDoc(row)).toBe(row)
    })

    it('parses a snake_case extractedJson blob with nested flags', () => {
        const raw = {
            fileName: 'model.xlsx',
            extractedJson: JSON.stringify({
                document_type: 'Financial Model',
                traffic_light: 'RED',
                risk_flag: 'HIGH',
                financial_facts: [{ metric: 'revenue', normalized_value: '960117.77', period: 'FY2025' }],
                response: { flags: { red_flags: ['Concentration risk'], yellow_flags: ['Owner dependence'] } },
                valuation: { base_estimate: 2000000 },
            }),
        }
        const doc = normalizeActualDoc(raw)
        expect(doc.detectedDocumentType).toBe('Financial Model')
        expect(doc.trafficLight).toBe('RED')
        expect(doc.financialFacts[0].normalizedValue).toBeCloseTo(960117.77, 2)
        expect(doc.redFlags).toEqual(['Concentration risk'])
        expect(doc.yellowFlags).toEqual(['Owner dependence'])
        expect(doc.valuation?.base_estimate).toBe(2000000)
    })

    it('applies safe defaults and never throws on malformed JSON', () => {
        const doc = normalizeActualDoc({ fileName: 'broken.pdf', extractedJson: '{not json' })
        expect(doc.fileName).toBe('broken.pdf')
    })
})

describe('evaluateDocument dimension scoring', () => {
    it('scores valuation by proximity tiers', () => {
        const gt = baseGroundTruth({ valuation: { valuation_base_estimate: 1000 } })
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: 1050 } })).valuationScore).toBe(15) // 5% off
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: 1250 } })).valuationScore).toBe(10) // 25% off
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: 2000 } })).valuationScore).toBe(5)  // 100% off
        expect(evaluateDocument(gt, baseActual({ valuation: null })).valuationScore).toBe(0) // expected but missing
    })

    it('scores employee evidence as exact-match only', () => {
        const gt = baseGroundTruth({ employeeEvidence: { employee_count: 12 } })
        expect(evaluateDocument(gt, baseActual({ employeeEvidence: { count: 12 } })).employeeScore).toBe(5)
        expect(evaluateDocument(gt, baseActual({ employeeEvidence: { count: 9 } })).employeeScore).toBe(0)
    })

    it('scores math-check status match vs mismatch', () => {
        expect(evaluateDocument(baseGroundTruth({ expectedMathCheckStatus: 'warning' }), baseActual({ mathCheckStatus: 'warning' })).mathScore).toBe(10)
        expect(evaluateDocument(baseGroundTruth({ expectedMathCheckStatus: 'warning' }), baseActual({ mathCheckStatus: 'passed' })).mathScore).toBe(5)
    })

    it('rewards expected-flag recall in the risk score', () => {
        const gt = baseGroundTruth({ trafficLight: 'YELLOW', expectedRedFlags: ['customer concentration risk'] })
        const caught = evaluateDocument(gt, baseActual({ trafficLight: 'YELLOW', redFlags: ['High customer concentration noted'] }))
        const missed = evaluateDocument(gt, baseActual({ trafficLight: 'YELLOW', redFlags: [] }))
        expect(caught.riskScore).toBeGreaterThan(missed.riskScore)
    })

    it('gives full acquisition-judgment credit when recommendations align', () => {
        const gt = baseGroundTruth({ expectedRecommendation: 'PROCEED WITH ACQUISITION' })
        const aligned = evaluateDocument(gt, baseActual({ finalRecommendation: 'PROCEED WITH ACQUISITION' }))
        expect(aligned.recommendationScore).toBe(10)
    })
})
