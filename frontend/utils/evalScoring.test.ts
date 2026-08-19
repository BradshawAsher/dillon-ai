import { describe, expect, it } from 'vitest'

import { evaluateDocument, evaluateProjectConflicts, extractYear, normalizeActualDoc, summarizeResults, type ActualRunDoc, type DocScore, type GroundTruth } from '../../scripts/evalScoring'
import type { ContradictionRecord } from './crossDocumentConflicts'

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
        // 3% off -> single-doc 5 pts -> 90%(10) + 10%(5) = 9.5 pts out of 10
        const actual = baseActual({ financialFacts: [{ metric: 'revenue', normalizedValue: 1030, period: '2025' }] })
        expect(evaluateDocument(gt, actual).factsScore).toBe(9.5)
    })

    it('gives full facts credit when ground truth lists no facts', () => {
        expect(evaluateDocument(baseGroundTruth(), baseActual()).factsScore).toBe(10)
    })

    it('does not award full credit for a wrong value against a negative ground-truth fact', () => {
        // A loss-making EBITDA is a legitimate negative ground truth. A sign-flipped
        // actual is 200% off and must earn only partial credit, not full marks.
        const gt = baseGroundTruth({
            financialFacts: [{ metric: 'ebitda', normalizedValue: -500_000, period: '2025' }],
        })
        const wrong = baseActual({ financialFacts: [{ metric: 'ebitda', normalizedValue: 500_000, period: '2025' }] })
        expect(evaluateDocument(gt, wrong).factsScore).toBe(9.3) // 90%(10) + 10%(3 partial)
        // An exact negative match still scores full facts.
        const exact = baseActual({ financialFacts: [{ metric: 'ebitda', normalizedValue: -500_000, period: '2025' }] })
        expect(evaluateDocument(gt, exact).factsScore).toBe(10)
    })
})

describe('evaluateDocument component scores', () => {
    it('awards full classification for an exact document-type match', () => {
        expect(evaluateDocument(baseGroundTruth(), baseActual()).classificationScore).toBe(10)
    })

    it('awards partial classification for a secondary-type match', () => {
        const gt = baseGroundTruth({ documentType: 'Financial Model', documentTypes: ['Financial Model', 'Profit and Loss Statement'] })
        const actual = baseActual({ detectedDocumentType: 'Profit and Loss Statement' })
        // 90%(10) + 10%(7) = 9.7
        expect(evaluateDocument(gt, actual).classificationScore).toBe(9.7)
    })

    it('penalizes an adjacent traffic-light mismatch', () => {
        const score = evaluateDocument(baseGroundTruth({ trafficLight: 'YELLOW' }), baseActual({ trafficLight: 'RED' }))
        // 90%(20) + 10%(5 + 10 recall) = 18 + 1.5 = 19.5
        expect(score.riskScore).toBe(19.5)
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

    it('keeps the original 7-key shape and headline when no project conflicts are passed', () => {
        const summary = summarizeResults([scoreWith(90), scoreWith(80)], 70)
        expect(summary.overallPercentage).toBe(85) // unchanged by the new arg
        expect(summary.categoryAverages.crossDocConflicts).toBeUndefined()
        expect(summary.crossDocConflictResults).toBeUndefined()
    })

    it('injects the crossDocConflicts average and can pick it as weakest', () => {
        const conflicts = [
            { projectId: 'p1', business: 'B', detected: [], expectedCount: 4, matchedCount: 1, llmRecall: 0.25, detectorRecall: 0.25, falsePositives: 0, score: 2, maxScore: 10 as const },
        ]
        const summary = summarizeResults([scoreWith(90), scoreWith(90)], 70, conflicts)
        expect(summary.categoryAverages.crossDocConflicts).toBe(20) // 2/10
        expect(summary.weakestDimension).toBe('crossDocConflicts')
        expect(summary.crossDocConflictResults).toHaveLength(1)
    })
})

describe('dual-mode accuracy (preLoi / postLoi)', () => {
    it('averages the six Pre-LOI dimensions', () => {
        const summary = summarizeResults([scoreWith(80, { valuationScore: 0 }), scoreWith(80, { valuationScore: 0 })], 70)
        // five dims at 100, valuation at 0 -> round(500 / 6)
        expect(summary.categoryAverages.valuation).toBe(0)
        expect(summary.preLoiAccuracyPct).toBe(83)
    })

    it('defaults Post-LOI cross-doc to 100 when conflicts were not scored', () => {
        const summary = summarizeResults([scoreWith(90), scoreWith(90)], 70)
        expect(summary.categoryAverages.crossDocConflicts).toBeUndefined()
        expect(summary.postLoiAccuracyPct).toBe(100) // recommendation 100 + unscored default 100
    })

    it('does not treat a real 0% cross-doc score as 100 (regression)', () => {
        const zeroConflict = [
            { projectId: 'p', business: 'B', detected: [], expectedCount: 2, matchedCount: 0, llmRecall: 0, detectorRecall: 0, falsePositives: 0, score: 0, maxScore: 10 as const },
        ]
        const summary = summarizeResults([scoreWith(90), scoreWith(90)], 70, zeroConflict)
        expect(summary.categoryAverages.crossDocConflicts).toBe(0)
        expect(summary.postLoiAccuracyPct).toBe(50) // (100 + real 0) / 2 — not 100
    })
})

describe('evaluateProjectConflicts', () => {
    const detected = (metric: string, period: string): ContradictionRecord => ({
        metric, period, docA: 'a', docB: 'b', valueA: 1, valueB: 2, deltaPct: 0.5, severity: 'critical', citations: [],
    })

    it('credits recall via the deterministic detector', () => {
        const gt = baseGroundTruth({
            expectedCrossDocumentConflicts: [{ metric: 'ebitda', period: 'TTM', description: 'seller overstated ebitda' }],
        })
        const score = evaluateProjectConflicts([gt], [baseActual()], [detected('ebitda', 'TTM')])
        expect(score.detectorRecall).toBe(1)
        expect(score.matchedCount).toBe(1)
        expect(score.score).toBe(10)
    })

    it('credits recall via LLM conflict keywords when the detector misses', () => {
        const gt = baseGroundTruth({
            expectedCrossDocumentConflicts: [{ metric: 'ebitda', period: 'TTM', description: 'seller overstated adjusted earnings' }],
        })
        const actual = baseActual({ crossDocumentConflicts: ['The seller overstated earnings versus the buyer model.'] })
        const score = evaluateProjectConflicts([gt], [actual], [])
        expect(score.detectorRecall).toBe(0)
        expect(score.llmRecall).toBe(1)
        expect(score.matchedCount).toBe(1)
    })

    it('penalises detector false positives', () => {
        const gt = baseGroundTruth({ expectedCrossDocumentConflicts: [] })
        const score = evaluateProjectConflicts([gt], [baseActual()], [detected('revenue', '2024'), detected('cash', '2024')])
        expect(score.expectedCount).toBe(0)
        expect(score.falsePositives).toBe(2)
        expect(score.score).toBe(6) // 10 - min(2*2, 5)
    })
})

describe('normalizeActualDoc mml remap', () => {
    it('maps extractedFacts / valuationBaseEstimate / mathCheckPassed', () => {
        const normalized = normalizeActualDoc({
            fileName: 'packet.pdf',
            detectedDocumentType: 'Financial Packet',
            trafficLight: 'RED',
            extractedFacts: [{ metric: 'ebitda', normalizedValue: 1_260_400, period: 'TTM' }],
            valuation: { valuationBaseEstimate: 5_671_800 },
            mathCheckPassed: false,
        })
        expect(normalized.financialFacts[0].normalizedValue).toBe(1_260_400)
        expect(normalized.valuation?.base_estimate).toBe(5_671_800)
        expect(normalized.mathCheckStatus).toBe('failed')
        expect(normalized.crossDocumentConflicts).toEqual([])
    })
})

describe('normalizeActualDoc', () => {
    it('preserves a row that already matches ActualRunDoc, defaulting conflicts to []', () => {
        const row = baseActual({ fileName: 'x.pdf' })
        expect(normalizeActualDoc(row)).toEqual({ ...row, crossDocumentConflicts: [] })
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
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: 1050 } })).valuationScore).toBe(15) // 5% off -> 90%(15) + 10%(15) = 15
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: 1250 } })).valuationScore).toBe(14.5) // 25% off -> 90%(15) + 10%(10) = 14.5
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: 2000 } })).valuationScore).toBe(14)  // 100% off -> 90%(15) + 10%(5) = 14
        expect(evaluateDocument(gt, baseActual({ valuation: null })).valuationScore).toBe(13.5) // expected but missing -> 90%(15) + 10%(0) = 13.5
    })

    it('scores valuation proximity by magnitude even for a negative base estimate', () => {
        const gt = baseGroundTruth({ valuation: { valuation_base_estimate: -1000 } })
        // A value 100% off in magnitude must land in the far tier, not full marks.
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: -2000 } })).valuationScore).toBe(14) // 90%(15) + 10%(5)
        expect(evaluateDocument(gt, baseActual({ valuation: { base_estimate: -1050 } })).valuationScore).toBe(15) // 5% off -> full
    })

    it('scores employee evidence as exact-match only', () => {
        const gt = baseGroundTruth({ employeeEvidence: { employee_count: 12 } })
        expect(evaluateDocument(gt, baseActual({ employeeEvidence: { count: 12 } })).employeeScore).toBe(5)
        expect(evaluateDocument(gt, baseActual({ employeeEvidence: { count: 9 } })).employeeScore).toBe(4.5) // 90%(5) + 10%(0) = 4.5
    })

    it('scores math-check status match vs mismatch', () => {
        expect(evaluateDocument(baseGroundTruth({ expectedMathCheckStatus: 'warning' }), baseActual({ mathCheckStatus: 'warning' })).mathScore).toBe(10)
        expect(evaluateDocument(baseGroundTruth({ expectedMathCheckStatus: 'warning' }), baseActual({ mathCheckStatus: 'passed' })).mathScore).toBe(9.5) // 90%(10) + 10%(5) = 9.5
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
